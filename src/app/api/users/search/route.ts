import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/search?query=prefix
 * Returns up to 10 profiles whose username matches prefix (by username).
 * Used for @mentions autocomplete in chat composer.
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

    const query = request.nextUrl.searchParams.get("query")?.trim().toLowerCase() ?? "";
    if (!query || query.length < 1) {
      return NextResponse.json([], { status: 200 });
    }

    if (!/^[a-z0-9_]+$/.test(query)) {
      return NextResponse.json([], { status: 200 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .ilike("username", `${query}%`)
      .order("username", { ascending: true })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

