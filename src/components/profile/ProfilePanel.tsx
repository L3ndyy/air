"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { X, LogOut, Lock, Moon, Volume2, Headphones, Download, Crown } from "lucide-react";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { Button, Input, PremiumBadge } from "@/components/ui";
import type { Profile, Message } from "@/types/database";

interface ProfilePanelProps {
  onClose: () => void;
}

export function ProfilePanel({ onClose }: ProfilePanelProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [updatingDnd, setUpdatingDnd] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("air-sound-enabled") !== "false" : true
  );
  const [density, setDensity] = useState<"normal" | "compact">(() => {
    if (typeof window === "undefined") return "normal";
    return localStorage.getItem("air-density") === "compact" ? "compact" : "normal";
  });
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportText, setSupportText] = useState("");
  const [supportSending, setSupportSending] = useState(false);
  const [supportConversationId, setSupportConversationId] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState<Message[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [isDesktopApp, setIsDesktopApp] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const supabase = createClient();
  const supportScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const isDesktop = q.get("desktop") === "1" || !!(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    setIsDesktopApp(isDesktop);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("density-compact", density === "compact");
    document.documentElement.classList.toggle("density-normal", density === "normal");
    localStorage.setItem("air-density", density);
  }, [density]);

  async function handleSupportSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = supportText.trim();
    if (!text) return;
    setSupportSending(true);
    try {
      // Ensure conversation exists
      let conversationId = supportConversationId;
      if (!conversationId) {
        const ensureRes = await fetch("/api/support/chat/ensure", {
          method: "POST",
          credentials: "include",
        });
        const ensureData = await ensureRes.json().catch(() => ({}));
        conversationId = ensureData.conversation_id ?? null;
        if (!conversationId) throw new Error("Не удалось инициализировать поддержку");
        setSupportConversationId(conversationId);
      }

      const res = await fetch("/api/support/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text }),
      });
      if (res.ok) {
        setSupportText("");
        // scroll to bottom will happen via effect
      } else {
        alert("Не удалось отправить");
      }
    } finally {
      setSupportSending(false);
    }
  }

  useEffect(() => {
    if (!supportOpen) return;

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      setSupportLoading(true);
      setSupportConversationId(null);
      setSupportMessages([]);

      try {
        const ensureRes = await fetch("/api/support/chat/ensure", {
          method: "POST",
          credentials: "include",
        });
        const ensureData = await ensureRes.json().catch(() => ({}));
        const conversationId = ensureData.conversation_id as string | undefined;
        if (!conversationId || cancelled) return;

        setSupportConversationId(conversationId);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { data } = await supabase
          .from("messages")
          .select("id, content, sender_id, created_at, is_read")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(200);

        if (!cancelled) {
          setSupportMessages((data ?? []) as Message[]);
        }

        if (user?.id) {
          await supabase
            .from("messages")
            .update({ is_read: true })
            .eq("conversation_id", conversationId)
            .neq("sender_id", user.id)
            .eq("is_read", false);
        }

        channel = supabase
          .channel(`support:${conversationId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `conversation_id=eq.${conversationId}`,
            },
            (payload) => {
              setSupportMessages((prev) => [...prev, payload.new as Message]);
            }
          )
          .subscribe();
      } finally {
        if (!cancelled) setSupportLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [supportOpen]);

  useEffect(() => {
    if (!supportOpen) return;
    requestAnimationFrame(() => {
      if (!supportScrollRef.current) return;
      supportScrollRef.current.scrollTop = supportScrollRef.current.scrollHeight;
    });
  }, [supportMessages.length, supportOpen]);

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("air-sound-enabled", next ? "1" : "0");
    }
  }

  async function toggleDnd() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !profile) return;
    setUpdatingDnd(true);
    const next = !profile.do_not_disturb;
    await supabase.from("profiles").update({ do_not_disturb: next }).eq("id", user.id);
    setProfile((prev) => (prev ? { ...prev, do_not_disturb: next } : null));
    setUpdatingDnd(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword.length < 6) {
      setPasswordError("Новый пароль не менее 6 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Пароли не совпадают");
      return;
    }
    setChangingPassword(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setPasswordError("Не удалось определить email");
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        setPasswordError("Неверный текущий пароль");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setPasswordError(updateError.message);
        return;
      }
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

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
                <h1 className="mt-4 flex items-center justify-center gap-2 text-xl font-semibold [color:var(--air-text)]">
                  Профиль
                  {profile.is_premium && <PremiumBadge size="md" />}
                </h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm [color:var(--air-text-muted)]">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-[var(--air-border)]"}`}
                    title={isOnline ? "в сети" : "не в сети"}
                  />
                  {isOnline ? "в сети" : "не в сети"}
                </p>
                <p className="mt-0.5 text-xs [color:var(--air-text-muted)]">Имя, ник, описание</p>
                <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl bg-[var(--air-input-bg)]/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4 [color:var(--air-text-muted)]" />
                      <span className="text-sm [color:var(--air-text)]">Не беспокоить</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={profile.do_not_disturb}
                      disabled={updatingDnd}
                      onClick={toggleDnd}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition focus:outline-none ${
                        profile.do_not_disturb ? "bg-indigo-500" : "bg-[var(--air-glass-border)]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          profile.do_not_disturb ? "left-4" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4 [color:var(--air-text-muted)]" />
                      <span className="text-sm [color:var(--air-text)]">Звук</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={soundEnabled}
                      onClick={toggleSound}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition focus:outline-none ${
                        soundEnabled ? "bg-indigo-500" : "bg-[var(--air-glass-border)]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          soundEnabled ? "left-4" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm [color:var(--air-text)]">Плотность</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={density === "compact"}
                      onClick={() => setDensity((d) => (d === "compact" ? "normal" : "compact"))}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition focus:outline-none ${
                        density === "compact" ? "bg-indigo-500" : "bg-[var(--air-glass-border)]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          density === "compact" ? "left-4" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-8 border-t border-[var(--air-glass-border)] pt-6">
                <ProfileForm
                  profile={profile}
                  onSaved={(updated) => updated && setProfile((prev) => (prev ? { ...prev, ...updated } : null))}
                />
              </div>
              <div className="mt-8 border-t border-[var(--air-glass-border)] pt-6">
                <p className="mb-3 flex items-center gap-2 text-sm font-medium [color:var(--air-text-muted)]">
                  <Lock className="h-4 w-4" />
                  Безопасность
                </p>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <Input
                    type="password"
                    placeholder="Текущий пароль"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <Input
                    type="password"
                    placeholder="Новый пароль (от 6 символов)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <Input
                    type="password"
                    placeholder="Повторите новый пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  {passwordError && (
                    <p className="text-sm text-red-500">{passwordError}</p>
                  )}
                  {passwordSuccess && (
                    <p className="text-sm text-emerald-600">Пароль изменён</p>
                  )}
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    disabled={changingPassword}
                  >
                    {changingPassword ? "Сохранение…" : "Сменить пароль"}
                  </Button>
                </form>
              </div>
              <div className="mt-4 space-y-2 border-t border-[var(--air-glass-border)] pt-4">
                <Button
                  type="button"
                  className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 border-0"
                  onClick={() => setPremiumOpen(true)}
                >
                  <Crown className="h-4 w-4" />
                  Купить премиум — 1 ₽
                </Button>
                {!isDesktopApp && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full gap-2"
                    onClick={() => router.push("/download")}
                  >
                    <Download className="h-4 w-4" />
                    Скачать для Windows
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full gap-2"
                  onClick={() => setSupportOpen(true)}
                >
                  <Headphones className="h-4 w-4" />
                  Написать в поддержку
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-2 w-full gap-2"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  <LogOut className="h-4 w-4" />
                  {loggingOut ? "Выход…" : "Выйти из аккаунта"}
                </Button>
              </div>
              {supportOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30 bg-black/30"
                    onClick={() => {
                      setSupportOpen(false);
                      setSupportText("");
                      setSupportConversationId(null);
                      setSupportMessages([]);
                    }}
                    aria-hidden
                  />
                  <div className="fixed left-1/2 top-1/2 z-40 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--air-glass-border)] bg-[var(--air-surface)] p-6 shadow-xl">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold [color:var(--air-text)]">Поддержка</h3>
                        <p className="mt-1 text-sm [color:var(--air-text-muted)]">Напишите админам — отвечаем в этом же чате</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSupportOpen(false);
                          setSupportText("");
                          setSupportConversationId(null);
                          setSupportMessages([]);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full [color:var(--air-text-muted)] transition hover:bg-[var(--air-glass)] hover:[color:var(--air-text)]"
                        aria-label="Закрыть поддержку"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div
                      ref={supportScrollRef}
                      className="mt-4 max-h-[52vh] overflow-y-auto rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-glass)] p-3"
                    >
                      {supportLoading ? (
                        <div className="flex justify-center py-6">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--air-accent)] border-t-transparent" />
                        </div>
                      ) : supportMessages.length === 0 ? (
                        <p className="py-6 text-center text-sm [color:var(--air-text-muted)]">Сообщений пока нет</p>
                      ) : (
                        supportMessages.map((m) => {
                          const myId = profile?.id ?? null;
                          const isOwn = myId && m.sender_id === myId;
                          const time = new Date(m.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
                          return (
                            <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
                              <div
                                className={`max-w-[80%] rounded-[14px] px-3 py-2 ${
                                  isOwn
                                    ? "bg-[var(--tg-bubble-out,var(--air-accent))] text-white air-bubble-out"
                                    : "bg-[var(--tg-bubble-in)] border border-[var(--tg-bubble-in-border,var(--air-glass-border))] text-[var(--air-text)] air-bubble-in"
                                }`}
                              >
                                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                  {m.content || ""}
                                </div>
                                <div className={`mt-1 text-[11px] opacity-70 ${isOwn ? "text-white" : ""}`}>
                                  {time}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <form onSubmit={handleSupportSubmit} className="mt-3 flex items-end gap-2">
                      <textarea
                        value={supportText}
                        onChange={(e) => setSupportText(e.target.value)}
                        placeholder="Ваше сообщение..."
                        className="min-h-[40px] max-h-[100px] w-full resize-none rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] px-3 py-2 text-sm [color:var(--air-text)] placeholder:[color:var(--air-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--air-accent)]/20"
                        maxLength={2000}
                      />
                      <Button type="submit" disabled={supportSending || !supportText.trim()} className="rounded-[12px] bg-[var(--air-accent)] hover:opacity-90">
                        {supportSending ? "…" : "Отправить"}
                      </Button>
                    </form>
                  </div>
                </>
              )}
              {premiumOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
                    onClick={() => setPremiumOpen(false)}
                    aria-hidden
                  />
                  <div className="fixed left-1/2 top-1/2 z-40 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-amber-400/30 bg-[var(--air-surface)] p-6 shadow-2xl shadow-amber-500/10">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
                        <Crown className="h-8 w-8" />
                      </div>
                      <h3 className="text-lg font-semibold [color:var(--air-text)]">Премиум — 1 ₽</h3>
                      <p className="mt-1 text-xs [color:var(--air-text-muted)]">
                        От покупки премиума ничего не изменится. Просто потратите деньги 🙂
                      </p>
                      <div className="mt-4 flex flex-col items-center gap-3">
                        <span className="text-sm font-medium [color:var(--air-text)]">Оплачивай:</span>
                        <img
                          src="/qr-code.png"
                          alt="QR-код для оплаты"
                          className="h-44 w-44 rounded-xl border-2 border-[var(--air-glass-border)] object-contain bg-white p-2"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setPremiumOpen(false)}
                        className="mt-4 w-full rounded-xl border border-[var(--air-glass-border)] py-2 text-sm [color:var(--air-text-muted)] transition hover:bg-[var(--air-input-bg)] hover:[color:var(--air-text)]"
                      >
                        Закрыть
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
