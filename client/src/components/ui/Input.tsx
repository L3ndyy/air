import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

/** Минималистичное поле ввода с фокусом */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`
        w-full rounded-xl border border-border dark:border-border-dark
        bg-surface dark:bg-surface-dark
        px-4 py-2.5 text-content-primary dark:text-slate-100
        placeholder:text-content-muted dark:placeholder:text-slate-500
        focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50
        transition-all duration-150
        ${className}
      `}
      {...props}
    />
  )
)
Input.displayName = 'Input'
