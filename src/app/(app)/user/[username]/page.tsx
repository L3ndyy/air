"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, X } from "lucide-react";
import { Button, Avatar } from "@/components/ui";
import type { Profile } from "@/types/database";

const EMOJI_PREFIX = "emoji:";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = typeof params?.username === "string" ? params.username : "";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomAvatar, setZoomAvatar] = useState(false);
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
    return () => { cancelled = true; };
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
        return;
      }
      const resGet = await fetch(
        `/api/conversations/direct?username=${encodeURIComponent(profile.username)}`,
        { credentials: "include" }
      );
      const dataGet = await resGet.json().catch(() => ({}));
      if (resGet.ok && dataGet.id) {
        router.push(`/chat?conversation=${dataGet.id}`);
      } else {
        setError((dataGet.error as string) || data.error || "Не удалось начать чат");
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setStartingChat(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--air-accent)] border-t-transparent" />
        <p className="text-sm [color:var(--air-text-muted)]">Загрузка профиля...</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-center [color:var(--air-text-muted)]">{error}</p>
        <Link href="/chat">
          <Button variant="secondary">Вернуться в чаты</Button>
        </Link>
      </div>
    );
  }

  if (!profile) return null;

  const isEmojiAvatar = profile.avatar_url?.startsWith(EMOJI_PREFIX);
  const emojiChar = isEmojiAvatar && profile.avatar_url
    ? profile.avatar_url.slice(EMOJI_PREFIX.length)
    : null;
  const displayName = profile.full_name || profile.username || "Пользователь";

  return (
    <>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--air-glass-border)] bg-[var(--air-glass)] px-3 backdrop-blur-xl md:px-4">
          <Link
            href="/chat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl [color:var(--air-text-muted)] transition hover:bg-[var(--air-glass)] hover:[color:var(--air-text)]"
            aria-label="Назад"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-semibold [color:var(--air-text)]">Профиль</span>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto flex max-w-sm flex-col items-center">
            <button
              type="button"
              onClick={() => setZoomAvatar(true)}
              className="rounded-2xl ring-2 ring-[var(--air-glass-border)] ring-offset-2 ring-offset-[var(--air-bg)] transition hover:ring-[var(--air-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--air-accent)]"
              aria-label="Увеличить фото"
            >
              <Avatar
                src={profile.avatar_url}
                fallback={displayName}
                size="xl"
                className="h-28 w-28 md:h-36 md:w-36 text-4xl md:text-5xl"
              />
            </button>
            <h1 className="mt-4 text-xl font-bold [color:var(--air-text)]">{displayName}</h1>
            <p className="text-sm [color:var(--air-text-muted)]">@{profile.username}</p>
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
        </div>
      </div>

      {/* Fullscreen avatar zoom */}
      {zoomAvatar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomAvatar(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Escape" && setZoomAvatar(false)}
          aria-label="Закрыть"
        >
          <button
            type="button"
            onClick={() => setZoomAvatar(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Закрыть"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {emojiChar ? (
              <span
                className="block text-center text-8xl md:text-9xl"
                style={{ lineHeight: 1 }}
              >
                {emojiChar}
              </span>
            ) : profile.avatar_url && !isEmojiAvatar ? (
              <Image
                src={profile.avatar_url}
                alt={displayName}
                width={400}
                height={400}
                className="max-h-[85vh] w-auto rounded-2xl object-contain"
                unoptimized={profile.avatar_url.includes("supabase") || profile.avatar_url.startsWith("blob:")}
              />
            ) : (
              <Avatar
                src={null}
                fallback={displayName}
                size="xl"
                className="h-48 w-48 text-6xl"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
