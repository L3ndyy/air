import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient();
}

async function handleDirectConversation(username: string, userId: string) {
  const admin = getAdminClient();
  if (!admin) {
    return { error: "Сервер не настроен. Обратитесь к администратору.", status: 503 as const };
  }

  const { data: other, error: findErr } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (findErr) {
    return { error: findErr.message, status: 500 as const };
  }
  if (!other) {
    return { error: "Пользователь не найден", status: 404 as const };
  }

  if (other.id === userId) {
    return { error: "Нельзя начать чат с собой", status: 400 as const };
  }

  const { data: myParts } = await admin
    .from("participants")
    .select("conversation_id")
    .eq("user_id", userId);
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
      return { id: existing.conversation_id };
    }
  }

  const { data: newConv, error: createErr } = await admin
    .from("conversations")
    .insert({ type: "direct" })
    .select("id")
    .single();

  if (createErr || !newConv) {
    return { error: createErr?.message || "Ошибка создания чата", status: 500 as const };
  }

  const { error: insertErr } = await admin.from("participants").insert([
    { conversation_id: newConv.id, user_id: userId },
    { conversation_id: newConv.id, user_id: other.id },
  ]);

  if (insertErr) {
    return { error: insertErr.message || "Ошибка добавления участников", status: 500 as const };
  }

  return { id: newConv.id };
}

/**
 * POST /api/conversations/direct — Body: { username: string }
 * GET  /api/conversations/direct?username=xxx — для хостингов, где POST даёт 405
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Необходимо войти в аккаунт" }, { status: 401 });
    }
    let body: { username?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Укажите username собеседника" }, { status: 400 });
    }
    const username = (body.username as string)?.trim()?.toLowerCase();
    if (!username || username.length < 2) {
      return NextResponse.json({ error: "Укажите username собеседника" }, { status: 400 });
    }
    const result = await handleDirectConversation(username, user.id);
    if ("status" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ id: result.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Необходимо войти в аккаунт" }, { status: 401 });
    }
    const username = request.nextUrl.searchParams.get("username")?.trim()?.toLowerCase();
    if (!username || username.length < 2) {
      return NextResponse.json({ error: "Укажите username собеседника" }, { status: 400 });
    }
    const result = await handleDirectConversation(username, user.id);
    if ("status" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ id: result.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
