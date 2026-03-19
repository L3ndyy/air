"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Paperclip, X, Smile, Reply } from "lucide-react";
import { Button } from "@/components/ui";
import { EmojiPicker } from "./EmojiPicker";

export interface ReplyToState {
  id: string;
  content: string;
}

interface MentionSuggestion {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface ComposerProps {
  conversationId: string;
  replyTo?: ReplyToState | null;
  onClearReply?: () => void;
  isBanned?: boolean;
}

function getExtension(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i) : "";
}

export function Composer({ conversationId, replyTo, onClearReply, isBanned = false }: ComposerProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const lastSendAtRef = useRef(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const supabase = createClient();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
  const mentionAbortRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    if (!mentionOpen || !mentionQuery.trim()) {
      setMentionSuggestions([]);
      setMentionIndex(0);
      return;
    }

    const controller = new AbortController();
    mentionAbortRef.current?.abort();
    mentionAbortRef.current = controller;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?query=${encodeURIComponent(mentionQuery)}`, {
          credentials: "include",
          signal: controller.signal,
        });
        const data = await res.json().catch(() => []);
        setMentionSuggestions(Array.isArray(data) ? (data as MentionSuggestion[]) : []);
        setMentionIndex(0);
      } catch {
        // ignore abort/errors
      }
    }, 160);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [mentionOpen, mentionQuery]);

  const send = useCallback(async () => {
    const text = content.trim();
    const hasContent = text || pendingFile;
    const now = Date.now();
    if (!hasContent || sending || sendingRef.current || now - lastSendAtRef.current < 450) return;
    sendingRef.current = true;
    lastSendAtRef.current = now;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUploadError(null);
      let attachmentUrl: string | null = null;
      if (pendingFile) {
        const ext = getExtension(pendingFile.name);
        const path = `${conversationId}/${user.id}/${crypto.randomUUID()}${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("chat-files")
          .upload(path, pendingFile, { upsert: false });
        if (uploadErr) {
          const msg =
            uploadErr.message?.toLowerCase().includes("bucket") ||
            uploadErr.message?.toLowerCase().includes("not found")
              ? "Хранилище файлов не настроено. В Supabase выполните миграцию 20240316000006_chat_attachments.sql (Storage → создать бакет chat-files)."
              : uploadErr.message;
          setUploadError(msg);
          return;
        }
        const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
        attachmentUrl = urlData.publicUrl;
        setPendingFile(null);
      }
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: text || "",
        attachment_url: attachmentUrl,
        reply_to_id: replyTo?.id ?? null,
      });
      setContent("");
      onClearReply?.();
      const notifyBody = text?.slice(0, 100) || "Вложение";
      // Для хостингов вроде Onreza, где POST /api может давать 405, используем GET
      const params = new URLSearchParams({
        conversationId,
        title: "Air",
        body: notifyBody,
      });
      fetch(`/api/push/notify?${params.toString()}`, { credentials: "include" }).catch(() => {});
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [content, conversationId, pendingFile, replyTo?.id, sending, supabase, onClearReply]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  }, []);

  const insertEmoji = useCallback((emoji: string) => {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newContent = content.slice(0, start) + emoji + content.slice(end);
      setContent(newContent);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setContent((prev) => prev + emoji);
    }
  }, [content]);

  const insertMention = useCallback((username: string) => {
    if (!mentionRange) return;
    const before = content.slice(0, mentionRange.start);
    const after = content.slice(mentionRange.end);
    const next = `${before}@${username} ${after}`;
    const cursorPos = before.length + username.length + 2; // @ + username + space

    setContent(next);
    setMentionOpen(false);
    setMentionSuggestions([]);
    setMentionQuery("");
    setMentionRange(null);
    setMentionIndex(0);

    setTimeout(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(cursorPos, cursorPos);
    }, 0);
    onInput();
  }, [content, mentionRange, onInput]);

  const canSend = content.trim() || pendingFile;

  const adjustTextareaHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight, 40), 128)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  return (
    <div className="air-composer flex shrink-0 flex-col gap-2 border-t border-[var(--air-glass-border)] bg-[var(--air-surface)] p-3">
      {replyTo && (
        <div className="flex items-center gap-2 rounded-[12px] border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] px-3 py-2 text-sm [color:var(--air-text)]">
          <Reply className="h-4 w-4 shrink-0 [color:var(--air-text-muted)]" />
          <span className="min-w-0 flex-1 truncate" title={replyTo.content}>
            Ответ на: {replyTo.content.trim().slice(0, 60) || "сообщение"}
            {replyTo.content.trim().length > 60 ? "…" : ""}
          </span>
          <button
            type="button"
            onClick={onClearReply}
            className="shrink-0 rounded p-0.5 [color:var(--air-text-muted)] hover:[color:var(--air-text)]"
            aria-label="Отменить ответ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {pendingFile && (
        <div className="flex items-center gap-2 rounded-[12px] border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] px-3 py-2 text-sm [color:var(--air-text)]">
          <Paperclip className="h-4 w-4 shrink-0 [color:var(--air-text-muted)]" />
          <span className="min-w-0 flex-1 truncate" title={pendingFile.name}>
            {pendingFile.name}
          </span>
          <button
            type="button"
            onClick={() => setPendingFile(null)}
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs [color:var(--air-text-muted)] transition hover:bg-[var(--air-glass)] hover:[color:var(--air-text)]"
            aria-label="Убрать файл"
          >
            <X className="h-3.5 w-3.5" />
            Очистить
          </button>
        </div>
      )}
      {uploadError && (
        <p className="text-xs text-red-500">{uploadError}</p>
      )}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar,.7z,.tar,.gz,.bz2,application/zip,application/x-rar-compressed,application/x-7z-compressed,application/gzip,application/x-tar"
          onChange={onFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] [color:var(--air-text-muted)] transition hover:bg-[var(--air-glass)] hover:[color:var(--air-text)]"
          aria-label="Прикрепить файл"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <EmojiPicker
            open={emojiOpen}
            onClose={() => setEmojiOpen(false)}
            onSelect={insertEmoji}
            anchorRef={emojiButtonRef}
          />
          <button
            ref={emojiButtonRef}
            type="button"
            onClick={() => setEmojiOpen((v) => !v)}
            className="absolute left-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[12px] [color:var(--air-text-muted)] transition hover:bg-[var(--air-glass)] hover:[color:var(--air-text)]"
            aria-label="Эмодзи"
          >
            <Smile className="h-5 w-5" />
          </button>
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Сообщение..."
          value={content}
          onChange={(e) => {
            const nextValue = e.target.value;
            const cursor = e.target.selectionStart ?? nextValue.length;

            setContent(nextValue);
            onInput();

            const uptoCursor = nextValue.slice(0, cursor);
            const match = uptoCursor.match(/@([a-zA-Z0-9_]{1,32})$/);
            if (!match) {
              setMentionOpen(false);
              setMentionSuggestions([]);
              setMentionQuery("");
              setMentionRange(null);
              return;
            }

            const q = (match[1] ?? "").toLowerCase();
            const start = cursor - match[0].length;
            setMentionQuery(q);
            setMentionOpen(true);
            setMentionRange({ start, end: cursor });
          }}
          onFocus={onInput}
          onKeyDown={(e) => {
            if (mentionOpen) {
              if (e.key === "Escape") {
                e.preventDefault();
                setMentionOpen(false);
                setMentionSuggestions([]);
                setMentionQuery("");
                setMentionRange(null);
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionIndex((i) => Math.min(i + 1, Math.max(mentionSuggestions.length - 1, 0)));
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIndex((i) => Math.max(i - 1, 0));
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                if (mentionSuggestions.length > 0) {
                  e.preventDefault();
                  const chosen = mentionSuggestions[mentionIndex] ?? mentionSuggestions[0];
                  if (chosen) insertMention(chosen.username);
                  return;
                }
                setMentionOpen(false);
              }
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          className="min-h-[40px] max-h-[128px] w-full resize-none overflow-y-auto rounded-[12px] border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] pl-10 pr-4 py-2 text-sm leading-relaxed [color:var(--air-text)] placeholder:[color:var(--air-text-muted)] focus:border-[var(--air-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--air-accent)]/20 transition"
          style={{ height: "auto", minHeight: "40px", maxHeight: "128px" }}
        />
        {mentionOpen && mentionSuggestions.length > 0 && (
          <div className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[var(--air-glass-border)] bg-[var(--air-surface)] shadow-2xl">
            {mentionSuggestions.map((p, idx) => {
              const active = idx === mentionIndex;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => insertMention(p.username)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-[var(--air-input-bg)] ${
                    active ? "bg-[var(--air-input-bg)]" : ""
                  }`}
                >
                  <span className="min-w-0 truncate font-medium">
                    @{p.username}
                  </span>
                  {p.full_name ? (
                    <span className="min-w-0 truncate text-xs [color:var(--air-text-muted)]">
                      {p.full_name}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
        </div>
        <Button
          type="button"
          size="md"
          onClick={send}
          disabled={!canSend || sending || isBanned}
          className="shrink-0 rounded-[12px] bg-[var(--air-accent)] hover:opacity-90 border-0"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
