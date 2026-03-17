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
import { cn } from "@/lib/utils";
import type { Conversation, Profile } from "@/types/database";

interface ConversationWithDetails extends Conversation {
  otherParticipant?: Profile | null;
  lastMessage?: { content: string; created_at: string } | null;
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
        .single();
      return { ...c, otherParticipant, lastMessage: lastMsg ?? null };
    })
  );
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
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
  const supabase = createClient();

  useEffect(() => {
    setShowNewChatModal((prev) => prev || searchParams.get("new") === "1");
  }, [searchParams]);

  useEffect(() => {
    if (!showNewChatModal) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").order("username");
      setAllProfiles((data ?? []).filter((p) => p.id !== currentUser?.id));
    })();
  }, [showNewChatModal, currentUser?.id, supabase]);

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

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser({ id: user.id });
      const list = await loadConversations(supabase, user.id);
      setConversations(list);
    })();
  }, [supabase]);

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

  async function createGroup() {
    if (!currentUser || !groupName.trim()) return;
    setCreatingGroup(true);
    const { data: newConv, error: createErr } = await supabase
      .from("conversations")
      .insert({ type: "group", name: groupName.trim() })
      .select("id")
      .single();
    if (createErr || !newConv) {
      setCreatingGroup(false);
      return;
    }
    await supabase.from("participants").insert({ conversation_id: newConv.id, user_id: currentUser.id });
    if (groupMemberIds.length > 0) {
      await supabase.from("participants").insert(groupMemberIds.map((user_id) => ({ conversation_id: newConv.id, user_id })));
    }
    await refreshConversations();
    setSelectedId(newConv.id);
    setShowNewChatModal(false);
    setGroupName("");
    setGroupMemberIds([]);
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

  useEffect(() => {
    if (showProfilePanel) setSidebarOpen(false);
  }, [showProfilePanel]);

  function closeProfilePanel() {
    router.replace("/chat");
  }

  function handleSelectChat(id: string) {
    setSelectedId(id);
    setSidebarOpen(false);
  }

  return (
    <div className="relative flex h-full">
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
        onNewChatClick={() => setShowNewChatModal(true)}
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
              subtitle={<TypingIndicator conversationId={selectedId} currentUserId={currentUser?.id} />}
              onBack={() => {
                setSelectedId(null);
                setSidebarOpen(true);
              }}
            />
            <MessageList conversationId={selectedId} currentUserId={currentUser?.id ?? ""} />
            <Composer conversationId={selectedId} />
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
      />
      {showProfilePanel && (
        <ProfilePanel onClose={closeProfilePanel} />
      )}
    </div>
  );
}
