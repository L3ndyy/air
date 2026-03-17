"use client";

import { useState, useEffect, useMemo } from "react";
import { X, MessageCircle, Users, Search, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Avatar } from "@/components/ui";
import type { Profile } from "@/types/database";

type Tab = "direct" | "group";

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
  /** Direct chat */
  directUsername: string;
  onDirectUsernameChange: (v: string) => void;
  directError: string | null;
  onStartDirect: () => void;
  directLoading: boolean;
  /** Group */
  groupName: string;
  onGroupNameChange: (v: string) => void;
  allProfiles: Profile[];
  groupMemberIds: string[];
  onToggleGroupMember: (id: string) => void;
  onCreateGroup: (memberIds?: string[]) => void;
  groupLoading: boolean;
  groupError?: string | null;
}

export function NewChatModal({
  open,
  onClose,
  initialTab = "direct",
  directUsername,
  onDirectUsernameChange,
  directError,
  onStartDirect,
  directLoading,
  groupName,
  onGroupNameChange,
  allProfiles,
  groupMemberIds,
  onToggleGroupMember,
  onCreateGroup,
  groupLoading,
  groupError = null,
}: NewChatModalProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [groupStep, setGroupStep] = useState<1 | 2>(1);
  const [participantSearch, setParticipantSearch] = useState("");

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setGroupStep(1);
      setParticipantSearch("");
    }
  }, [open, initialTab]);

  const filteredProfiles = useMemo(() => {
    if (!participantSearch.trim()) return allProfiles;
    const q = participantSearch.trim().toLowerCase();
    return allProfiles.filter(
      (p) =>
        (p.username ?? "").toLowerCase().includes(q) ||
        (p.full_name ?? "").toLowerCase().includes(q)
    );
  }, [allProfiles, participantSearch]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "tween", duration: 0.2 }}
            className="relative w-full max-w-md rounded-2xl border border-[var(--air-glass-border)] bg-[var(--air-glass)] p-6 shadow-glow backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--air-glass-border)] pb-4">
              <h2 className="text-lg font-semibold [color:var(--air-text)]">Новый чат</h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full [color:var(--air-text-muted)] transition hover:bg-[var(--air-glass)] hover:[color:var(--air-text)]"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setTab("direct")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition ${
                  tab === "direct"
                    ? "bg-air-accent text-white"
                    : "bg-[var(--air-surface)] [color:var(--air-text-muted)] hover:bg-[var(--air-glass)] hover:[color:var(--air-text)]"
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                Личный чат
              </button>
              <button
                type="button"
                onClick={() => setTab("group")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition ${
                  tab === "group"
                    ? "bg-air-accent text-white"
                    : "bg-[var(--air-surface)] [color:var(--air-text-muted)] hover:bg-[var(--air-glass)] hover:[color:var(--air-text)]"
                }`}
              >
                <Users className="h-4 w-4" />
                Группа
              </button>
            </div>

            {tab === "direct" && (
              <div className="mt-5 space-y-3">
                <label className="block text-sm font-medium [color:var(--air-text-muted)]">
                  Username собеседника
                </label>
                <Input
                  placeholder="Введите username"
                  value={directUsername}
                  onChange={(e) => onDirectUsernameChange(e.target.value)}
                  error={directError ?? undefined}
                />
                <div className="flex gap-2 pt-1">
                  <Button
                    size="md"
                    onClick={onStartDirect}
                    isLoading={directLoading}
                    disabled={!directUsername.trim()}
                  >
                    Начать
                  </Button>
                  <Button size="md" variant="ghost" onClick={onClose}>
                    Отмена
                  </Button>
                </div>
              </div>
            )}

            {tab === "group" && (
              <div className="mt-5">
                {groupStep === 1 && (
                  <div className="space-y-4">
                    <p className="text-xs font-medium [color:var(--air-text-muted)]">1. Название</p>
                    <Input
                      placeholder="Название группы"
                      value={groupName}
                      onChange={(e) => onGroupNameChange(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="md"
                        onClick={() => setGroupStep(2)}
                        disabled={!groupName.trim()}
                        className="gap-2"
                      >
                        Далее
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button size="md" variant="ghost" onClick={onClose}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                )}

                {groupStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium [color:var(--air-text-muted)]">2. Участники (необязательно)</p>
                      <button
                        type="button"
                        onClick={() => setGroupStep(1)}
                        className="text-xs [color:var(--air-accent)] hover:underline"
                      >
                        Назад
                      </button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 [color:var(--air-text-muted)]" />
                      <input
                        type="text"
                        placeholder="Поиск по имени или username..."
                        value={participantSearch}
                        onChange={(e) => setParticipantSearch(e.target.value)}
                        className="w-full rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] py-2.5 pl-9 pr-3 text-sm [color:var(--air-text)] placeholder:[color:var(--air-text-muted)] focus:border-[var(--air-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--air-glow)]"
                      />
                    </div>
                    <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[var(--air-glass-border)] p-1.5">
                      {filteredProfiles.length === 0 ? (
                        <li className="py-4 text-center text-sm [color:var(--air-text-muted)]">
                          {allProfiles.length === 0 ? "Нет пользователей" : "Никого не найдено"}
                        </li>
                      ) : (
                        filteredProfiles.map((p) => {
                          const selected = groupMemberIds.includes(p.id);
                          return (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => onToggleGroupMember(p.id)}
                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                                  selected
                                    ? "bg-[var(--air-glow)] [color:var(--air-text)]"
                                    : "hover:bg-[var(--air-surface)] [color:var(--air-text)]"
                                }`}
                              >
                                <Avatar
                                  src={p.avatar_url}
                                  fallback={p.full_name || p.username}
                                  size="sm"
                                  className="h-9 w-9 shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium">
                                    {p.full_name || p.username}
                                  </p>
                                  <p className="truncate text-xs [color:var(--air-text-muted)]">
                                    @{p.username}
                                  </p>
                                </div>
                                {selected && (
                                  <span className="text-xs font-medium text-[var(--air-accent)]">✓</span>
                                )}
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                    {groupError && (
                      <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-500 dark:text-red-400">
                        {groupError}
                      </p>
                    )}
                    <div className="flex flex-col gap-2 pt-1">
                      <Button
                        size="md"
                        onClick={() => onCreateGroup()}
                        isLoading={groupLoading}
                        disabled={!groupName.trim()}
                      >
                        Создать группу
                      </Button>
                      <Button
                        size="md"
                        variant="ghost"
                        onClick={() => onCreateGroup([])}
                        disabled={!groupName.trim() || groupLoading}
                      >
                        Создать без участников
                      </Button>
                      <Button size="md" variant="ghost" onClick={onClose}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
