import { useEffect, useState } from 'react'
import { COUNTDOWN_EMOJIS, countdownDateFmt, fromLocalInput, toLocalInput } from '../lib/countdown'
import { useData } from '../lib/data'
import { savePendingPhoto } from '../lib/photos'
import { getPrefs } from '../lib/prefs'
import { Icon } from './Icon'
import { PhotoInput } from './Photo'
import { Sheet } from './Sheet'
import { useToast } from './Toast'

const MESSAGE_MAX = 160

/**
 * Personalización compartida de Inicio: foto de los dos, un mensaje y una
 * cuenta atrás. Todo opcional; lo que se añade aquí lo veis los dos.
 */
export function HomeSettingsCard() {
  const { home, store } = useData()
  const toast = useToast()
  const [sheet, setSheet] = useState<'message' | 'countdown' | null>(null)
  const [busy, setBusy] = useState(false)

  const removePhoto = async () => {
    const old = home.photo
    await store.updateHome({ photo: undefined })
    if (old) void store.deletePhoto(old.id).catch(console.error)
  }

  return (
    <>
      <h2 className="settings-heading">Pantalla de inicio</h2>
      <div className="card settings-card">
        <div className="settings-row">
          {home.photo ? (
            <img className="row-photo" src={home.photo.thumb} alt="" />
          ) : (
            <span className="row-icon tint-pink-solid">
              <Icon name="image" size={18} />
            </span>
          )}
          <span className="row-label">
            Foto de los dos
            <span className="muted small block">{home.photo ? 'En la cabecera de Inicio' : 'Opcional'}</span>
          </span>
          {home.photo && (
            <button className="icon-btn" onClick={() => void removePhoto()} aria-label="Quitar foto">
              <Icon name="trash" size={18} />
            </button>
          )}
          <PhotoInput
            className="btn btn-small btn-soft"
            label={home.photo ? 'Cambiar foto' : 'Añadir foto'}
            onPhoto={async (p) => {
              if (busy) return
              setBusy(true)
              try {
                const old = home.photo
                const photo = await savePendingPhoto(store, p)
                await store.updateHome({ photo })
                if (old) void store.deletePhoto(old.id).catch(console.error)
                toast('Foto actualizada 📸')
              } catch (e) {
                console.error(e)
                toast('No se ha podido guardar la foto')
              } finally {
                setBusy(false)
              }
            }}
          >
            {home.photo ? 'Cambiar' : 'Añadir'}
          </PhotoInput>
        </div>

        <button className="settings-row is-button" onClick={() => setSheet('message')}>
          <span className="row-icon tint-yellow-solid">
            <Icon name="heart" size={18} />
          </span>
          <span className="row-label">
            Mensaje
            <span className="muted small block row-preview">{home.message?.text ?? 'Opcional · una nota para los dos'}</span>
          </span>
          <Icon name="chevron" size={16} className="row-chevron" />
        </button>

        <button className="settings-row is-button" onClick={() => setSheet('countdown')}>
          <span className="row-icon tint-blue-solid">
            <Icon name="clock" size={18} />
          </span>
          <span className="row-label">
            Cuenta atrás
            <span className="muted small block row-preview">
              {home.countdown ? `${home.countdown.emoji} ${home.countdown.title}` : 'Opcional · p. ej. para vuestro viaje'}
            </span>
          </span>
          <Icon name="chevron" size={16} className="row-chevron" />
        </button>
      </div>
      <p className="settings-footnote">Lo que pongas aquí lo veis los dos en Inicio.</p>

      <MessageSheet open={sheet === 'message'} onClose={() => setSheet(null)} />
      <CountdownSheet open={sheet === 'countdown'} onClose={() => setSheet(null)} />
    </>
  )
}

function MessageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { home, store } = useData()
  const [text, setText] = useState('')

  useEffect(() => {
    if (open) setText(home.message?.text ?? '')
  }, [open, home.message?.text])

  const save = async () => {
    const t = text.trim()
    await store.updateHome({
      message: t ? { text: t, author: getPrefs().name || undefined, updatedAt: Date.now() } : undefined,
    })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Mensaje"
      tone="blue"
      footer={
        <div className="row-gap">
          {home.message && (
            <button
              className="btn btn-danger-soft"
              onClick={() => {
                void store.updateHome({ message: undefined })
                onClose()
              }}
            >
              Quitar
            </button>
          )}
          <button className="btn btn-primary btn-grow" onClick={() => void save()}>
            Guardar
          </button>
        </div>
      }
    >
      <p className="muted small sheet-intro">Aparece en Inicio con tu nombre. Un recordatorio, una frase bonita…</p>
      <div className="message-editor">
        <textarea
          value={text}
          maxLength={MESSAGE_MAX}
          rows={4}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ej. ¡Que tengas un día precioso! 💛"
          aria-label="Mensaje"
        />
        <span className="char-count">
          {text.length}/{MESSAGE_MAX}
        </span>
      </div>
    </Sheet>
  )
}

function CountdownSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { home, store } = useData()
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState(COUNTDOWN_EMOJIS[0])
  const [date, setDate] = useState('')

  useEffect(() => {
    if (!open) return
    const c = home.countdown
    setTitle(c?.title ?? '')
    setEmoji(c?.emoji ?? COUNTDOWN_EMOJIS[0])
    // Por defecto, dentro de una semana a las 9:00.
    const def = new Date()
    def.setDate(def.getDate() + 7)
    def.setHours(9, 0, 0, 0)
    setDate(toLocalInput(c?.date ?? def.getTime()))
  }, [open, home.countdown])

  const target = fromLocalInput(date)
  const valid = !!title.trim() && target !== null

  const save = async () => {
    if (!valid) return
    await store.updateHome({ countdown: { title: title.trim(), emoji, date: target! } })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Cuenta atrás"
      tone="blue"
      footer={
        <div className="row-gap">
          {home.countdown && (
            <button
              className="btn btn-danger-soft"
              onClick={() => {
                void store.updateHome({ countdown: undefined })
                onClose()
              }}
            >
              Quitar
            </button>
          )}
          <button className="btn btn-primary btn-grow" disabled={!valid} onClick={() => void save()}>
            Guardar
          </button>
        </div>
      }
    >
      <div className="field-group">
        <label className="field">
          <span>¿Para qué?</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Nuestro viaje a Roma" maxLength={40} />
        </label>
        <label className="field">
          <span>Fecha y hora</span>
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      {target && <p className="muted small sheet-intro capitalize">{countdownDateFmt.format(target)}</p>}
      <div className="section-label">Icono</div>
      <div className="emoji-row">
        {COUNTDOWN_EMOJIS.map((e) => (
          <button key={e} type="button" className={`emoji-option ${emoji === e ? 'is-selected' : ''}`} onClick={() => setEmoji(e)}>
            {e}
          </button>
        ))}
      </div>
    </Sheet>
  )
}
