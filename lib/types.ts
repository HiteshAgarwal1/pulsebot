export interface FeedConfig {
  name: string;
  url: string;
  tier: number;
}

export interface RawArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: Date | null;
  description: string;
  tier: number;
}

export interface ScoredArticle extends RawArticle {
  score: number;
  normalizedUrl: string;
  categories: string[];
}

export interface SummarizedArticle extends ScoredArticle {
  summary: string;
  whyItMatters: string;
}

export interface ArticleCluster {
  primary: ScoredArticle;
  related: ScoredArticle[];
}

export interface DigestResult {
  tldr: string;
  articles: SummarizedArticle[];
  categoriesCovered: string[];
  date: string;
}

export interface UserConfig {
  id: string;
  user_id: string;
  slack_webhook_url: string;
  channel_name: string;
  delivery_time: string;
  timezone: string;
  top_n: number;
  topics: string[];
  is_active: boolean;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: "user" | "admin";
  created_at: string;
  updated_at: string;
}

export interface DeliveryLog {
  id: string;
  user_id: string | null;
  delivered_at: string;
  article_count: number | null;
  status: "success" | "failed" | "retrying";
  error_message: string | null;
  digest_snapshot: DigestResult | null;
}

export interface DailyDigest {
  id: string;
  digest_date: string;
  tldr: string | null;
  articles: unknown;
  categories_covered: string[] | null;
  created_at: string;
}

export const AVAILABLE_TOPICS = [
  "LLMs",
  "Computer Vision",
  "Robotics",
  "AI Policy & Regulation",
  "Funding & Acquisitions",
  "Research Papers",
  "Open Source",
  "AI Safety",
  "AI Tools & Products",
] as const;

export type Topic = (typeof AVAILABLE_TOPICS)[number];

export const TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
] as const;
