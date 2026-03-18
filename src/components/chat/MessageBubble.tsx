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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const time = new Date(createdAt).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const isImage = attachmentUrl ? IMAGE_EXTS.test(attachmentUrl) : false;

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
    }
  }

  function startEdit() {
    setEditContent(content);
    setEditing(true);
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
          {onEdit && isOwn && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { startEdit(); setContextMenu(null); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--air-input-bg)]"
            >
              <Pencil className="h-4 w-4 shrink-0" />
              Изменить
            </button>
          )}
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
          {onReport && !isOwn && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { onReport(messageId); setContextMenu(null); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-600 hover:bg-amber-500/10"
            >
              <Flag className="h-4 w-4 shrink-0" />
              Пожаловаться
            </button>
          )}
        </div>
      )}
      <div
        className={cn(
          "group relative max-w-[85%] rounded-[12px] px-3 py-2",
          isOwn
            ? "bg-[var(--tg-bubble-out,var(--air-accent))] text-white air-bubble-out"
            : "bg-[var(--tg-bubble-in)] border border-[var(--tg-bubble-in-border,var(--air-glass-border))] text-[var(--air-text)] air-bubble-in"
        )}
      >
        {/* Reply quote — компактно */}
        {replyToMessage && (
          <button
            type="button"
            onClick={() => onScrollToMessage?.(replyToMessage!.id)}
            className="mb-1.5 flex w-full items-start gap-1.5 border-l-2 border-white/40 pl-2 text-left text-[11px] opacity-85 hover:opacity-100"
          >
            <Reply className="h-3 w-3 shrink-0 opacity-70" />
            <span className="line-clamp-2 break-words">
              {replyToMessage.content.trim() || "Сообщение удалено"}
            </span>
          </button>
        )}

        {attachmentUrl && (
          <div className={content.trim() ? "mb-1.5" : ""}>
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
                className="inline-flex items-center gap-1 text-sm underline opacity-90"
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
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {renderContentWithMentions(content, searchHighlight)}
                  <span
                    className={cn(
                      "float-right clear-right ml-1.5 shrink-0 text-[11px]",
                      isOwn ? "text-white/75" : "text-[var(--air-text-muted)]"
                    )}
                  >
                    {editedAt && (
                      <span title={new Date(editedAt).toLocaleString("ru-RU")}>изм. </span>
                    )}
                    {time}
                    {isOwn && (
                      <span className="ml-0.5 inline" title={isRead ? "Просмотрено" : "Доставлено"}>
                        {showReadStatus ? (
                          isRead ? <CheckCheck className="h-3 w-3 inline" /> : <Check className="h-3 w-3 inline" />
                        ) : (
                          <Check className="h-3 w-3 inline" />
                        )}
                      </span>
                    )}
                  </span>
                </p>
                {!editing && extractUrls(content).map((url: string) => (
                  <LinkPreview key={url} url={url} />
                ))}
              </>
            ) : (
              <div className="flex items-center justify-end gap-1.5">
                {editedAt && (
                  <span
                    className={cn(
                      "text-[11px]",
                      isOwn ? "text-white/70" : "text-[var(--air-text-muted)]"
                    )}
                  >
                    изм.
                  </span>
                )}
                <span
                  className={cn(
                    "text-[11px]",
                    isOwn ? "text-white/75" : "text-[var(--air-text-muted)]"
                  )}
                >
                  {time}
                </span>
                {isOwn && (
                  <span title={isRead ? "Просмотрено" : "Доставлено"}>
                    {showReadStatus ? (
                      isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                  </span>
                )}
              </div>
            )}
            {hasReactions && (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {reactions.map((r) => (
                  <button
                    key={r.emoji}
                    type="button"
                    onClick={() => handleReactionClick(r.emoji)}
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs transition",
                      r.userIds.includes(currentUserId)
                        ? "bg-white/20"
                        : "bg-black/10 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/15"
                    )}
                  >
                    <span>{r.emoji}</span>
                    {r.count > 1 && <span className="opacity-90">{r.count}</span>}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
