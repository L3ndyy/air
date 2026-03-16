"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui";

interface ComposerProps {
  conversationId: string;
}

function getExtension(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i) : "";
}

export function Composer({ conversationId }: ComposerProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const supabase = createClient();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const hasContent = text || pendingFile;
    if (!hasContent || sending) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSending(true);
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
        setSending(false);
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
    });
    setContent("");
    setSending(false);
  }, [content, conversationId, pendingFile, sending, supabase]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  }, []);

  const canSend = content.trim() || pendingFile;

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--air-glass-border)] bg-[var(--air-glass)] p-3 backdrop-blur-xl">
      {pendingFile && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] px-3 py-2 text-sm [color:var(--air-text)]">
          <Paperclip className="h-4 w-4 shrink-0 [color:var(--air-text-muted)]" />
          <span className="min-w-0 truncate">{pendingFile.name}</span>
          <button
            type="button"
            onClick={() => setPendingFile(null)}
            className="shrink-0 rounded p-0.5 [color:var(--air-text-muted)] hover:[color:var(--air-text)]"
            aria-label="Убрать файл"
          >
            <X className="h-4 w-4" />
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
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
          onChange={onFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] [color:var(--air-text-muted)] transition hover:bg-white/10 hover:[color:var(--air-text)]"
          aria-label="Прикрепить файл"
        >
          <Paperclip className="h-5 w-5" />
        </button>
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
          className="flex-1 rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] px-4 py-2 text-sm [color:var(--air-text)] placeholder:[color:var(--air-text-muted)] focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
        />
        <Button
          type="button"
          size="md"
          onClick={send}
          disabled={!canSend || sending}
          className="shrink-0"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
