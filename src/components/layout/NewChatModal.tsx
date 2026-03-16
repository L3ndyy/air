"use client";

import { useState, useEffect } from "react";
import { X, MessageCircle, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input } from "@/components/ui";
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
  onCreateGroup: () => void;
  groupLoading: boolean;
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
}: NewChatModalProps) {
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

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
              className="flex h-8 w-8 items-center justify-center rounded-full [color:var(--air-text-muted)] transition hover:bg-white/60 dark:hover:bg-white/10 hover:[color:var(--air-text)]"
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
                  : "bg-white/50 dark:bg-white/10 [color:var(--air-text-muted)] hover:bg-white/70 dark:hover:bg-white/20"
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
                  : "bg-white/50 dark:bg-white/10 [color:var(--air-text-muted)] hover:bg-white/70 dark:hover:bg-white/20"
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
            <div className="mt-5 max-h-64 space-y-3 overflow-y-auto">
              <Input
                placeholder="Название группы"
                value={groupName}
                onChange={(e) => onGroupNameChange(e.target.value)}
              />
              <label className="block text-sm font-medium [color:var(--air-text-muted)]">Участники</label>
              <ul className="space-y-1.5">
                {allProfiles.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-2 transition hover:bg-white/50 dark:hover:bg-white/10">
                      <input
                        type="checkbox"
                        checked={groupMemberIds.includes(p.id)}
                        onChange={() => onToggleGroupMember(p.id)}
                        className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-400 dark:border-gray-600"
                      />
                      <span className="text-sm [color:var(--air-text)]">
                        {p.full_name || p.username}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 pt-2">
                <Button
                  size="md"
                  onClick={onCreateGroup}
                  isLoading={groupLoading}
                  disabled={!groupName.trim()}
                >
                  Создать
                </Button>
                <Button size="md" variant="ghost" onClick={onClose}>
                  Отмена
                </Button>
              </div>
            </div>
          )}
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
