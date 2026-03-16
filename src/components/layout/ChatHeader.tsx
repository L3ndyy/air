"use client";

import { ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/ui";

interface ChatHeaderProps {
  title: string;
  avatarUrl?: string | null;
  fallback?: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
}

export function ChatHeader({ title, avatarUrl, fallback, subtitle, onBack }: ChatHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--air-glass-border)] bg-[var(--air-glass)] px-3 backdrop-blur-xl md:px-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl [color:var(--air-text-muted)] transition hover:bg-white/50 dark:hover:bg-white/10 md:hidden"
          aria-label="Назад к чатам"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <Avatar src={avatarUrl} fallback={fallback || title} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold [color:var(--air-text)]">{title}</p>
        {subtitle != null && (
          <div className="truncate text-xs text-air-muted">{subtitle}</div>
        )}
      </div>
    </header>
  );
}
