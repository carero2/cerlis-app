import type { ReactNode } from 'react'
import { goBack, paths } from '../lib/router'
import { Icon } from './Icon'
import { BackButton } from './Page'

/** Botón Atrás hacia la lista de juegos. */
export function GamesBack() {
  return <BackButton onClick={() => goBack(paths.games)} label="Juegos" iconOnly />
}

/** "+" (nueva partida) y "?" (reglas) de la barra superior de cada juego. */
export function GameHeaderButtons({ onNew, onHelp }: { onNew: () => void; onHelp: () => void }) {
  return (
    <>
      <button className="nav-btn nav-icon help-btn" onClick={onNew} aria-label="Nueva partida">
        <Icon name="plus" size={18} strokeWidth={2.6} />
      </button>
      <button className="nav-btn nav-icon help-btn" onClick={onHelp} aria-label="Cómo se juega">
        ?
      </button>
    </>
  )
}

/** Tarjeta de bienvenida cuando no hay partida. */
export function GameIntro({
  art,
  title,
  children,
  onStart,
  onHelp,
  startLabel = 'Empezar partida',
  disabled,
}: {
  art: ReactNode
  title: string
  children: ReactNode
  onStart: () => void
  onHelp: () => void
  startLabel?: string
  disabled?: boolean
}) {
  return (
    <section className="go-intro card">
      <div className="go-intro-art" aria-hidden>
        {art}
      </div>
      <h2>{title}</h2>
      <div className="muted go-intro-text">{children}</div>
      <button className="btn btn-primary btn-block" onClick={onStart} disabled={disabled}>
        {startLabel}
      </button>
      <button className="btn btn-ghost btn-block" onClick={onHelp}>
        Ver cómo se juega
      </button>
    </section>
  )
}

/** Sección numerada de las reglas (mismo estilo que las del Go). */
export function Rule({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="go-rule">
      <h4>
        <span className="go-rule-n">{n}</span>
        {title}
      </h4>
      {children}
    </section>
  )
}

export function saveError(e: unknown): string {
  if ((e as { code?: string }).code === 'permission-denied') return 'Firebase no deja guardar: revisa las reglas.'
  if (!navigator.onLine) return 'Sin conexión: se enviará cuando vuelva internet.'
  return 'No se ha podido guardar.'
}
