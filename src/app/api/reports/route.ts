import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/reports
 * Body: { messageId: string; reason?: string }
 * Create a report for a message.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { messageId?: string; reason?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const messageId = body.messageId?.trim();
    if (!messageId) {
      return NextResponse.json({ error: "messageId required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: msg } = await admin
      .from("messages")
      .select("id, conversation_id")
      .eq("id", messageId)
      .maybeSingle();
    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const { data: part } = await admin
      .from("participants")
      .select("user_id")
      .eq("conversation_id", msg.conversation_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!part) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: insertErr } = await admin.from("reports").insert({
      message_id: messageId,
      reporter_id: user.id,
      reason: body.reason?.trim()?.slice(0, 500) ?? null,
    });
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
