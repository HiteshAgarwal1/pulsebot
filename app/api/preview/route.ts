import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runPipeline } from "@/lib/pipeline";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { timezone, top_n, date } = body as {
      timezone?: string;
      top_n?: number;
      date?: string; // "YYYY-MM-DD" for past dates
    };

    // Check if user has a config to use their defaults
    let effectiveTimezone = timezone;
    let effectiveTopN = top_n;

    if (!effectiveTimezone || !effectiveTopN) {
      const { data: config } = await supabase
        .from("user_configs")
        .select("timezone, top_n")
        .eq("user_id", user.id)
        .single();

      if (config) {
        effectiveTimezone = effectiveTimezone || config.timezone;
        effectiveTopN = effectiveTopN || config.top_n;
      }
    }

    const digest = await runPipeline(
      effectiveTimezone || "Asia/Kolkata",
      effectiveTopN,
      date
    );

    return NextResponse.json(digest);
  } catch (error) {
    console.error("[API /preview] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
