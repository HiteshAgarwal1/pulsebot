import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Forbidden", status: 403 };
  }

  return { user };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const admin = createAdminClient();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get user configs and last delivery for each user
  const users = await Promise.all(
    (profiles || []).map(async (profile) => {
      const { data: config } = await admin
        .from("user_configs")
        .select("is_active, delivery_time")
        .eq("user_id", profile.id)
        .maybeSingle();

      const { data: lastLog } = await admin
        .from("delivery_logs")
        .select("delivered_at")
        .eq("user_id", profile.id)
        .order("delivered_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        id: profile.id,
        email: profile.email,
        display_name: profile.display_name,
        role: profile.role,
        created_at: profile.created_at,
        user_config: config,
        last_delivery: lastLog?.delivered_at ?? null,
      };
    })
  );

  return NextResponse.json({ users });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const body = await request.json();
  const { action, user_id } = body;
  const admin = createAdminClient();

  if (action === "toggle_active") {
    const { error } = await admin
      .from("user_configs")
      .update({ is_active: body.is_active })
      .eq("user_id", user_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (action === "update_role") {
    const { error } = await admin
      .from("profiles")
      .update({ role: body.role })
      .eq("id", user_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const body = await request.json();
  const { user_id } = body;
  const admin = createAdminClient();

  // Delete user_configs first (FK constraint)
  await admin.from("user_configs").delete().eq("user_id", user_id);
  // Delete delivery_logs
  await admin.from("delivery_logs").delete().eq("user_id", user_id);
  // Delete profile
  await admin.from("profiles").delete().eq("id", user_id);
  // Delete auth user
  await admin.auth.admin.deleteUser(user_id);

  return NextResponse.json({ success: true });
}
