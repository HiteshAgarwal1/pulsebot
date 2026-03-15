import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runPipeline, deliverToUsers, deliverToSingleUser } from "@/lib/pipeline";

export async function POST(request: NextRequest) {
  try {
    // Check API key auth
    const apiKey = request.headers.get("x-api-trigger-key");
    let isAuthorized = apiKey === process.env.API_TRIGGER_KEY;

    // Fall back to Supabase session auth
    if (!isAuthorized) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      isAuthorized = !!user;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { user_id, date } = body as { user_id?: string; date?: string };

    // Deliver to a single user
    if (user_id) {
      const result = await deliverToSingleUser(user_id, date);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        delivered: 1,
        failed: 0,
      });
    }

    // Run pipeline and deliver to all active users
    const digest = await runPipeline(undefined, undefined, date);
    const { delivered, failed } = await deliverToUsers(digest);

    return NextResponse.json({ success: true, delivered, failed });
  } catch (error) {
    console.error("[API /trigger] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
