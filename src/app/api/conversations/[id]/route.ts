import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient();
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
      .select("user_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!part) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { error: updateErr } = await admin
      .from("conversations")
      .update(updates)
      .eq("id", conversationId);

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
