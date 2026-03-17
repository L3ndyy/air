import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient();
}

async function handleCreateGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
  memberIds: string[] | undefined
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Необходимо войти в аккаунт" }, { status: 401 });
  }

    if (!name) {
      return NextResponse.json({ error: "Укажите название группы" }, { status: 400 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Сервер не настроен. Обратитесь к администратору." },
        { status: 503 }
      );
    }

    const { data: newConv, error: createErr } = await admin
      .from("conversations")
      .insert({ type: "group", name })
      .select("id")
      .single();

    if (createErr || !newConv) {
      return NextResponse.json(
        { error: createErr?.message || "Ошибка создания группы" },
        { status: 500 }
      );
    }

    const participantRows: { conversation_id: string; user_id: string }[] = [
      { conversation_id: newConv.id, user_id: user.id },
    ];

    const safeMemberIds = Array.isArray(memberIds) ? memberIds : [];
    const uniqueIds = Array.from(new Set(safeMemberIds)).filter((id) => id && id !== user.id);
    for (const uid of uniqueIds) {
      participantRows.push({ conversation_id: newConv.id, user_id: uid });
    }

    const { error: insertErr } = await admin.from("participants").insert(participantRows);
    if (insertErr) {
      return NextResponse.json(
        { error: insertErr.message || "Ошибка добавления участников" },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: newConv.id });
}

/**
 * POST /api/conversations/group
 * Body: { name: string; memberIds?: string[] }
 * Creates a group conversation and adds current user + optional members. Uses admin to avoid RLS 403.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    let body: { name?: string; memberIds?: string[] } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Укажите название группы" }, { status: 400 });
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    return await handleCreateGroup(supabase, name, body.memberIds);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/conversations/group?name=xxx&memberIds=id1,id2
 * Fallback для хостингов, где POST даёт 405.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const name = request.nextUrl.searchParams.get("name")?.trim() ?? "";
    const memberIdsParam = request.nextUrl.searchParams.get("memberIds") ?? "";
    const memberIds =
      memberIdsParam && memberIdsParam.length > 0
        ? memberIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;
    return await handleCreateGroup(supabase, name, memberIds);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
