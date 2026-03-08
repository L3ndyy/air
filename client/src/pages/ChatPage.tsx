import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Send, Paperclip, Smile, Search, X } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { getSocket } from '@/lib/socket'
import { useAuthStore } from '@/stores/useAuthStore'
import { useChatStore, type ChatMessage } from '@/stores/useChatStore'
import { Avatar } from '@/components/Avatar'
import { MessageBubble } from '@/components/MessageBubble'
import { EmojiPickerWrapper } from '@/components/EmojiPickerWrapper'
import { Button } from '@/components/ui/Button'

/** Окно чата: сообщения + поле ввода с эмодзи и отправкой */
export function ChatPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const me = useAuthStore((s) => s.user)
  const MESSAGE_PAGE_SIZE = 50
  const {
    messages,
    setMessages,
    prependMessages,
    addMessage,
    setTyping,
    typingUserIds,
    chats,
  } = useChatStore()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; senderUsername: string; senderId: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesScrollRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const fromState = (location.state as { username?: string } | null)?.username
  const fromChats = userId ? chats.find((c) => c.user._id === userId)?.user : null
  const otherUser = fromChats ?? (fromState && userId ? { _id: userId, username: fromState } : null)
  const onlineUserIds = useChatStore((s) => s.onlineUserIds)
  const isOtherOnline = otherUser && (onlineUserIds[otherUser._id] ?? chats.find((c) => c.user._id === userId)?.online)
  const rawList = (userId && messages[userId]) || []
  const q = searchQuery.trim().toLowerCase()
  const list = q ? rawList.filter((m) => m.content.toLowerCase().includes(q)) : rawList

  useEffect(() => {
    if (!userId || !getSocket()) return
    setHasMore(true)
    getSocket()!.emit('get_messages', { otherUserId: userId, limit: MESSAGE_PAGE_SIZE }, (res: { ok?: boolean; messages?: ChatMessage[]; error?: string }) => {
      if (res?.ok && res.messages) {
        setMessages(userId, res.messages)
        setHasMore(res.messages.length >= MESSAGE_PAGE_SIZE)
      }
      getSocket()!.emit('messages_read', { otherUserId: userId })
    })
  }, [userId, setMessages])

  const loadOlderMessages = () => {
    if (!userId || !getSocket() || loadingMore || !hasMore || list.length === 0) return
    const firstId = list[0]._id
    setLoadingMore(true)
    const scrollEl = messagesScrollRef.current
    const prevScrollHeight = scrollEl?.scrollHeight ?? 0
    getSocket()!.emit('get_messages', { otherUserId: userId, beforeId: firstId, limit: MESSAGE_PAGE_SIZE }, (res: { ok?: boolean; messages?: ChatMessage[]; error?: string }) => {
      setLoadingMore(false)
      if (res?.ok && res.messages?.length) {
        prependMessages(userId, res.messages)
        setHasMore(res.messages.length >= MESSAGE_PAGE_SIZE)
        requestAnimationFrame(() => {
          if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight - prevScrollHeight
        })
      } else if (res?.ok) setHasMore(false)
    })
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [list.length])

  const sendMessage = (filePayload?: { fileUrl: string; fileName: string; fileSize: number }) => {
    const text = input.trim()
    if ((!text && !filePayload) || !userId || !me) return
    setSending(true)
    setInput('')
    setReplyTo(null)
    setTyping(userId, false)
    const payload: { receiverId: string; content: string; fileUrl?: string; fileName?: string; fileSize?: number; replyToMessageId?: string; replyToContent?: string; replyToSenderId?: string } = filePayload
      ? { receiverId: userId, content: text || filePayload.fileName, ...filePayload }
      : { receiverId: userId, content: text }
    if (replyTo) {
      payload.replyToMessageId = replyTo.id
      payload.replyToContent = replyTo.content
      payload.replyToSenderId = replyTo.senderId
    }
    getSocket()!.emit('send_message', payload, (res: { ok?: boolean; message?: ChatMessage; error?: string }) => {
      setSending(false)
      if (res?.ok && res.message) addMessage(res.message)
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !userId || !me) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Ошибка загрузки')
      sendMessage({ fileUrl: data.url, fileName: data.fileName ?? file.name, fileSize: data.fileSize ?? file.size })
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const emitTyping = () => {
    if (!userId) return
    setTyping(userId, true)
    getSocket()!.emit('typing', { otherUserId: userId, isTyping: true })
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      getSocket()!.emit('typing', { otherUserId: userId, isTyping: false })
      setTyping(userId, false)
    }, 2000)
  }

  const isTyping = userId ? typingUserIds.has(userId) : false

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditingContent(content)
  }
  const handleSaveEdit = () => {
    if (!editingMessageId || !editingContent.trim()) return
    getSocket()!.emit('edit_message', { messageId: editingMessageId, content: editingContent.trim() }, (res: { ok?: boolean; message?: ChatMessage; error?: string }) => {
      if (res?.ok && res.message) {
        useChatStore.getState().updateMessage(userId!, res.message._id, res.message)
      }
      setEditingMessageId(null)
      setEditingContent('')
    })
  }
  const handleDeleteMessage = (messageId: string) => {
    getSocket()!.emit('delete_message', { messageId }, (res: { ok?: boolean; error?: string }) => {
      if (res?.ok) useChatStore.getState().removeMessage(userId!, messageId)
    })
  }
  const handleReply = (messageId: string, content: string, senderId: string) => {
    const senderUsername = senderId === me!._id ? me!.username : (otherUser?.username ?? '')
    setReplyTo({ id: messageId, content, senderUsername, senderId })
  }

  if (!userId) return null
  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Шапка чата */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark shrink-0">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="md:hidden p-2 -ml-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Назад"
        >
          ←
        </button>
        {otherUser ? (
          <>
            <Avatar name={otherUser.username} size="md" />
            <div className="min-w-0 flex-1">
              <h1 className="font-semibold text-content-primary dark:text-slate-100 truncate">
                {otherUser.username}
              </h1>
              {isTyping && (
                <p className="text-xs text-content-muted dark:text-slate-400">печатает...</p>
              )}
              {!isTyping && isOtherOnline && (
                <p className="text-xs text-green-600 dark:text-green-400">в сети</p>
              )}
            </div>
            {searchOpen ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Поиск в чате..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-40 rounded-lg border border-border dark:border-border-dark bg-primary dark:bg-primary-dark px-2 py-1 text-sm text-content-primary dark:text-slate-100 placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent"
                  autoFocus
                />
                <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery('') }} className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setSearchOpen(true)} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10" aria-label="Поиск">
                <Search className="w-5 h-5 text-content-muted" />
              </button>
            )}
          </>
        ) : (
          <span className="text-content-muted dark:text-slate-400">Загрузка...</span>
        )}
      </header>

      {/* Сообщения */}
      <div
        ref={messagesScrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        onScroll={(e) => {
          const el = e.currentTarget
          if (el.scrollTop < 100) loadOlderMessages()
        }}
      >
        {loadingMore && (
          <div className="flex justify-center py-2">
            <span className="text-sm text-content-muted dark:text-slate-400">Загрузка…</span>
          </div>
        )}
        <AnimatePresence initial={false}>
          {searchQuery.trim() && <p className="text-xs text-content-muted dark:text-slate-400 py-1">Найдено: {list.length}</p>}
          {list.map((msg) => (
            <MessageBubble
              key={msg._id}
              messageId={msg._id}
              senderId={msg.senderId}
              content={msg.content}
              isOwn={msg.senderId === me!._id}
              time={msg.createdAt}
              read={msg.read}
              editedAt={msg.editedAt}
              fileUrl={msg.fileUrl}
              fileName={msg.fileName}
              highlightText={searchQuery.trim() || undefined}
              replyTo={msg.replyToMessageId ? { id: msg.replyToMessageId, content: msg.replyToContent ?? '', senderUsername: msg.replyToSenderId === me?._id ? me?.username ?? '' : otherUser?.username ?? '' } : undefined}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              onReply={handleReply}
            />
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Превью ответа */}
      {replyTo && (
        <div className="px-3 py-2 border-t border-border dark:border-border-dark bg-primary/50 dark:bg-primary-dark/50 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-content-muted dark:text-slate-400">Ответ на: {replyTo.senderUsername}</p>
            <p className="text-sm truncate text-content-primary dark:text-slate-200">{replyTo.content}</p>
          </div>
          <button type="button" onClick={() => setReplyTo(null)} className="text-content-muted hover:text-content-primary shrink-0">Отмена</button>
        </div>
      )}

      {/* Редактирование сообщения */}
      {editingMessageId && (
        <div className="px-3 py-2 border-t border-border dark:border-border-dark bg-amber-500/10 dark:bg-amber-500/20 flex items-center gap-2">
          <input
            type="text"
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            className="flex-1 rounded-lg border border-border dark:border-border-dark bg-primary dark:bg-primary-dark px-3 py-2 text-sm"
            placeholder="Текст сообщения"
          />
          <Button type="button" onClick={handleSaveEdit}>Сохранить</Button>
          <button type="button" onClick={() => { setEditingMessageId(null); setEditingContent('') }} className="text-sm text-content-muted">Отмена</button>
        </div>
      )}

      {/* Поле ввода */}
      <div className="p-3 border-t border-border dark:border-border-dark bg-surface dark:bg-surface-dark">
        <div className="flex items-end gap-2">
          <EmojiPickerWrapper onEmojiSelect={(emoji) => setInput((t) => t + emoji)}>
            <Smile className="w-5 h-5" />
          </EmojiPickerWrapper>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.txt,.doc,.docx"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2 rounded-xl text-content-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 disabled:opacity-50"
            aria-label="Прикрепить файл"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              emitTyping()
            }}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение"
            rows={1}
            className="flex-1 min-h-[44px] max-h-32 resize-y rounded-xl border border-border dark:border-border-dark bg-primary dark:bg-primary-dark px-4 py-2.5 text-content-primary dark:text-slate-100 placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
          />
          <Button
            type="button"
            onClick={() => sendMessage()}
            disabled={!input.trim() || sending}
            className="shrink-0 rounded-full w-11 h-11 p-0 flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
