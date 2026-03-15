"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { AVAILABLE_TOPICS, type Topic, type UserConfig } from "@/lib/types";
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
import { Loader2Icon, SaveIcon, CheckIcon } from "lucide-react";

export default function TopicsPage() {
  const supabase = createClient();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadTopics = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from("user_configs")
      .select("topics")
      .eq("user_id", user.id)
      .single<Pick<UserConfig, "topics">>();

    if (data?.topics) {
      setSelected(new Set(data.topics));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  function toggleTopic(topic: Topic) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);

    // Check if config row exists
    const { data: existing } = await supabase
      .from("user_configs")
      .select("id")
      .eq("user_id", userId)
      .single();

    let error;
    if (existing) {
      // Update existing row
      ({ error } = await supabase
        .from("user_configs")
        .update({ topics: Array.from(selected) })
        .eq("user_id", userId));
    } else {
      // Insert new row with defaults
      ({ error } = await supabase
        .from("user_configs")
        .insert({
          user_id: userId,
          slack_webhook_url: "",
          topics: Array.from(selected),
        }));
    }

    setSaving(false);

    if (error) {
      toast.error("Failed to save topics", {
        description: error.message,
      });
    } else {
      toast.success("Topics updated successfully");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Topics</h1>
        <p className="text-muted-foreground">
          Select the AI topics you want to follow. Your digest will be tailored
          to these interests.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Topics</CardTitle>
          <CardDescription>
            Click a topic to toggle it. Selected topics are highlighted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TOPICS.map((topic) => {
              const isSelected = selected.has(topic);
              return (
                <button
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className={`
                    inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium
                    transition-colors cursor-pointer select-none
                    ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  `}
                >
                  {isSelected && <CheckIcon className="size-3.5" />}
                  {topic}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selected.size} of {AVAILABLE_TOPICS.length} topics selected
        </p>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SaveIcon className="size-4" />
          )}
          Save Topics
        </Button>
      </div>
    </div>
  );
}
