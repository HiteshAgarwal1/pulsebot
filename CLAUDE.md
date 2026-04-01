# Pulsebot

AI News Daily Reporter — fetches, scores, summarizes, and delivers AI/ML news digests to Slack.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4, shadcn/ui (base-ui primitives), Inter font
- **Auth & DB:** Supabase (auth, Postgres, RLS)
- **AI:** Anthropic Claude (article summarization)
- **Delivery:** Slack Webhooks
- **Deployment:** Vercel (production), cron-job.org (scheduled triggers)

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
```

## Project Structure

```
app/
  (auth)/          # Login, signup (public)
  dashboard/       # User-facing pages (settings, topics, history, preview)
  admin/           # Admin panel (users, deliveries, articles, digests, config, logs)
  api/
    cron/          # Cron endpoint — finds pending users and delivers
    preview/       # Preview digest for current user
    auth/          # Auth callbacks
    admin/         # Admin API routes
lib/
  pipeline.ts      # Main pipeline orchestrator (fetch → dedup → score → cluster → summarize → deliver)
  pipeline/        # Pipeline stages (fetcher, deduplicator, scorer, clusterer, summarizer, formatter, deliver)
  supabase/        # Supabase clients (client, server, admin)
  types.ts         # Shared types, AVAILABLE_TOPICS, TIMEZONES
config/
  feeds.yaml       # RSS feed sources (tiered, all verified working)
  source-tiers.yaml # Score multipliers per tier
scripts/
  check-recent-articles.ts  # Query recent articles from DB for quality review
  generate-digest.ts        # Generate a digest locally (bypasses cache)
supabase/
  migrations/      # Database schema
```

## Key Architecture Decisions

- **Pipeline runs once per day per timezone**, cached in `daily_digests` table. No duplicate LLM calls.
- **Cron is catch-up based:** every run checks which users' delivery_time has passed today but haven't been delivered yet. Safe with any cron interval.
- **Topics filter at delivery time**, not at pipeline level. All articles are fetched/summarized, then filtered per-user.
- **New users get all topics selected by default** when their config is first created.
- **Theme stored in localStorage** (`pulsebot-theme`), default light.
- **Auth cookies refreshed in middleware** — redirects carry refreshed cookies to prevent session expiry.
- **ArXiv articles have a higher relevance threshold** (0.4 vs 0.2) to filter out niche academic papers.
- **All RSS feed URLs must be verified** before adding to `feeds.yaml` — many AI lab blogs don't offer RSS. Use `scripts/check-recent-articles.ts` to audit article quality.

## Database Tables

- `profiles` — user profiles with role (user/admin)
- `user_configs` — per-user settings (webhook, topics, schedule, timezone)
- `articles` — deduplicated article cache (unique on URL)
- `daily_digests` — one per day, cached pipeline output
- `delivery_logs` — per-user delivery history with status

## Environment Variables

See `.env.example`. Key ones: Supabase credentials, `ANTHROPIC_API_KEY`, `CRON_SECRET`, `ADMIN_EMAIL`.

## Deployment Notes

- Vercel auto-deploys on push to `main`
- cron-job.org hits `/api/cron?secret=<CRON_SECRET>` every 5 minutes
- Env vars must be trimmed (no trailing newlines) when adding to Vercel
- `output: "standalone"` in next.config.ts for Docker support
