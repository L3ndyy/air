import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient();
}

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const dynamic = "force-dynamic";

/**
 * POST /api/conversations/[id]/invite
 * Create an invite link for the group. Body: { expiresInDays?: number; maxUses?: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json({ error: "Conversation id required" }, { status: 400 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 });
    }

    const { data: part } = await admin
      .from("participants")
      .select("user_id, role")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!part) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const role = (part as { role?: string }).role ?? "member";
    if (role !== "creator" && role !== "admin") {
      return NextResponse.json({ error: "Только создатель или администратор могут создавать ссылку" }, { status: 403 });
    }

    const { data: conv } = await admin
      .from("conversations")
      .select("type")
      .eq("id", conversationId)
      .single();
    if (!conv || conv.type !== "group") {
      return NextResponse.json({ error: "Not a group" }, { status: 400 });
    }

    let body: { expiresInDays?: number; maxUses?: number } = {};
    try {
      body = await request.json();
    } catch {
      // optional body
    }
    const expiresInDays = Math.min(30, Math.max(1, body.expiresInDays ?? 7));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    const maxUses = body.maxUses != null && body.maxUses > 0 ? body.maxUses : null;

    const token = generateToken();
    const { error: insertErr } = await admin.from("group_invites").insert({
      conversation_id: conversationId,
      token,
      expires_at: expiresAt.toISOString(),
      max_uses: maxUses,
      created_by: user.id,
    });
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    const origin = request.nextUrl.origin;
    const inviteUrl = `${origin}/invite/${token}`;
    return NextResponse.json({
      inviteUrl,
      token,
      expiresAt: expiresAt.toISOString(),
      maxUses,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
