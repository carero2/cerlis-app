import type { ReactNode } from 'react'

export function EmptyState({
  emoji,
  title,
  children,
  action,
}: {
  emoji: string
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty-emoji">{emoji}</div>
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  )
}
