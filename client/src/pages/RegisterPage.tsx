import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { getSocket } from '@/lib/socket'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

/** Страница регистрации */
export function RegisterPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const sock = getSocket()
    if (!sock) {
      setError('Нет соединения с сервером')
      setLoading(false)
      return
    }
    sock.emit('register', { username: username.trim(), password }, (res: { ok?: boolean; user?: { _id: string; username: string }; token?: string; error?: string }) => {
      setLoading(false)
      if (res?.ok && res.user) {
        setUser(res.user, res.token ?? null)
      } else {
        setError(res?.error || 'Ошибка регистрации')
      }
    })
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-surface dark:bg-surface-dark p-8 shadow-card dark:shadow-card-dark border border-border dark:border-border-dark">
      <h1 className="text-2xl font-semibold text-content-primary dark:text-slate-100 mb-2 text-center tracking-tight">
        Регистрация
      </h1>
      <p className="text-sm text-content-muted dark:text-slate-400 mb-6 text-center">Минимум 3 символа в имени, 4 — в пароле</p>
      <form onSubmit={handleRegister} className="space-y-4">
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
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-content-muted dark:text-slate-400">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="text-accent hover:text-accent-hover font-medium">
          Войти
        </Link>
      </p>
    </div>
  )
}
