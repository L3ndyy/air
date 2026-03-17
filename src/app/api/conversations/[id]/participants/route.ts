import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient();
}

async function ensureMember(admin: ReturnType<typeof createAdminClient>, conversationId: string, userId: string) {
  const { data } = await admin
    .from("participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

/**
 * GET /api/conversations/[id]/participants
 * Returns list of participants with profile (id, username, full_name, avatar_url).
 */
export async function GET(
  _request: NextRequest,
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

    const isMember = await ensureMember(admin, conversationId, user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: participants } = await admin
      .from("participants")
      .select("user_id")
      .eq("conversation_id", conversationId);

    if (!participants?.length) {
      return NextResponse.json([]);
    }

    const userIds = participants.map((p) => p.user_id);
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const list = userIds.map((uid) => ({
      user_id: uid,
      ...profileMap.get(uid),
    }));

    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations/[id]/participants
 * Body: { username: string }
 * Add a user to the group by username. Caller must be a participant.
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

    const isMember = await ensureMember(admin, conversationId, user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: conv } = await admin
      .from("conversations")
      .select("type")
      .eq("id", conversationId)
      .single();

    if (!conv || conv.type !== "group") {
      return NextResponse.json({ error: "Not a group" }, { status: 400 });
    }

    let body: { username?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Укажите username" }, { status: 400 });
    }

    const username = (body.username ?? "").trim().toLowerCase();
    if (!username || username.length < 2) {
      return NextResponse.json({ error: "Укажите username" }, { status: 400 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    if (profile.id === user.id) {
      return NextResponse.json({ error: "Вы уже в группе" }, { status: 400 });
    }

    const { error: insertErr } = await admin.from("participants").insert({
      conversation_id: conversationId,
      user_id: profile.id,
    });

    if (insertErr) {
      if (insertErr.code === "23505") {
        return NextResponse.json({ error: "Пользователь уже в группе" }, { status: 409 });
      }
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
