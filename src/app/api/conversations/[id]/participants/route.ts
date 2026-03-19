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

async function handleLeaveGroup(conversationId: string, userId: string) {
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }
  const isMember = await ensureMember(admin, conversationId, userId);
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
  const { error: delErr } = await admin
    .from("participants")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * GET /api/conversations/[id]/participants
 * Returns list of participants. If ?action=leave, leaves the group (fallback when DELETE is blocked).
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

    if (request.nextUrl.searchParams.get("action") === "leave") {
      return handleLeaveGroup(conversationId, user.id);
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
      .select("user_id, role")
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
    const list = participants.map((p) => ({
      user_id: p.user_id,
      role: (p as { role?: string }).role ?? "member",
      ...profileMap.get(p.user_id),
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

    const { data: myPart } = await admin
      .from("participants")
      .select("user_id, role")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!myPart) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const role = (myPart as { role?: string }).role ?? "member";
    if (role !== "creator" && role !== "admin") {
      return NextResponse.json({ error: "Только создатель или администратор могут добавлять участников" }, { status: 403 });
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

/**
 * PATCH /api/conversations/[id]/participants
 * Body: { userId: string, role: "admin" | "member" }
 * Change a participant's role. Caller must be creator or admin; cannot change creator.
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
    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 });
    }
    const { data: myPart } = await admin
      .from("participants")
      .select("user_id, role")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!myPart) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const myRole = (myPart as { role?: string }).role ?? "member";
    if (myRole !== "creator" && myRole !== "admin") {
      return NextResponse.json({ error: "Только создатель или администратор могут менять роли" }, { status: 403 });
    }
    let body: { userId?: string; role?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const targetUserId = body.userId?.trim();
    const role = body.role === "admin" ? "admin" : body.role === "member" ? "member" : null;
    if (!targetUserId || !role) {
      return NextResponse.json({ error: "Укажите userId и role (admin или member)" }, { status: 400 });
    }
    const { data: targetPart } = await admin
      .from("participants")
      .select("user_id, role")
      .eq("conversation_id", conversationId)
      .eq("user_id", targetUserId)
      .maybeSingle();
    if (!targetPart) {
      return NextResponse.json({ error: "Участник не найден" }, { status: 404 });
    }
    const targetRole = (targetPart as { role?: string }).role ?? "member";
    if (targetRole === "creator") {
      return NextResponse.json({ error: "Нельзя изменить роль создателя" }, { status: 400 });
    }
    if (myRole !== "creator" && targetRole === "admin") {
      return NextResponse.json({ error: "Только создатель может менять роль администратора" }, { status: 403 });
    }
    const { error: updateErr } = await admin
      .from("participants")
      .update({ role })
      .eq("conversation_id", conversationId)
      .eq("user_id", targetUserId);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations/[id]/participants
 * Leave the group (remove current user). If ?userId=xxx and caller is creator/admin, remove that user.
 */
export async function DELETE(
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
    const targetUserId = request.nextUrl.searchParams.get("userId")?.trim();
    if (targetUserId && targetUserId !== user.id) {
      const admin = getAdminClient();
      if (!admin) {
        return NextResponse.json({ error: "Server not configured" }, { status: 503 });
      }
      const { data: myPart } = await admin
        .from("participants")
        .select("role")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!myPart) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const myRole = (myPart as { role?: string }).role ?? "member";
      if (myRole !== "creator" && myRole !== "admin") {
        return NextResponse.json({ error: "Только создатель или администратор могут исключать участников" }, { status: 403 });
      }
      const { data: targetPart } = await admin
        .from("participants")
        .select("role")
        .eq("conversation_id", conversationId)
        .eq("user_id", targetUserId)
        .maybeSingle();
      if (!targetPart) {
        return NextResponse.json({ error: "Участник не найден" }, { status: 404 });
      }
      const targetRole = (targetPart as { role?: string }).role ?? "member";
      if (targetRole === "creator") {
        return NextResponse.json({ error: "Нельзя исключить создателя" }, { status: 400 });
      }
      if (myRole !== "creator" && targetRole === "admin") {
        return NextResponse.json({ error: "Только создатель может исключить администратора" }, { status: 403 });
      }
      const { error: delErr } = await admin
        .from("participants")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", targetUserId);
      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }
    return handleLeaveGroup(conversationId, user.id);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
