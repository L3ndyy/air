import { useState, useRef, useEffect } from 'react'
import EmojiPicker, { type Theme, type EmojiClickData } from 'emoji-picker-react'

interface EmojiPickerWrapperProps {
  onEmojiSelect: (emoji: string) => void
  children: React.ReactNode
  className?: string
}

/** Обёртка над emoji-picker-react: клик по children открывает попап выбора эмодзи */
export function EmojiPickerWrapper({ onEmojiSelect, children, className = '' }: EmojiPickerWrapperProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handlePick = (data: EmojiClickData) => {
    onEmojiSelect(data.emoji)
  }

  const theme = (document.documentElement.classList.contains('dark') ? 'dark' : 'light') as Theme

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-xl text-content-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label="Выбрать эмодзи"
      >
        {children}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 z-50">
          <EmojiPicker onEmojiClick={handlePick} theme={theme} width={320} height={360} />
        </div>
      )}
    </div>
  )
}
