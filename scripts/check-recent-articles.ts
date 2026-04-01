import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, url, source, score, categories, published_at, fetched_at")
    .gte("fetched_at", tenDaysAgo.toISOString())
    .order("fetched_at", { ascending: false });

  if (error) {
    console.error("Error fetching articles:", error.message);
    process.exit(1);
  }

  console.log(`\n=== Articles from last 10 days: ${articles.length} total ===\n`);

  // Group by source
  const bySource: Record<string, typeof articles> = {};
  for (const a of articles) {
    const src = a.source || "Unknown";
    if (!bySource[src]) bySource[src] = [];
    bySource[src].push(a);
  }

  for (const [source, items] of Object.entries(bySource).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n--- ${source} (${items.length} articles) ---`);
    for (const a of items) {
      const score = a.score != null ? a.score.toFixed(1) : "N/A";
      const cats = a.categories?.join(", ") || "none";
      console.log(`  [score: ${score}] ${a.title}`);
      console.log(`    url: ${a.url}`);
      console.log(`    categories: ${cats} | published: ${a.published_at || "N/A"}`);
    }
  }

  // Summary stats
  const scores = articles.filter((a) => a.score != null).map((a) => a.score!);
  const noScore = articles.filter((a) => a.score == null).length;
  const noCats = articles.filter((a) => !a.categories?.length).length;
  const noTitle = articles.filter((a) => !a.title || a.title.trim() === "").length;

  console.log(`\n=== Summary ===`);
  console.log(`Total articles: ${articles.length}`);
  console.log(`Score range: ${scores.length ? `${Math.min(...scores).toFixed(1)} - ${Math.max(...scores).toFixed(1)}` : "N/A"}`);
  console.log(`Avg score: ${scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : "N/A"}`);
  console.log(`Articles with no score: ${noScore}`);
  console.log(`Articles with no categories: ${noCats}`);
  console.log(`Articles with no/empty title: ${noTitle}`);
  console.log(`Unique sources: ${Object.keys(bySource).length}`);

  // Flag potentially low-quality articles
  const suspicious = articles.filter((a) => {
    const lowScore = a.score != null && a.score < 3;
    const emptyTitle = !a.title || a.title.trim() === "";
    const tooShortTitle = a.title && a.title.length < 15;
    const noUrl = !a.url;
    return lowScore || emptyTitle || tooShortTitle || noUrl;
  });

  if (suspicious.length > 0) {
    console.log(`\n=== Potentially Low-Quality Articles (${suspicious.length}) ===`);
    for (const a of suspicious) {
      console.log(`  [score: ${a.score ?? "N/A"}] "${a.title}" — ${a.source} — ${a.url}`);
    }
  }
}

main();
