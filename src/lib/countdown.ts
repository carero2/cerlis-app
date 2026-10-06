import { useEffect, useState } from 'react'

export const COUNTDOWN_EMOJIS = ['✈️', '🏖️', '🏔️', '🎉', '🎂', '💍', '❤️', '🏠', '🎄', '🎟️']

export interface Remaining {
  /** El momento ya ha llegado (y estamos dentro de las 24 h siguientes). */
  arrived: boolean
  /** Hace más de un día que pasó: ya no se muestra en Inicio. */
  expired: boolean
  days: number
  hours: number
  minutes: number
  totalHours: number
}

export function remaining(target: number, now = Date.now()): Remaining {
  const diff = target - now
  if (diff <= 0) return { arrived: diff > -86_400_000, expired: diff <= -86_400_000, days: 0, hours: 0, minutes: 0, totalHours: 0 }
  const minutesTotal = Math.ceil(diff / 60_000)
  return {
    arrived: false,
    expired: false,
    days: Math.floor(minutesTotal / 1440),
    hours: Math.floor((minutesTotal % 1440) / 60),
    minutes: minutesTotal % 60,
    totalHours: Math.floor(minutesTotal / 60),
  }
}

/** Hora actual que se refresca sola (cada `ms`). */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms)
    const onVisible = () => document.visibilityState === 'visible' && setNow(Date.now())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [ms])
  return now
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Formato que entiende <input type="datetime-local">. */
export function toLocalInput(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(value: string): number | null {
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
}

export const countdownDateFmt = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})
