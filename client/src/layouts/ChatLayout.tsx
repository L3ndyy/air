import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { ChatListPage } from '@/pages/ChatListPage'
import { HeaderActions } from '@/components/HeaderActions'

/** Лейаут чата: сайдбар со списком + область чата. На мобильном — один экран. */
export function ChatLayout() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const isChatOpen = location.pathname.startsWith('/chat/')
  const isIndex = location.pathname === '/'

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="h-screen flex bg-primary dark:bg-primary-dark overflow-hidden">
      <div
        className={`
          w-full md:w-80 shrink-0 flex flex-col border-r border-border dark:border-border-dark
          ${isChatOpen ? 'hidden md:flex' : 'flex'}
        `}
      >
        <header className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark shadow-soft dark:shadow-soft-dark">
          <span className="font-semibold text-xl tracking-tight text-content-primary dark:text-slate-100">Air</span>
          <HeaderActions />
        </header>
        <ChatListPage />
      </div>
      {/* Область чата: на мобильном на главной скрыта */}
      <main className={`flex-1 min-w-0 flex flex-col overflow-hidden ${isIndex ? 'hidden md:flex' : 'flex'}`}>
        <Outlet />
      </main>
    </div>
  )
}
