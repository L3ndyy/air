import { create } from 'zustand'
import { useAuthStore, type User } from './useAuthStore'

export interface ChatMessage {
  _id: string
  senderId: string
  receiverId: string
  content: string
  read: boolean
  createdAt: string
  editedAt?: string
  isDeleted?: boolean
  replyToMessageId?: string
  replyToContent?: string
  replyToSenderId?: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
}

export interface ChatItem {
  user: User
  lastMessage?: ChatMessage
  online?: boolean
}

interface ChatState {
  chats: ChatItem[]
  messages: Record<string, ChatMessage[]>
  activeChatUserId: string | null
  typingUserIds: Set<string>
  setChats: (chats: ChatItem[]) => void
  setMessages: (otherUserId: string, messages: ChatMessage[]) => void
  prependMessages: (otherUserId: string, messages: ChatMessage[]) => void
  addMessage: (msg: ChatMessage) => void
  setActiveChat: (userId: string | null) => void
  setTyping: (userId: string, isTyping: boolean) => void
  updateChatLastMessage: (otherUserId: string, message: ChatMessage) => void
  markMessagesRead: (readerId: string) => void
  updateMessage: (otherUserId: string, messageId: string, updates: Partial<ChatMessage>) => void
  removeMessage: (otherUserId: string, messageId: string) => void
  onlineUserIds: Record<string, boolean>
  setOnline: (userId: string, online: boolean) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  messages: {},
  activeChatUserId: null,
  typingUserIds: new Set(),

  setChats: (chats) =>
    set((s) => {
      const nextOnline = { ...s.onlineUserIds }
      chats.forEach((c) => {
        if (c.online != null) nextOnline[c.user._id] = c.online
      })
      return { chats, onlineUserIds: nextOnline }
    }),

  onlineUserIds: {},
  setOnline: (userId, online) =>
    set((s) => ({ onlineUserIds: { ...s.onlineUserIds, [userId]: online } })),

  setMessages: (otherUserId, messages) =>
    set((s) => ({ messages: { ...s.messages, [otherUserId]: messages } })),

  prependMessages: (otherUserId, messages) =>
    set((s) => {
      const existing = s.messages[otherUserId] ?? []
      const ids = new Set(existing.map((m) => m._id))
      const toPrepend = messages.filter((m) => !ids.has(m._id))
      if (toPrepend.length === 0) return s
      return { messages: { ...s.messages, [otherUserId]: [...toPrepend, ...existing] } }
    }),

  addMessage: (msg) => {
    const me = useAuthStore.getState().user?._id
    if (!me) return
    const other = msg.senderId === me ? msg.receiverId : msg.senderId
    set((s) => {
      const list = s.messages[other] ?? []
      if (list.some((m) => m._id === msg._id)) return s
      return {
        messages: { ...s.messages, [other]: [...list, msg] },
      }
    })
    get().updateChatLastMessage(other, msg)
  },

  setActiveChat: (userId) => set({ activeChatUserId: userId }),

  setTyping: (userId, isTyping) =>
    set((s) => {
      const next = new Set(s.typingUserIds)
      if (isTyping) next.add(userId)
      else next.delete(userId)
      return { typingUserIds: next }
    }),

  updateChatLastMessage: (otherUserId, message) => {
    set((s) => {
      const existing = s.chats.find((c) => c.user._id === otherUserId)
      if (!existing) return s
      const rest = s.chats.filter((c) => c.user._id !== otherUserId)
      return {
        chats: [{ ...existing, lastMessage: message }, ...rest],
      }
    })
  },

  markMessagesRead: (readerId) => {
    set((s) => {
      const list = s.messages[readerId]
      if (!list) return s
      const me = useAuthStore.getState().user?._id
      if (!me) return s
      const next = list.map((m) => (m.senderId === me ? { ...m, read: true } : m))
      return { messages: { ...s.messages, [readerId]: next } }
    })
  },

  updateMessage: (otherUserId, messageId, updates) => {
    set((s) => {
      const list = s.messages[otherUserId]
      if (!list) return s
      const next = list.map((m) => (m._id === messageId ? { ...m, ...updates } : m))
      return { messages: { ...s.messages, [otherUserId]: next } }
    })
  },

  removeMessage: (otherUserId, messageId) => {
    set((s) => {
      const list = s.messages[otherUserId]
      if (!list) return s
      const next = list.filter((m) => m._id !== messageId)
      return { messages: { ...s.messages, [otherUserId]: next } }
    })
  },
}))
