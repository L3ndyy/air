import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/support/chat/ensure
 * Ensures there is a support conversation for the current user.
 * Returns: { conversation_id }
 */
export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const userId = user.id;

  const { data: existing } = await admin
    .from("support_conversations")
    .select("conversation_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.conversation_id) {
    return NextResponse.json({ conversation_id: existing.conversation_id }, { status: 200 });
  }

  const { data: conv, error: convErr } = await admin
    .from("conversations")
    .insert({ type: "direct", name: "Поддержка", avatar_url: null })
    .select("id")
    .single();

  if (convErr || !conv?.id) {
    return NextResponse.json(
      { error: convErr?.message ?? "Failed to create conversation" },
      { status: 500 }
    );
  }

  const conversationId = conv.id as string;

  const { error: participantsErr } = await admin.from("participants").insert({
    conversation_id: conversationId,
    user_id: userId,
  });

  if (participantsErr) {
    return NextResponse.json({ error: participantsErr.message }, { status: 500 });
  }

  const { error: mappingErr } = await admin.from("support_conversations").insert({
    user_id: userId,
    conversation_id: conversationId,
  });

  if (mappingErr) {
    return NextResponse.json({ error: mappingErr.message }, { status: 500 });
  }

  return NextResponse.json({ conversation_id: conversationId }, { status: 200 });
}

