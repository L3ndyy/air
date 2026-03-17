"use client";

import { ArrowLeft, Settings } from "lucide-react";
import { Avatar } from "@/components/ui";

interface ChatHeaderProps {
  title: string;
  avatarUrl?: string | null;
  fallback?: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  isGroup?: boolean;
  onOpenGroupSettings?: () => void;
  onOpenProfile?: () => void;
}

export function ChatHeader({
  title,
  avatarUrl,
  fallback,
  subtitle,
  onBack,
  isGroup,
  onOpenGroupSettings,
  onOpenProfile,
}: ChatHeaderProps) {
  const headerContent = (
    <>
      <Avatar src={avatarUrl} fallback={fallback || title} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold [color:var(--air-text)]">{title}</p>
        {subtitle != null && (
          <div className="truncate text-xs text-air-muted">{subtitle}</div>
        )}
      </div>
    </>
  );

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--air-glass-border)] bg-[var(--air-glass)] px-3 backdrop-blur-xl md:px-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl [color:var(--air-text-muted)] transition hover:bg-[var(--air-glass)] hover:[color:var(--air-text)] md:hidden"
          aria-label="Назад к чатам"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <button
        type="button"
        onClick={onOpenProfile}
        disabled={!onOpenProfile}
        className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 pr-2 ${
          onOpenProfile
            ? "transition hover:bg-[var(--air-glass)]"
            : "cursor-default"
        }`}
      >
        {headerContent}
      </button>
      {isGroup && onOpenGroupSettings && (
        <button
          type="button"
          onClick={onOpenGroupSettings}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl [color:var(--air-text-muted)] transition hover:bg-[var(--air-glass)] hover:[color:var(--air-text)]"
          aria-label="Настройки группы"
        >
          <Settings className="h-5 w-5" />
        </button>
      )}
    </header>
  );
}
