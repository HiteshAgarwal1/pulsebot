import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const params = request.nextUrl.searchParams;
  const q = params.get("q") || "";
  const date = params.get("date") || "";
  const sort = params.get("sort") || "desc";

  let query = admin
    .from("articles")
    .select("*")
    .order("score", { ascending: sort === "asc", nullsFirst: false })
    .limit(100);

  if (q) {
    query = query.or(`title.ilike.%${q}%,source.ilike.%${q}%`);
  }

  if (date) {
    query = query
      .gte("published_at", `${date}T00:00:00`)
      .lt("published_at", `${date}T23:59:59`);
  }

  const { data: articles, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ articles: articles || [] });
}
