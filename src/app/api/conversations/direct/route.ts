import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/conversations/direct
 * Body: { username: string }
 * Finds user by username, creates or returns existing direct conversation.
 * Uses service role to avoid RLS 403 on conversations/participants.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const username = (body.username as string)?.trim()?.toLowerCase();
    if (!username || username.length < 2) {
      return NextResponse.json(
        { error: "Укажите username собеседника" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: other, error: findErr } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (findErr) {
      return NextResponse.json({ error: findErr.message }, { status: 500 });
    }
    if (!other) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    if (other.id === user.id) {
      return NextResponse.json(
        { error: "Нельзя начать чат с собой" },
        { status: 400 }
      );
    }

    const { data: myParts } = await admin
      .from("participants")
      .select("conversation_id")
      .eq("user_id", user.id);
    const myConvIds = (myParts ?? []).map((p) => p.conversation_id);

    if (myConvIds.length > 0) {
      const { data: directConvs } = await admin
        .from("conversations")
        .select("id")
        .eq("type", "direct")
        .in("id", myConvIds);
      const directIds = (directConvs ?? []).map((c) => c.id);

      const { data: otherParts } = await admin
        .from("participants")
        .select("conversation_id")
        .eq("user_id", other.id)
        .in("conversation_id", directIds);

      const existing = otherParts?.find((p) => directIds.includes(p.conversation_id));
      if (existing) {
        return NextResponse.json({ id: existing.conversation_id });
      }
    }

    const { data: newConv, error: createErr } = await admin
      .from("conversations")
      .insert({ type: "direct" })
      .select("id")
      .single();

    if (createErr || !newConv) {
      return NextResponse.json(
        { error: createErr?.message || "Ошибка создания чата" },
        { status: 500 }
      );
    }

    const { error: insertErr } = await admin.from("participants").insert([
      { conversation_id: newConv.id, user_id: user.id },
      { conversation_id: newConv.id, user_id: other.id },
    ]);

    if (insertErr) {
      return NextResponse.json(
        { error: insertErr.message || "Ошибка добавления участников" },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: newConv.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
