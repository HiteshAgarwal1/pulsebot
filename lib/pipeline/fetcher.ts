import Parser from "rss-parser";
import { readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { join } from "path";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { FeedConfig, RawArticle } from "@/lib/types";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "Pulsebot/1.0 (AI News Aggregator)",
  },
});

export function loadFeeds(): FeedConfig[] {
  const configPath = join(process.cwd(), "config", "feeds.yaml");
  const raw = readFileSync(configPath, "utf-8");
  const config = parseYaml(raw) as { feeds: FeedConfig[] };
  return config.feeds;
}

export async function fetchAllFeeds(
  timezone: string = "Asia/Kolkata",
  targetDate?: string // "YYYY-MM-DD" format, defaults to yesterday
): Promise<RawArticle[]> {
  const feeds = loadFeeds();
  let targetDay: Date;

  if (targetDate) {
    // Parse the target date string
    targetDay = new Date(targetDate + "T12:00:00");
  } else {
    const now = toZonedTime(new Date(), timezone);
    targetDay = subDays(now, 1);
  }

  const dayStart = startOfDay(targetDay);
  const dayEnd = endOfDay(targetDay);

  const results = await Promise.allSettled(
    feeds.map((feed) => fetchSingleFeed(feed, dayStart, dayEnd))
  );

  const articles: RawArticle[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    } else {
      console.warn(`Feed fetch failed: ${result.reason}`);
    }
  }

  return articles;
}

async function fetchSingleFeed(
  feed: FeedConfig,
  dayStart: Date,
  dayEnd: Date
): Promise<RawArticle[]> {
  const parsed = await parser.parseURL(feed.url);
  const articles: RawArticle[] = [];

  for (const item of parsed.items || []) {
    const pubDate = item.pubDate ? new Date(item.pubDate) : null;

    // If we have a date, filter to yesterday only
    if (pubDate && (pubDate < dayStart || pubDate > dayEnd)) {
      continue;
    }

    // If no date, include it (might be today's content)
    if (!item.title || !item.link) continue;

    articles.push({
      title: item.title.trim(),
      url: item.link.trim(),
      source: feed.name,
      publishedAt: pubDate,
      description: (item.contentSnippet || item.content || "").slice(0, 1000),
      tier: feed.tier,
    });
  }

  return articles;
}
