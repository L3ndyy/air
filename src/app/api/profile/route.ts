import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    let { data: profile, error: fetchError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!profile) {
      const { data: inserted, error: insertError } = await admin
        .from("profiles")
        .insert({
          id: user.id,
          username: "user_" + user.id.slice(0, 8),
          full_name: (user.user_metadata?.full_name as string) || "",
        })
        .select("*")
        .single();
      if (insertError) {
        const { data: retry } = await admin.from("profiles").select("*").eq("id", user.id).single();
        profile = retry ?? null;
      } else {
        profile = inserted;
      }
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
