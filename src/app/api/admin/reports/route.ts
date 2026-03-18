import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/reports
 * List all reports for admin. Returns reports with message preview, reporter and author info.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email ?? undefined)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: reports, error: reportsErr } = await admin
      .from("reports")
      .select("id, message_id, reporter_id, reason, created_at")
      .order("created_at", { ascending: false });

    if (reportsErr || !reports?.length) {
      return NextResponse.json(reports ?? []);
    }

    const messageIds = Array.from(new Set(reports.map((r) => r.message_id)));
    const { data: messages } = await admin
      .from("messages")
      .select("id, content, sender_id, conversation_id, created_at, hidden")
      .in("id", messageIds);

    const msgMap = new Map((messages ?? []).map((m) => [m.id, m]));
    const userIds = new Set<string>();
    reports.forEach((r) => {
      userIds.add(r.reporter_id);
      const msg = msgMap.get(r.message_id);
      if (msg) userIds.add(msg.sender_id);
    });

    const { data: profiles } = await admin
      .from("profiles")
      .select("id, username, full_name")
      .in("id", Array.from(userIds));

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const list = reports
      .map((r) => {
        const msg = msgMap.get(r.message_id);
        const reporter = profileMap.get(r.reporter_id);
        const author = msg ? profileMap.get(msg.sender_id) : null;
        return {
          id: r.id,
          message_id: r.message_id,
          reporter_id: r.reporter_id,
          reporter_username: reporter?.username ?? null,
          reporter_name: reporter?.full_name ?? null,
          reason: r.reason,
          created_at: r.created_at,
          message_content: msg?.content ?? null,
          message_created_at: msg?.created_at ?? null,
          message_hidden: msg?.hidden ?? false,
          author_id: msg?.sender_id ?? null,
          author_username: author?.username ?? null,
          author_name: author?.full_name ?? null,
          conversation_id: msg?.conversation_id ?? null,
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
