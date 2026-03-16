"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChatPlaceholder } from "@/components/layout/ChatPlaceholder";
import { ChatHeader } from "@/components/layout/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { Composer } from "@/components/chat/Composer";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ProfilePanel } from "@/components/profile/ProfilePanel";
import { Button, Input } from "@/components/ui";
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
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newChatUsername, setNewChatUsername] = useState("");
  const [newChatError, setNewChatError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setShowNewChat(searchParams.get("new") === "1");
  }, [searchParams]);

  useEffect(() => {
    if (!showNewGroup) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").order("username");
      setAllProfiles((data ?? []).filter((p) => p.id !== currentUser?.id));
    })();
  }, [showNewGroup, currentUser?.id, supabase]);

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
    const { data: other } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (!other) {
      setNewChatError("Пользователь не найден");
      setCreating(false);
      return;
    }
    if (other.id === currentUser.id) {
      setNewChatError("Нельзя начать чат с собой");
      setCreating(false);
      return;
    }
    const { data: existing } = await supabase
      .from("participants")
      .select("conversation_id")
      .eq("user_id", currentUser.id);
    const myConvIds = (existing ?? []).map((p) => p.conversation_id);
    if (myConvIds.length > 0) {
      const { data: direct } = await supabase
        .from("conversations")
        .select("id")
        .eq("type", "direct")
        .in("id", myConvIds);
      const convIds = direct?.map((c) => c.id) ?? [];
      const { data: otherParts } = await supabase
        .from("participants")
        .select("conversation_id")
        .eq("user_id", other.id)
        .in("conversation_id", convIds);
      const existingWithOther = otherParts?.find((p) => convIds.includes(p.conversation_id));
      if (existingWithOther) {
        setSelectedId(existingWithOther.conversation_id);
        setShowNewChat(false);
        setNewChatUsername("");
        setCreating(false);
        return;
      }
    }
    const { data: newConv, error: createErr } = await supabase
      .from("conversations")
      .insert({ type: "direct" })
      .select("id")
      .single();
    if (createErr || !newConv) {
      setNewChatError("Ошибка создания чата");
      setCreating(false);
      return;
    }
    await supabase.from("participants").insert([
      { conversation_id: newConv.id, user_id: currentUser.id },
      { conversation_id: newConv.id, user_id: other.id },
    ]);
    await refreshConversations();
    setSelectedId(newConv.id);
    setShowNewChat(false);
    setNewChatUsername("");
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
    setShowNewGroup(false);
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

  function closeProfilePanel() {
    router.replace("/chat");
  }

  return (
    <div className="relative flex h-full">
      <div className="flex w-80 shrink-0 flex-col border-r border-gray-200/60 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-gray-200/60 px-3 py-2">
          <h2 className="text-sm font-medium text-gray-500">Чаты</h2>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => { setShowNewChat(true); setShowNewGroup(false); }}
              className="rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
            >
              Личный
            </button>
            <button
              type="button"
              onClick={() => { setShowNewGroup(true); setShowNewChat(false); }}
              className="rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
            >
              Группа
            </button>
          </div>
        </div>
        {showNewChat && (
          <div className="border-b border-gray-200/60 p-3 space-y-2">
            <p className="text-xs text-gray-500">Начать личный чат</p>
            <Input
              placeholder="Username"
              value={newChatUsername}
              onChange={(e) => setNewChatUsername(e.target.value)}
            />
            {newChatError && <p className="text-xs text-red-500">{newChatError}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={startDirectChat} isLoading={creating}>
                Начать
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowNewChat(false); setNewChatError(null); }}>
                Отмена
              </Button>
            </div>
          </div>
        )}
        {showNewGroup && (
          <div className="border-b border-gray-200/60 p-3 space-y-2 max-h-64 overflow-y-auto">
            <p className="text-xs text-gray-500">Новая группа</p>
            <Input
              placeholder="Название группы"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <p className="text-xs text-gray-500">Участники</p>
            <ul className="space-y-1">
              {allProfiles.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={groupMemberIds.includes(p.id)}
                      onChange={() => toggleGroupMember(p.id)}
                      className="rounded border-gray-300"
                    />
                    <span>{p.full_name || p.username}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button size="sm" onClick={createGroup} isLoading={creatingGroup} disabled={!groupName.trim()}>
                Создать
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowNewGroup(false); setGroupName(""); setGroupMemberIds([]); }}>
                Отмена
              </Button>
            </div>
          </div>
        )}
        <ul className="flex-1 overflow-y-auto">
          {conversations.map((c) => {
            const label =
              c.type === "group"
                ? (c.name ?? "Группа")
                : ((c.otherParticipant?.full_name || c.otherParticipant?.username) ?? "Чат");
            const isSelected = c.id === selectedId;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm ${
                    isSelected ? "bg-gray-100/80" : "hover:bg-gray-50/80"
                  }`}
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-blue-200 to-purple-200 flex items-center justify-center text-gray-700 font-medium">
                    {c.type === "group" ? (c.name?.[0] ?? "Г") : ((c.otherParticipant?.full_name?.[0] || c.otherParticipant?.username?.[0]) ?? "?")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-800">{label}</p>
                    {c.lastMessage && (
                      <p className="truncate text-xs text-gray-500">
                        {c.lastMessage.content}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex flex-1 flex-col min-w-0">
        {selectedId && selected ? (
          <>
            <ChatHeader
              title={title}
              avatarUrl={avatarUrl}
              fallback={fallback}
              subtitle={<TypingIndicator conversationId={selectedId} currentUserId={currentUser?.id} />}
            />
            <MessageList conversationId={selectedId} currentUserId={currentUser?.id ?? ""} />
            <Composer conversationId={selectedId} />
          </>
        ) : (
          <ChatPlaceholder />
        )}
      </div>
      {showProfilePanel && (
        <ProfilePanel onClose={closeProfilePanel} />
      )}
    </div>
  );
}
