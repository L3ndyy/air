import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMaintenance, isAdminEmail, setMaintenance } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const setValue = searchParams.get("maintenance");
    if (setValue === "true" || setValue === "false") {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isAdminEmail(user.email ?? undefined)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const maintenance = setValue === "true";
      await setMaintenance(maintenance);
      return NextResponse.json({ maintenance });
    }
    const maintenance = await getMaintenance();
    return NextResponse.json({ maintenance });
  } catch (e) {
    return NextResponse.json(
      { maintenance: false, error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
