import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient();
}

function getStoragePathFromUrl(url: string): string | null {
  const marker = "chat-files/";
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.slice(i + marker.length);
}

/**
 * POST /api/conversations/[id]/clear
 * Delete all messages in the conversation and their files from storage.
 * Caller must be a participant.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json({ error: "Conversation id required" }, { status: 400 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 });
    }

    const { data: part } = await admin
      .from("participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!part) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: messages } = await admin
      .from("messages")
      .select("id, attachment_url")
      .eq("conversation_id", conversationId);

    const paths: string[] = [];
    for (const m of messages ?? []) {
      const url = (m as { attachment_url?: string }).attachment_url;
      if (url) {
        const path = getStoragePathFromUrl(url);
        if (path) paths.push(path);
      }
    }
    if (paths.length > 0) {
      await admin.storage.from("chat-files").remove(paths);
    }

    const { error: delErr } = await admin
      .from("messages")
      .delete()
      .eq("conversation_id", conversationId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
