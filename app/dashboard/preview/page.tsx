"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DigestResult, SummarizedArticle } from "@/lib/types";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2Icon,
  SparklesIcon,
  SendIcon,
  ExternalLinkIcon,
  NewspaperIcon,
} from "lucide-react";

function ArticleCard({ article }: { article: SummarizedArticle }) {
  return (
    <div className="rounded-md border bg-background p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-tight">{article.title}</h3>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <ExternalLinkIcon className="size-3.5" />
        </a>
      </div>
      <p className="text-xs text-muted-foreground">
        {article.source}
        {article.publishedAt &&
          ` - ${new Date(article.publishedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}`}
      </p>
      <p className="text-sm text-foreground/80">{article.summary}</p>
      {article.whyItMatters && (
        <p className="text-xs text-muted-foreground italic">
          Why it matters: {article.whyItMatters}
        </p>
      )}
      <div className="flex flex-wrap gap-1 pt-1">
        {article.categories.map((cat) => (
          <Badge key={cat} variant="outline" className="text-xs">
            {cat}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export default function PreviewPage() {
  const supabase = createClient();

  const [digest, setDigest] = useState<DigestResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getYesterdayDate());

  async function handleGenerate() {
    setGenerating(true);
    setDigest(null);

    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error("Failed to generate preview", {
          description: body.error || "Please try again",
        });
        return;
      }

      const data: DigestResult = await res.json();
      setDigest(data);
      toast.success("Preview generated successfully");
    } catch {
      toast.error("Failed to generate preview", {
        description: "Network error. Please try again.",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleSendToSlack() {
    setSending(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Not authenticated");
        setSending(false);
        return;
      }

      // Check if user has a webhook configured
      const { data: config } = await supabase
        .from("user_configs")
        .select("slack_webhook_url")
        .eq("user_id", user.id)
        .single();

      if (!config?.slack_webhook_url) {
        toast.error("No Slack webhook URL configured", {
          description: "Go to Settings and add your webhook URL first.",
        });
        setSending(false);
        return;
      }

      const res = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, date: selectedDate }),
      });

      if (res.ok) {
        toast.success("Digest sent to Slack");
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error("Failed to send digest", {
          description: body.error || "Check your webhook settings",
        });
      }
    } catch {
      toast.error("Failed to send digest", {
        description: "Network error. Please try again.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Preview Digest</h1>
        <p className="text-muted-foreground">
          Generate a preview of your next AI news digest and optionally send it
          to Slack.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="digest-date" className="text-sm font-medium">
            Date
          </label>
          <input
            id="digest-date"
            type="date"
            value={selectedDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SparklesIcon className="size-4" />
          )}
          Generate Preview
        </Button>

        {digest && (
          <Button
            variant="outline"
            onClick={handleSendToSlack}
            disabled={sending}
          >
            {sending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SendIcon className="size-4" />
            )}
            Send to Slack
          </Button>
        )}
      </div>

      {generating && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Generating your digest preview. This may take a moment...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {digest && !generating && (
        <div className="space-y-4">
          {/* Slack-style preview container */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-center gap-2">
                <NewspaperIcon className="size-5 text-primary" />
                <CardTitle className="text-base">
                  Pulsebot AI Digest - {digest.date}
                </CardTitle>
              </div>
              <CardDescription className="text-sm">
                {digest.tldr}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {digest.categoriesCovered.map((cat) => (
                  <Badge key={cat} variant="secondary" className="text-xs">
                    {cat}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {digest.articles.length} articles
              </p>
            </CardContent>
          </Card>

          <Separator />

          <h2 className="text-lg font-semibold">Articles</h2>

          <div className="grid gap-3">
            {digest.articles.map((article, i) => (
              <ArticleCard key={i} article={article} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
