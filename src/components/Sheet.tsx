import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  /** Color de acento (las hojas se montan fuera de la pantalla y no lo heredan). */
  tone?: 'green' | 'orange' | 'blue' | 'purple' | 'wood'
}

/** Hoja inferior estilo iOS con animación de entrada y salida. */
export function Sheet({ open, onClose, title, children, footer, tone = 'green' }: SheetProps) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
      return () => cancelAnimationFrame(raf)
    }
    setVisible(false)
    const t = window.setTimeout(() => setMounted(false), 280)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <div className={`sheet-root tone-${tone} ${visible ? 'is-open' : ''}`}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" />
        {title && (
          <div className="sheet-header">
            <h3>{title}</h3>
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

interface ConfirmProps {
  open: boolean
  title: string
  message?: string
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => void
  onClose: () => void
  tone?: SheetProps['tone']
}

export function ConfirmSheet({ open, title, message, confirmLabel, destructive, onConfirm, onClose, tone }: ConfirmProps) {
  return (
    <Sheet open={open} onClose={onClose} tone={tone}>
      <div className="confirm">
        <h3>{title}</h3>
        {message && <p className="muted">{message}</p>}
        <button
          className={`btn btn-block ${destructive ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel}
        </button>
        <button className="btn btn-block btn-ghost" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </Sheet>
  )
}
