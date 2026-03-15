import { readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { join } from "path";
import type { RawArticle, ScoredArticle } from "@/lib/types";
import { normalizeUrl } from "./deduplicator";

interface TierConfig {
  tiers: Record<
    string,
    { label: string; score_multiplier: number; sources: string[] }
  >;
}

// AI-related keywords for relevance scoring
const AI_KEYWORDS = [
  "artificial intelligence",
  "machine learning",
  "deep learning",
  "neural network",
  "llm",
  "large language model",
  "gpt",
  "gpt-4",
  "gpt-5",
  "o1",
  "o3",
  "o4-mini",
  "claude",
  "claude 4",
  "claude opus",
  "claude sonnet",
  "gemini",
  "gemini 2",
  "gemini ultra",
  "transformer",
  "diffusion model",
  "generative ai",
  "gen ai",
  "computer vision",
  "nlp",
  "natural language",
  "robotics",
  "autonomous",
  "ai safety",
  "alignment",
  "reinforcement learning",
  "foundation model",
  "open source ai",
  "hugging face",
  "openai",
  "anthropic",
  "deepmind",
  "google ai",
  "meta ai",
  "mistral",
  "llama",
  "llama 4",
  "phi-4",
  "copilot",
  "ai agent",
  "ai model",
  "new model",
  "model release",
  "benchmark",
  "multimodal",
  "reasoning model",
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  LLMs: ["llm", "large language model", "gpt", "gpt-4", "gpt-5", "o1", "o3", "o4-mini", "claude", "claude 4", "gemini", "chatbot", "transformer", "foundation model", "mistral", "llama", "phi-4", "reasoning model", "ai model", "new model", "model release", "benchmark"],
  "Computer Vision": ["computer vision", "image recognition", "diffusion", "stable diffusion", "midjourney", "dall-e", "image generation", "video generation", "sora"],
  Robotics: ["robot", "robotics", "autonomous", "self-driving", "drone", "humanoid"],
  "AI Policy & Regulation": ["regulation", "policy", "eu ai act", "governance", "ethics", "ban", "legislation", "congress", "senate"],
  "Funding & Acquisitions": ["funding", "raised", "valuation", "acquisition", "acquired", "series a", "series b", "ipo", "investment", "billion", "million"],
  "Research Papers": ["paper", "research", "arxiv", "study", "findings", "researchers", "published"],
  "Open Source": ["open source", "open-source", "github", "hugging face", "weights", "model release", "apache", "mit license"],
  "AI Safety": ["safety", "alignment", "existential risk", "agi", "superintelligence", "guardrails", "red team", "jailbreak"],
  "AI Tools & Products": ["launch", "product", "tool", "api", "platform", "feature", "release", "app", "plugin", "integration"],
};

function loadTierConfig(): TierConfig {
  const configPath = join(process.cwd(), "config", "source-tiers.yaml");
  const raw = readFileSync(configPath, "utf-8");
  return parseYaml(raw) as TierConfig;
}

function getSourceMultiplier(source: string, tierConfig: TierConfig): number {
  for (const [, tier] of Object.entries(tierConfig.tiers)) {
    if (tier.sources.includes(source)) {
      return tier.score_multiplier;
    }
  }
  return 1.0; // Default tier 3
}

function calculateRelevanceScore(article: RawArticle): number {
  const text = `${article.title} ${article.description}`.toLowerCase();
  let score = 0;

  for (const keyword of AI_KEYWORDS) {
    if (text.includes(keyword)) {
      score += 1;
    }
  }

  // Normalize to 0-1 range
  return Math.min(score / 5, 1);
}

function calculateRecencyScore(article: RawArticle): number {
  if (!article.publishedAt) return 0.5;
  const hour = article.publishedAt.getHours();
  // Later in the day = higher score (catching late-breaking news)
  return hour / 24;
}

function categorizeArticle(article: RawArticle): string[] {
  const text = `${article.title} ${article.description}`.toLowerCase();
  const categories: string[] = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        categories.push(category);
        break;
      }
    }
  }

  return categories.length > 0 ? categories : ["AI Tools & Products"];
}

export function scoreArticles(articles: RawArticle[]): ScoredArticle[] {
  const tierConfig = loadTierConfig();

  return articles
    .map((article) => {
      const sourceMultiplier = getSourceMultiplier(article.source, tierConfig);
      const relevance = calculateRelevanceScore(article);
      const recency = calculateRecencyScore(article);

      // Weighted score
      const score =
        relevance * 0.5 * sourceMultiplier +
        recency * 0.2 * sourceMultiplier +
        (1 / article.tier) * 0.3;

      return {
        ...article,
        score,
        normalizedUrl: normalizeUrl(article.url),
        categories: categorizeArticle(article),
      };
    })
    .filter((a) => calculateRelevanceScore(a) > 0.1) // Filter out irrelevant articles
    .sort((a, b) => b.score - a.score);
}
