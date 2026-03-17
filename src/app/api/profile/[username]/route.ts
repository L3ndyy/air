import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/profile/[username]
 * Returns public profile (username, full_name, avatar_url, status) for the given username.
 * Requires authenticated user.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username: rawUsername } = await params;
    const username = rawUsername?.trim().toLowerCase();
    if (!username || username.length < 2) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("id, username, full_name, avatar_url, status, updated_at")
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
