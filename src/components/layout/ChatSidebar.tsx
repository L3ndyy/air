"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MessageCircle, User, Plus, Search, Shield } from "lucide-react";
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
  onNewChatClick: () => void;
  className?: string;
}

export function ChatSidebar({
  conversations,
  selectedId,
  onSelect,
  profile,
  onNewChatClick,
  className = "",
}: ChatSidebarProps) {
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const searchParams = useSearchParams();
  const isProfileOpen = searchParams.get("panel") === "profile";

  useEffect(() => {
    fetch("/api/admin/check", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setIsAdmin(!!d.admin))
      .catch(() => setIsAdmin(false));
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
      className={`flex w-[320px] max-w-[350px] shrink-0 flex-col border-r border-[var(--air-glass-border)] bg-[var(--air-glass)] backdrop-blur-xl ${className}`}
    >
      {/* Header: logo + search */}
      <div className="shrink-0 border-b border-[var(--air-glass-border)] px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-air-accent text-white shadow-glow-sm">
            <MessageCircle className="h-5 w-5" />
          </div>
          <span className="font-semibold [color:var(--air-text)]">Air</span>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 [color:var(--air-text-muted)]" />
          <input
            type="text"
            placeholder="Поиск"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] py-2 pl-9 pr-3 text-sm [color:var(--air-text)] placeholder:[color:var(--air-text-muted)] focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
          />
        </div>
      </div>

      {/* New chat button */}
      <div className="shrink-0 px-3 pt-3">
        <button
          type="button"
          onClick={onNewChatClick}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-air-accent py-2.5 text-sm font-medium text-white shadow-air-md transition hover:opacity-95 active:scale-[0.99]"
        >
          <Plus className="h-5 w-5" />
          Новый чат
        </button>
      </div>

      {/* Chat list with stagger */}
      <ul className="flex-1 overflow-y-auto px-2 py-2">
        {filtered.map((c, index) => {
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
                  className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200 ${
                    isSelected
                      ? "bg-gradient-to-r from-indigo-50/90 to-transparent dark:from-indigo-500/20"
                      : "hover:bg-white/50 dark:hover:bg-white/10"
                  } ${isSelected ? "border-l-4 border-l-[var(--air-accent)] pl-[calc(0.75rem-4px)]" : ""}`}
                >
                  <Avatar
                    src={avatarUrl}
                    fallback={label}
                    size="sm"
                    className="h-10 w-10 shrink-0 text-sm"
                  />
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

      {/* Theme + Profile */}
      <div className="shrink-0 border-t border-[var(--air-glass-border)] p-3 space-y-1">
        <ThemeToggle />
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
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200 ${
            isProfileOpen ? "bg-indigo-50/80 dark:bg-indigo-500/20 [color:var(--air-text)]" : "[color:var(--air-text-muted)] hover:bg-white/50"
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
