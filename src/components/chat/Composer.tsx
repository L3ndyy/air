"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send } from "lucide-react";
import { Button } from "@/components/ui";

interface ComposerProps {
  conversationId: string;
}

export function Composer({ conversationId }: ComposerProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const supabase = createClient();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`presence:${conversationId}`);
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) channel.track({ user_id: user.id, typing: false });
      }
    });
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  const setTyping = useCallback(
    (typing: boolean) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        const ch = supabase.channel(`presence:${conversationId}`);
        ch.track({ user_id: user.id, typing });
      });
    },
    [conversationId, supabase]
  );

  const onInput = useCallback(() => {
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      typingTimeoutRef.current = null;
    }, 2000);
  }, [setTyping]);

  const send = useCallback(async () => {
    const text = content.trim();
    if (!text || sending) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSending(true);
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: text,
    });
    setContent("");
    setSending(false);
  }, [content, conversationId, sending, supabase]);

  return (
    <div className="flex shrink-0 gap-2 border-t border-gray-200/60 bg-white/80 p-3 backdrop-blur-xl">
      <input
        type="text"
        placeholder="Сообщение..."
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          onInput();
        }}
        onFocus={onInput}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        className="flex-1 rounded-xl border border-gray-200/80 bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
      />
      <Button
        type="button"
        size="md"
        onClick={send}
        disabled={!content.trim() || sending}
        className="shrink-0"
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  );
}
