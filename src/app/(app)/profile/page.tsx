"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { ProfileForm } from "@/components/profile/ProfileForm";
import type { Profile } from "@/types/database";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [is500, setIs500] = useState(false);
  const supabase = createClient();

  async function loadProfile() {
    setLoading(true);
    setError(null);
    setIs500(false);
    try {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (res.status === 401) {
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Не удалось загрузить профиль");
        setIs500(res.status === 500);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setProfile(data);
    } catch {
      setError("Не удалось загрузить профиль");
      setIs500(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
  }, [supabase]);

  async function handleAvatarUpload(file: File) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
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

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          <p className="text-sm text-gray-500">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-gray-600">{error || "Профиль не найден"}</p>
        {is500 && (
          <p className="max-w-sm text-sm text-gray-500">
            Добавьте в переменные окружения (ONREZA и локально) ключ{" "}
            <code className="rounded bg-gray-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> из Supabase → Settings → API.
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={() => loadProfile()}>
            Повторить
          </Button>
          <Link href="/chat">
            <Button variant="secondary">Вернуться в чаты</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 justify-center overflow-y-auto bg-gradient-to-b from-gray-50/80 to-white p-6">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-gray-200/60 bg-white/95 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-sm">
          <div className="flex flex-col items-center text-center">
            <AvatarPicker
              currentUrl={profile.avatar_url}
              fallback={profile.full_name || profile.username}
              onUpload={handleAvatarUpload}
              onEmojiSelect={handleEmojiSelect}
            />
            <h1 className="mt-4 text-2xl font-semibold text-gray-800">Профиль</h1>
            <p className="mt-1 text-sm text-gray-500">Настройте имя, ник и статус</p>
          </div>
          <div className="mt-8 border-t border-gray-100 pt-8">
            <ProfileForm
              profile={profile}
              onSaved={(updated) => {
                if (updated) setProfile((prev) => (prev ? { ...prev, ...updated } : null));
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
