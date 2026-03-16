"use client";

import { cn } from "@/lib/utils";

const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|svg)(\?|$)/i;

interface MessageBubbleProps {
  content: string;
  attachmentUrl?: string | null;
  isOwn: boolean;
  createdAt: string;
}

export function MessageBubble({ content, attachmentUrl, isOwn, createdAt }: MessageBubbleProps) {
  const time = new Date(createdAt).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const isImage = attachmentUrl ? IMAGE_EXTS.test(attachmentUrl) : false;

  return (
    <div
      className={cn(
        "flex w-full",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2",
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
        <p
          className={cn(
            "mt-1 text-xs",
            isOwn ? "text-white/80" : "text-gray-400 dark:[color:var(--air-text-muted)]"
          )}
        >
          {time}
        </p>
      </div>
    </div>
  );
}
