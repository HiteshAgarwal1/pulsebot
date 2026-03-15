import type { ScoredArticle, ArticleCluster } from "@/lib/types";

// Simple keyword-based clustering
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

function similarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  return intersection.size / union.size; // Jaccard similarity
}

export function clusterArticles(
  articles: ScoredArticle[],
  topN: number = 10
): ArticleCluster[] {
  if (articles.length === 0) return [];

  const keywords = articles.map((a) =>
    extractKeywords(`${a.title} ${a.description}`)
  );

  const clusters: ArticleCluster[] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < articles.length; i++) {
    if (assigned.has(i)) continue;

    const cluster: ArticleCluster = {
      primary: articles[i],
      related: [],
    };
    assigned.add(i);

    for (let j = i + 1; j < articles.length; j++) {
      if (assigned.has(j)) continue;

      const sim = similarity(keywords[i], keywords[j]);
      if (sim > 0.3) {
        cluster.related.push(articles[j]);
        assigned.add(j);
      }
    }

    clusters.push(cluster);
  }

  // Sort clusters by primary article score, take top N
  return clusters
    .sort((a, b) => b.primary.score - a.primary.score)
    .slice(0, topN);
}
