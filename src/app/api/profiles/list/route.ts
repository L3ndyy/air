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
 * GET /api/profiles/list?search=...
 * Returns list of profiles (id, username, full_name, avatar_url) for participant selection.
 * Excludes current user. Optional search filter.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 });
    }

    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .order("username")
      .neq("id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let list = profiles ?? [];
    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase();
    if (search && search.length > 0) {
      list = list.filter(
        (p) =>
          (p.username ?? "").toLowerCase().includes(search) ||
          (p.full_name ?? "").toLowerCase().includes(search)
      );
    }

    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
