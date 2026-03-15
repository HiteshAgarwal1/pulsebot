import { NextRequest, NextResponse } from "next/server";
import { runPipeline, deliverToUsers } from "@/lib/pipeline";
import { createAdminClient } from "@/lib/supabase/admin";
import { toZonedTime, format } from "date-fns-tz";
import type { UserConfig } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    // Validate cron secret
    const secret =
      request.headers.get("x-cron-secret") ||
      request.nextUrl.searchParams.get("secret");

    if (secret !== process.env.CRON_SECRET) {
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
        matched: 0,
        delivered: 0,
        failed: 0,
      });
    }

    // Filter users whose delivery_time matches the current time in their timezone
    const matchingConfigs = (configs as UserConfig[]).filter((config) => {
      const userNow = toZonedTime(now, config.timezone);
      const currentTime = format(userNow, "HH:mm", {
        timeZone: config.timezone,
      });
      return currentTime === config.delivery_time;
    });

    if (matchingConfigs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users matched current time",
        matched: 0,
        delivered: 0,
        failed: 0,
      });
    }

    console.log(
      `[Cron] ${matchingConfigs.length} users matched for delivery at ${now.toISOString()}`
    );

    // Group users by timezone to potentially reuse digests
    const byTimezone = new Map<string, UserConfig[]>();
    for (const config of matchingConfigs) {
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
      matched: matchingConfigs.length,
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
