"use client";

import { Avatar } from "@/components/ui";
import type { Profile } from "@/types/database";

interface ChatHeaderProps {
  title: string;
  avatarUrl?: string | null;
  fallback?: string;
  subtitle?: React.ReactNode;
}

export function ChatHeader({ title, avatarUrl, fallback, subtitle }: ChatHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200/60 bg-white/80 px-4 backdrop-blur-xl">
      <Avatar src={avatarUrl} fallback={fallback || title} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-800">{title}</p>
        {subtitle != null && (
          <div className="truncate text-xs text-gray-500">{subtitle}</div>
        )}
      </div>
    </header>
  );
}
