import Anthropic from "@anthropic-ai/sdk";
import type { ScoredArticle, SummarizedArticle, ArticleCluster } from "@/lib/types";

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

function extractFirstSentences(text: string, count: number = 2): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0, count).join(" ").trim() || text.slice(0, 200);
}

export async function summarizeArticles(
  clusters: ArticleCluster[]
): Promise<{ articles: SummarizedArticle[]; tldr: string }> {
  const client = getClient();

  if (!client) {
    // Fallback: extract first sentences
    return fallbackSummarize(clusters);
  }

  try {
    return await llmSummarize(client, clusters);
  } catch (error) {
    console.error("LLM summarization failed, falling back:", error);
    return fallbackSummarize(clusters);
  }
}

function fallbackSummarize(
  clusters: ArticleCluster[]
): { articles: SummarizedArticle[]; tldr: string } {
  const articles: SummarizedArticle[] = clusters.map((cluster) => ({
    ...cluster.primary,
    summary: extractFirstSentences(cluster.primary.description),
    whyItMatters: "Read the full article for more details.",
  }));

  const topTitles = articles.slice(0, 3).map((a) => a.title);
  const tldr = `Today's top AI stories cover: ${topTitles.join(", ")}.`;

  return { articles, tldr };
}

async function llmSummarize(
  client: Anthropic,
  clusters: ArticleCluster[]
): Promise<{ articles: SummarizedArticle[]; tldr: string }> {
  const model = process.env.LLM_MODEL || "claude-sonnet-4-20250514";

  // Build a single prompt for all articles
  const articleList = clusters
    .map(
      (c, i) =>
        `${i + 1}. Title: ${c.primary.title}\n   Source: ${c.primary.source}\n   Description: ${c.primary.description.slice(0, 500)}`
    )
    .join("\n\n");

  const response = await client.messages.create({
    model,
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are an AI news editor. Summarize these articles for a daily AI news digest.

For each article, provide:
1. A 2-3 sentence summary
2. A one-line "Why this matters" note

Also write a 2-3 sentence TL;DR overview of the day's biggest AI theme.

Articles:
${articleList}

Respond in this exact JSON format:
{
  "tldr": "...",
  "summaries": [
    {"summary": "...", "why_it_matters": "..."},
    ...
  ]
}

Return ONLY valid JSON, no other text.`,
      },
    ],
  });

  let text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Strip markdown code fences if present (Claude often wraps JSON in ```json ... ```)
  text = text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```$/, "");
  }

  const parsed = JSON.parse(text);

  const articles: SummarizedArticle[] = clusters.map((cluster, i) => ({
    ...cluster.primary,
    summary: parsed.summaries[i]?.summary || extractFirstSentences(cluster.primary.description),
    whyItMatters: parsed.summaries[i]?.why_it_matters || "Read the full article for more details.",
  }));

  return { articles, tldr: parsed.tldr };
}
