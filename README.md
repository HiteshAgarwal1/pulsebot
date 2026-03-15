# Pulsebot

AI News Daily Reporter — a curated digest of the most important AI/ML news delivered to your Slack channel every day.

## Features

- **Smart Aggregation** — monitors 13+ top AI sources (TechCrunch, The Verge, MIT Tech Review, OpenAI, Anthropic, DeepMind, etc.), deduplicates stories, and ranks by relevance
- **AI Summaries** — Claude-powered summaries and "Why this matters" notes for each article
- **Slack Delivery** — beautifully formatted digests delivered to your Slack at your preferred time
- **Per-User Customization** — choose topics, delivery time, timezone, and number of articles
- **Admin Panel** — manage users, view deliveries, articles, digests, and system config
- **Topic Filtering** — 17 AI/ML topics to follow (LLMs, AI Agents, Robotics, Generative Media, etc.)

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui
- **Backend:** Next.js API routes, Supabase (auth + database)
- **AI:** Anthropic Claude (article summarization)
- **Delivery:** Slack Webhooks
- **Cron:** External cron service (cron-job.org) hitting `/api/cron`

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project
- An Anthropic API key
- A Slack webhook URL

### Setup

1. Clone the repo and install dependencies:

```bash
git clone https://github.com/HiteshAgarwal1/pulsebot.git
cd pulsebot
npm install
```

2. Copy the env file and fill in your values:

```bash
cp .env.example .env
```

3. Run Supabase migrations (in your Supabase dashboard SQL editor, run the files in `supabase/migrations/` in order).

4. Start the dev server:

```bash
npm run dev
```

### Environment Variables

See `.env.example` for all required variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `CRON_SECRET` | Secret to authenticate cron requests |
| `ADMIN_EMAIL` | Email for the admin account |

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### Cron Setup

The digest pipeline runs via `/api/cron` endpoint. Set up [cron-job.org](https://cron-job.org) (free) to hit:

```
GET https://your-domain.com/api/cron?secret=YOUR_CRON_SECRET
```

Schedule: every 1 minute. The endpoint checks each user's delivery time in their timezone and only delivers when it matches.

### Docker (Alternative)

```bash
docker compose up -d
```

## Feed Configuration

Feed sources are configured in `config/feeds.yaml`. Sources are tiered (Tier 1–3) with different scoring multipliers defined in `config/source-tiers.yaml`.

## Database Schema

- **profiles** — user profiles with roles
- **user_configs** — per-user settings (webhook, topics, schedule)
- **articles** — deduplicated article cache
- **daily_digests** — cached daily digests (one LLM call per day)
- **delivery_logs** — delivery history and status

## Pipeline

The pipeline runs once per day (per timezone) and caches results:

1. **Fetch** — pull articles from RSS feeds
2. **Deduplicate** — remove duplicate stories across sources
3. **Score & Rank** — score by source tier and relevance
4. **Cluster** — group related articles
5. **Summarize** — Claude generates summaries and TL;DR
6. **Deliver** — filter by user topics and send to Slack

Subsequent users on the same day get the cached digest — no extra API calls.

## License

This project is licensed under the [GNU AGPLv3](LICENSE) — free to use, modify, and share, but not for commercial use without open-sourcing your changes.
