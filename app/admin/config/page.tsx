"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { PlayIcon, Loader2Icon, CheckCircleIcon, XCircleIcon } from "lucide-react";

const FEEDS = [
  { name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", tier: 1 },
  { name: "The Verge AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", tier: 1 },
  { name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", tier: 1 },
  { name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/", tier: 1 },
  { name: "Ars Technica AI", url: "https://feeds.arstechnica.com/arstechnica/technology-lab", tier: 2 },
  { name: "Wired AI", url: "https://www.wired.com/feed/tag/ai/latest/rss", tier: 1 },
  { name: "OpenAI Blog", url: "https://openai.com/blog/rss.xml", tier: 1 },
  { name: "Google AI Blog", url: "https://blog.google/technology/ai/rss/", tier: 1 },
  { name: "Anthropic Blog", url: "https://www.anthropic.com/rss.xml", tier: 1 },
  { name: "DeepMind Blog", url: "https://deepmind.google/blog/rss.xml", tier: 1 },
  { name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml", tier: 2 },
  { name: "Hacker News AI", url: "https://hnrss.org/newest?q=AI+OR+LLM+OR+machine+learning&points=50", tier: 2 },
  { name: "ArXiv AI", url: "http://arxiv.org/rss/cs.AI", tier: 2 },
];

const CONFIG_ITEMS = [
  { key: "DEFAULT_TOP_N", value: "10", description: "Default number of articles per digest" },
  { key: "DEDUP_THRESHOLD", value: "0.7", description: "Similarity threshold for deduplication" },
  { key: "LLM_MODEL", value: "gpt-4o-mini", description: "Model used for summarization" },
];

export default function ConfigPage() {
  const [pipelineStatus, setPipelineStatus] = useState<
    "idle" | "running" | "success" | "error"
  >("idle");
  const [pipelineMessage, setPipelineMessage] = useState("");

  async function triggerPipeline() {
    setPipelineStatus("running");
    setPipelineMessage("");
    try {
      const res = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPipelineStatus("success");
        setPipelineMessage(
          `Delivered: ${data.delivered}, Failed: ${data.failed}`
        );
      } else {
        setPipelineStatus("error");
        setPipelineMessage(data.error || "Pipeline failed");
      }
    } catch (err) {
      setPipelineStatus("error");
      setPipelineMessage(
        err instanceof Error ? err.message : "Network error"
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuration</h1>
        <p className="text-muted-foreground">
          System settings and pipeline controls
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Control</CardTitle>
          <CardDescription>
            Manually trigger the full pipeline: fetch, score, summarize, and
            deliver to all active users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={triggerPipeline}
            disabled={pipelineStatus === "running"}
            size="lg"
          >
            {pipelineStatus === "running" ? (
              <Loader2Icon className="size-4 mr-2 animate-spin" />
            ) : (
              <PlayIcon className="size-4 mr-2" />
            )}
            {pipelineStatus === "running"
              ? "Running Pipeline..."
              : "Trigger Pipeline Now"}
          </Button>

          {pipelineStatus === "success" && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircleIcon className="size-4" />
              {pipelineMessage}
            </div>
          )}
          {pipelineStatus === "error" && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <XCircleIcon className="size-4" />
              {pipelineMessage}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Config</CardTitle>
          <CardDescription>
            Current configuration values (read-only, set via environment
            variables)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CONFIG_ITEMS.map((item) => (
                  <TableRow key={item.key}>
                    <TableCell className="font-mono text-xs">
                      {item.key}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.value}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feed Sources</CardTitle>
          <CardDescription>
            Configured RSS/Atom feeds (read-only, edit config/feeds.yaml)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Tier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FEEDS.map((feed) => (
                  <TableRow key={feed.name}>
                    <TableCell className="font-medium">{feed.name}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground font-mono">
                      {feed.url}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={feed.tier === 1 ? "default" : "secondary"}
                      >
                        Tier {feed.tier}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
