import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

import { fetchAllFeeds } from "../lib/pipeline/fetcher";
import { deduplicateArticles } from "../lib/pipeline/deduplicator";
import { scoreArticles } from "../lib/pipeline/scorer";
import { clusterArticles } from "../lib/pipeline/clusterer";
import { summarizeArticles } from "../lib/pipeline/summarizer";

const TIMEZONE = "Asia/Kolkata";
const TARGET_DATE = "2026-03-31"; // yesterday
const TOP_N = 10;

async function main() {
  console.log(`\n=== Generating fresh digest for ${TARGET_DATE} ===\n`);

  // Step 1: Fetch
  console.log("[1/5] Fetching articles from all feeds...");
  const rawArticles = await fetchAllFeeds(TIMEZONE, TARGET_DATE);
  console.log(`  → ${rawArticles.length} raw articles fetched`);

  if (rawArticles.length === 0) {
    console.log("No articles found. Exiting.");
    return;
  }

  // Show sources breakdown
  const bySrc: Record<string, number> = {};
  for (const a of rawArticles) {
    bySrc[a.source] = (bySrc[a.source] || 0) + 1;
  }
  console.log("  Sources:", JSON.stringify(bySrc, null, 2));

  // Step 2: Deduplicate
  console.log("\n[2/5] Deduplicating...");
  const deduped = deduplicateArticles(rawArticles);
  console.log(`  → ${deduped.length} articles after dedup`);

  // Step 3: Score
  console.log("\n[3/5] Scoring...");
  const scored = scoreArticles(deduped);
  console.log(`  → ${scored.length} articles after scoring/filtering`);

  console.log("\n  Top 15 scored articles:");
  for (const a of scored.slice(0, 15)) {
    console.log(`    [${a.score.toFixed(2)}] ${a.title} (${a.source})`);
    console.log(`           categories: ${a.categories.join(", ")}`);
  }

  // Step 4: Cluster
  console.log(`\n[4/5] Clustering (top ${TOP_N})...`);
  const clusters = clusterArticles(scored, TOP_N);
  console.log(`  → ${clusters.length} clusters`);

  // Step 5: Summarize
  console.log("\n[5/5] Summarizing with Claude...");
  const { articles: summarized, tldr } = await summarizeArticles(clusters);

  // Output final digest
  console.log("\n" + "=".repeat(60));
  console.log("DAILY AI DIGEST — " + TARGET_DATE);
  console.log("=".repeat(60));
  console.log(`\n📋 TL;DR: ${tldr}\n`);

  for (let i = 0; i < summarized.length; i++) {
    const a = summarized[i];
    console.log(`\n--- ${i + 1}. ${a.title} ---`);
    console.log(`Source: ${a.source} | Score: ${a.score.toFixed(2)}`);
    console.log(`Categories: ${a.categories.join(", ")}`);
    console.log(`URL: ${a.url}`);
    console.log(`Summary: ${a.summary}`);
    if (a.whyItMatters) {
      console.log(`Why it matters: ${a.whyItMatters}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Total: ${summarized.length} stories`);
}

main().catch(console.error);
