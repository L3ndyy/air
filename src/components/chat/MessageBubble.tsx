"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Trash2, Check, CheckCheck } from "lucide-react";

const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|svg)(\?|$)/i;

interface MessageBubbleProps {
  messageId: string;
  content: string;
  attachmentUrl?: string | null;
  isOwn: boolean;
  isRead?: boolean;
  createdAt: string;
  onDelete?: (id: string) => void;
}

export function MessageBubble({
  messageId,
  content,
  attachmentUrl,
  isOwn,
  isRead = false,
  createdAt,
  onDelete,
}: MessageBubbleProps) {
  const [showDelete, setShowDelete] = useState(false);
  const time = new Date(createdAt).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const isImage = attachmentUrl ? IMAGE_EXTS.test(attachmentUrl) : false;

  function handleDelete() {
    if (onDelete && confirm("Удалить сообщение?")) onDelete(messageId);
  }

  return (
    <div
      className={cn(
        "flex w-full",
        isOwn ? "justify-end" : "justify-start"
      )}
      onMouseEnter={() => isOwn && setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <div
        className={cn(
          "group relative max-w-[75%] rounded-2xl px-4 py-2",
          isOwn
            ? "bg-gradient-to-r from-blue-400 to-purple-500 text-white"
            : "bg-white/90 dark:bg-white/10 border border-gray-200/60 dark:border-[var(--air-glass-border)] text-gray-800 dark:[color:var(--air-text)] shadow-air"
        )}
      >
        {attachmentUrl && (
          <div className="mb-2">
            {isImage ? (
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachmentUrl}
                  alt="Вложение"
                  className="max-h-48 w-full object-cover"
                />
              </a>
            ) : (
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm underline"
              >
                Скачать файл
              </a>
            )}
          </div>
        )}
        {content.trim() ? (
          <p className="whitespace-pre-wrap break-words text-sm">{content}</p>
        ) : null}
        <div className="mt-1 flex items-center justify-end gap-1">
          {isOwn && (
            <>
              <span className="text-xs opacity-80" title={isRead ? "Просмотрено" : "Доставлено"}>
                {isRead ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              </span>
              {showDelete && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded p-0.5 opacity-70 hover:opacity-100"
                  aria-label="Удалить"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
          <span
            className={cn(
              "text-xs",
              isOwn ? "text-white/80" : "text-gray-400 dark:[color:var(--air-text-muted)]"
            )}
          >
            {time}
          </span>
        </div>
      </div>
    </div>
  );
}
