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
  "chatgpt",
  "claude",
  "claude 4",
  "claude opus",
  "claude sonnet",
  "claude code",
  "gemini",
  "gemini 2",
  "gemini ultra",
  "qwen",
  "qwen 3",
  "deepseek",
  "deepseek r1",
  "grok",
  "xai",
  "cohere",
  "command r",
  "stability ai",
  "stable diffusion",
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
  LLMs: ["llm", "large language model", "gpt", "gpt-4", "gpt-5", "o1", "o3", "o4-mini", "chatgpt", "claude", "claude 4", "claude code", "gemini", "chatbot", "transformer", "foundation model", "mistral", "llama", "phi-4", "qwen", "deepseek", "grok", "cohere", "command r", "reasoning model", "ai model", "new model", "model release", "benchmark"],
  "Computer Vision": ["computer vision", "image recognition", "object detection", "segmentation", "vision model", "image classification"],
  Robotics: ["robot", "robotics", "autonomous vehicle", "self-driving", "drone", "humanoid", "manipulation"],
  "AI Policy & Regulation": ["regulation", "policy", "eu ai act", "governance", "ethics", "ban", "legislation", "congress", "senate", "lawsuit", "copyright"],
  "Funding & Acquisitions": ["funding", "raised", "valuation", "acquisition", "acquired", "series a", "series b", "series c", "ipo", "investment", "funding round", "venture"],
  "Research Papers": ["paper", "arxiv", "preprint", "findings", "researchers", "published study", "peer-reviewed"],
  "Open Source": ["open source", "open-source", "open weights", "hugging face", "apache license", "mit license", "permissive license"],
  "AI Safety": ["ai safety", "alignment", "existential risk", "agi", "superintelligence", "guardrail", "red team", "jailbreak", "model evaluation", "deceptive"],
  "AI Tools & Products": ["ide", "plugin", "extension", "developer tool", "api release", "sdk", "no-code", "low-code", "workflow automation"],
  "AI Agents": ["ai agent", "agentic", "autonomous agent", "multi-agent", "agent framework", "browser agent", "coding agent", "tool use", "function calling"],
  "AI in Healthcare": ["healthcare", "medical ai", "medicine", "diagnosis", "clinical", "patient", "drug discovery", "biotech", "radiology", "pathology", "ehr"],
  "Generative Media": ["image generation", "video generation", "sora", "midjourney", "dall-e", "stable diffusion", "diffusion model", "audio generation", "music generation", "voice cloning", "text-to-image", "text-to-video", "text-to-audio", "deepfake"],
  "AI Startups": ["startup", "founded", "y combinator", " yc ", "pre-seed", "seed round", "stealth mode", "founder"],
  "Multimodal AI": ["multimodal", "vision-language", "vlm", "audio-visual", "cross-modal", "omni model"],
  "AI for Marketing": ["marketing", "customer engagement", "personalization", "recommendation engine", "crm", "marketing automation", "lead generation"],
  "AI Advertising": ["advertising", "ad tech", "adtech", "advertisement", "programmatic ads", "ad targeting", "ad creative"],
  "AI Content Creation": ["content creation", "content generation", "creator economy", "writing assistant", "copywriting", "blog generation", "seo content", "social media content"],
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

  return categories;
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
    .filter((a) => {
      const relevance = calculateRelevanceScore(a);
      // ArXiv papers need higher relevance to pass — filters out niche academic papers
      const minRelevance = a.source === "ArXiv AI" ? 0.4 : 0.2;
      return relevance > minRelevance;
    })
    .sort((a, b) => b.score - a.score);
}
