import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

async function ensureConversationForUser(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: existing } = await admin
    .from("support_conversations")
    .select("conversation_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.conversation_id) return existing.conversation_id as string;

  const { data: conv, error: convErr } = await admin
    .from("conversations")
    .insert({ type: "direct", name: "Поддержка", avatar_url: null })
    .select("id")
    .single();

  if (convErr || !conv?.id) {
    throw new Error(convErr?.message ?? "Failed to create support conversation");
  }

  const conversationId = conv.id as string;

  const { error: participantsErr } = await admin.from("participants").insert({
    conversation_id: conversationId,
    user_id: userId,
  });
  if (participantsErr) throw new Error(participantsErr.message);

  const { error: mappingErr } = await admin.from("support_conversations").insert({
    user_id: userId,
    conversation_id: conversationId,
  });
  if (mappingErr) throw new Error(mappingErr.message);

  return conversationId;
}

/**
 * POST /api/support/chat/send
 * Body: { message: string, targetUserId?: string, reportId?: string }
 * - If targetUserId omitted: user sends to their own support.
 * - If targetUserId provided: requires admin; sends as admin to user's support.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { message?: string; targetUserId?: string; reportId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const message = (body.message ?? "").trim().slice(0, 2000);
  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const targetUserId = (body.targetUserId ?? user.id) as string;
  const reportId = body.reportId ?? null;
  const isAdminReply = targetUserId !== user.id;

  const admin = createAdminClient();

  let senderId = user.id;

  if (isAdminReply) {
    if (!isAdminEmail(user.email ?? undefined)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // sender_id remains admin's user id (sender profile)
  } else {
    senderId = user.id;
  }

  try {
    const conversationId = await ensureConversationForUser(admin, targetUserId);

    const { data: inserted, error: insertErr } = await admin
      .from("messages")
      .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: message,
      attachment_url: null,
      reply_to_id: null,
      })
      .select("id")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    if (isAdminReply && reportId) {
      try {
        await admin.from("moderation_logs").insert({
          action: "support_answer",
          report_id: reportId,
          message_id: inserted?.id ?? null,
          target_user_id: targetUserId,
          admin_id: user.id,
          details: { messagePreview: message.slice(0, 120) },
        });
      } catch {
        // best-effort
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

