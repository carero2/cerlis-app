import { useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from '../components/Icon'
import { Page } from '../components/Page'
import { ConfirmSheet, Sheet } from '../components/Sheet'
import { SyncBadge } from '../components/SyncBadge'
import { useToast } from '../components/Toast'
import { useAuth, useUser } from '../lib/auth'
import { useData } from '../lib/data'
import { setPrefs, usePrefs, type ThemePref } from '../lib/prefs'
import type { Recipe } from '../lib/types'

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export function Settings() {
  const prefs = usePrefs()
  const { sync, recipes, items, store } = useData()
  const toast = useToast()
  const user = useUser()
  const { signOut } = useAuth()
  const [sheet, setSheet] = useState<'backup' | 'signout' | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const exportData = () => {
    // Las fotos grandes no van en la copia (solo las miniaturas) para que el archivo sea ligero.
    const blob = new Blob([JSON.stringify({ app: 'cerlis', version: 1, exportedAt: new Date().toISOString(), recipes, items }, null, 2)], {
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
        <button className="settings-row is-button" onClick={() => setSheet('backup')}>
          <RowIcon icon="download" tint="gray" />
          <span className="row-label">Copia de seguridad</span>
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

      <Sheet open={sheet === 'backup'} onClose={() => setSheet(null)} title="Copia de seguridad" tone="blue">
        <p className="muted small sheet-intro">
          Descarga vuestras recetas y la lista en un archivo, o recupera recetas de una copia anterior.
        </p>
        <div className="backup-actions">
          <button className="btn btn-primary btn-block" onClick={exportData}>
            <Icon name="download" size={18} /> Descargar copia
          </button>
          <button className="btn btn-soft btn-block" onClick={() => fileInput.current?.click()}>
            <Icon name="book" size={18} /> Importar recetas
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

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  const idx = options.findIndex((o) => o.value === value)
  return (
    <div className="segmented" role="radiogroup" style={{ ['--seg-count' as string]: options.length, ['--seg-index' as string]: idx }}>
      <span className="segmented-thumb" />
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
