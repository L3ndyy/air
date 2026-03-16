import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email ?? undefined)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { count: totalUsers } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const iso = yesterday.toISOString();
    const { count: activeCount } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("updated_at", iso);

    const mem = process.memoryUsage();
    const uptimeSec = process.uptime();

    return NextResponse.json({
      users: { total: totalUsers ?? 0, activeLast24h: activeCount ?? 0 },
      server: {
        uptimeSeconds: Math.floor(uptimeSec),
        memoryMB: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        },
      },
      storage: "N/A",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
