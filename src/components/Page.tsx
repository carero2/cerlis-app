import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

interface PageProps {
  title: string
  subtitle?: ReactNode
  /** Contenido a la izquierda de la barra superior (p. ej. botón Atrás). */
  left?: ReactNode
  right?: ReactNode
  /** Oculta el título grande (pantallas con cabecera propia). */
  hideLargeTitle?: boolean
  /** Barra superior transparente sobre una cabecera con imagen/color. */
  overlay?: boolean
  children: ReactNode
  className?: string
}

/**
 * Estructura de pantalla con título grande que se contrae en la barra
 * superior al hacer scroll, como en las apps nativas de iOS.
 */
export function Page({ title, subtitle, left, right, hideLargeTitle, overlay, children, className }: PageProps) {
  const sentinel = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setCollapsed(!entry.isIntersecting), {
      rootMargin: '-60px 0px 0px 0px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className={`page ${className ?? ''}`}>
      <header className={`topbar ${collapsed ? 'is-collapsed' : ''} ${overlay ? 'is-overlay' : ''}`}>
        <div className="topbar-side">{left}</div>
        <div className="topbar-title" aria-hidden={!collapsed}>
          {title}
        </div>
        <div className="topbar-side topbar-right">{right}</div>
      </header>
      {!hideLargeTitle && (
        <div className="large-title">
          <h1>{title}</h1>
          {subtitle && <div className="large-subtitle">{subtitle}</div>}
        </div>
      )}
      {/* Con cabecera propia, la barra se rellena al pasar la cabecera (≈ 180px). */}
      <div ref={sentinel} className="title-sentinel" style={overlay ? { position: 'absolute', top: 180 } : undefined} />
      <main className="page-content">{children}</main>
    </div>
  )
}

export function BackButton({ onClick, label = 'Atrás', iconOnly }: { onClick: () => void; label?: string; iconOnly?: boolean }) {
  return (
    <button className={`nav-btn nav-back ${iconOnly ? 'nav-icon' : ''}`} onClick={onClick} aria-label={label}>
      <Icon name="back" size={22} />
      {!iconOnly && <span>{label}</span>}
    </button>
  )
}

export function NavIconButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: Parameters<typeof Icon>[0]['name']
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button className={`nav-btn nav-icon ${active ? 'is-active' : ''}`} onClick={onClick} aria-label={label}>
      <Icon name={icon} size={22} filled={active && icon === 'heart'} />
    </button>
  )
}
