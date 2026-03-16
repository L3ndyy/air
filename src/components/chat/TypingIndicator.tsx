"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface TypingIndicatorProps {
  conversationId: string;
  currentUserId?: string;
}

export function TypingIndicator({ conversationId, currentUserId }: TypingIndicatorProps) {
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const [names, setNames] = useState<Record<string, string>>({});
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase.channel(`presence:${conversationId}`);
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const ids = new Set<string>();
        Object.values(state).flat().forEach((p: { user_id?: string; typing?: boolean }) => {
          if (p?.user_id && p?.typing && p.user_id !== currentUserId) ids.add(p.user_id);
        });
        setTypingUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            channel.track({ user_id: user.id, typing: false });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, supabase]);

  useEffect(() => {
    if (typingUserIds.size === 0) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", Array.from(typingUserIds));
      const map: Record<string, string> = {};
      data?.forEach((p) => {
        map[p.id] = p.full_name || p.username || "Кто-то";
      });
      setNames(map);
    })();
  }, [typingUserIds, supabase]);

  if (typingUserIds.size === 0) return null;
  const label = Object.keys(names).length > 0
    ? `${Object.values(names).join(", ")} печатает...`
    : "Печатает...";
  return <span>{label}</span>;
}
