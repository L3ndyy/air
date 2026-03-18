import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/reports/[id]/resolve
 * Body: { action: 'dismiss' | 'hide' | 'delete' | 'ban', banDays?: number }
 * - dismiss: remove the report only
 * - hide: set message.hidden = true
 * - delete: delete the message
 * - ban: set author's banned_until (banDays, default 1)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email ?? undefined)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: reportId } = await params;
    if (!reportId) {
      return NextResponse.json({ error: "Report id required" }, { status: 400 });
    }

    let body: { action?: string; banDays?: number } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const action = (body.action ?? "dismiss").toLowerCase();
    const validActions = ["dismiss", "hide", "delete", "ban"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: report, error: reportErr } = await admin
      .from("reports")
      .select("id, message_id")
      .eq("id", reportId)
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const messageId = report.message_id as string;

    if (action === "dismiss") {
      const { error: delErr } = await admin.from("reports").delete().eq("id", reportId);
      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, action: "dismissed" });
    }

    const { data: msg } = await admin
      .from("messages")
      .select("id, sender_id")
      .eq("id", messageId)
      .single();

    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (action === "hide") {
      const { error: upErr } = await admin
        .from("messages")
        .update({ hidden: true })
        .eq("id", messageId);
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
      const { error: delErr } = await admin.from("reports").delete().eq("id", reportId);
      if (delErr) {}
      return NextResponse.json({ ok: true, action: "hidden" });
    }

    if (action === "delete") {
      const { error: delMsgErr } = await admin.from("messages").delete().eq("id", messageId);
      if (delMsgErr) {
        return NextResponse.json({ error: delMsgErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, action: "deleted" });
    }

    if (action === "ban") {
      const banDays = Math.min(Math.max(Number(body.banDays) || 1, 1), 365);
      const bannedUntil = new Date();
      bannedUntil.setDate(bannedUntil.getDate() + banDays);
      const { error: banErr } = await admin
        .from("profiles")
        .update({ banned_until: bannedUntil.toISOString() })
        .eq("id", msg.sender_id);
      if (banErr) {
        return NextResponse.json({ error: banErr.message }, { status: 500 });
      }
      const { error: upErr } = await admin
        .from("messages")
        .update({ hidden: true })
        .eq("id", messageId);
      if (upErr) {}
      const { error: delErr } = await admin.from("reports").delete().eq("id", reportId);
      if (delErr) {}
      return NextResponse.json({ ok: true, action: "banned", banDays });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
