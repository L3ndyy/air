import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store, no-cache, max-age=0",
};

/**
 * GET /api/users/check?username=xxx
 * Returns { available: boolean }. Does not require auth (for registration form).
 */
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim().toLowerCase();
  if (!username || username.length < 3) {
    return NextResponse.json({ available: false }, { status: 200, headers });
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return NextResponse.json({ available: false }, { status: 200, headers });
  }

  try {
    const admin = createAdminClient();
    // Сначала пробуем RPC (если миграция применена)
    const { data: rpcData, error: rpcError } = await admin.rpc("check_username_available", {
      p_username: username,
    });
    if (!rpcError && typeof rpcData === "boolean") {
      return NextResponse.json({ available: rpcData }, { status: 200, headers });
    }
    // Иначе проверяем по таблице profiles
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    return NextResponse.json({ available: !profile }, { status: 200, headers });
  } catch {
    // При любой ошибке считаем username свободным, чтобы не блокировать регистрацию
    return NextResponse.json({ available: true }, { status: 200, headers });
  }
}
