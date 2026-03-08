import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { ChatLayout } from '@/layouts/ChatLayout'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ChatPlaceholder } from '@/pages/ChatPlaceholder'
import { ChatPage } from '@/pages/ChatPage'
import { connectSocket } from '@/lib/socket'
import { useChatStore } from '@/stores/useChatStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useSocketStore } from '@/stores/useSocketStore'

function playNotificationSound() {
  try {
    const audio = new Audio('/notification.mp3')
    audio.volume = 0.5
    audio.play().catch(() => {
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 800
        gain.gain.value = 0.1
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.1)
      } catch {}
    })
  } catch {}
}

function App() {
  const addMessage = useChatStore((s) => s.addMessage)
  const setTyping = useChatStore((s) => s.setTyping)
  const isDark = useSettingsStore((s) => s.isDark)
  const setSocketStatus = useSocketStore((s) => s.setStatus)

  // Тема: вешаем класс dark на <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    const socket = connectSocket()
    setSocketStatus('disconnected')
    const onConnect = () => {
      setSocketStatus('connected')
      const { user, token } = useAuthStore.getState()
      if (user && token) {
        socket.emit('restore_session', { token }, (res: { ok?: boolean }) => {
          if (!res?.ok) useAuthStore.getState().logout()
        })
      }
    }
    socket.on('connect', onConnect)
    socket.on('disconnect', () => setSocketStatus('reconnecting'))
    socket.on('connect_error', () => setSocketStatus('reconnecting'))
    socket.on('new_message', (msg: { _id: string; senderId: string; receiverId: string; content: string; read: boolean; createdAt: string }) => {
      addMessage(msg)
      const me = useAuthStore.getState().user?._id
      if (!me) return
      const otherUserId = msg.senderId === me ? msg.receiverId : msg.senderId
      const activeChat = useChatStore.getState().activeChatUserId
      const soundEnabled = useSettingsStore.getState().soundEnabled
      const shouldPlay = soundEnabled && (activeChat !== otherUserId || document.hidden)
      if (shouldPlay) playNotificationSound()
    })
    socket.on('user_typing', (data: { userId: string; isTyping: boolean }) => {
      setTyping(data.userId, data.isTyping)
    })
    socket.on('messages_read', (data: { readerId: string }) => {
      useChatStore.getState().markMessagesRead(data.readerId)
    })
    socket.on('message_updated', (msg: { _id: string; senderId: string; receiverId: string; content: string; read: boolean; createdAt: string; editedAt?: string }) => {
      const me = useAuthStore.getState().user?._id
      if (!me) return
      const other = msg.senderId === me ? msg.receiverId : msg.senderId
      useChatStore.getState().updateMessage(other, msg._id, msg)
    })
    socket.on('user_online', (data: { userId: string }) => {
      useChatStore.getState().setOnline(data.userId, true)
    })
    socket.on('user_offline', (data: { userId: string }) => {
      useChatStore.getState().setOnline(data.userId, false)
    })
    socket.on('message_deleted', (data: { messageId: string }) => {
      const me = useAuthStore.getState().user?._id
      if (!me) return
      const { messages } = useChatStore.getState()
      for (const [otherUserId, list] of Object.entries(messages)) {
        const found = list.find((m) => m._id === data.messageId)
        if (found) {
          useChatStore.getState().removeMessage(otherUserId, data.messageId)
          break
        }
      }
    })
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect')
      socket.off('connect_error')
      socket.off('new_message')
      socket.off('user_typing')
      socket.off('messages_read')
      socket.off('user_online')
      socket.off('user_offline')
      socket.off('message_updated')
      socket.off('message_deleted')
    }
  }, [addMessage, setTyping, setSocketStatus])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthLayout />}>
          <Route index element={<LoginPage />} />
        </Route>
        <Route path="/register" element={<AuthLayout />}>
          <Route index element={<RegisterPage />} />
        </Route>
        <Route path="/" element={<ChatLayout />}>
          <Route index element={<ChatPlaceholder />} />
          <Route path="chat/:userId" element={<ChatPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
