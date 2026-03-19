"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ChatPlaceholder } from "@/components/layout/ChatPlaceholder";
import { ChatHeader } from "@/components/layout/ChatHeader";
import { ChatSidebar } from "@/components/layout/ChatSidebar";
import { NewChatModal } from "@/components/layout/NewChatModal";
import { MessageList } from "@/components/chat/MessageList";
import { Composer } from "@/components/chat/Composer";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ProfilePanel } from "@/components/profile/ProfilePanel";
import { UserProfilePanel } from "@/components/profile/UserProfilePanel";
import { GroupSettingsPanel } from "@/components/group/GroupSettingsPanel";
import { cn } from "@/lib/utils";
import type { Conversation, Profile } from "@/types/database";

interface ConversationWithDetails extends Conversation {
  otherParticipant?: Profile | null;
  lastMessage?: { content: string; created_at: string } | null;
  unreadCount?: number;
}

async function loadConversations(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<ConversationWithDetails[]> {
  const { data: participantsData } = await supabase
    .from("participants")
    .select("conversation_id")
    .eq("user_id", userId);
  if (!participantsData?.length) return [];

  const convIds = participantsData.map((p) => p.conversation_id);
  const { data: convs } = await supabase
    .from("conversations")
    .select("*")
    .in("id", convIds)
    .order("created_at", { ascending: false });
  if (!convs) return [];

  const { data: unreadRows } = await supabase
    .from("messages")
    .select("conversation_id")
    .in("conversation_id", convIds)
    .neq("sender_id", userId)
    .eq("is_read", false);
  const unreadByConv: Record<string, number> = {};
  (unreadRows ?? []).forEach((r) => {
    unreadByConv[r.conversation_id] = (unreadByConv[r.conversation_id] ?? 0) + 1;
  });

  return Promise.all(
    convs.map(async (c) => {
      const { data: participants } = await supabase
        .from("participants")
        .select("user_id")
        .eq("conversation_id", c.id)
        .neq("user_id", userId);
      let otherParticipant: Profile | null = null;
      if (c.type === "direct" && participants?.[0]) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", participants[0].user_id)
          .single();
        otherParticipant = profile ?? null;
      }
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, created_at")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return {
        ...c,
        otherParticipant,
        lastMessage: lastMsg ?? null,
        unreadCount: unreadByConv[c.id] ?? 0,
      };
    })
  );
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatUsername, setNewChatUsername] = useState("");
  const [newChatError, setNewChatError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const stored = localStorage.getItem("air-density");
    const next = stored === "compact" ? "compact" : "normal";
    document.documentElement.classList.toggle("density-compact", next === "compact");
    document.documentElement.classList.toggle("density-normal", next === "normal");
  }, []);

  useEffect(() => {
    setShowNewChatModal((prev) => prev || searchParams.get("new") === "1");
  }, [searchParams]);

  const conversationIdFromUrl = searchParams.get("conversation");
  useEffect(() => {
    if (conversationIdFromUrl && conversations.some((c) => c.id === conversationIdFromUrl)) {
      setSelectedId(conversationIdFromUrl);
      setSidebarOpen(false);
      setReplyTo(null);
    }
  }, [conversationIdFromUrl, conversations]);

  useEffect(() => {
    if (!showNewChatModal) return;
    (async () => {
      const res = await fetch("/api/profiles/list", { credentials: "include" });
      const data = await res.json().catch(() => []);
      setAllProfiles(Array.isArray(data) ? data : []);
    })();
  }, [showNewChatModal]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data ?? null);
    })();
  }, [supabase]);

  const refreshConversations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const list = await loadConversations(supabase, user.id);
    setConversations(list);
  }, [supabase]);

  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setConversationsLoading(false);
        return;
      }
      setCurrentUser({ id: user.id });
      const list = await loadConversations(supabase, user.id);
      setConversations(list);
      setConversationsLoading(false);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase.channel("presence:online");
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        channel.track({ user_id: currentUser.id });
      }
    });
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const ids = new Set<string>();
      Object.values(state).flat().forEach((p) => {
        const uid = (p as { user_id?: string }).user_id;
        if (uid) ids.add(uid);
      });
      setOnlineUserIds(ids);
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, supabase]);

  async function startDirectChat() {
    const username = newChatUsername.trim().toLowerCase();
    if (!username || !currentUser) return;
    setCreating(true);
    setNewChatError(null);
    try {
      let res = await fetch("/api/conversations/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username }),
      });
      if (res.status === 405) {
        res = await fetch(
          `/api/conversations/direct?username=${encodeURIComponent(username)}`,
          { credentials: "include" }
        );
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNewChatError((data.error as string) || "Не удалось создать чат");
        setCreating(false);
        return;
      }
      const convId = data.id as string;
      await refreshConversations();
      setSelectedId(convId);
      setShowNewChatModal(false);
      setNewChatUsername("");
    } catch {
      setNewChatError("Ошибка создания чата");
    }
    setCreating(false);
  }

  async function createGroup(memberIds: string[] = groupMemberIds) {
    if (!currentUser || !groupName.trim()) return;
    setCreatingGroup(true);
    setGroupError(null);
    try {
      const name = groupName.trim();
      const params = new URLSearchParams({
        name,
        ...(memberIds.length ? { memberIds: memberIds.join(",") } : {}),
      });
      const res = await fetch(`/api/conversations/group?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGroupError((data.error as string) || "Не удалось создать группу");
        setCreatingGroup(false);
        return;
      }
      const convId = data.id as string;
      await refreshConversations();
      setSelectedId(convId);
      setShowNewChatModal(false);
      setGroupName("");
      setGroupMemberIds([]);
    } catch {
      setGroupError("Ошибка соединения");
    }
    setCreatingGroup(false);
  }

  function toggleGroupMember(id: string) {
    setGroupMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const selected = selectedId
    ? conversations.find((c) => c.id === selectedId)
    : null;
  const title = selected
    ? selected.type === "group"
      ? (selected.name ?? "Группа")
      : ((selected.otherParticipant?.full_name || selected.otherParticipant?.username) ?? "Чат")
    : "";
  const avatarUrl = selected?.type === "group" ? selected.avatar_url : selected?.otherParticipant?.avatar_url;
  const fallback = selected?.type === "group" ? (selected.name ?? "Г") : ((selected?.otherParticipant?.full_name || selected?.otherParticipant?.username) ?? "?");
  const showProfilePanel = searchParams.get("panel") === "profile";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showGroupSettingsPanel, setShowGroupSettingsPanel] = useState(false);
  const [otherProfileUsername, setOtherProfileUsername] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string } | null>(null);
  const [chatSearch, setChatSearch] = useState("");
  const [clearChatKey, setClearChatKey] = useState(0);
  const [clearingChat, setClearingChat] = useState(false);

  useEffect(() => {
    if (showProfilePanel) setSidebarOpen(false);
  }, [showProfilePanel]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && key === "k") {
        // Открываем поиск в шапке (ChatHeader сам фокусит input по autoFocus).
        e.preventDefault();
        if (!selectedId) return;

        const searchBtn = document.querySelector(
          'button[aria-label="Поиск по чату"]'
        ) as HTMLButtonElement | null;
        searchBtn?.click();

        setTimeout(() => {
          const input = document.querySelector('header input[type="search"]') as HTMLInputElement | null;
          input?.focus();
        }, 0);

        return;
      }

      if (e.key !== "Escape") return;

      // Закрываем поиск (нужно кликнуть по кнопке, т.к. внутри ChatHeader есть internal state).
      const closeSearchBtn = document.querySelector(
        'button[aria-label="Закрыть поиск"]'
      ) as HTMLButtonElement | null;
      if (closeSearchBtn) {
        closeSearchBtn.click();
      } else {
        setChatSearch("");
      }

      if (showProfilePanel) closeProfilePanel();
      setOtherProfileUsername(null);
      setShowGroupSettingsPanel(false);
      setShowNewChatModal(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, showProfilePanel]);

  function closeProfilePanel() {
    router.replace("/chat");
  }

  function handleSelectChat(id: string) {
    setSelectedId(id);
    setSidebarOpen(false);
    setReplyTo(null);
    setChatSearch("");
    setTimeout(() => refreshConversations(), 500);
  }

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase
      .channel("messages:all")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as { conversation_id: string; sender_id: string };
          refreshConversations();
          if (msg.sender_id !== currentUser.id && msg.conversation_id !== selectedId && !profile?.do_not_disturb) {
            setToast("Новое сообщение");
            const tauriInvoke = (window as unknown as {
              __TAURI_INTERNALS__?: { invoke?: (cmd: string, payload?: unknown) => Promise<unknown> };
            }).__TAURI_INTERNALS__?.invoke;
            if (tauriInvoke) {
              tauriInvoke("show_notification", { payload: { title: "Air", body: "Новое сообщение" } }).catch(() => {});
            }
            if (typeof window !== "undefined" && window.parent !== window) {
              try {
                window.parent.postMessage(
                  { type: "tauri-notify", title: "Air", body: "Новое сообщение" },
                  "*"
                );
              } catch {}
            }
            const soundOn = typeof window !== "undefined" && localStorage.getItem("air-sound-enabled") !== "false";
            if (soundOn) {
              try {
                const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 800;
                gain.gain.value = 0.1;
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
              } catch {}
            }
            setTimeout(() => setToast(null), 3000);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, selectedId, supabase, refreshConversations, profile?.do_not_disturb]);

  return (
    <div className="relative flex h-full">
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[var(--air-accent)] px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
      {/* Mobile overlay when sidebar is open */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] transition md:hidden",
          sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none invisible opacity-0"
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />
      <ChatSidebar
        conversations={conversations}
        selectedId={selectedId}
        onSelect={handleSelectChat}
        profile={profile}
        onlineUserIds={onlineUserIds}
        loading={conversationsLoading}
        onNewChatClick={() => setShowNewChatModal(true)}
        onStartChatWithUsername={(username) => {
          setNewChatUsername(username);
          setShowNewChatModal(true);
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-out md:relative md:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      />
      <div className="flex flex-1 flex-col min-w-0">
        {!selectedId && (
          <div className="flex h-12 shrink-0 items-center border-b border-[var(--air-glass-border)] bg-[var(--air-glass)] px-3 backdrop-blur-xl md:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 transition hover:bg-white/50"
              aria-label="Меню"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        )}
        {selectedId && selected ? (
          <>
            <ChatHeader
              title={title}
              avatarUrl={avatarUrl}
              fallback={fallback}
              showPremiumBadge={selected?.type === "direct" && !!selected?.otherParticipant?.is_premium}
              subtitle={<TypingIndicator conversationId={selectedId} currentUserId={currentUser?.id} />}
              onBack={() => {
                setSelectedId(null);
                setSidebarOpen(true);
              }}
              isGroup={selected?.type === "group"}
              onOpenGroupSettings={selected?.type === "group" ? () => setShowGroupSettingsPanel(true) : undefined}
              onOpenProfile={
                selected?.type === "direct" && selected.otherParticipant?.username
                  ? () => setOtherProfileUsername(selected.otherParticipant!.username)
                  : undefined
              }
              searchValue={chatSearch}
              onSearchChange={setChatSearch}
              onClearSearch={() => setChatSearch("")}
              onClearChat={
                selectedId && !clearingChat
                  ? async () => {
                      if (!confirm("Очистить весь чат? Все сообщения и вложения будут удалены. Это нельзя отменить.")) return;
                      setClearingChat(true);
                      try {
                        const res = await fetch(`/api/conversations/${selectedId}/clear`, {
                          method: "POST",
                          credentials: "include",
                        });
                        const data = await res.json().catch(() => ({}));
                        if (res.ok) {
                          setClearChatKey((k) => k + 1);
                          refreshConversations();
                        } else {
                          alert((data.error as string) || "Не удалось очистить чат");
                        }
                      } finally {
                        setClearingChat(false);
                      }
                    }
                  : undefined
              }
            />
            <MessageList
              key={`${selectedId}-${clearChatKey}`}
              conversationId={selectedId}
              currentUserId={currentUser?.id ?? ""}
              searchQuery={chatSearch.trim()}
              conversationsForForward={conversations}
              onReplyTo={(msg) => setReplyTo({ id: msg.id, content: msg.content })}
              onMentionClick={(username) => setOtherProfileUsername(username)}
              onReport={async (messageId) => {
                if (!confirm("Отправить жалобу на сообщение?")) return;
                try {
                  const res = await fetch("/api/reports", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ messageId }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (res.ok) alert("Жалоба отправлена");
                  else alert(data?.error ?? "Не удалось отправить жалобу");
                } catch {
                  alert("Не удалось отправить жалобу");
                }
              }}
            />
            <Composer
              conversationId={selectedId}
              replyTo={replyTo}
              onClearReply={() => setReplyTo(null)}
              isBanned={!!(profile?.banned_until && new Date(profile.banned_until) > new Date())}
            />
          </>
        ) : (
          <ChatPlaceholder />
        )}
      </div>
      <NewChatModal
        open={showNewChatModal}
        onClose={() => {
          setShowNewChatModal(false);
          setNewChatError(null);
          setGroupError(null);
          setNewChatUsername("");
          setGroupName("");
          setGroupMemberIds([]);
        }}
        initialTab={searchParams.get("new") === "1" ? "direct" : "direct"}
        directUsername={newChatUsername}
        onDirectUsernameChange={setNewChatUsername}
        directError={newChatError}
        onStartDirect={startDirectChat}
        directLoading={creating}
        groupName={groupName}
        onGroupNameChange={setGroupName}
        allProfiles={allProfiles}
        groupMemberIds={groupMemberIds}
        onToggleGroupMember={toggleGroupMember}
        onCreateGroup={createGroup}
        groupLoading={creatingGroup}
        groupError={groupError}
      />
      {showProfilePanel && (
        <ProfilePanel onClose={closeProfilePanel} />
      )}
      {otherProfileUsername && (
        <UserProfilePanel
          username={otherProfileUsername}
          onClose={() => setOtherProfileUsername(null)}
          onlineUserIds={onlineUserIds}
        />
      )}
      {showGroupSettingsPanel && selected?.type === "group" && selectedId && currentUser?.id && (
        <GroupSettingsPanel
          conversationId={selectedId}
          name={selected.name ?? "Группа"}
          avatarUrl={selected.avatar_url}
          currentUserId={currentUser.id}
          onClose={() => setShowGroupSettingsPanel(false)}
          onUpdated={() => refreshConversations()}
          onLeftGroup={() => {
            setShowGroupSettingsPanel(false);
            setSelectedId(null);
            refreshConversations();
          }}
          onDeleted={() => {
            setShowGroupSettingsPanel(false);
            setSelectedId(null);
            refreshConversations();
          }}
        />
      )}
    </div>
  );
}
