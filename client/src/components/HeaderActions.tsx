import { useNavigate } from 'react-router-dom'
import { Sun, Moon, LogOut, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useSocketStore } from '@/stores/useSocketStore'
import { disconnectSocket } from '@/lib/socket'

/** Переключатель темы, индикатор сети, выход */
export function HeaderActions() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const isDark = useSettingsStore((s) => s.isDark)
  const toggleDark = useSettingsStore((s) => s.toggleDark)
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled)
  const status = useSocketStore((s) => s.status)

  const handleLogout = () => {
    logout()
    disconnectSocket()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex items-center gap-2">
      {/* Индикатор сети */}
      <span
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${
          status === 'connected'
            ? 'text-green-600 dark:text-green-400 bg-green-500/10'
            : status === 'reconnecting'
              ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
              : 'text-red-600 dark:text-red-400 bg-red-500/10'
        }`}
        title={status === 'connected' ? 'Подключено' : status === 'reconnecting' ? 'Переподключение…' : 'Нет сети'}
      >
        {status === 'connected' ? (
          <Wifi className="w-3.5 h-3.5" />
        ) : status === 'reconnecting' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <WifiOff className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">
          {status === 'connected' ? 'Подключено' : status === 'reconnecting' ? 'Переподключение…' : 'Нет сети'}
        </span>
      </span>

      {/* Звук уведомлений */}
      <button
        type="button"
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="p-2 rounded-xl text-content-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        title={soundEnabled ? 'Звук вкл' : 'Звук выкл'}
      >
        <span className="text-xs font-medium">{soundEnabled ? '🔔' : '🔕'}</span>
      </button>

      {/* Тема */}
      <button
        type="button"
        onClick={toggleDark}
        className="p-2 rounded-xl text-content-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label={isDark ? 'Светлая тема' : 'Тёмная тема'}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Выход */}
      <button
        type="button"
        onClick={handleLogout}
        className="p-2 rounded-xl text-content-muted hover:bg-black/5 dark:hover:bg-white/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        title="Выйти"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  )
}
