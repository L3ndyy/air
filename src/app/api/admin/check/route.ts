import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ admin: false }, { status: 200 });
    }
    return NextResponse.json({ admin: isAdminEmail(user.email ?? undefined) });
  } catch {
    return NextResponse.json({ admin: false }, { status: 200 });
  }
}
