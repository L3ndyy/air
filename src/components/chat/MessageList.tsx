"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageBubble, type ReactionSummary } from "./MessageBubble";
import { MessageCircle, ImageIcon } from "lucide-react";
import type { Message, MessageReaction } from "@/types/database";

const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|svg)(\?|$)/i;

function formatMessageDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return "Сегодня";
  if (d.getTime() === yesterday.getTime()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
}

function groupMessagesByDate(messages: Message[]): { dateLabel: string; messages: Message[] }[] {
  const groups: { dateLabel: string; messages: Message[] }[] = [];
  let lastLabel: string | null = null;
  let currentGroup: Message[] = [];

  for (const msg of messages) {
    const label = formatMessageDate(new Date(msg.created_at));
    if (label !== lastLabel) {
      if (currentGroup.length > 0) {
        groups.push({ dateLabel: lastLabel!, messages: currentGroup });
        currentGroup = [];
      }
      lastLabel = label;
    }
    currentGroup.push(msg);
  }
  if (currentGroup.length > 0 && lastLabel) {
    groups.push({ dateLabel: lastLabel, messages: currentGroup });
  }
  return groups;
}

function buildReactionsByMessage(reactions: MessageReaction[]): Record<string, ReactionSummary[]> {
  const byMessage: Record<string, Record<string, { userIds: string[] }>> = {};
  for (const r of reactions) {
    if (!byMessage[r.message_id]) byMessage[r.message_id] = {};
    if (!byMessage[r.message_id][r.emoji]) byMessage[r.message_id][r.emoji] = { userIds: [] };
    byMessage[r.message_id][r.emoji].userIds.push(r.user_id);
  }
  const result: Record<string, ReactionSummary[]> = {};
  for (const [msgId, emojiMap] of Object.entries(byMessage)) {
    result[msgId] = Object.entries(emojiMap).map(([emoji, { userIds }]) => ({
      emoji,
      count: userIds.length,
      userIds,
    }));
  }
  return result;
}

interface MessageListProps {
  conversationId: string;
  currentUserId: string;
  searchQuery?: string;
  onReplyTo?: (message: Message) => void;
  onReport?: (messageId: string) => void;
}

export function MessageList({ conversationId, currentUserId, searchQuery = "", onReplyTo, onReport }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [viewMode, setViewMode] = useState<"messages" | "media">("messages");
  const [messagesLoading, setMessagesLoading] = useState(true);
  const supabase = createClient();

  const fetchReactions = useCallback(
    async (messageIds: string[]) => {
      if (messageIds.length === 0) {
        setReactions([]);
        return;
      }
      const { data } = await supabase
        .from("message_reactions")
        .select("message_id, user_id, emoji")
        .in("message_id", messageIds);
      setReactions((data as MessageReaction[]) ?? []);
    },
    [supabase]
  );

  useEffect(() => {
    setMessagesLoading(true);
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      const list = (data ?? []) as Message[];
      setMessages(list);
      await fetchReactions(list.map((m) => m.id));
      setMessagesLoading(false);
    })();

    supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", currentUserId)
      .eq("is_read", false)
      .then(() => {});

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const next = [...prev, payload.new as Message];
            fetchReactions(next.map((m) => m.id));
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== (payload.old as { id: string }).id));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === (payload.new as Message).id ? (payload.new as Message) : m))
          );
        }
      )
      .subscribe();

    const reactionChannel = supabase
      .channel(`reactions:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => {
          setMessages((prev) => {
            fetchReactions(prev.map((m) => m.id));
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(reactionChannel);
    };
  }, [conversationId, currentUserId, supabase, fetchReactions]);

  async function handleDeleteMessage(id: string) {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (!error) setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleEditMessage(id: string, newContent: string) {
    const msg = messages.find((m) => m.id === id);
    if (!msg || msg.sender_id !== currentUserId) return;
    const { error } = await supabase
      .from("messages")
      .update({ content: newContent, edited_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, content: newContent, edited_at: new Date().toISOString() } : m
        )
      );
    }
  }

  function handleScrollToMessage(id: string) {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleAddReaction(messageId: string, emoji: string) {
    await supabase.from("message_reactions").insert({ message_id: messageId, user_id: currentUserId, emoji });
    setReactions((prev) => [...prev, { message_id: messageId, user_id: currentUserId, emoji }]);
  }

  async function handleRemoveReaction(messageId: string, emoji: string) {
    await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", currentUserId)
      .eq("emoji", emoji);
    setReactions((prev) =>
      prev.filter(
        (r) => !(r.message_id === messageId && r.user_id === currentUserId && r.emoji === emoji)
      )
    );
  }

  async function handleMarkRead(messageId: string) {
    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("id", messageId);
    if (!error) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m))
      );
    }
  }

  const reactionsByMessage = useMemo(() => buildReactionsByMessage(reactions), [reactions]);
  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = q ? messages.filter((m) => m.content.toLowerCase().includes(q)) : messages;
    return list.filter((m) => !m.hidden);
  }, [messages, searchQuery]);
  const dateGroups = useMemo(() => groupMessagesByDate(filteredMessages), [filteredMessages]);

  const lastOwnMessageId = useMemo(() => {
    for (let i = filteredMessages.length - 1; i >= 0; i--) {
      if (filteredMessages[i].sender_id === currentUserId) return filteredMessages[i].id;
    }
    return null;
  }, [filteredMessages, currentUserId]);

  const mediaItems = useMemo(
    () =>
      messages
        .filter((m) => m.attachment_url)
        .map((m) => ({ ...m, isImage: IMAGE_EXTS.test(m.attachment_url ?? "") })),
    [messages]
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 border-b border-[var(--air-glass-border)] bg-[var(--air-glass)] px-2 py-1">
        <button
          type="button"
          onClick={() => setViewMode("messages")}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
            viewMode === "messages"
              ? "bg-[var(--air-accent)] text-white"
              : "[color:var(--air-text-muted)] hover:bg-[var(--air-glass)] hover:[color:var(--air-text)]"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          Сообщения
        </button>
        <button
          type="button"
          onClick={() => setViewMode("media")}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
            viewMode === "media"
              ? "bg-[var(--air-accent)] text-white"
              : "[color:var(--air-text-muted)] hover:bg-[var(--air-glass)] hover:[color:var(--air-text)]"
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          Фото и файлы
        </button>
      </div>
      {viewMode === "media" ? (
        <div className="flex-1 overflow-y-auto p-4">
          {mediaItems.length === 0 ? (
            <p className="py-8 text-center text-sm [color:var(--air-text-muted)]">Нет вложений</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {mediaItems.map((m) => (
                <a
                  key={m.id}
                  href={m.attachment_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)]"
                >
                  {m.isImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.attachment_url!}
                      alt="Вложение"
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center p-4 text-center text-xs [color:var(--air-text-muted)]">
                      Файл
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      ) : messagesLoading && messages.length === 0 ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[75%] rounded-2xl px-4 py-3">
                <div className="h-4 w-48 animate-pulse rounded bg-[var(--air-glass-border)]" />
                <div className="mt-2 h-3 w-16 animate-pulse rounded bg-[var(--air-glass-border)]" />
              </div>
            </div>
          ))}
        </div>
      ) : (
    <div className="flex-1 overflow-y-auto p-4">
      {dateGroups.map((group) => (
        <div key={group.dateLabel} className="space-y-0.5">
          <div className="flex justify-center py-1">
            <span className="rounded-full bg-[var(--air-input-bg)] px-3 py-1 text-xs [color:var(--air-text-muted)]">
              {group.dateLabel}
            </span>
          </div>
          {group.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              messageId={msg.id}
              content={msg.content}
              searchHighlight={searchQuery.trim() || undefined}
              attachmentUrl={msg.attachment_url ?? undefined}
              isOwn={msg.sender_id === currentUserId}
              isRead={msg.is_read}
              showReadStatus={msg.sender_id === currentUserId ? msg.id === lastOwnMessageId : undefined}
              createdAt={msg.created_at}
              editedAt={msg.edited_at ?? undefined}
              replyToMessage={
                msg.reply_to_id
                  ? (() => {
                      const replied = messages.find((m) => m.id === msg.reply_to_id);
                      return replied
                        ? { id: replied.id, content: replied.content }
                        : { id: msg.reply_to_id, content: "" };
                    })()
                  : null
              }
              reactions={reactionsByMessage[msg.id]}
              currentUserId={currentUserId}
              onDelete={handleDeleteMessage}
              onEdit={handleEditMessage}
              onReply={onReplyTo ? () => onReplyTo(msg) : undefined}
              onScrollToMessage={handleScrollToMessage}
              onAddReaction={handleAddReaction}
              onRemoveReaction={handleRemoveReaction}
              onReport={onReport}
              onMarkRead={handleMarkRead}
            />
          ))}
        </div>
      ))}
    </div>
      )}
    </div>
  );
}
