import { fetchAllFeeds } from "./pipeline/fetcher";
import { deduplicateArticles } from "./pipeline/deduplicator";
import { scoreArticles } from "./pipeline/scorer";
import { clusterArticles } from "./pipeline/clusterer";
import { summarizeArticles } from "./pipeline/summarizer";
import { deliverToSlack, sendErrorMessage } from "./pipeline/deliver";
import { createAdminClient } from "./supabase/admin";
import { format, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { DigestResult, UserConfig } from "./types";

export async function runPipeline(
  timezone: string = "Asia/Kolkata",
  topN?: number,
  targetDate?: string // "YYYY-MM-DD" format, defaults to yesterday
): Promise<DigestResult> {
  const effectiveTopN = topN || parseInt(process.env.DEFAULT_TOP_N || "10");

  let dateStr: string;
  if (targetDate) {
    dateStr = targetDate;
  } else {
    const now = toZonedTime(new Date(), timezone);
    const yesterday = subDays(now, 1);
    dateStr = format(yesterday, "yyyy-MM-dd");
  }

  console.log(`[Pipeline] Starting for date: ${dateStr}, timezone: ${timezone}`);

  // Check if we already have a digest for this date
  const supabase = createAdminClient();
  const { data: existingDigest } = await supabase
    .from("daily_digests")
    .select("*")
    .eq("digest_date", dateStr)
    .single();

  if (existingDigest) {
    console.log(`[Pipeline] Using cached digest for ${dateStr}`);
    return {
      tldr: existingDigest.tldr || "",
      articles: existingDigest.articles as DigestResult["articles"],
      categoriesCovered: existingDigest.categories_covered || [],
      date: dateStr,
    };
  }

  // Step 1: Fetch
  console.log("[Pipeline] Fetching articles...");
  const rawArticles = await fetchAllFeeds(timezone, targetDate);
  console.log(`[Pipeline] Fetched ${rawArticles.length} raw articles`);

  if (rawArticles.length === 0) {
    return {
      tldr: "It was a quiet day in AI news. No significant stories were published yesterday.",
      articles: [],
      categoriesCovered: [],
      date: dateStr,
    };
  }

  // Step 2: Deduplicate
  console.log("[Pipeline] Deduplicating...");
  const deduped = deduplicateArticles(rawArticles);
  console.log(`[Pipeline] ${deduped.length} articles after dedup`);

  // Step 3: Score & Rank
  console.log("[Pipeline] Scoring...");
  const scored = scoreArticles(deduped);
  console.log(`[Pipeline] ${scored.length} articles after scoring/filtering`);

  // Step 4: Cluster
  console.log("[Pipeline] Clustering...");
  const clusters = clusterArticles(scored, effectiveTopN);
  console.log(`[Pipeline] ${clusters.length} clusters created`);

  // Step 5: Summarize
  console.log("[Pipeline] Summarizing...");
  const { articles: summarized, tldr } = await summarizeArticles(clusters);

  // Collect categories
  const categoriesSet = new Set<string>();
  for (const article of summarized) {
    article.categories.forEach((c) => categoriesSet.add(c));
  }
  const categoriesCovered = Array.from(categoriesSet);

  const digest: DigestResult = {
    tldr,
    articles: summarized,
    categoriesCovered,
    date: dateStr,
  };

  // Step 6: Store in Supabase
  console.log("[Pipeline] Storing digest...");
  try {
    // Store articles
    for (const article of summarized) {
      await supabase.from("articles").upsert(
        {
          url: article.url,
          title: article.title,
          source: article.source,
          published_at: article.publishedAt?.toISOString() || null,
          summary: article.summary,
          why_it_matters: article.whyItMatters,
          categories: article.categories,
          score: article.score,
        },
        { onConflict: "url" }
      );
    }

    // Store daily digest
    await supabase.from("daily_digests").upsert(
      {
        digest_date: dateStr,
        tldr,
        articles: summarized,
        categories_covered: categoriesCovered,
      },
      { onConflict: "digest_date" }
    );
  } catch (error) {
    console.error("[Pipeline] Failed to store digest:", error);
  }

  console.log("[Pipeline] Complete!");
  return digest;
}

export async function deliverToUsers(
  digest: DigestResult,
  userConfigs?: UserConfig[]
): Promise<{ delivered: number; failed: number }> {
  const supabase = createAdminClient();

  // Get users to deliver to
  let configs = userConfigs;
  if (!configs) {
    const { data } = await supabase
      .from("user_configs")
      .select("*")
      .eq("is_active", true);
    configs = (data || []) as UserConfig[];
  }

  let delivered = 0;
  let failed = 0;

  // Batch deliveries with concurrency limit
  const BATCH_SIZE = 10;
  for (let i = 0; i < configs.length; i += BATCH_SIZE) {
    const batch = configs.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (config) => {
        // Filter articles by user's topic preferences
        let filteredDigest = digest;
        if (config.topics && config.topics.length > 0) {
          const filteredArticles = digest.articles.filter((article) =>
            article.categories.some((c) => config.topics.includes(c))
          );
          filteredDigest = {
            ...digest,
            articles:
              filteredArticles.length > 0 ? filteredArticles : digest.articles,
          };
        }

        // Limit to user's top_n
        if (filteredDigest.articles.length > config.top_n) {
          filteredDigest = {
            ...filteredDigest,
            articles: filteredDigest.articles.slice(0, config.top_n),
          };
        }

        const result = await deliverToSlack(
          config.slack_webhook_url,
          filteredDigest
        );

        // Log delivery
        await supabase.from("delivery_logs").insert({
          user_id: config.user_id,
          article_count: filteredDigest.articles.length,
          status: result.success ? "success" : "failed",
          error_message: result.error || null,
          digest_snapshot: filteredDigest,
        });

        if (!result.success) {
          await sendErrorMessage(config.slack_webhook_url, result.error || "Unknown error");
          throw new Error(result.error);
        }

        return result;
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") delivered++;
      else failed++;
    }
  }

  return { delivered, failed };
}

export async function deliverToSingleUser(
  userId: string,
  targetDate?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: config } = await supabase
    .from("user_configs")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!config) {
    return { success: false, error: "No configuration found. Please go to Settings and save your Slack webhook URL first." };
  }

  if (!config.slack_webhook_url) {
    return { success: false, error: "No Slack webhook URL configured. Please go to Settings and add your webhook URL." };
  }

  const digest = await runPipeline(config.timezone, config.top_n, targetDate);
  const result = await deliverToUsers(digest, [config as UserConfig]);

  return {
    success: result.failed === 0,
    error: result.failed > 0 ? "Delivery failed" : undefined,
  };
}
