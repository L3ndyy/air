"use client";

import { useState } from "react";
import { ArrowLeft, Settings, Search, X } from "lucide-react";
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
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onClearSearch?: () => void;
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
  searchValue = "",
  onSearchChange,
  onClearSearch,
}: ChatHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const showSearch = searchOpen || (onSearchChange && searchValue.trim() !== "");

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
      {showSearch && onSearchChange ? (
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-[var(--air-input-bg)] px-2 py-1.5">
          <Search className="h-4 w-4 shrink-0 [color:var(--air-text-muted)]" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск по чату..."
            className="min-w-0 flex-1 bg-transparent text-sm [color:var(--air-text)] placeholder:[color:var(--air-text-muted)] focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              onClearSearch?.();
              setSearchOpen(false);
            }}
            className="shrink-0 rounded p-1 [color:var(--air-text-muted)] hover:bg-[var(--air-glass)] hover:[color:var(--air-text)]"
            aria-label="Закрыть поиск"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
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
      )}
      {!showSearch && onSearchChange && (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl [color:var(--air-text-muted)] transition hover:bg-[var(--air-glass)] hover:[color:var(--air-text)]"
          aria-label="Поиск по чату"
        >
          <Search className="h-5 w-5" />
        </button>
      )}
      {isGroup && onOpenGroupSettings && !showSearch && (
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
