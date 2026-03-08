import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { getSocket } from '@/lib/socket'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

/** Страница входа */
export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const sock = getSocket()
    if (!sock) {
      setError('Нет соединения с сервером')
      setLoading(false)
      return
    }
    sock.emit('login', { username: username.trim(), password }, (res: { ok?: boolean; user?: { _id: string; username: string }; token?: string; error?: string }) => {
      setLoading(false)
      if (res?.ok && res.user) {
        setUser(res.user, res.token ?? null)
      } else {
        setError(res?.error || 'Ошибка входа')
      }
    })
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-surface dark:bg-surface-dark p-8 shadow-card dark:shadow-card-dark border border-border dark:border-border-dark">
      <h1 className="text-2xl font-semibold text-content-primary dark:text-slate-100 mb-2 text-center tracking-tight">
        Вход в Air
      </h1>
      <p className="text-sm text-content-muted dark:text-slate-400 mb-6 text-center">Введите имя и пароль</p>
      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          placeholder="Имя пользователя"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <Input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-content-muted dark:text-slate-400">
        Нет аккаунта?{' '}
        <Link to="/register" className="text-accent hover:text-accent-hover font-medium">
          Регистрация
        </Link>
      </p>
    </div>
  )
}
