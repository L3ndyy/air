import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSocket } from '@/lib/socket'
import { useAuthStore } from '@/stores/useAuthStore'
import { useChatStore } from '@/stores/useChatStore'
import { Avatar } from '@/components/Avatar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { UserPlus } from 'lucide-react'

/** Список чатов: аватар, имя, последнее сообщение */
export function ChatListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { chats, setChats, setActiveChat, onlineUserIds } = useChatStore()
  const [newChatUsername, setNewChatUsername] = useState('')
  const [newChatError, setNewChatError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const sock = getSocket()
    if (!sock || !user) return
    sock.emit('get_chats', {}, (res: { ok?: boolean; chats?: import('@/stores/useChatStore').ChatItem[]; error?: string }) => {
      if (res?.ok && res.chats) setChats(res.chats)
    })
  }, [user, setChats])

  const openChat = (userId: string) => {
    setActiveChat(userId)
    navigate(`/chat/${userId}`)
  }

  const startChatWithUsername = (e: React.FormEvent) => {
    e.preventDefault()
    const username = newChatUsername.trim()
    if (!username) return
    setNewChatError('')
    const sock = getSocket()
    if (!sock) {
      setNewChatError('Нет соединения')
      return
    }
    sock.emit('get_user_id', { username }, (res: { ok?: boolean; userId?: string; username?: string; error?: string }) => {
      if (res?.ok && res.userId) {
        if (res.userId === user?._id) {
          setNewChatError('Нельзя написать себе')
          return
        }
        setNewChatUsername('')
        navigate(`/chat/${res.userId}`, { state: { username: res.username } })
        setActiveChat(res.userId)
      } else {
        setNewChatError(res?.error || 'Не найден')
      }
    })
  }

  return (
    <div className="flex flex-col h-full bg-surface dark:bg-surface-dark overflow-y-auto">
      <div className="p-3 border-b border-border dark:border-border-dark space-y-3">
        <h2 className="font-semibold text-content-primary dark:text-slate-100 text-sm uppercase tracking-wider text-content-muted dark:text-slate-400">Чаты</h2>
        <form onSubmit={startChatWithUsername} className="flex gap-2">
          <Input
            placeholder="Имя пользователя"
            value={newChatUsername}
            onChange={(e) => setNewChatUsername(e.target.value)}
            className="flex-1 min-w-0 rounded-input"
          />
          <Button type="submit" className="shrink-0 rounded-input" title="Начать чат">
            <UserPlus className="w-5 h-5" />
          </Button>
        </form>
        {newChatError && <p className="text-xs text-red-500 dark:text-red-400">{newChatError}</p>}
        <input
          type="text"
          placeholder="Поиск по чатам..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-input border border-border dark:border-border-dark bg-primary dark:bg-primary-dark px-3 py-2 text-sm text-content-primary dark:text-slate-100 placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 transition-shadow"
        />
      </div>
      <ul className="flex-1 overflow-y-auto min-h-0">
        {(() => {
          const q = searchQuery.trim().toLowerCase()
          const filtered = q ? chats.filter((c) => c.user.username.toLowerCase().includes(q) || (c.lastMessage?.content && c.lastMessage.content.toLowerCase().includes(q))) : chats
          if (filtered.length === 0) {
            return (
              <li className="p-4 text-center text-content-muted dark:text-slate-400 text-sm">
                {chats.length === 0 ? 'Пока нет чатов. Начните общение с пользователем по имени.' : 'Ничего не найдено.'}
              </li>
            )
          }
          return filtered.map((chat) => (
            <li
              key={chat.user._id}
              onClick={() => openChat(chat.user._id)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/8 dark:active:bg-white/8 cursor-pointer transition-colors border-b border-border/50 dark:border-border-dark/50"
            >
              <div className="relative">
                <Avatar name={chat.user.username} size="md" />
                {(onlineUserIds[chat.user._id] ?? chat.online) && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-surface dark:border-surface-dark" title="в сети" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-content-primary dark:text-slate-100 truncate">
                  {chat.user.username}
                </p>
                {chat.lastMessage && (
                  <p className="text-sm text-content-muted dark:text-slate-400 truncate">
                    {chat.lastMessage.content}
                  </p>
                )}
              </div>
            </li>
          ))
        })()}
      </ul>
    </div>
  )
}
