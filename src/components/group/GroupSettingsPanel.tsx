"use client";

import { useState, useEffect } from "react";
import { X, Users, UserPlus, Link2, LogOut } from "lucide-react";
import { Avatar, Button, Input } from "@/components/ui";
import { EMOJI_LIST } from "@/lib/emoji";

const EMOJI_PREFIX = "emoji:";

export interface GroupParticipant {
  user_id: string;
  id?: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role?: string;
}

interface GroupSettingsPanelProps {
  conversationId: string;
  name: string;
  avatarUrl: string | null;
  currentUserId: string;
  onClose: () => void;
  onUpdated: () => void;
  onLeftGroup?: () => void;
}

export function GroupSettingsPanel({
  conversationId,
  name: initialName,
  avatarUrl: initialAvatarUrl,
  currentUserId,
  onClose,
  onUpdated,
  onLeftGroup,
}: GroupSettingsPanelProps) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [savingName, setSavingName] = useState(false);
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const myRole = participants.find((p) => p.user_id === currentUserId)?.role ?? "member";
  const canManage = myRole === "creator" || myRole === "admin";
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [addUsername, setAddUsername] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    setName(initialName);
    setAvatarUrl(initialAvatarUrl);
  }, [initialName, initialAvatarUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingParticipants(true);
      const res = await fetch(`/api/conversations/${conversationId}/participants`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => []);
      if (!cancelled) {
        setParticipants(Array.isArray(data) ? data : []);
      }
      setLoadingParticipants(false);
    })();
    return () => { cancelled = true; };
  }, [conversationId]);

  async function updateConversation(payload: { name?: string; avatar_url?: string }) {
    let res = await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (res.status === 405) {
      const params = new URLSearchParams();
      if (payload.name != null) params.set("name", payload.name);
      if (payload.avatar_url != null) params.set("avatar_url", payload.avatar_url);
      res = await fetch(`/api/conversations/${conversationId}?${params.toString()}`, {
        credentials: "include",
      });
    }
    return res;
  }

  async function handleSaveName() {
    if (name.trim() === initialName) return;
    setSavingName(true);
    try {
      const res = await updateConversation({ name: name.trim() });
      if (res.ok) {
        onUpdated();
      }
    } finally {
      setSavingName(false);
    }
  }

  async function handleAvatarEmoji(emoji: string) {
    const value = EMOJI_PREFIX + emoji;
    const res = await updateConversation({ avatar_url: value });
    if (res.ok) {
      setAvatarUrl(value);
      setShowEmojiPicker(false);
      onUpdated();
    }
  }

  async function handleCreateInvite() {
    setInviteLoading(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ expiresInDays: 7 }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof (data as { inviteUrl?: string }).inviteUrl === "string") {
        setInviteUrl((data as { inviteUrl: string }).inviteUrl);
      } else {
        alert((data.error as string) || "Не удалось создать ссылку");
      }
    } finally {
      setInviteLoading(false);
    }
  }

  function handleCopyInvite() {
    if (!inviteUrl) return;
    navigator.clipboard?.writeText(inviteUrl).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  }

  async function handleLeaveGroup() {
    if (!onLeftGroup || !confirm("Покинуть группу? Вы перестанете получать сообщения.")) return;
    setLeaving(true);
    try {
      let res = await fetch(`/api/conversations/${conversationId}/participants`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 405) {
        res = await fetch(`/api/conversations/${conversationId}/participants?action=leave`, {
          credentials: "include",
        });
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onClose();
        onLeftGroup();
      } else {
        alert((data.error as string) || "Не удалось выйти из группы");
      }
    } finally {
      setLeaving(false);
    }
  }

  async function handleAddMember() {
    const username = addUsername.trim().toLowerCase();
    if (!username) return;
    setAddingMember(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAddUsername("");
        const listRes = await fetch(`/api/conversations/${conversationId}/participants`, {
          credentials: "include",
        });
        const list = await listRes.json().catch(() => []);
        setParticipants(Array.isArray(list) ? list : []);
        onUpdated();
      } else {
        setAddError((data.error as string) || "Не удалось добавить");
      }
    } finally {
      setAddingMember(false);
    }
  }

  return (
    <>
      <div
        className="absolute inset-0 z-10 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute right-0 top-0 z-20 flex h-full w-full max-w-md flex-col bg-[var(--air-surface)] shadow-2xl [color:var(--air-text)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--air-glass-border)] px-4 py-3">
          <span className="text-sm font-medium [color:var(--air-text-muted)]">Настройки группы</span>
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
          <div className="space-y-8">
            {canManage && (
            <div>
              <p className="mb-2 text-xs font-medium [color:var(--air-text-muted)]">Название</p>
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Название группы"
                  className="flex-1"
                />
                <Button
                  size="md"
                  variant="secondary"
                  onClick={handleSaveName}
                  disabled={savingName || name.trim() === initialName}
                >
                  {savingName ? "…" : "Сохранить"}
                </Button>
              </div>
            </div>
            )}

            {canManage && (
            <div>
              <p className="mb-2 text-xs font-medium [color:var(--air-text-muted)]">Аватар группы</p>
              <div className="flex items-center gap-4">
                <Avatar
                  src={avatarUrl}
                  fallback={name || "Г"}
                  size="lg"
                  className="h-14 w-14"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                >
                  {showEmojiPicker ? "Скрыть" : "Изменить"}
                </Button>
              </div>
              {showEmojiPicker && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleAvatarEmoji(emoji)}
                      className="rounded-lg border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] p-2 text-2xl transition hover:bg-[var(--air-glow)]"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}

            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-medium [color:var(--air-text-muted)]">
                <Users className="h-4 w-4" />
                Участники
              </p>
              {loadingParticipants ? (
                <div className="py-4 text-center text-sm [color:var(--air-text-muted)]">
                  Загрузка…
                </div>
              ) : (
                <ul className="space-y-2">
                  {participants.map((p) => (
                    <li
                      key={p.user_id}
                      className="flex items-center gap-3 rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] px-3 py-2"
                    >
                      <Avatar
                        src={p.avatar_url}
                        fallback={p.full_name || p.username}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium [color:var(--air-text)]">
                          {p.full_name || p.username}
                          {p.role === "creator" && (
                            <span className="ml-1.5 text-xs font-normal [color:var(--air-text-muted)]">· Создатель</span>
                          )}
                          {p.role === "admin" && (
                            <span className="ml-1.5 text-xs font-normal [color:var(--air-text-muted)]">· Админ</span>
                          )}
                        </p>
                        <p className="truncate text-xs [color:var(--air-text-muted)]">
                          @{p.username}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {canManage && (
              <div className="mt-3 flex gap-2">
                <Input
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  placeholder="Username для добавления"
                  className="flex-1"
                />
                <Button
                  size="md"
                  onClick={handleAddMember}
                  disabled={!addUsername.trim() || addingMember}
                  isLoading={addingMember}
                  className="gap-1"
                >
                  <UserPlus className="h-4 w-4" />
                  Добавить
                </Button>
              </div>
              )}
              {addError && (
                <p className="mt-2 text-sm text-red-500 dark:text-red-400">{addError}</p>
              )}
            </div>

            {canManage && (
            <div className="rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] p-4">
              <p className="flex items-center gap-2 text-sm font-medium [color:var(--air-text-muted)]">
                <Link2 className="h-4 w-4" />
                Пригласительная ссылка
              </p>
              {inviteUrl ? (
                <>
                  <p className="mt-2 truncate rounded bg-[var(--air-surface)] px-2 py-1.5 text-xs [color:var(--air-text)]">
                    {inviteUrl}
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    onClick={handleCopyInvite}
                  >
                    {inviteCopied ? "Скопировано" : "Копировать ссылку"}
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-1 text-xs [color:var(--air-text-muted)]">
                    Ссылка действует 7 дней. По клику участник присоединится к группе.
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    onClick={handleCreateInvite}
                    disabled={inviteLoading}
                  >
                    {inviteLoading ? "…" : "Создать ссылку"}
                  </Button>
                </>
              )}
            </div>
            )}

            {onLeftGroup && (
              <div className="border-t border-[var(--air-glass-border)] pt-6">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full gap-2 border-red-500/30 text-red-600 hover:bg-red-500/10"
                  onClick={handleLeaveGroup}
                  disabled={leaving}
                >
                  <LogOut className="h-4 w-4" />
                  {leaving ? "Выход…" : "Покинуть группу"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
