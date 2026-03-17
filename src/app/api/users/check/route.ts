import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/users/check?username=xxx
 * Returns { available: boolean }. Does not require auth (for registration form).
 * Username is free if no confirmed user has it (unconfirmed signups don't block).
 */
export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get("username")?.trim().toLowerCase();
    if (!username || username.length < 3) {
      return NextResponse.json({ available: false }, { status: 200 });
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      return NextResponse.json({ available: false }, { status: 200 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_username_available", {
      p_username: username,
    });

    if (!error && typeof data === "boolean") {
      return NextResponse.json({ available: data });
    }

    // Fallback: если RPC нет или ошибка — проверяем по profiles (без учёта подтверждения почты)
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    return NextResponse.json({ available: !profile });
  } catch {
    return NextResponse.json({ available: false }, { status: 200 });
  }
}
