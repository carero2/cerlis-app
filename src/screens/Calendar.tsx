import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { EventSheet } from '../components/EventSheet'
import { Icon } from '../components/Icon'
import { Page } from '../components/Page'
import {
  REPEAT_LABELS,
  WEEKDAYS,
  dayLongFmt,
  fromKey,
  monthFmt,
  monthGrid,
  occurrences,
  onDay,
  relativeDay,
  timeLabel,
  todayKey,
  upcoming,
  type Occurrence,
} from '../lib/calendar'
import { useData } from '../lib/data'
import { usePrefs } from '../lib/prefs'
import type { CalendarEvent } from '../lib/types'

const shortRange = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })

export function Calendar({ initialDate }: { initialDate?: string }) {
  const { events } = useData()
  const today = todayKey()
  const [selected, setSelected] = useState(initialDate ?? today)
  const [view, setView] = useState(() => {
    const d = fromKey(initialDate ?? today)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [editing, setEditing] = useState<{ event: CalendarEvent | null } | null>(null)

  const grid = useMemo(() => monthGrid(view.year, view.month), [view])
  const monthOccs = useMemo(() => occurrences(events, grid[0], grid[41]), [events, grid])
  const dayOccs = useMemo(
    () => onDay(occurrences(events, selected, selected), selected),
    [events, selected],
  )
  const next = useMemo(() => upcoming(events, 8), [events])

  // Cuántos planes tiene cada día visible (para los puntitos).
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const day of grid) map.set(day, onDay(monthOccs, day).length)
    return map
  }, [grid, monthOccs])

  const shiftMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })

  const goToday = () => {
    const d = fromKey(today)
    setView({ year: d.getFullYear(), month: d.getMonth() })
    setSelected(today)
  }

  const pick = (day: string) => {
    setSelected(day)
    const d = fromKey(day)
    if (d.getMonth() !== view.month || d.getFullYear() !== view.year) setView({ year: d.getFullYear(), month: d.getMonth() })
  }

  // Deslizar el mes a izquierda o derecha.
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: PointerEvent) => (swipe.current = { x: e.clientX, y: e.clientY })
  const onPointerUp = (e: PointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) shiftMonth(dx < 0 ? 1 : -1)
  }

  const isCurrentMonth = (() => {
    const d = fromKey(today)
    return d.getFullYear() === view.year && d.getMonth() === view.month
  })()

  return (
    <Page
      title="Calendario"
      className="theme-calendar"
      right={
        <button className="nav-btn nav-icon nav-accent" onClick={() => setEditing({ event: null })} aria-label="Nuevo plan">
          <Icon name="plus" size={24} />
        </button>
      }
    >
      <section className="card cal-card">
        <div className="cal-header">
          <h2 className="capitalize">{monthFmt.format(new Date(view.year, view.month, 1))}</h2>
          {!isCurrentMonth && (
            <button className="chip cal-today-btn" onClick={goToday}>
              Hoy
            </button>
          )}
          <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
            <Icon name="back" size={20} />
          </button>
          <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
            <Icon name="chevron" size={20} />
          </button>
        </div>
        <div className="cal-weekdays" aria-hidden>
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="cal-grid" onPointerDown={onPointerDown} onPointerUp={onPointerUp} style={{ touchAction: 'pan-y' }}>
          {grid.map((day) => {
            const d = fromKey(day)
            const count = counts.get(day) ?? 0
            const outside = d.getMonth() !== view.month
            return (
              <button
                key={day}
                className={`cal-day ${outside ? 'is-outside' : ''} ${day === today ? 'is-today' : ''} ${day === selected ? 'is-selected' : ''}`}
                onClick={() => pick(day)}
                aria-label={`${dayLongFmt.format(d)}${count ? `, ${count} plan${count === 1 ? '' : 'es'}` : ''}`}
                aria-pressed={day === selected}
              >
                <span className="cal-num">{d.getDate()}</span>
                <span className="cal-dots">
                  {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                    <i key={i} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="cal-section">
        <div className="cal-section-head">
          <h2 className="capitalize">{dayLongFmt.format(fromKey(selected))}</h2>
          {selected === today && <span className="tag-today">Hoy</span>}
        </div>
        {dayOccs.length === 0 ? (
          <button className="cal-empty" onClick={() => setEditing({ event: null })}>
            <span>Nada planeado</span>
            <span className="cal-empty-add">
              <Icon name="plus" size={16} /> Añadir plan
            </span>
          </button>
        ) : (
          <div className="event-list">
            {dayOccs.map((o) => (
              <EventCard key={o.event.id + o.date} occ={o} onClick={() => setEditing({ event: o.event })} />
            ))}
          </div>
        )}
      </section>

      {next.length > 0 && (
        <section className="cal-section">
          <div className="cal-section-head">
            <h2>Próximos planes</h2>
          </div>
          <div className="card upcoming-list">
            {next.map((o) => (
              <button key={o.event.id + o.date} className="upcoming-row" onClick={() => pick(o.date < today ? today : o.date)}>
                <span className="upcoming-day">
                  <span className="upcoming-num">{fromKey(o.date).getDate()}</span>
                  <span className="upcoming-month">{shortRange.format(fromKey(o.date)).split(' ')[1]}</span>
                </span>
                <span className="upcoming-text">
                  <strong>{o.event.title}</strong>
                  <span className="muted small">
                    {relativeDay(o.date)} · {o.event.allDay ? (o.endDate !== o.date ? `hasta el ${shortRange.format(fromKey(o.endDate))}` : 'todo el día') : timeLabel(o.event)}
                  </span>
                </span>
                {o.event.repeat && <Icon name="repeat" size={15} className="muted" />}
              </button>
            ))}
          </div>
        </section>
      )}

      <EventSheet open={!!editing} onClose={() => setEditing(null)} event={editing?.event} defaultDate={selected} />
    </Page>
  )
}

export function EventCard({ occ, onClick }: { occ: Occurrence; onClick: () => void }) {
  const { name: me } = usePrefs()
  const e = occ.event
  const multi = occ.endDate !== occ.date
  return (
    <button className="event-card" onClick={onClick}>
      <span className="event-time">
        {e.allDay ? (
          <span className="event-allday">Todo el día</span>
        ) : (
          <>
            <strong>{e.start}</strong>
            {e.end && <span>{e.end}</span>}
          </>
        )}
      </span>
      <span className="event-body">
        <strong>{e.title}</strong>
        {(multi || e.repeat) && (
          <span className="event-meta">
            {multi && `${shortRange.format(fromKey(occ.date))} – ${shortRange.format(fromKey(occ.endDate))}`}
            {multi && e.repeat && ' · '}
            {e.repeat && (
              <>
                <Icon name="repeat" size={12} /> {REPEAT_LABELS[e.repeat]}
              </>
            )}
          </span>
        )}
        {e.notes && <span className="event-notes-text">{e.notes}</span>}
        {e.createdBy && e.createdBy !== me && <span className="event-author">Añadido por {e.createdBy}</span>}
      </span>
    </button>
  )
}
