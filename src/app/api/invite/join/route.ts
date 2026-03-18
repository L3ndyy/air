import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient();
}

export const dynamic = "force-dynamic";

/**
 * GET /api/invite/join?token=...
 * Join the group by invite token. User must be authenticated.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = request.nextUrl.searchParams.get("token")?.trim();
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 });
    }

    const { data: invite } = await admin
      .from("group_invites")
      .select("id, conversation_id, expires_at, max_uses, use_count")
      .eq("token", token)
      .maybeSingle();

    if (!invite) {
      return NextResponse.json({ error: "Ссылка недействительна или истекла" }, { status: 404 });
    }
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "Ссылка недействительна или истекла" }, { status: 410 });
    }
    if (invite.max_uses != null && invite.use_count >= invite.max_uses) {
      return NextResponse.json({ error: "Достигнут лимит использований ссылки" }, { status: 410 });
    }

    const { data: existing } = await admin
      .from("participants")
      .select("user_id")
      .eq("conversation_id", invite.conversation_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        conversationId: invite.conversation_id,
        alreadyMember: true,
      });
    }

    const { error: insertErr } = await admin.from("participants").insert({
      conversation_id: invite.conversation_id,
      user_id: user.id,
    });
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    await admin
      .from("group_invites")
      .update({ use_count: invite.use_count + 1 })
      .eq("id", invite.id);

    return NextResponse.json({ conversationId: invite.conversation_id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invite/join - same, body: { token }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { token?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }
    const token = (body.token ?? "").trim();
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 });
    }

    const { data: invite } = await admin
      .from("group_invites")
      .select("id, conversation_id, expires_at, max_uses, use_count")
      .eq("token", token)
      .maybeSingle();

    if (!invite) {
      return NextResponse.json({ error: "Ссылка недействительна или истекла" }, { status: 404 });
    }
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "Ссылка недействительна или истекла" }, { status: 410 });
    }
    if (invite.max_uses != null && invite.use_count >= invite.max_uses) {
      return NextResponse.json({ error: "Достигнут лимит использований ссылки" }, { status: 410 });
    }

    const { data: existing } = await admin
      .from("participants")
      .select("user_id")
      .eq("conversation_id", invite.conversation_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        conversationId: invite.conversation_id,
        alreadyMember: true,
      });
    }

    const { error: insertErr } = await admin.from("participants").insert({
      conversation_id: invite.conversation_id,
      user_id: user.id,
    });
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    await admin
      .from("group_invites")
      .update({ use_count: invite.use_count + 1 })
      .eq("id", invite.id);

    return NextResponse.json({ conversationId: invite.conversation_id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
