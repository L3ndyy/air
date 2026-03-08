/** Заглушка «Выберите чат» на десктопе */
export function ChatPlaceholder() {
  return (
    <div className="hidden md:flex flex-1 items-center justify-center bg-primary dark:bg-primary-dark">
      <p className="text-content-muted dark:text-slate-400">Выберите чат или начните новый</p>
    </div>
  )
}
