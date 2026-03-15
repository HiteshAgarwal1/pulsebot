"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { AVAILABLE_TOPICS, TIMEZONES, type UserConfig } from "@/lib/types";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon, SendIcon, SaveIcon } from "lucide-react";

type FormState = {
  slack_webhook_url: string;
  channel_name: string;
  delivery_time: string;
  timezone: string;
  top_n: number;
  is_active: boolean;
};

const DEFAULT_FORM: FormState = {
  slack_webhook_url: "",
  channel_name: "",
  delivery_time: "09:00",
  timezone: "Asia/Kolkata",
  top_n: 10,
  is_active: true,
};

export default function SettingsPage() {
  const supabase = createClient();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from("user_configs")
      .select("*")
      .eq("user_id", user.id)
      .single<UserConfig>();

    if (data) {
      setForm({
        slack_webhook_url: data.slack_webhook_url,
        channel_name: data.channel_name,
        delivery_time: data.delivery_time,
        timezone: data.timezone,
        top_n: data.top_n,
        is_active: data.is_active,
      });
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);

    // Check if config row already exists
    const { data: existing } = await supabase
      .from("user_configs")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let error;
    if (existing) {
      // Update existing row
      ({ error } = await supabase
        .from("user_configs")
        .update({
          slack_webhook_url: form.slack_webhook_url,
          channel_name: form.channel_name,
          delivery_time: form.delivery_time,
          timezone: form.timezone,
          top_n: form.top_n,
          is_active: form.is_active,
        })
        .eq("user_id", userId));
    } else {
      // Insert new row with all topics selected by default
      ({ error } = await supabase
        .from("user_configs")
        .insert({
          user_id: userId,
          slack_webhook_url: form.slack_webhook_url,
          channel_name: form.channel_name,
          delivery_time: form.delivery_time,
          timezone: form.timezone,
          top_n: form.top_n,
          is_active: form.is_active,
          topics: [...AVAILABLE_TOPICS],
        }));
    }

    setSaving(false);

    if (error) {
      toast.error("Failed to save settings", {
        description: error.message,
      });
    } else {
      // Verify the row was actually saved
      const { data: verify } = await supabase
        .from("user_configs")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (verify) {
        toast.success("Settings saved successfully");
      } else {
        toast.error("Settings may not have saved", {
          description: "The database did not return an error but the config was not found. Check your Supabase RLS policies.",
        });
      }
    }
  }

  async function handleTestWebhook() {
    if (!form.slack_webhook_url) {
      toast.error("Please enter a Slack Webhook URL first");
      return;
    }
    setTesting(true);

    try {
      const res = await fetch("/api/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhook_url: form.slack_webhook_url,
          channel_name: form.channel_name,
        }),
      });

      if (res.ok) {
        toast.success("Test message sent to Slack");
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error("Webhook test failed", {
          description: body.error || "Check the URL and try again",
        });
      }
    } catch {
      toast.error("Webhook test failed", {
        description: "Network error. Please try again.",
      });
    } finally {
      setTesting(false);
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
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your digest delivery preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Slack Integration</CardTitle>
          <CardDescription>
            Set up your Slack webhook to receive daily digests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Slack Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={form.slack_webhook_url}
                onChange={(e) =>
                  updateField("slack_webhook_url", e.target.value)
                }
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleTestWebhook}
                disabled={testing}
              >
                {testing ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SendIcon className="size-4" />
                )}
                Test
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel Name</Label>
            <Input
              id="channel-name"
              placeholder="#ai-news"
              value={form.channel_name}
              onChange={(e) => updateField("channel_name", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Schedule</CardTitle>
          <CardDescription>
            Choose when and how you receive your digest.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="delivery-time">Delivery Time</Label>
              <Input
                id="delivery-time"
                type="time"
                value={form.delivery_time}
                onChange={(e) => updateField("delivery_time", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={form.timezone}
                onValueChange={(val) => val && updateField("timezone", val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="top-n">Top N Articles</Label>
            <div className="flex items-center gap-3">
              <Input
                id="top-n"
                type="number"
                min={1}
                max={50}
                value={form.top_n}
                onChange={(e) =>
                  updateField("top_n", parseInt(e.target.value, 10) || 1)
                }
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                articles per digest
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Digest Status</CardTitle>
          <CardDescription>
            Enable or disable your daily digest delivery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-sm text-muted-foreground">
                {form.is_active
                  ? "You will receive daily digests."
                  : "Digest delivery is paused."}
              </p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => updateField("is_active", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SaveIcon className="size-4" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
