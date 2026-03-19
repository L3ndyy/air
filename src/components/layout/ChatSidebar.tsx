"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MessageCircle, User, Plus, Search, Shield, Download } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { Profile } from "@/types/database";

export interface ConversationItem {
  id: string;
  type: "direct" | "group";
  name: string | null;
  avatar_url: string | null;
  otherParticipant?: Profile | null;
  lastMessage?: { content: string; created_at: string } | null;
  unreadCount?: number;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (sameDay) return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (isYesterday) return "Вчера";
  if (now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return d.toLocaleDateString("ru-RU", { weekday: "short" });
  }
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

interface ChatSidebarProps {
  conversations: ConversationItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  profile: Profile | null;
  onlineUserIds?: Set<string>;
  loading?: boolean;
  onNewChatClick: () => void;
  onStartChatWithUsername?: (username: string) => void;
  className?: string;
}

export function ChatSidebar({
  conversations,
  selectedId,
  onSelect,
  profile,
  onlineUserIds = new Set(),
  loading = false,
  onNewChatClick,
  onStartChatWithUsername,
  className = "",
}: ChatSidebarProps) {
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<{ id: string; username: string; full_name: string | null; avatar_url: string | null }[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const searchParams = useSearchParams();
  const isProfileOpen = searchParams.get("panel") === "profile";
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/admin/check", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setIsAdmin(!!d.admin))
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) {
      setUserSearchResults([]);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setUserSearchLoading(true);
      fetch(`/api/users/search?query=${encodeURIComponent(q)}`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          setUserSearchResults(Array.isArray(data) ? data : []);
        })
        .catch(() => setUserSearchResults([]))
        .finally(() => setUserSearchLoading(false));
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [search]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (searchContainerRef.current?.contains(e.target as Node)) return;
      setUserSearchResults([]);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      const label =
        c.type === "group"
          ? (c.name ?? "Группа")
          : ((c.otherParticipant?.full_name || c.otherParticipant?.username) ?? "");
      return label.toLowerCase().includes(q);
    });
  }, [conversations, search]);

  return (
    <aside
      className={`flex w-[320px] max-w-[350px] shrink-0 flex-col border-r border-[var(--air-glass-border)] bg-[var(--air-surface)] backdrop-blur-xl ${className}`}
    >
      {/* Header: logo + search — Telegram-style */}
      <div className="shrink-0 border-b border-[var(--air-glass-border)] px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--air-accent)] text-white shadow-sm">
            <MessageCircle className="h-5 w-5" />
          </div>
          <span className="font-semibold [color:var(--air-text)]">Air</span>
        </div>
        <div className="relative mt-3" ref={searchContainerRef}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 [color:var(--air-text-muted)]" />
          <input
            type="text"
            placeholder="Поиск чатов и пользователей"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[12px] border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] py-2 pl-9 pr-3 text-sm [color:var(--air-text)] placeholder:[color:var(--air-text-muted)] focus:border-[var(--air-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--air-accent)]/30 transition"
          />
          {search.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-surface)] shadow-xl">
              {userSearchLoading ? (
                <div className="px-3 py-4 text-center text-xs [color:var(--air-text-muted)]">Поиск…</div>
              ) : userSearchResults.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs [color:var(--air-text-muted)]">Нет пользователей по запросу</div>
              ) : (
                <ul className="py-1">
                  {userSearchResults
                    .filter((u) => u.id !== profile?.id)
                    .map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onStartChatWithUsername?.(u.username);
                            setSearch("");
                            setUserSearchResults([]);
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-[var(--air-input-bg)] [color:var(--air-text)]"
                        >
                          <Avatar src={u.avatar_url} fallback={u.full_name || u.username} size="sm" className="h-9 w-9" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">@{u.username}</p>
                            {u.full_name && <p className="truncate text-xs [color:var(--air-text-muted)]">{u.full_name}</p>}
                          </div>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New chat button */}
      <div className="shrink-0 px-3 pt-3">
        <button
          type="button"
          onClick={onNewChatClick}
          className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--air-accent)] py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95 active:scale-[0.99]"
        >
          <Plus className="h-5 w-5" />
          Новый чат
        </button>
      </div>

      {/* Chat list with stagger */}
      <ul className="flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-[var(--air-glass-border)]" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="h-4 w-24 animate-pulse rounded bg-[var(--air-glass-border)]" />
                <div className="h-3 w-32 animate-pulse rounded bg-[var(--air-glass-border)]" />
              </div>
            </li>
          ))
        ) : filtered.map((c, index) => {
          const label =
            c.type === "group"
              ? (c.name ?? "Группа")
              : ((c.otherParticipant?.full_name || c.otherParticipant?.username) ?? "Чат");
          const isSelected = c.id === selectedId;
          const avatarUrl = c.type === "group" ? c.avatar_url : c.otherParticipant?.avatar_url;
          const fallback =
            c.type === "group"
              ? (c.name?.[0] ?? "Г")
              : ((c.otherParticipant?.full_name?.[0] || c.otherParticipant?.username?.[0]) ?? "?");
          return (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.25 }}
              className="mb-0.5"
            >
              <div className="flex w-full items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={`flex min-w-0 flex-1 items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors duration-200 ${
                    isSelected
                      ? "bg-[var(--air-input-bg)]"
                      : "hover:bg-[var(--air-input-bg)]/70"
                  } ${isSelected ? "border-l-4 border-l-[var(--air-accent)] pl-[calc(0.75rem-4px)]" : ""}`}
                >
                  <div className="relative h-10 w-10 shrink-0">
                    <Avatar
                      src={avatarUrl}
                      fallback={label}
                      size="sm"
                      className="h-10 w-10 text-sm"
                    />
                    {c.type === "direct" && c.otherParticipant?.id && onlineUserIds.has(c.otherParticipant.id) && (
                      <span
                        className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--air-surface)] bg-emerald-500"
                        title="в сети"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold [color:var(--air-text)]">{label}</p>
                    {c.lastMessage && (
                      <p className="truncate text-xs text-air-muted">{c.lastMessage.content}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {(c.unreadCount ?? 0) > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--air-accent)] px-1.5 text-xs font-medium text-white">
                        {c.unreadCount! > 99 ? "99+" : c.unreadCount}
                      </span>
                    )}
                    {c.lastMessage && (
                      <span className="text-[11px] text-air-muted">
                        {formatTime(c.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                </button>
                {/* Специальной кнопки профиля в списке чатов больше нет — заход в профиль через аватар в самом чате */}
              </div>
            </motion.li>
          );
        })}
      </ul>

      {/* Theme + Profile + Download */}
      <div className="shrink-0 border-t border-[var(--air-glass-border)] p-3 space-y-1">
        <ThemeToggle />
        <Link
          href="/download"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm [color:var(--air-text-muted)] transition-colors duration-200 hover:bg-white/50 hover:[color:var(--air-text)]"
        >
          <Download className="h-4 w-4 shrink-0" />
          <span>Скачать для Windows</span>
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm [color:var(--air-text-muted)] transition-colors duration-200 hover:bg-white/50 hover:[color:var(--air-text)]"
          >
            <Shield className="h-4 w-4 shrink-0" />
            <span>Админка</span>
          </Link>
        )}
        <Link
          href="/chat?panel=profile"
          className={`flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm transition-colors duration-200 ${
            isProfileOpen ? "bg-[var(--air-input-bg)] [color:var(--air-text)]" : "[color:var(--air-text-muted)] hover:bg-[var(--air-input-bg)]/70"
          }`}
        >
          <Avatar
            src={profile?.avatar_url}
            fallback={profile?.full_name || profile?.username || "?"}
            size="sm"
          />
          <span className="min-w-0 truncate font-medium [color:var(--air-text)]">
            {profile?.full_name || profile?.username || "Профиль"}
          </span>
          <User className="ml-auto h-4 w-4 shrink-0 opacity-60" />
        </Link>
      </div>
    </aside>
  );
}
