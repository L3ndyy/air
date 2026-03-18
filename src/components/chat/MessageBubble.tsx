"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Trash2,
  Check,
  CheckCheck,
  MoreVertical,
  Pencil,
  Reply,
  SmilePlus,
  Flag,
  Pin,
  Copy,
  Forward,
  CheckSquare,
  Eye,
} from "lucide-react";
import { LinkPreview, extractUrls } from "./LinkPreview";

const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|svg)(\?|$)/i;

const REACTION_EMOJIS = ["❤️", "👍", "🔥", "👏"];

export interface ReplyToMessage {
  id: string;
  content: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  userIds: string[];
}

interface MessageBubbleProps {
  messageId: string;
  content: string;
  attachmentUrl?: string | null;
  isOwn: boolean;
  isRead?: boolean;
  showReadStatus?: boolean;
  createdAt: string;
  editedAt?: string | null;
  replyToMessage?: ReplyToMessage | null;
  reactions?: ReactionSummary[];
  currentUserId: string;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newContent: string) => void;
  onReply?: () => void;
  onScrollToMessage?: (id: string) => void;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  searchHighlight?: string;
  onReport?: (messageId: string) => void;
  onMarkRead?: (messageId: string) => void;
}

function highlightContent(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const q = query.trim();
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="rounded bg-amber-200/80 dark:bg-amber-500/30 px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function renderContentWithMentions(text: string, searchHighlight?: string): React.ReactNode {
  const mentionRegex = /@(\w+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const segment = text.slice(lastIndex, match.index);
      parts.push(
        <React.Fragment key={key++}>
          {searchHighlight ? highlightContent(segment, searchHighlight) : segment}
        </React.Fragment>
      );
    }
    parts.push(
      <span key={key++} className="mention font-medium text-indigo-600 dark:text-indigo-400">
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    const segment = text.slice(lastIndex);
    parts.push(
      <React.Fragment key={key++}>
        {searchHighlight ? highlightContent(segment, searchHighlight) : segment}
      </React.Fragment>
    );
  }
  return parts.length > 0 ? parts : (searchHighlight ? highlightContent(text, searchHighlight) : text);
}

export function MessageBubble({
  messageId,
  content,
  attachmentUrl,
  isOwn,
  isRead = false,
  showReadStatus = true,
  createdAt,
  editedAt,
  replyToMessage,
  reactions = [],
  currentUserId,
  onDelete,
  onEdit,
  onReply,
  onScrollToMessage,
  onAddReaction,
  onRemoveReaction,
  searchHighlight,
  onReport,
  onMarkRead,
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const time = new Date(createdAt).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const isImage = attachmentUrl ? IMAGE_EXTS.test(attachmentUrl) : false;

  useEffect(() => {
    if (!showMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (editing && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.setSelectionRange(editContent.length, editContent.length);
    }
  }, [editing, editContent.length]);

  function handleDelete() {
    if (onDelete && confirm("Удалить сообщение?")) {
      onDelete(messageId);
      setShowMenu(false);
    }
  }

  function startEdit() {
    setEditContent(content);
    setEditing(true);
    setShowMenu(false);
  }

  function saveEdit() {
    const trimmed = editContent.trim();
    if (trimmed !== content && onEdit) {
      onEdit(messageId, trimmed);
    }
    setEditing(false);
  }

  function cancelEdit() {
    setEditContent(content);
    setEditing(false);
  }

  function handleReactionClick(emoji: string) {
    const summary = reactions.find((r) => r.emoji === emoji);
    const hasReacted = summary?.userIds.includes(currentUserId);
    if (hasReacted && onRemoveReaction) {
      onRemoveReaction(messageId, emoji);
    } else if (!hasReacted && onAddReaction) {
      onAddReaction(messageId, emoji);
    }
    setShowReactionPicker(false);
    setContextMenu(null);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }

  function copyText() {
    const text = content.trim();
    if (text) navigator.clipboard?.writeText(text);
    setContextMenu(null);
  }

  const hasReactions = reactions.length > 0;

  return (
    <div
      id={`msg-${messageId}`}
      data-message-id={messageId}
      className={cn(
        "flex w-full scroll-mt-4",
        isOwn ? "justify-end" : "justify-start"
      )}
      onContextMenu={handleContextMenu}
    >
      {/* Context menu (right-click) */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[200px] rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-surface)] py-1.5 shadow-xl [color:var(--air-text)]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
        >
          <div className="flex flex-wrap gap-1 border-b border-[var(--air-glass-border)] px-2 pb-2">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                role="menuitem"
                onClick={() => handleReactionClick(emoji)}
                className="rounded p-1.5 text-lg transition hover:bg-[var(--air-input-bg)]"
              >
                {emoji}
              </button>
            ))}
          </div>
          {onReply && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { onReply(); setContextMenu(null); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--air-input-bg)]"
            >
              <Reply className="h-4 w-4 shrink-0" />
              Ответить
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => setContextMenu(null)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--air-input-bg)]"
            title="Скоро"
          >
            <Pin className="h-4 w-4 shrink-0" />
            Закрепить
          </button>
          {content.trim() && (
            <button
              type="button"
              role="menuitem"
              onClick={copyText}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--air-input-bg)]"
            >
              <Copy className="h-4 w-4 shrink-0" />
              Копировать текст
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => setContextMenu(null)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--air-input-bg)]"
            title="Скоро"
          >
            <Forward className="h-4 w-4 shrink-0" />
            Переслать
          </button>
          {onDelete && isOwn && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { handleDelete(); setContextMenu(null); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              Удалить
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => setContextMenu(null)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--air-input-bg)]"
            title="Скоро"
          >
            <CheckSquare className="h-4 w-4 shrink-0" />
            Выделить
          </button>
          {onMarkRead && !isOwn && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { onMarkRead(messageId); setContextMenu(null); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--air-input-bg)]"
            >
              <Eye className="h-4 w-4 shrink-0" />
              Прочитать
            </button>
          )}
        </div>
      )}
      <div
        className={cn(
          "group relative max-w-[75%] rounded-[14px] px-4 py-2.5 transition-shadow",
          isOwn
            ? "bg-[var(--tg-bubble-out,var(--air-accent))] text-white air-bubble-out"
            : "bg-[var(--tg-bubble-in)] border border-[var(--tg-bubble-in-border,var(--air-glass-border))] text-[var(--air-text)] air-bubble-in"
        )}
      >
        {/* Reply quote */}
        {replyToMessage && (
          <button
            type="button"
            onClick={() => onScrollToMessage?.(replyToMessage!.id)}
            className="mb-2 flex w-full items-start gap-2 rounded-lg border-l-2 border-white/50 pl-2 text-left text-xs opacity-90 hover:opacity-100"
          >
            <Reply className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="line-clamp-2 break-words">
              {replyToMessage.content.trim() || "Сообщение удалено"}
            </span>
          </button>
        )}

        {attachmentUrl && (
          <div className="mb-2">
            {isImage ? (
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachmentUrl}
                  alt="Вложение"
                  className="max-h-48 w-full object-cover"
                />
              </a>
            ) : (
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm underline"
              >
                Скачать файл
              </a>
            )}
          </div>
        )}

        {editing ? (
          <div className="space-y-2">
            <textarea
              ref={editTextareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className={cn(
                "w-full resize-none rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2",
                isOwn
                  ? "border-white/40 bg-white/20 text-white placeholder-white/60"
                  : "border-[var(--air-glass-border)] bg-[var(--air-input-bg)] [color:var(--air-text)]"
              )}
              rows={3}
            />
            <div className="flex justify-end gap-1">
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded px-2 py-1 text-xs opacity-80 hover:opacity-100"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="rounded px-2 py-1 text-xs font-medium opacity-90 hover:opacity-100"
              >
                Сохранить
              </button>
            </div>
          </div>
        ) : (
          <>
            {content.trim() ? (
              <>
                <p className="whitespace-pre-wrap break-words text-sm">
                  {renderContentWithMentions(content, searchHighlight)}
                </p>
                {!editing && extractUrls(content).map((url: string) => (
                  <LinkPreview key={url} url={url} />
                ))}
              </>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
              {isOwn && (
                <>
                  {showReadStatus && (
                    <span
                      className="text-xs opacity-80"
                      title={isRead ? "Просмотрено" : "Доставлено"}
                    >
                      {isRead ? (
                        <CheckCheck className="h-3.5 w-3.5 inline" />
                      ) : (
                        <Check className="h-3.5 w-3.5 inline" />
                      )}
                    </span>
                  )}
                  {!showReadStatus && (
                    <span className="text-xs opacity-80" title="Доставлено">
                      <Check className="h-3.5 w-3.5 inline" />
                    </span>
                  )}
                </>
              )}
              {editedAt && (
                <span
                  className={cn(
                    "text-xs",
                    isOwn ? "text-white/70" : "text-gray-400 dark:[color:var(--air-text-muted)]"
                  )}
                  title={new Date(editedAt).toLocaleString("ru-RU")}
                >
                  изменено
                </span>
              )}
              <span
                className={cn(
                  "text-xs",
                  isOwn ? "text-white/80" : "text-gray-400 dark:[color:var(--air-text-muted)]"
                )}
              >
                {time}
              </span>
              {/* Menu: only for own messages */}
              {(onDelete || onEdit) && isOwn && (
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setShowMenu((v) => !v)}
                    className="rounded p-0.5 opacity-70 hover:opacity-100"
                    aria-label="Меню"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                  {showMenu && (
                    <div
                      className={cn(
                        "absolute right-0 top-full z-10 mt-0.5 flex flex-col rounded-lg border py-1 shadow-lg",
                        "border-[var(--air-glass-border)] bg-[var(--air-surface)]"
                      )}
                    >
                      {onEdit && (
                        <button
                          type="button"
                          onClick={startEdit}
                          className="flex items-center gap-2 px-3 py-1.5 text-left text-sm [color:var(--air-text)] hover:bg-[var(--air-glass)]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Изменить
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={handleDelete}
                          className="flex items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Удалить
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Reply: for others' messages */}
              {onReply && !isOwn && (
                <button
                  type="button"
                  onClick={onReply}
                  className="rounded p-0.5 opacity-70 hover:opacity-100"
                  aria-label="Ответить"
                  title="Ответить"
                >
                  <Reply className="h-3.5 w-3.5" />
                </button>
              )}
              {onReport && !isOwn && (
                <button
                  type="button"
                  onClick={() => onReport(messageId)}
                  className="rounded p-0.5 opacity-70 hover:opacity-100"
                  aria-label="Пожаловаться"
                  title="Пожаловаться"
                >
                  <Flag className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {/* Reactions */}
            {(hasReactions || onAddReaction) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                {reactions.map((r) => (
                  <button
                    key={r.emoji}
                    type="button"
                    onClick={() => handleReactionClick(r.emoji)}
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-sm transition",
                      r.userIds.includes(currentUserId)
                        ? "bg-white/25"
                        : "bg-black/10 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/15"
                    )}
                  >
                    <span>{r.emoji}</span>
                    {r.count > 1 && <span className="text-xs opacity-90">{r.count}</span>}
                  </button>
                ))}
                {onAddReaction && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowReactionPicker((v) => !v)}
                      className="rounded-full p-0.5 opacity-60 hover:opacity-100"
                      aria-label="Добавить реакцию"
                    >
                      <SmilePlus className="h-4 w-4" />
                    </button>
                    {showReactionPicker && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          aria-hidden
                          onClick={() => setShowReactionPicker(false)}
                        />
                        <div
                          className="absolute bottom-full left-0 z-20 mb-1 flex gap-0.5 rounded-full border border-[var(--air-glass-border)] bg-[var(--air-surface)] px-1.5 py-1 shadow-lg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleReactionClick(emoji)}
                              className="rounded p-0.5 text-lg hover:bg-[var(--air-glass)]"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
