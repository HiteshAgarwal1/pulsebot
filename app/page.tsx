import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div className="max-w-2xl mx-auto text-center px-4">
        <div className="text-6xl mb-6">📡</div>
        <h1 className="text-4xl font-bold mb-4">Pulsebot</h1>
        <p className="text-xl text-muted-foreground mb-8">
          AI News Daily Reporter — Get a curated digest of the most important
          AI/ML news delivered to your Slack channel every day.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-lg border bg-card">
            <div className="text-2xl mb-2">🔍</div>
            <h3 className="font-semibold mb-1">Smart Aggregation</h3>
            <p className="text-sm text-muted-foreground">
              Monitors 14+ top AI sources, deduplicates stories, and ranks by
              relevance.
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <div className="text-2xl mb-2">🤖</div>
            <h3 className="font-semibold mb-1">AI Summaries</h3>
            <p className="text-sm text-muted-foreground">
              Claude-powered summaries and &quot;Why this matters&quot; notes
              for each article.
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <div className="text-2xl mb-2">💬</div>
            <h3 className="font-semibold mb-1">Slack Delivery</h3>
            <p className="text-sm text-muted-foreground">
              Beautifully formatted digests delivered to your Slack at your
              preferred time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
