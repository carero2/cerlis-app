import { useEffect, useState } from 'react'
import { addDays, daysBetween } from '../lib/calendar'
import { useData } from '../lib/data'
import { BOTH, usePeople } from '../lib/people'
import { getPrefs } from '../lib/prefs'
import type { CalendarEvent, EventDraft, Repeat } from '../lib/types'
import { Segmented } from './Segmented'
import { Sheet } from './Sheet'
import { useToast } from './Toast'

interface Props {
  open: boolean
  onClose: () => void
  /** Plan a editar; si no hay, se crea uno nuevo en `defaultDate`. */
  event?: CalendarEvent | null
  defaultDate: string
}

type RepeatOption = Repeat | 'none'

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const fromMinutes = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`
const plusHour = (t: string) => fromMinutes(Math.min(toMinutes(t) + 60, 23 * 60 + 59))

function saveError(e: unknown): string {
  if ((e as { code?: string }).code === 'permission-denied')
    return 'Firebase no deja guardar: publica las reglas nuevas en Firestore → Reglas (incluyen "events").'
  if (!navigator.onLine) return 'Sin conexión. Se guardará cuando vuelva internet.'
  return 'No se ha podido guardar. Inténtalo de nuevo.'
}

export function EventSheet({ open, onClose, event, defaultDate }: Props) {
  const { store } = useData()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [allDay, setAllDay] = useState(true)
  const [date, setDate] = useState(defaultDate)
  const [endDate, setEndDate] = useState(defaultDate)
  const [start, setStart] = useState('20:00')
  const [end, setEnd] = useState('')
  const [repeat, setRepeat] = useState<RepeatOption>('none')
  const [who, setWho] = useState<string>(BOTH)
  const { options } = usePeople()
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(event?.title ?? '')
    setAllDay(event?.allDay ?? true)
    setDate(event?.date ?? defaultDate)
    setEndDate(event?.endDate ?? event?.date ?? defaultDate)
    const s0 = event?.start ?? '20:00'
    setStart(s0)
    // Como en el calendario del iPhone: por defecto dura una hora.
    setEnd(event?.end ?? plusHour(s0))
    setRepeat(event?.repeat ?? 'none')
    setWho(event?.who ?? BOTH)
    setNotes(event?.notes ?? '')
    setError(null)
  }, [open, event, defaultDate])

  // El final no puede ser anterior al inicio.
  const endsBefore = allDay ? endDate < date : `${endDate}T${end || start}` < `${date}T${start}`
  const valid = !!title.trim() && !!date && (allDay || !!start) && !endsBefore

  /** Al mover el inicio, el final se mueve con él manteniendo la duración. */
  const changeStartDate = (v: string) => {
    if (!v) return
    setEndDate(addDays(v, Math.max(0, daysBetween(date, endDate))))
    setDate(v)
  }
  const changeStartTime = (v: string) => {
    if (!v) return
    if (start && end) {
      const shifted = toMinutes(end) + (toMinutes(v) - toMinutes(start))
      const days = Math.floor(shifted / 1440)
      setEnd(fromMinutes(((shifted % 1440) + 1440) % 1440))
      if (days > 0) setEndDate(addDays(endDate, days))
    }
    setStart(v)
  }

  const save = async () => {
    if (!valid) return
    const draft: EventDraft = {
      title: title.trim(),
      date,
      endDate: endDate > date ? endDate : undefined,
      allDay,
      start: allDay ? undefined : start,
      end: allDay || !end ? undefined : end,
      repeat: repeat === 'none' ? undefined : repeat,
      who: who === BOTH ? undefined : who,
      notes: notes.trim() || undefined,
      createdBy: event?.createdBy ?? (getPrefs().name || undefined),
    }
    setSaving(true)
    setError(null)
    try {
      if (event) await store.updateEvent(event.id, draft)
      else await store.createEvent(draft)
      toast(event ? 'Plan actualizado' : 'Plan añadido 🗓️')
      onClose()
    } catch (e) {
      console.error(e)
      setError(saveError(e))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!event) return
    try {
      await store.deleteEvent(event.id)
      onClose()
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = event
      toast(`“${event.title}” eliminado`, { action: { label: 'Deshacer', onClick: () => void store.createEvent(rest) } })
    } catch (e) {
      console.error(e)
      setError(saveError(e))
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={event ? 'Editar plan' : 'Nuevo plan'}
      tone="purple"
      footer={
        <div className="row-gap">
          {event && (
            <button className="btn btn-danger-soft" disabled={saving} onClick={() => void remove()}>
              Eliminar
            </button>
          )}
          <button className="btn btn-primary btn-grow" disabled={!valid || saving} onClick={() => void save()}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <div className="field-group">
          <label className="field">
            <span>¿Qué hacemos?</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Cena con Marta y Luis"
              maxLength={80}
              autoFocus={!event}
            />
          </label>
          <label className="field field-inline">
            <span>Todo el día</span>
            <input type="checkbox" className="ios-switch" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          </label>
          <div className="field field-inline">
            <span>Empieza</span>
            <div className="dt-pair">
              <input type="date" className="date-input" value={date} onChange={(e) => changeStartDate(e.target.value)} aria-label="Fecha de inicio" />
              {!allDay && (
                <input type="time" className="date-input" value={start} onChange={(e) => changeStartTime(e.target.value)} aria-label="Hora de inicio" />
              )}
            </div>
          </div>
          <div className="field field-inline">
            <span>Termina</span>
            <div className="dt-pair">
              <input
                type="date"
                className="date-input"
                value={endDate}
                min={date}
                onChange={(e) => setEndDate(e.target.value || date)}
                aria-label="Fecha de fin"
              />
              {!allDay && (
                <input type="time" className="date-input" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="Hora de fin" />
              )}
            </div>
          </div>
        </div>

        <div className="section-label">¿De quién?</div>
        <div className="who-picker" role="radiogroup">
          {options.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={who === p.id}
              className={`who-chip ${who === p.id ? 'is-selected' : ''}`}
              style={{ ['--who' as string]: p.color }}
              onClick={() => setWho(p.id)}
            >
              <i />
              {p.name}
            </button>
          ))}
        </div>

        <div className="section-label">Repetir</div>
        <Segmented<RepeatOption>
          value={repeat}
          onChange={setRepeat}
          options={[
            { value: 'none', label: 'No' },
            { value: 'weekly', label: 'Semana' },
            { value: 'monthly', label: 'Mes' },
            { value: 'yearly', label: 'Año' },
          ]}
        />
        {endsBefore ? (
          <p className="form-error event-span">Termina antes de empezar: revisa la fecha u hora de fin.</p>
        ) : (
          endDate > date && <p className="muted small sheet-intro event-span">Dura {daysBetween(date, endDate) + 1} días</p>
        )}

        <div className="field-group event-notes">
          <label className="field">
            <span>Notas</span>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dirección, reserva, qué llevar…" />
          </label>
        </div>
        {error && <p className="form-error sheet-error">{error}</p>}
        <button type="submit" hidden />
      </form>
    </Sheet>
  )
}
