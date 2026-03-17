import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import webpush from "web-push";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const conversationId = body.conversationId as string | undefined;
    const title = (body.title as string) || "Air";
    const messageBody = (body.body as string) || "Новое сообщение";
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: participants } = await admin
      .from("participants")
      .select("user_id")
      .eq("conversation_id", conversationId);
    const recipientIds = (participants ?? [])
      .map((p) => p.user_id)
      .filter((id) => id !== user.id);
    if (recipientIds.length === 0) return NextResponse.json({ ok: true });

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("user_id", recipientIds);

    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPrivate || !vapidPublic) {
      return NextResponse.json({ ok: true });
    }

    webpush.setVapidDetails(
      "mailto:air@localhost",
      vapidPublic,
      vapidPrivate
    );

    const payload = JSON.stringify({ title, body: messageBody });
    await Promise.allSettled(
      (subs ?? []).map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
