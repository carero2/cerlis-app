import { useEffect, useState } from 'react'
import { addDays, daysBetween } from '../lib/calendar'
import { useData } from '../lib/data'
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
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(event?.title ?? '')
    setAllDay(event?.allDay ?? true)
    setDate(event?.date ?? defaultDate)
    setEndDate(event?.endDate ?? event?.date ?? defaultDate)
    setStart(event?.start ?? '20:00')
    setEnd(event?.end ?? '')
    setRepeat(event?.repeat ?? 'none')
    setNotes(event?.notes ?? '')
    setError(null)
  }, [open, event, defaultDate])

  const valid = !!title.trim() && !!date && (allDay || !!start)

  const save = async () => {
    if (!valid) return
    const multiDay = allDay && endDate > date
    const draft: EventDraft = {
      title: title.trim(),
      date,
      endDate: multiDay ? endDate : undefined,
      allDay,
      start: allDay ? undefined : start,
      end: allDay || !end ? undefined : end,
      repeat: repeat === 'none' ? undefined : repeat,
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
          {allDay ? (
            <>
              <label className="field field-inline">
                <span>Desde</span>
                <input
                  type="date"
                  className="date-input"
                  value={date}
                  onChange={(e) => {
                    const v = e.target.value
                    if (!v) return
                    // "Hasta" se mueve con "Desde" manteniendo la duración.
                    setEndDate(addDays(v, Math.max(0, daysBetween(date, endDate))))
                    setDate(v)
                  }}
                />
              </label>
              <label className="field field-inline">
                <span>Hasta</span>
                <input type="date" className="date-input" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value || date)} />
              </label>
            </>
          ) : (
            <>
              <label className="field field-inline">
                <span>Día</span>
                <input
                  type="date"
                  className="date-input"
                  value={date}
                  onChange={(e) => {
                    if (!e.target.value) return
                    setDate(e.target.value)
                    setEndDate(e.target.value)
                  }}
                />
              </label>
              <div className="field field-inline">
                <span>Hora</span>
                <div className="time-range">
                  <input type="time" className="date-input" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Hora de inicio" />
                  <span className="muted">–</span>
                  <input type="time" className="date-input" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="Hora de fin (opcional)" />
                </div>
              </div>
            </>
          )}
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
        {allDay && endDate > date && (
          <p className="muted small sheet-intro event-span">Dura {daysBetween(date, endDate) + 1} días</p>
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
