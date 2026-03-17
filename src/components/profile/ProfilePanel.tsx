"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { ProfileForm } from "@/components/profile/ProfileForm";
import type { Profile } from "@/types/database";

interface ProfilePanelProps {
  onClose: () => void;
}

export function ProfilePanel({ onClose }: ProfilePanelProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (cancelled) return;
      if (!res.ok) {
        setError("Не удалось загрузить профиль");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setProfile(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const sb = createClient();
    const channel = sb.channel("app:online");
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const { data: { user } } = await sb.auth.getUser();
        if (user) channel.track({ user_id: user.id });
        setIsOnline(true);
      }
    });
    return () => {
      sb.removeChannel(channel);
      setIsOnline(false);
    };
  }, []);

  async function handleAvatarUpload(file: File) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);
    setProfile((prev) => (prev ? { ...prev, avatar_url: urlData.publicUrl } : null));
  }

  async function handleEmojiSelect(emoji: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const value = "emoji:" + emoji;
    await supabase.from("profiles").update({ avatar_url: value }).eq("id", user.id);
    setProfile((prev) => (prev ? { ...prev, avatar_url: value } : null));
  }

  return (
    <>
      <div className="absolute inset-0 z-10 bg-black/20 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
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
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--air-accent)] border-t-transparent" />
              <p className="mt-3 text-sm [color:var(--air-text-muted)]">Загрузка...</p>
            </div>
          )}
          {error && !profile && (
            <div className="p-6 text-center [color:var(--air-text-muted)]">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 text-sm text-[var(--air-accent)] hover:underline"
              >
                Повторить
              </button>
            </div>
          )}
          {profile && !loading && (
            <div className="bg-[var(--air-glass)]/50 p-6">
              <div className="flex flex-col items-center text-center">
                <AvatarPicker
                  currentUrl={profile.avatar_url}
                  fallback={profile.full_name || profile.username}
                  onUpload={handleAvatarUpload}
                  onEmojiSelect={handleEmojiSelect}
                />
                <h1 className="mt-4 text-xl font-semibold [color:var(--air-text)]">Профиль</h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm [color:var(--air-text-muted)]">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-[var(--air-border)]"}`}
                    title={isOnline ? "в сети" : "не в сети"}
                  />
                  {isOnline ? "в сети" : "не в сети"}
                </p>
                <p className="mt-0.5 text-xs [color:var(--air-text-muted)]">Настройте имя, ник и описание</p>
              </div>
              <div className="mt-8 border-t border-[var(--air-glass-border)] pt-6">
                <ProfileForm
                  profile={profile}
                  onSaved={(updated) => updated && setProfile((prev) => (prev ? { ...prev, ...updated } : null))}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
