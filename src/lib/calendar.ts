import type { CalendarEvent } from './types'

/**
 * Utilidades de fechas del calendario. Los días se manejan como texto
 * "AAAA-MM-DD" en hora local, así un plan nunca se mueve de día por el
 * horario de verano o la zona horaria.
 */

const pad = (n: number) => String(n).padStart(2, '0')

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Día a mediodía local (evita saltos por cambio de hora). */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function todayKey(): string {
  return toKey(new Date())
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000)
}

/** 6 semanas (lunes a domingo) que cubren el mes indicado. */
export function monthGrid(year: number, month: number): string[] {
  const first = new Date(year, month, 1, 12)
  const offset = (first.getDay() + 6) % 7 // lunes = 0
  const start = toKey(new Date(year, month, 1 - offset, 12))
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export const monthFmt = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
export const dayLongFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
export const dayShortFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })

export interface Occurrence {
  event: CalendarEvent
  /** Primer día de esta aparición. */
  date: string
  /** Último día (igual a `date` si dura un día). */
  endDate: string
}

function validDate(y: number, m: number, d: number): string | null {
  const date = new Date(y, m, d, 12)
  return date.getMonth() === ((m % 12) + 12) % 12 ? toKey(date) : null
}

/** Apariciones de los planes que tocan el rango [from, to] (ambos incluidos). */
export function occurrences(events: CalendarEvent[], from: string, to: string): Occurrence[] {
  const out: Occurrence[] = []
  for (const event of events) {
    const span = event.endDate ? Math.max(0, daysBetween(event.date, event.endDate)) : 0
    const push = (date: string) => {
      const endDate = addDays(date, span)
      if (endDate >= from && date <= to) out.push({ event, date, endDate })
    }
    if (!event.repeat) {
      push(event.date)
      continue
    }
    const base = fromKey(event.date)
    const [y, m, d] = [base.getFullYear(), base.getMonth(), base.getDate()]
    // Saltamos directamente cerca del rango para no recorrer años de repeticiones.
    const lead = Math.max(0, daysBetween(event.date, from) - span)
    if (event.repeat === 'weekly') {
      for (let i = Math.floor(lead / 7); i < Math.floor(lead / 7) + 60; i++) {
        const date = addDays(event.date, i * 7)
        if (date > to) break
        push(date)
      }
    } else if (event.repeat === 'monthly') {
      const start = Math.max(0, Math.floor(lead / 31) - 1)
      for (let i = start; i < start + 24; i++) {
        const date = validDate(y, m + i, d)
        if (!date) continue
        if (date > to) break
        push(date)
      }
    } else {
      const start = Math.max(0, Math.floor(lead / 366) - 1)
      for (let i = start; i < start + 4; i++) {
        const date = validDate(y + i, m, d)
        if (!date) continue
        if (date > to) break
        push(date)
      }
    }
  }
  return out.sort(compareOccurrences)
}

export function compareOccurrences(a: Occurrence, b: Occurrence): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1
  // Primero los de todo el día, luego por hora.
  if (a.event.allDay !== b.event.allDay) return a.event.allDay ? -1 : 1
  return (a.event.start ?? '').localeCompare(b.event.start ?? '')
}

/** Planes que caen en un día concreto. */
export function onDay(occs: Occurrence[], day: string): Occurrence[] {
  return occs.filter((o) => o.date <= day && o.endDate >= day)
}

/** Próximos planes desde hoy (incluye los que están en curso). */
export function upcoming(events: CalendarEvent[], limit: number, days = 120): Occurrence[] {
  const from = todayKey()
  const occs = occurrences(events, from, addDays(from, days))
  // Cada plan una sola vez (los que se repiten, con su próxima fecha).
  const seen = new Set<string>()
  return occs.filter((o) => !seen.has(o.event.id) && seen.add(o.event.id)).slice(0, limit)
}

export const REPEAT_LABELS = { weekly: 'Cada semana', monthly: 'Cada mes', yearly: 'Cada año' } as const

export function timeLabel(e: CalendarEvent): string {
  if (e.allDay) return 'Todo el día'
  return e.end ? `${e.start} – ${e.end}` : (e.start ?? '')
}

/** "Hoy", "Mañana", o la fecha corta. */
export function relativeDay(key: string): string {
  const diff = daysBetween(todayKey(), key)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  return dayShortFmt.format(fromKey(key))
}
