import { useRef, useState, type ReactNode } from 'react'
import { FirebaseConnectSheet } from '../components/FirebaseConnectSheet'
import { HomeSettingsCard } from '../components/HomeSettingsCard'
import { Icon, type IconName } from '../components/Icon'
import { Page } from '../components/Page'
import { Segmented } from '../components/Segmented'
import { ConfirmSheet, Sheet } from '../components/Sheet'
import { SyncBadge } from '../components/SyncBadge'
import { useToast } from '../components/Toast'
import { useAuth, useUser } from '../lib/auth'
import { useData } from '../lib/data'
import { COLORS, COLOR_NAMES, setMyColor, useMyId } from '../lib/people'
import { setPrefs, usePrefs, type ThemePref } from '../lib/prefs'
import { cloudEnabled, customConfig, firebaseConfig } from '../lib/store/config'
import type { ColorKey, Recipe } from '../lib/types'

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export function Settings() {
  const prefs = usePrefs()
  const { sync, recipes, items, home, events, store } = useData()
  const toast = useToast()
  const user = useUser()
  const { signOut } = useAuth()
  const [sheet, setSheet] = useState<'backup' | 'signout' | 'firebase' | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const exportData = () => {
    // Las fotos grandes no van en la copia (solo las miniaturas) para que el archivo sea ligero.
    const blob = new Blob([JSON.stringify({ app: 'cerlis', version: 1, exportedAt: new Date().toISOString(), recipes, items, events }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cerlis-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setSheet(null)
  }

  const [cleaning, setCleaning] = useState(false)
  const cleanPhotos = async () => {
    setCleaning(true)
    try {
      const used = new Set([...items, ...recipes].map((x) => x.photo?.id).concat(home.photo?.id))
      const unused = (await store.listPhotoIds()).filter((id) => !used.has(id))
      await Promise.all(unused.map((id) => store.deletePhoto(id)))
      toast(unused.length ? `${unused.length} foto${unused.length === 1 ? '' : 's'} sin usar borrada${unused.length === 1 ? '' : 's'}` : 'No había fotos sin usar')
    } catch (e) {
      console.error(e)
      toast('No se ha podido limpiar. Inténtalo de nuevo.')
    } finally {
      setCleaning(false)
    }
  }

  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as { recipes?: Recipe[] }
      const incoming = data.recipes ?? []
      const existing = new Set(recipes.map((r) => r.title.toLowerCase()))
      const fresh = incoming.filter((r) => r.title && !existing.has(r.title.toLowerCase()))
      for (const { id: _id, createdAt: _c, updatedAt: _u, photo: _p, ...rest } of fresh) {
        await store.createRecipe({ ...rest, tags: rest.tags ?? [], ingredients: rest.ingredients ?? [], steps: rest.steps ?? [] })
      }
      toast(fresh.length ? `${fresh.length} receta${fresh.length === 1 ? '' : 's'} importada${fresh.length === 1 ? '' : 's'}` : 'No había recetas nuevas')
    } catch (e) {
      console.error(e)
      toast('El archivo no es una copia válida de Cerlis')
    }
  }

  return (
    <Page title="Ajustes" className="theme-settings">
      <section className="profile">
        {user?.photoURL ? (
          <img className="profile-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
        ) : (
          <div className="profile-avatar">{(prefs.name || '?').charAt(0).toUpperCase()}</div>
        )}
        <label className="profile-name-input">
          <input
            value={prefs.name}
            onChange={(e) => setPrefs({ name: e.target.value })}
            onBlur={(e) => setPrefs({ name: e.target.value.trim() })}
            placeholder="Tu nombre"
            autoComplete="given-name"
            aria-label="Tu nombre"
          />
          <Icon name="edit" size={15} />
        </label>
        <p className="muted small">{user ? user.email : 'Modo local · solo en este dispositivo'}</p>
        {user && <SyncBadge state={sync} />}
      </section>

      <HomeSettingsCard />

      <h2 className="settings-heading">Preferencias</h2>
      <div className="card settings-card">
        <div className="settings-row">
          <RowIcon icon="palette" tint="purple" />
          <span className="row-label">Tema</span>
          <Segmented<ThemePref>
            value={prefs.theme}
            onChange={(theme) => setPrefs({ theme })}
            options={[
              { value: 'system', label: 'Auto' },
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
            ]}
          />
        </div>
        <label className="settings-row is-button">
          <RowIcon icon="layers" tint="green" />
          <span className="row-label">
            Agrupar la compra por pasillos
          </span>
          <input
            type="checkbox"
            className="ios-switch"
            checked={prefs.groupByCategory}
            onChange={(e) => setPrefs({ groupByCategory: e.target.checked })}
          />
        </label>
        <MyColorRow />
        <button className="settings-row is-button" onClick={() => setSheet('backup')}>
          <RowIcon icon="download" tint="gray" />
          <span className="row-label">Copia de seguridad</span>
          <Icon name="chevron" size={16} className="row-chevron" />
        </button>
        <button className="settings-row is-button" onClick={() => setSheet('firebase')}>
          <RowIcon icon={cloudEnabled ? 'cloud' : 'cloudOff'} tint="blue" />
          <span className="row-label">
            Conexión
            <span className="muted small block">
              {firebaseConfig ? firebaseConfig.projectId : 'Solo en este móvil'}
              {customConfig ? ' · Firebase propio' : ''}
            </span>
          </span>
          <Icon name="chevron" size={16} className="row-chevron" />
        </button>
      </div>

      {!isStandalone && (
        <div className="card install-card">
          <Icon name="phone" size={22} />
          <p>
            Para usarla como app: en Safari toca <span className="kbd"><Icon name="share" size={14} /></span> y{' '}
            <strong>Añadir a pantalla de inicio</strong>.
          </p>
        </div>
      )}

      {user && (
        <button className="card signout-btn" onClick={() => setSheet('signout')}>
          Cerrar sesión
        </button>
      )}

      <p className="about">
        <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={36} height={36} />
        <span>
          Cerlis · v{__APP_VERSION__}
          <br />
          Hecho con cariño para dos 💚
        </span>
      </p>
      {firebaseConfig?.appCheckKey && (
        <p className="recaptcha-note">
          Protegido por reCAPTCHA: se aplican la{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
            Política de Privacidad
          </a>{' '}
          y las{' '}
          <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">
            Condiciones
          </a>{' '}
          de Google.
        </p>
      )}

      <FirebaseConnectSheet open={sheet === 'firebase'} onClose={() => setSheet(null)} />

      <Sheet open={sheet === 'backup'} onClose={() => setSheet(null)} title="Copia de seguridad" tone="blue">
        <p className="muted small sheet-intro">
          Descarga vuestras recetas, la lista y el calendario en un archivo, o recupera recetas de una copia anterior.
        </p>
        <div className="backup-actions">
          <button className="btn btn-primary btn-block" onClick={exportData}>
            <Icon name="download" size={18} /> Descargar copia
          </button>
          <button className="btn btn-soft btn-block" onClick={() => fileInput.current?.click()}>
            <Icon name="book" size={18} /> Importar recetas
          </button>
          <button className="btn btn-ghost btn-block" disabled={cleaning} onClick={() => void cleanPhotos()}>
            <Icon name="trash" size={18} /> {cleaning ? 'Limpiando…' : 'Borrar fotos que ya no se usan'}
          </button>
        </div>
      </Sheet>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void importData(f).then(() => setSheet(null))
          e.target.value = ''
        }}
      />

      <ConfirmSheet
        open={sheet === 'signout'}
        title="¿Cerrar sesión?"
        message="Tendrás que volver a entrar con Google para ver la lista y las recetas."
        confirmLabel="Cerrar sesión"
        destructive
        tone="blue"
        onConfirm={() => void signOut()}
        onClose={() => setSheet(null)}
      />
    </Page>
  )
}

type Tint = 'green' | 'gray' | 'orange' | 'blue' | 'purple'

function RowIcon({ icon, tint }: { icon: IconName; tint: Tint }): ReactNode {
  return (
    <span className={`row-icon tint-${tint}-solid`}>
      <Icon name={icon} size={18} />
    </span>
  )
}

/** Color con el que salen mis planes en el calendario. */
function MyColorRow() {
  const { home, store } = useData()
  const { name } = usePrefs()
  const toast = useToast()
  const me = useMyId()
  const mine = home.members?.[me]
  const taken = new Set(
    Object.entries(home.members ?? {})
      .filter(([id]) => id !== me)
      .map(([, m]) => m.color),
  )
  return (
    <div className="settings-row color-row">
      <RowIcon icon="calendar" tint="purple" />
      <span className="row-label">
        Tu color en el calendario
        <span className="muted small block">El punto blanco es el de tu pareja</span>
      </span>
      <div className="color-swatches" role="radiogroup" aria-label="Tu color en el calendario">
        {(Object.keys(COLORS) as ColorKey[]).map((c) => (
          <button
            key={c}
            role="radio"
            aria-checked={mine?.color === c}
            aria-label={COLOR_NAMES[c] + (taken.has(c) ? ' (lo usa tu pareja)' : '')}
            className={`swatch ${mine?.color === c ? 'is-selected' : ''} ${taken.has(c) ? 'is-taken' : ''}`}
            style={{ background: COLORS[c] }}
            onClick={() =>
              void setMyColor(store, me, mine, name || 'Yo', c).catch((e) => {
                console.error(e)
                toast('No se ha podido guardar el color')
              })
            }
          />
        ))}
      </div>
    </div>
  )
}
