import { motion } from 'framer-motion'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
  children: React.ReactNode
  className?: string
}

/** Кнопка с микро-анимацией нажатия */
export function Button({ variant = 'primary', children, className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.02 }} className="inline-block">
      <button
        type={type}
        className={`
          rounded-xl px-4 py-2.5 font-medium transition-all duration-150
          disabled:opacity-50 disabled:pointer-events-none
          ${variant === 'primary' ? 'bg-accent text-white hover:bg-accent-hover shadow-[0_1px_3px_rgba(99,102,241,0.3)] hover:shadow-[0_2px 6px_rgba(99,102,241,0.35)]' : 'bg-transparent text-content-primary dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10'}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    </motion.div>
  )
}
