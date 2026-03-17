import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import webpush from "web-push";

export const dynamic = "force-dynamic";

async function sendNotify(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  title: string,
  messageBody: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId required" }, { status: 400 });
  }

  try {
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

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json().catch(() => ({}));
  const conversationId = body.conversationId as string | undefined;
  const title = (body.title as string) || "Air";
  const messageBody = (body.body as string) || "Новое сообщение";
  return sendNotify(supabase, conversationId ?? "", title, messageBody);
}

/** GET fallback for hosts that block POST to /api (e.g. 405). Same params in query. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const conversationId = request.nextUrl.searchParams.get("conversationId") ?? "";
  const title = request.nextUrl.searchParams.get("title") || "Air";
  const body = request.nextUrl.searchParams.get("body") || "Новое сообщение";
  return sendNotify(supabase, conversationId, title, body);
}
