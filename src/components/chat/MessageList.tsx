"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageBubble, type ReactionSummary } from "./MessageBubble";
import { CheckSquare, Forward as ForwardIcon, ImageIcon, MessageCircle, Pin, X } from "lucide-react";
import type { Message, MessageReaction } from "@/types/database";
import type { ConversationItem } from "@/components/layout/ChatSidebar";

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

function formatMessageTime(dateIso: string): string {
  return new Date(dateIso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
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
  conversationsForForward?: ConversationItem[];
  onMentionClick?: (username: string) => void;
}

export function MessageList({
  conversationId,
  currentUserId,
  searchQuery = "",
  onReplyTo,
  onReport,
  conversationsForForward = [],
  onMentionClick,
}: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [viewMode, setViewMode] = useState<"messages" | "media">("messages");
  const [messagesLoading, setMessagesLoading] = useState(true);
  const supabase = createClient();

  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [pinnedAt, setPinnedAt] = useState<string | null>(null);

  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardTargetId, setForwardTargetId] = useState<string | null>(null);
  const [forwardMessageIds, setForwardMessageIds] = useState<string[]>([]);
  const [forwardSending, setForwardSending] = useState(false);

  const [mediaViewer, setMediaViewer] = useState<{ url: string; createdAt: string } | null>(null);
  const [mediaZoom, setMediaZoom] = useState(1);
  const [mediaPan, setMediaPan] = useState({ x: 0, y: 0 });
  const mediaDragRef = useRef<{
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const PAGE_SIZE = 30;
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);

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

  const fetchPin = useCallback(async () => {
    const { data } = await supabase
      .from("conversation_pins")
      .select("message_id, pinned_at")
      .eq("conversation_id", conversationId)
      .maybeSingle();
    setPinnedMessageId((data as { message_id?: string } | null)?.message_id ?? null);
    setPinnedAt((data as { pinned_at?: string } | null)?.pinned_at ?? null);
  }, [supabase, conversationId]);

  function clearSelection() {
    setSelectedMessageIds(new Set());
  }

  function toggleSelect(messageId: string) {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }

  function getPreferredForwardTarget(): string | null {
    const other = conversationsForForward.find((c) => c.id !== conversationId);
    return other?.id ?? conversationsForForward[0]?.id ?? null;
  }

  function openForwardModal(messageIds: string[]) {
    if (!messageIds.length) return;
    setForwardMessageIds(messageIds);
    setForwardTargetId(getPreferredForwardTarget());
    setForwardOpen(true);
  }

  async function handlePinToggle(messageId: string) {
    if (pinnedMessageId === messageId) {
      const { error } = await supabase
        .from("conversation_pins")
        .delete()
        .eq("conversation_id", conversationId);
      if (!error) {
        setPinnedMessageId(null);
        setPinnedAt(null);
      }
      return;
    }

    const { error } = await supabase.from("conversation_pins").upsert(
      {
        conversation_id: conversationId,
        message_id: messageId,
        pinned_by: currentUserId,
      },
      { onConflict: "conversation_id" }
    );
    if (!error) {
      await fetchPin();
    }
  }

  async function handleConfirmForward() {
    if (!forwardTargetId || forwardMessageIds.length === 0) return;
    const byId = new Map(messages.map((m) => [m.id, m]));

    setForwardSending(true);
    try {
      const ids = forwardMessageIds;
      for (const id of ids) {
        const msg = byId.get(id);
        if (!msg) continue;

        const orig = msg.content.trim();
        const forwardedText = orig ? `Переслано:\n${orig}` : "Переслано: Вложение";

        const { error: insertErr } = await supabase.from("messages").insert({
          conversation_id: forwardTargetId,
          sender_id: currentUserId,
          content: forwardedText,
          attachment_url: msg.attachment_url,
          reply_to_id: null,
        });
        if (insertErr) {
          alert(insertErr.message ?? "Не удалось переслать сообщение");
          return;
        }
      }

      setForwardOpen(false);
      setForwardMessageIds([]);
      setForwardTargetId(null);
      clearSelection();
    } finally {
      setForwardSending(false);
    }
  }

  useEffect(() => {
    setMessagesLoading(true);
    setHasMore(true);
    setLoadingOlder(false);
    setSelectedMessageIds(new Set());
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      const listDesc = (data ?? []) as Message[];
      const list = listDesc.reverse();
      setHasMore(listDesc.length === PAGE_SIZE);
      setMessages(list);
      await fetchReactions(list.map((m) => m.id));
      await fetchPin();
      setMessagesLoading(false);
      requestAnimationFrame(() => {
        const el = messagesScrollRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
      });
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

    const pinChannel = supabase
      .channel(`pins:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_pins", filter: `conversation_id=eq.${conversationId}` },
        () => {
          fetchPin();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(reactionChannel);
      supabase.removeChannel(pinChannel);
    };
  }, [conversationId, currentUserId, supabase, fetchReactions, fetchPin]);

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

  function openMediaViewer(url: string, createdAt: string) {
    setMediaViewer({ url, createdAt });
    setMediaZoom(1);
    setMediaPan({ x: 0, y: 0 });
    mediaDragRef.current = null;
  }

  function closeMediaViewer() {
    setMediaViewer(null);
    setMediaZoom(1);
    setMediaPan({ x: 0, y: 0 });
    mediaDragRef.current = null;
  }

  const fetchOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMore) return;
    if (searchQuery.trim()) return;

    const oldest = messages[0];
    if (!oldest) return;

    const el = messagesScrollRef.current;
    if (!el) return;

    setLoadingOlder(true);
    const prevScrollHeight = el.scrollHeight;
    const prevScrollTop = el.scrollTop;

    try {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .lt("created_at", oldest.created_at)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      const olderDesc = (data ?? []) as Message[];
      if (olderDesc.length === 0) {
        setHasMore(false);
        return;
      }

      const olderAsc = olderDesc.reverse();
      if (olderDesc.length < PAGE_SIZE) setHasMore(false);

      setMessages((prev) => [...olderAsc, ...prev]);

      // Reactions храним только для текущего загруженного окна.
      const combinedIds = [...olderAsc, ...messages].map((m) => m.id);
      await fetchReactions(combinedIds);

      requestAnimationFrame(() => {
        const el2 = messagesScrollRef.current;
        if (!el2) return;
        const heightDiff = el2.scrollHeight - prevScrollHeight;
        el2.scrollTop = prevScrollTop + heightDiff;
      });
    } catch (e) {
      // ignore network/rls errors
    } finally {
      setLoadingOlder(false);
    }
  }, [
    loadingOlder,
    hasMore,
    searchQuery,
    messages,
    supabase,
    conversationId,
    fetchReactions,
    PAGE_SIZE,
  ]);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    if (el.scrollTop <= 80) {
      fetchOlderMessages();
    }
  }, [fetchOlderMessages]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (forwardOpen) setForwardOpen(false);
      if (mediaViewer) {
        setMediaViewer(null);
        setMediaZoom(1);
        setMediaPan({ x: 0, y: 0 });
        mediaDragRef.current = null;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [forwardOpen, mediaViewer]);

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

  const selectedMessages = useMemo(
    () => messages.filter((m) => selectedMessageIds.has(m.id)),
    [messages, selectedMessageIds]
  );

  const pinnedMessage = useMemo(() => {
    if (!pinnedMessageId) return null;
    return messages.find((m) => m.id === pinnedMessageId) ?? null;
  }, [messages, pinnedMessageId]);

  async function handleBulkCopy() {
    if (selectedMessages.length === 0) return;
    const parts = selectedMessages.map((m) => {
      const t = m.content.trim();
      if (t) return t;
      if (m.attachment_url) return "Вложение";
      return "";
    });
    const text = parts.filter(Boolean).join("\n\n---\n\n");
    if (!text) return;
    await navigator.clipboard?.writeText(text);
    clearSelection();
  }

  function handleBulkReply() {
    if (!onReplyTo) return;
    if (selectedMessages.length === 0) return;
    onReplyTo(selectedMessages[0]);
    clearSelection();
  }

  function handleBulkForward() {
    const ids = Array.from(selectedMessageIds);
    openForwardModal(ids);
  }

  async function handleBulkDelete() {
    if (selectedMessages.length === 0) return;
    const ids = Array.from(selectedMessageIds);
    const ownIds = ids.filter((id) => messages.find((m) => m.id === id)?.sender_id === currentUserId);
    const otherCount = ids.length - ownIds.length;
    if (ownIds.length === 0) {
      alert("Можно удалить только свои сообщения");
      return;
    }
    if (otherCount > 0) {
      alert(`Удалится только ваши сообщения (${ownIds.length}).`);
    }

    for (const id of ownIds) {
      await handleDeleteMessage(id);
    }
    clearSelection();
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

  function getConversationLabel(c: ConversationItem): string {
    return c.type === "group"
      ? c.name ?? "Группа"
      : ((c.otherParticipant?.full_name || c.otherParticipant?.username) ?? "Чат");
  }

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
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
              {mediaItems.map((m) => (
                <div key={m.id} className="relative">
                  {m.isImage ? (
                    <button
                      type="button"
                      onClick={() => openMediaViewer(m.attachment_url!, m.created_at)}
                      className="group block w-full overflow-hidden rounded-lg bg-[var(--air-input-bg)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.attachment_url!}
                        alt="Вложение"
                        className="aspect-square w-full object-cover"
                      />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/40 px-1 py-1 text-center text-[10px] opacity-0 transition group-hover:opacity-100">
                        {formatMessageTime(m.created_at)}
                      </div>
                    </button>
                  ) : (
                    <a
                      href={m.attachment_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-lg bg-[var(--air-input-bg)]"
                    >
                      <div className="flex aspect-square items-center justify-center p-2 text-center text-[10px] [color:var(--air-text-muted)]">
                        Файл
                      </div>
                    </a>
                  )}
                </div>
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
    <div
      ref={messagesScrollRef}
      className="flex-1 overflow-y-auto p-4"
      onScroll={handleMessagesScroll}
    >
      {selectedMessageIds.size > 0 && (
        <div className="sticky top-0 z-20 mb-3 rounded-2xl border border-[var(--air-glass-border)] bg-[var(--air-glass)] px-3 py-2 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs [color:var(--air-text-muted)]">
              <CheckSquare className="h-3.5 w-3.5" />
              Выбрано: {selectedMessageIds.size}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={handleBulkCopy}
                className="rounded-xl px-2 py-1 text-xs [color:var(--air-text)] hover:bg-[var(--air-input-bg)]"
              >
                Копировать
              </button>
              {onReplyTo && (
                <button
                  type="button"
                  onClick={handleBulkReply}
                  className="rounded-xl px-2 py-1 text-xs [color:var(--air-text)] hover:bg-[var(--air-input-bg)]"
                >
                  Ответить
                </button>
              )}
              <button
                type="button"
                onClick={handleBulkForward}
                className="rounded-xl px-2 py-1 text-xs [color:var(--air-text)] hover:bg-[var(--air-input-bg)]"
              >
                Переслать
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-500 hover:bg-red-500/20"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {pinnedMessageId && (
        <div className="mb-3 flex justify-center">
          <button
            type="button"
            onClick={() => handleScrollToMessage(pinnedMessageId)}
            className="inline-flex max-w-full items-center gap-2 rounded-full bg-[var(--air-input-bg)] px-3 py-1.5 text-xs [color:var(--air-text-muted)] hover:[color:var(--air-text)] hover:bg-[var(--air-glass)]"
          >
            <Pin className="h-3.5 w-3.5" />
            <span className="font-medium">Закреплено</span>
            <span className="truncate opacity-90">
              {pinnedMessage?.content?.trim() || (pinnedMessage?.attachment_url ? "Вложение" : "Сообщение")}
            </span>
          </button>
        </div>
      )}

      {dateGroups.map((group) => (
        <div key={group.dateLabel} className="space-y-0.5">
          <div className="sticky top-0 z-10 flex justify-center py-1 bg-[var(--air-glass)]/70 backdrop-blur-sm">
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
              isPinned={msg.id === pinnedMessageId}
              isSelected={selectedMessageIds.has(msg.id)}
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
              onToggleSelect={toggleSelect}
              onForward={openForwardModal}
              onPinToggle={handlePinToggle}
              onAddReaction={handleAddReaction}
              onRemoveReaction={handleRemoveReaction}
              onReport={onReport}
              onMarkRead={handleMarkRead}
              onMentionClick={onMentionClick}
            />
          ))}
        </div>
      ))}
    </div>
      )}
      {forwardOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          onClick={() => setForwardOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--air-glass-border)] bg-[var(--air-surface)] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold [color:var(--air-text)]">
                <ForwardIcon className="h-4 w-4" />
                Переслать
              </div>
              <button
                type="button"
                onClick={() => setForwardOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full [color:var(--air-text-muted)] transition hover:bg-[var(--air-glass)] hover:[color:var(--air-text)]"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-xs [color:var(--air-text-muted)]">
              Сообщений: {forwardMessageIds.length}
            </p>

            <div className="mt-3 max-h-[55vh] overflow-y-auto space-y-1">
              {conversationsForForward.length === 0 ? (
                <p className="py-4 text-center text-sm [color:var(--air-text-muted)]">Нет доступных чатов</p>
              ) : (
                conversationsForForward.map((c) => {
                  const label = getConversationLabel(c);
                  const active = c.id === forwardTargetId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setForwardTargetId(c.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                        active
                          ? "border-[var(--air-accent)] bg-[var(--air-input-bg)]"
                          : "border-[var(--air-glass-border)] bg-[var(--air-glass)] hover:bg-[var(--air-input-bg)]"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          active ? "bg-[var(--air-accent)]" : "bg-[var(--air-border)]"
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForwardOpen(false)}
                className="rounded-xl px-3 py-2 text-xs [color:var(--air-text-muted)] hover:bg-[var(--air-glass)] hover:[color:var(--air-text)]"
                disabled={forwardSending}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmForward}
                disabled={!forwardTargetId || forwardSending}
                className="rounded-xl bg-[var(--air-accent)] px-3 py-2 text-xs text-white hover:opacity-90 disabled:opacity-50"
              >
                {forwardSending ? "Пересылаем..." : "Переслать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mediaViewer && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          onClick={closeMediaViewer}
          onWheel={(e) => {
            e.preventDefault();
            const step = e.deltaY < 0 ? 0.12 : -0.12;
            setMediaZoom((z) => {
              const next = Math.max(1, Math.min(4, z + step));
              return next;
            });
            setMediaPan({ x: 0, y: 0 });
          }}
        >
          <div
            className="relative h-full w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute left-4 top-4 rounded-xl bg-black/40 px-3 py-1 text-xs [color:var(--air-text)]">
              {formatMessageTime(mediaViewer.createdAt)}
            </div>
            <button
              type="button"
              onClick={closeMediaViewer}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 [color:var(--air-text)] transition hover:bg-black/60"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex h-full items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaViewer.url}
                alt="Просмотр"
                draggable={false}
                className="max-h-[88vh] max-w-[92vw] select-none"
                style={{
                  transform: `translate(${mediaPan.x}px, ${mediaPan.y}px) scale(${mediaZoom})`,
                  transformOrigin: "center center",
                  transition: mediaDragRef.current ? "none" : "transform 80ms ease-out",
                  cursor: mediaZoom > 1 ? "grab" : "zoom-in",
                }}
                onPointerDown={(e) => {
                  const target = e.currentTarget;
                  target.setPointerCapture(e.pointerId);
                  mediaDragRef.current = {
                    startX: e.clientX,
                    startY: e.clientY,
                    startPanX: mediaPan.x,
                    startPanY: mediaPan.y,
                  };
                }}
                onPointerMove={(e) => {
                  if (!mediaDragRef.current) return;
                  const dx = e.clientX - mediaDragRef.current.startX;
                  const dy = e.clientY - mediaDragRef.current.startY;
                  setMediaPan({
                    x: mediaDragRef.current.startPanX + dx,
                    y: mediaDragRef.current.startPanY + dy,
                  });
                }}
                onPointerUp={() => {
                  mediaDragRef.current = null;
                }}
                onPointerCancel={() => {
                  mediaDragRef.current = null;
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
