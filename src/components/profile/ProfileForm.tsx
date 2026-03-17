"use client";

import { useState, useEffect } from "react";
import { Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

interface ProfileFormProps {
  profile: Profile | null;
  onSaved?: (updated: Partial<Profile>) => void;
}

export function ProfileForm({ profile, onSaved }: ProfileFormProps) {
  const [username, setUsername] = useState(profile?.username ?? "");
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [status, setStatus] = useState(profile?.status ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? "");
      setFullName(profile.full_name ?? "");
      setStatus(profile.status ?? "");
    }
  }, [profile]);

  async function checkUsernameAvailable(value: string): Promise<boolean> {
    if (!profile || !value || value.length < 3) return false;
    const normalized = value.toLowerCase().trim();
    if (!USERNAME_REGEX.test(normalized)) return false;
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", normalized)
      .maybeSingle();
    return !data || data.id === profile.id;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setUsernameError(null);
    const rawUsername = username.trim().toLowerCase();
    if (rawUsername.length < 3) {
      setUsernameError("Минимум 3 символа");
      return;
    }
    if (!USERNAME_REGEX.test(rawUsername)) {
      setUsernameError("Только латиница, цифры и _");
      return;
    }
    const available = await checkUsernameAvailable(rawUsername);
    if (!available) {
      setUsernameError("Этот username уже занят");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from("profiles")
      .update({
        username: rawUsername,
        full_name: fullName.trim(),
        status: status.trim(),
      })
      .eq("id", profile.id);
    setSaving(false);
    if (err) setError(err.message);
    else {
      onSaved?.({ username: rawUsername, full_name: fullName.trim(), status: status.trim() });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium [color:var(--air-text-muted)]">Username</label>
        <div className="flex items-center rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] px-3 focus-within:border-[var(--air-accent)] focus-within:ring-2 focus-within:ring-[var(--air-glow)]">
          <span className="[color:var(--air-text-muted)]">@</span>
          <input
            type="text"
            placeholder="например ivan_petrov"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setUsernameError(null);
            }}
            className="min-w-0 flex-1 border-0 bg-transparent py-2.5 pl-1 pr-2 [color:var(--air-text)] placeholder:[color:var(--air-text-muted)] focus:outline-none focus:ring-0"
          />
        </div>
        <p className="mt-1 text-xs [color:var(--air-text-muted)]">Латиница, цифры и _ — можно менять, если ник не занят</p>
        {usernameError && <p className="mt-1 text-sm text-red-500">{usernameError}</p>}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium [color:var(--air-text-muted)]">Имя</label>
        <Input
          placeholder="Ваше имя"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium [color:var(--air-text-muted)]">Описание</label>
        <Input
          placeholder="Расскажите о себе"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
      </div>
      {error && <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-500">{error}</p>}
      <Button type="submit" className="w-full" isLoading={saving}>
        Сохранить
      </Button>
    </form>
  );
}
