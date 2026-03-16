"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { ProfileForm } from "@/components/profile/ProfileForm";
import type { Profile } from "@/types/database";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (fetchError) {
        setError("Не удалось загрузить профиль");
        setLoading(false);
        return;
      }
      if (data) {
        setProfile(data);
      } else {
        const { data: upserted } = await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              username: "user_" + user.id.slice(0, 8),
              full_name: (user.user_metadata?.full_name as string) || "",
            },
            { onConflict: "id" }
          )
          .select("*")
          .single();
        if (upserted) setProfile(upserted);
        else {
          const { data: retry } = await supabase.from("profiles").select("*").eq("id", user.id).single();
          setProfile(retry ?? null);
          if (!retry) setError("Ошибка создания профиля");
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-gray-600">{error || "Профиль не найден"}</p>
        <Link href="/chat">
          <Button variant="secondary">Вернуться в чаты</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 justify-center overflow-y-auto p-6">
      <Card className="w-full max-w-md border-gray-200/60 shadow-air-md">
        <CardHeader className="space-y-1 pb-4 pt-6 text-center">
          <AvatarPicker
            currentUrl={profile.avatar_url}
            fallback={profile.full_name || profile.username}
            onUpload={handleAvatarUpload}
            onEmojiSelect={handleEmojiSelect}
          />
          <CardTitle className="pt-2 text-xl">Профиль</CardTitle>
          <p className="text-sm text-gray-500">@{profile.username}</p>
        </CardHeader>
        <CardContent className="border-t border-gray-100 pb-8 pt-6">
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}
