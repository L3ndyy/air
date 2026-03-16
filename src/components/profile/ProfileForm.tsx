"use client";

import { useState, useEffect } from "react";
import { Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

interface ProfileFormProps {
  profile: Profile | null;
  onSaved?: () => void;
}

export function ProfileForm({ profile, onSaved }: ProfileFormProps) {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [status, setStatus] = useState(profile?.status ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setStatus(profile.status ?? "");
    }
  }, [profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), status: status.trim() })
      .eq("id", profile.id);
    setSaving(false);
    if (err) setError(err.message);
    else onSaved?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">Имя</label>
        <Input
          placeholder="Ваше имя"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">Статус</label>
        <Input
          placeholder="Например: в сети"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" isLoading={saving}>
        Сохранить
      </Button>
    </form>
  );
}
