import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient();
}

async function handleUpdateConversation(
  conversationId: string,
  userId: string,
  updates: { name?: string; avatar_url?: string }
) {
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }
  const { data: conv } = await admin
    .from("conversations")
    .select("id, type")
    .eq("id", conversationId)
    .single();
  if (!conv || conv.type !== "group") {
    return NextResponse.json({ error: "Not a group" }, { status: 404 });
  }
  const { data: part } = await admin
    .from("participants")
    .select("user_id, role")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!part) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const role = (part as { role?: string }).role ?? "member";
  if (role !== "creator" && role !== "admin") {
    return NextResponse.json({ error: "Только создатель или администратор могут менять название и аватар" }, { status: 403 });
  }
  const { error: updateErr } = await admin
    .from("conversations")
    .update(updates)
    .eq("id", conversationId);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * PATCH /api/conversations/[id]
 * Body: { name?: string; avatar_url?: string }
 * Update group name/avatar. Caller must be a participant.
 */
export async function PATCH(
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
    let body: { name?: string; avatar_url?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const updates: { name?: string; avatar_url?: string } = {};
    if (typeof body.name === "string") {
      const v = body.name.trim();
      if (v) updates.name = v;
    }
    if (typeof body.avatar_url === "string") {
      const v = body.avatar_url.trim();
      if (v) updates.avatar_url = v;
    }
    return handleUpdateConversation(conversationId, user.id, updates);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/conversations/[id]?name=...&avatar_url=...
 * Fallback для хостингов, где PATCH даёт 405. Обновляет название и/или аватар группы.
 */
export async function GET(
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
    const updates: { name?: string; avatar_url?: string } = {};
    const name = request.nextUrl.searchParams.get("name");
    if (typeof name === "string" && name.trim()) updates.name = name.trim();
    const avatarUrl = request.nextUrl.searchParams.get("avatar_url");
    if (typeof avatarUrl === "string" && avatarUrl.trim()) updates.avatar_url = avatarUrl.trim();
    return handleUpdateConversation(conversationId, user.id, updates);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
