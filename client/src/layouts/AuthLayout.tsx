import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'

/** Лейаут для страниц входа/регистрации — редирект если уже авторизован */
export function AuthLayout() {
  const user = useAuthStore((s) => s.user)
  if (user) return <Navigate to="/" replace />
  return (
    <div className="min-h-screen bg-primary dark:bg-primary-dark flex items-center justify-center p-4">
      <Outlet />
    </div>
  )
}
