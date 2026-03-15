import Fuse from "fuse.js";
import type { RawArticle } from "@/lib/types";

const DEDUP_THRESHOLD = parseFloat(
  process.env.DEDUP_THRESHOLD || "0.85"
);

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove tracking params
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "ref",
      "source",
      "fbclid",
      "gclid",
    ];
    trackingParams.forEach((p) => u.searchParams.delete(p));
    // Remove trailing slash
    let path = u.pathname.replace(/\/+$/, "");
    if (!path) path = "/";
    return `${u.hostname}${path}${u.search}`.toLowerCase();
  } catch {
    return url.toLowerCase().replace(/\/+$/, "");
  }
}

export function deduplicateArticles(articles: RawArticle[]): RawArticle[] {
  if (articles.length === 0) return [];

  // First pass: deduplicate by normalized URL
  const urlMap = new Map<string, RawArticle>();
  for (const article of articles) {
    const normalized = normalizeUrl(article.url);
    const existing = urlMap.get(normalized);
    if (!existing || article.tier < existing.tier) {
      urlMap.set(normalized, article);
    }
  }

  const urlDeduped = Array.from(urlMap.values());

  // Second pass: fuzzy title matching
  const fuse = new Fuse(urlDeduped, {
    keys: ["title"],
    threshold: 1 - DEDUP_THRESHOLD, // Fuse threshold is inverted (0 = exact match)
    includeScore: true,
  });

  const seen = new Set<number>();
  const result: RawArticle[] = [];

  for (let i = 0; i < urlDeduped.length; i++) {
    if (seen.has(i)) continue;

    const article = urlDeduped[i];
    const matches = fuse.search(article.title);

    // Mark all similar articles as seen, keep the one with best tier
    let best = article;
    let bestIdx = i;

    for (const match of matches) {
      const matchIdx = urlDeduped.indexOf(match.item);
      if (matchIdx === i || seen.has(matchIdx)) continue;

      if (match.item.tier < best.tier) {
        best = match.item;
        seen.add(bestIdx);
        bestIdx = matchIdx;
      } else {
        seen.add(matchIdx);
      }
    }

    seen.add(bestIdx);
    result.push(best);
  }

  return result;
}
