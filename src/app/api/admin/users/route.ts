import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email ?? undefined)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");

    if (action === "delete" && userId) {
      const admin = createAdminClient();
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "set_password" && userId) {
      const newPassword = Array.from(crypto.getRandomValues(new Uint8Array(12)))
        .map((b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 32])
        .join("");
      const admin = createAdminClient();
      const { error } = await admin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, password: newPassword });
    }

    const admin = createAdminClient();
    const { data: listData, error: listError } = await admin.auth.admin.listUsers({
      perPage: 500,
    });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const authUsers = listData?.users ?? [];
    const ids = authUsers.map((u) => u.id);
    let profileMap = new Map<string, { username: string | null; full_name: string | null }>();
    if (ids.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, username, full_name")
        .in("id", ids);
      profileMap = new Map((profiles ?? []).map((p) => [p.id, { username: p.username ?? null, full_name: p.full_name ?? null }]));
    }

    const users = authUsers.map((u) => {
      const p = profileMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        email_confirmed_at: u.email_confirmed_at ?? null,
        username: p?.username ?? null,
        full_name: p?.full_name ?? null,
      };
    });

    return NextResponse.json({ users });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email ?? undefined)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action as string;
    const userId = body.userId as string | undefined;

    if (action === "delete" && userId) {
      const admin = createAdminClient();
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "set_password" && userId) {
      let newPassword = (body.password as string)?.trim();
      if (!newPassword || newPassword.length < 6) {
        newPassword = Array.from(crypto.getRandomValues(new Uint8Array(12)))
          .map((b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 32])
          .join("");
      }
      const admin = createAdminClient();
      const { error } = await admin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, password: newPassword });
    }

    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
