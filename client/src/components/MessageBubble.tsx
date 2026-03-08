import { useState } from 'react'
import type React from 'react'
import { motion } from 'framer-motion'
import { Check, CheckCheck, FileDown, MoreVertical, Pencil, Trash2, Reply } from 'lucide-react'

interface MessageBubbleProps {
  content: string
  isOwn: boolean
  time: string
  read?: boolean
  editedAt?: string
  fileUrl?: string
  fileName?: string
  highlightText?: string
  messageId?: string
  senderId?: string
  replyTo?: { id: string; content: string; senderUsername: string }
  onEdit?: (messageId: string, content: string) => void
  onDelete?: (messageId: string) => void
  onReply?: (messageId: string, content: string, senderId: string) => void
}

/** Пузырёк сообщения с хвостиком, свои справа, чужие слева */
function highlightContent(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(re)
  return parts.map((part, i) => (i % 2 === 1 ? <mark key={i} className="bg-amber-300 dark:bg-amber-600 rounded px-0.5">{part}</mark> : part))
}

export function MessageBubble({ content, isOwn, time, read, editedAt, fileUrl, fileName, highlightText, messageId, senderId, replyTo, onEdit, onDelete, onReply }: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isImage = fileUrl && fileName && /\.(jpe?g|png|gif|webp)$/i.test(fileName)
  const showMenu = messageId && (onEdit && isOwn || onDelete && isOwn || onReply)
  return (
    <motion.div
      id={messageId ? `msg-${messageId}` : undefined}
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`
          max-w-[75%] rounded-bubble rounded-tl-none px-4 py-2.5 shadow-bubble
          ${isOwn ? 'bg-accent text-white rounded-tr-none shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'bg-surface dark:bg-surface-dark text-content-primary dark:text-slate-100 border border-border dark:border-border-dark rounded-tl-none'}
        `}
      >
        {replyTo && (
          <button
            type="button"
            onClick={() => document.getElementById(`msg-${replyTo.id}`)?.scrollIntoView({ behavior: 'smooth' })}
            className="block w-full text-left mb-2 pl-2 border-l-2 border-current opacity-80 rounded-r text-sm truncate hover:opacity-100"
          >
            <span className="font-medium">{replyTo.senderUsername}</span>
            <span className="ml-1 truncate">{replyTo.content}</span>
          </button>
        )}
        {fileUrl && (
          <div className="mb-2">
            {isImage ? (
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden max-h-64">
                <img src={fileUrl} alt={fileName ?? 'Файл'} className="max-w-full object-contain" />
              </a>
            ) : (
              <a
                href={fileUrl}
                download={fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg py-2 px-3 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
              >
                <FileDown className="w-4 h-4 shrink-0" />
                <span className="truncate text-sm">{fileName ?? 'Скачать'}</span>
              </a>
            )}
          </div>
        )}
        {content && (
          <p className="text-[15px] leading-snug break-words whitespace-pre-wrap">
            {highlightText ? highlightContent(content, highlightText) : content}
          </p>
        )}
        <div className={`flex items-center gap-1 mt-1 flex-wrap ${isOwn ? 'justify-end' : 'justify-start'}`}>
          {editedAt && <span className="text-xs opacity-70">ред.</span>}
          <span className="text-xs opacity-80">{formatTime(time)}</span>
          {isOwn && (read ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />)}
          {showMenu && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
                  <div className="absolute right-0 top-full mt-1 py-1 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark shadow-lg z-20 min-w-[120px]">
                    {onEdit && (
                      <button type="button" onClick={() => { onEdit(messageId!, content); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5">
                        <Pencil className="w-4 h-4" /> Редактировать
                      </button>
                    )}
                    {onDelete && (
                      <button type="button" onClick={() => { onDelete(messageId!); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" /> Удалить
                      </button>
                    )}
                    {onReply && (
                      <button type="button" onClick={() => { if (senderId) onReply(messageId!, content.slice(0, 80), senderId); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5">
                        <Reply className="w-4 h-4" /> Ответить
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
