import { useMemo } from 'react'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }

/** Цвет фона по хешу имени (стабильный для одного имени) */
function colorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 55%, 45%)`
}

/** Инициалы из имени (первые буквы слов или первые 2 символа) */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase() || '?'
}

/** Аватар по инициалам и цвету по имени */
export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const bg = useMemo(() => colorFromName(name), [name])
  const initial = useMemo(() => initials(name), [name])
  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-medium text-white shrink-0 ${className}`}
      style={{ backgroundColor: bg }}
    >
      {initial}
    </div>
  )
}
