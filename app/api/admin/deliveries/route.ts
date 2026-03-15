import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const scope = request.nextUrl.searchParams.get("scope");
  const today = format(new Date(), "yyyy-MM-dd");

  let query = admin
    .from("delivery_logs")
    .select("*")
    .order("delivered_at", { ascending: false });

  if (scope === "today") {
    query = query.gte("delivered_at", `${today}T00:00:00`);
  }

  const { data: logs, error } = await query.limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with user emails
  const userIds = [...new Set((logs || []).map((l) => l.user_id).filter(Boolean))];
  const emailMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email")
      .in("id", userIds as string[]);

    for (const p of profiles || []) {
      emailMap[p.id] = p.email;
    }
  }

  const deliveries = (logs || []).map((log) => ({
    id: log.id,
    user_id: log.user_id,
    user_email: log.user_id ? emailMap[log.user_id] ?? null : null,
    delivered_at: log.delivered_at,
    article_count: log.article_count,
    status: log.status,
    error_message: log.error_message,
  }));

  return NextResponse.json({ deliveries });
}
