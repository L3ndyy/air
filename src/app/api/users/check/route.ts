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

    if (error) {
      return NextResponse.json({ available: false }, { status: 200 });
    }
    return NextResponse.json({ available: data === true });
  } catch (e) {
    return NextResponse.json({ available: false }, { status: 200 });
  }
}
