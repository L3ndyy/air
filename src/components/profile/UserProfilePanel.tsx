"use client";

import { useEffect, useState } from "react";
import { X, MessageCircle } from "lucide-react";
import { Avatar, Button, PremiumBadge } from "@/components/ui";
import type { Profile } from "@/types/database";
import { useRouter } from "next/navigation";

const EMOJI_PREFIX = "emoji:";

interface UserProfilePanelProps {
  username: string;
  onClose: () => void;
  onlineUserIds?: Set<string>;
}

export function UserProfilePanel({ username, onClose, onlineUserIds = new Set() }: UserProfilePanelProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      setError("Не указан пользователь");
      return;
    }
    let cancelled = false;
    fetch(`/api/profile/${encodeURIComponent(username)}`, { credentials: "include" })
      .then((res) => {
        if (cancelled) return null;
        if (!res.ok) {
          if (res.status === 404) setError("Пользователь не найден");
          else setError("Не удалось загрузить профиль");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) setProfile(data);
      })
      .catch(() => {
        if (!cancelled) setError("Ошибка загрузки");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  async function handleStartChat() {
    if (!profile?.username || startingChat) return;
    setStartingChat(true);
    try {
      const res = await fetch("/api/conversations/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: profile.username }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.id) {
        router.push(`/chat?conversation=${data.id}`);
        onClose();
        return;
      }
      const resGet = await fetch(
        `/api/conversations/direct?username=${encodeURIComponent(profile.username)}`,
        { credentials: "include" }
      );
      const dataGet = await resGet.json().catch(() => ({}));
      if (resGet.ok && dataGet.id) {
        router.push(`/chat?conversation=${dataGet.id}`);
        onClose();
      } else {
        setError((dataGet.error as string) || data.error || "Не удалось начать чат");
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setStartingChat(false);
    }
  }

  const isEmojiAvatar = profile?.avatar_url?.startsWith(EMOJI_PREFIX);
  const emojiChar =
    isEmojiAvatar && profile?.avatar_url
      ? profile.avatar_url.slice(EMOJI_PREFIX.length)
      : null;
  const displayName = profile?.full_name || profile?.username || "Пользователь";

  return (
    <>
      <div
        className="absolute inset-0 z-10 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute right-0 top-0 z-20 flex h-full w-full max-w-md flex-col bg-[var(--air-surface)] shadow-2xl [color:var(--air-text)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--air-glass-border)] px-4 py-3">
          <span className="text-sm font-medium [color:var(--air-text-muted)]">Профиль</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full [color:var(--air-text-muted)] transition hover:bg-[var(--air-glass)] hover:[color:var(--air-text)]"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--air-accent)] border-t-transparent" />
              <p className="text-sm [color:var(--air-text-muted)]">Загрузка профиля...</p>
            </div>
          )}
          {!loading && error && !profile && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8">
              <p className="text-center text-sm [color:var(--air-text-muted)]">{error}</p>
            </div>
          )}
          {profile && (
            <div className="mx-auto flex max-w-sm flex-col items-center">
              <button
                type="button"
                onClick={() => {}}
                className="rounded-2xl ring-2 ring-[var(--air-glass-border)] ring-offset-2 ring-offset-[var(--air-bg)]"
                aria-label="Аватар"
              >
                <Avatar
                  src={profile.avatar_url}
                  fallback={displayName}
                  size="xl"
                  className="h-28 w-28 md:h-36 md:w-36 text-4xl md:text-5xl"
                />
              </button>
              <h1 className="mt-4 flex items-center justify-center gap-1.5 text-xl font-bold [color:var(--air-text)]">
                {displayName}
                {profile.is_premium && <PremiumBadge size="md" className="shrink-0" />}
              </h1>
              <p className="text-sm [color:var(--air-text-muted)]">@{profile.username}</p>
              {profile.id && onlineUserIds.has(profile.id) && (
                <p className="mt-1 flex items-center justify-center gap-1.5 text-xs [color:var(--air-text-muted)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  в сети
                </p>
              )}
              {profile.status && (
                <p className="mt-3 max-w-md text-center text-sm leading-relaxed [color:var(--air-text-muted)]">
                  {profile.status}
                </p>
              )}
              <Button
                className="mt-6 w-full gap-2"
                onClick={handleStartChat}
                isLoading={startingChat}
                disabled={startingChat}
              >
                <MessageCircle className="h-5 w-5" />
                Написать
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

