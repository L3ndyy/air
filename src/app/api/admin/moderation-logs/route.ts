import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email ?? undefined)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: logs, error } = await admin
      .from("moderation_logs")
      .select("id, action, report_id, message_id, target_user_id, admin_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = Array.from(
      new Set(
        (logs ?? [])
          .flatMap((l: any) => [l.target_user_id, l.admin_id])
          .filter(Boolean)
      )
    ) as string[];

    const { data: profiles } = await admin
      .from("profiles")
      .select("id, username, full_name")
      .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const list = (logs ?? []).map((l: any) => {
      const target = l.target_user_id ? profileMap.get(l.target_user_id) : null;
      const adminProfile = l.admin_id ? profileMap.get(l.admin_id) : null;
      return {
        id: l.id,
        action: l.action,
        report_id: l.report_id,
        message_id: l.message_id,
        created_at: l.created_at,
        target_username: target?.username ?? null,
        target_name: target?.full_name ?? null,
        admin_username: adminProfile?.username ?? null,
        admin_name: adminProfile?.full_name ?? null,
        details: l.details ?? null,
      };
    });

    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

