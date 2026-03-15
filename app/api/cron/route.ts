import { NextRequest, NextResponse } from "next/server";
import { runPipeline, deliverToUsers } from "@/lib/pipeline";
import { createAdminClient } from "@/lib/supabase/admin";
import { toZonedTime, format } from "date-fns-tz";
import type { UserConfig } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    // Validate cron secret (supports Vercel Cron header and custom secret)
    const isVercelCron =
      request.headers.get("authorization") ===
      `Bearer ${process.env.CRON_SECRET}`;
    const isCustomSecret =
      (request.headers.get("x-cron-secret") ||
        request.nextUrl.searchParams.get("secret")) ===
      process.env.CRON_SECRET;

    if (!isVercelCron && !isCustomSecret) {
      const received = request.nextUrl.searchParams.get("secret") || "";
      const expected = process.env.CRON_SECRET || "";
      console.log("[Cron] Auth failed");
      console.log("[Cron] Received length:", received.length, "Expected length:", expected.length);
      console.log("[Cron] Match:", received === expected);
      console.log("[Cron] Received (first 8):", JSON.stringify(received.slice(0, 8)));
      console.log("[Cron] Expected (first 8):", JSON.stringify(expected.slice(0, 8)));
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date();

    // Get all active user configs
    const { data: configs, error } = await supabase
      .from("user_configs")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("[Cron] Failed to fetch user configs:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch user configs" },
        { status: 500 }
      );
    }

    if (!configs || configs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active users",
        pending: 0,
        delivered: 0,
        failed: 0,
      });
    }

    // Find users whose delivery_time has passed today but haven't been delivered yet
    const pendingConfigs: UserConfig[] = [];

    for (const config of configs as UserConfig[]) {
      const userNow = toZonedTime(now, config.timezone);
      const currentTime = format(userNow, "HH:mm", { timeZone: config.timezone });
      const todayStr = format(userNow, "yyyy-MM-dd", { timeZone: config.timezone });

      // Check if delivery time has passed today in user's timezone
      if (currentTime < config.delivery_time) continue;

      // Check if already delivered today (using user's local date)
      const dayStart = new Date(`${todayStr}T00:00:00`);
      const dayStartUTC = new Date(
        dayStart.getTime() - getTimezoneOffsetMs(now, config.timezone)
      );

      const { data: todayLog } = await supabase
        .from("delivery_logs")
        .select("id")
        .eq("user_id", config.user_id)
        .eq("status", "success")
        .gte("delivered_at", dayStartUTC.toISOString())
        .limit(1)
        .maybeSingle();

      if (!todayLog) {
        pendingConfigs.push(config);
      }
    }

    if (pendingConfigs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending deliveries",
        pending: 0,
        delivered: 0,
        failed: 0,
      });
    }

    console.log(
      `[Cron] ${pendingConfigs.length} pending deliveries at ${now.toISOString()}`
    );

    // Group users by timezone to reuse digests
    const byTimezone = new Map<string, UserConfig[]>();
    for (const config of pendingConfigs) {
      const existing = byTimezone.get(config.timezone) || [];
      existing.push(config);
      byTimezone.set(config.timezone, existing);
    }

    let totalDelivered = 0;
    let totalFailed = 0;

    for (const [timezone, users] of byTimezone) {
      console.log(
        `[Cron] Running pipeline for timezone ${timezone} (${users.length} users)`
      );

      try {
        const digest = await runPipeline(timezone);
        const { delivered, failed } = await deliverToUsers(digest, users);
        totalDelivered += delivered;
        totalFailed += failed;

        console.log(
          `[Cron] Timezone ${timezone}: delivered=${delivered}, failed=${failed}`
        );
      } catch (err) {
        console.error(`[Cron] Pipeline failed for timezone ${timezone}:`, err);
        totalFailed += users.length;
      }
    }

    const summary = {
      success: true,
      pending: pendingConfigs.length,
      delivered: totalDelivered,
      failed: totalFailed,
      timezones: Array.from(byTimezone.keys()),
      timestamp: now.toISOString(),
    };

    console.log("[Cron] Complete:", summary);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[Cron] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// Get the timezone offset in milliseconds for a given date and timezone
function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = date.toLocaleString("en-US", { timeZone: timezone });
  return new Date(tzStr).getTime() - new Date(utcStr).getTime();
}
