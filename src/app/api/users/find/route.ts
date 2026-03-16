import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/users/find?username=xxx
 * Returns { id, username } for the user with that username, or 404.
 * Uses service role so search works regardless of RLS (find anyone by username).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const username = request.nextUrl.searchParams.get("username")?.trim().toLowerCase();
    if (!username || username.length < 2) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("id, username")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!profile) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
