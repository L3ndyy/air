"use client";

import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  content: string;
  isOwn: boolean;
  createdAt: string;
}

export function MessageBubble({ content, isOwn, createdAt }: MessageBubbleProps) {
  const time = new Date(createdAt).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

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
            : "bg-white/90 border border-gray-200/60 text-gray-800 shadow-air"
        )}
      >
        <p className="whitespace-pre-wrap break-words text-sm">{content}</p>
        <p
          className={cn(
            "mt-1 text-xs",
            isOwn ? "text-white/80" : "text-gray-400"
          )}
        >
          {time}
        </p>
      </div>
    </div>
  );
}
