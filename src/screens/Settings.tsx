import { useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from '../components/Icon'
import { Page } from '../components/Page'
import { ConfirmSheet } from '../components/Sheet'
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
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ app: 'cerlis', version: 1, exportedAt: new Date().toISOString(), recipes, items }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cerlis-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as { recipes?: Recipe[] }
      const incoming = data.recipes ?? []
      const existing = new Set(recipes.map((r) => r.title.toLowerCase()))
      const fresh = incoming.filter((r) => r.title && !existing.has(r.title.toLowerCase()))
      for (const { id: _id, createdAt: _c, updatedAt: _u, ...rest } of fresh) {
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
      <div className="profile-card card">
        {user?.photoURL ? (
          <img className="avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
        ) : (
          <div className="avatar">{(prefs.name || '?').charAt(0).toUpperCase()}</div>
        )}
        <label className="profile-name">
          <span className="muted small">Tu nombre</span>
          <input
            value={prefs.name}
            onChange={(e) => setPrefs({ name: e.target.value })}
            onBlur={(e) => setPrefs({ name: e.target.value.trim() })}
            placeholder="Escribe tu nombre"
            autoComplete="given-name"
          />
        </label>
      </div>
      <p className="group-footer">Aparece en lo que añades, para saber quién lo pidió.</p>

      <Group title={user ? 'Cuenta' : 'Sincronización'}>
        {user ? (
          <>
            <div className="settings-row">
              <span className="row-icon tint-blue-solid">
                <Icon name="user" size={18} />
              </span>
              <span className="row-label">
                Google
                <span className="muted small block">{user.email}</span>
              </span>
            </div>
            <div className="settings-row">
              <span className="row-icon tint-gray-solid">
                <Icon name={sync === 'offline' || sync === 'error' ? 'cloudOff' : 'cloud'} size={18} />
              </span>
              <span className="row-label">Estado</span>
              <SyncBadge state={sync} />
            </div>
          </>
        ) : (
          <div className="settings-note">
            <div className="settings-note-icon">📱</div>
            <div>
              <strong>Modo local</strong>
              <p className="muted small">
                Los datos se guardan solo en este dispositivo. Para compartirlos con tu pareja en tiempo real, configura
                Firebase (ver README del proyecto).
              </p>
            </div>
          </div>
        )}
      </Group>
      {user && (
        <div className="group-actions">
          <span />
          <button className="link-btn link-danger" onClick={() => setConfirmSignOut(true)}>
            Cerrar sesión
          </button>
        </div>
      )}

      <Group title="Lista de la compra">
        <ToggleRow
          icon="layers"
          tint="green"
          label="Agrupar por pasillos"
          checked={prefs.groupByCategory}
          onChange={(v) => setPrefs({ groupByCategory: v })}
        />
      </Group>

      <Group title="Apariencia">
        <div className="settings-row">
          <span className="row-icon tint-purple-solid">
            <Icon name="palette" size={18} />
          </span>
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
      </Group>

      <Group title="Asistente">
        <div className="settings-row is-disabled">
          <span className="row-icon tint-ai">
            <Icon name="sparkles" size={18} />
          </span>
          <span className="row-label">
            Importar recetas con IA
            <span className="muted small block">Con tu cuenta de Google, sin guardar credenciales</span>
          </span>
          <span className="badge">Pronto</span>
        </div>
      </Group>

      {!isStandalone && (
        <Group title="Instalar en el iPhone">
          <ol className="install-steps">
            <li>
              Abre esta página en <strong>Safari</strong>.
            </li>
            <li>
              Toca <span className="kbd"><Icon name="share" size={14} /></span> <strong>Compartir</strong>.
            </li>
            <li>
              Elige <strong>Añadir a pantalla de inicio</strong>.
            </li>
          </ol>
        </Group>
      )}

      <Group title="Datos">
        <Row icon="download" tint="gray" label="Exportar copia de seguridad" onClick={exportData} />
        <Row icon="book" tint="orange" label="Importar recetas" onClick={() => fileInput.current?.click()} />
      </Group>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void importData(f)
          e.target.value = ''
        }}
      />

      <p className="about">
        <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={40} height={40} />
        <span>
          Cerlis · v{__APP_VERSION__}
          <br />
          Hecho con cariño para dos 💚
        </span>
      </p>

      <ConfirmSheet
        open={confirmSignOut}
        title="¿Cerrar sesión?"
        message="Tendrás que volver a entrar con Google para ver la lista y las recetas."
        confirmLabel="Cerrar sesión"
        destructive
        tone="blue"
        onConfirm={() => void signOut()}
        onClose={() => setConfirmSignOut(false)}
      />
    </Page>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-group">
      <h2 className="group-title">{title}</h2>
      <div className="card settings-card">{children}</div>
    </section>
  )
}

type Tint = 'green' | 'gray' | 'orange' | 'blue' | 'purple'

function Row({ icon, tint, label, value, onClick }: { icon: IconName; tint: Tint; label: string; value?: string; onClick: () => void }) {
  return (
    <button className="settings-row is-button" onClick={onClick}>
      <span className={`row-icon tint-${tint}-solid`}>
        <Icon name={icon} size={18} />
      </span>
      <span className="row-label">{label}</span>
      {value && <span className="row-value">{value}</span>}
      <Icon name="chevron" size={16} className="row-chevron" />
    </button>
  )
}

function ToggleRow({ icon, tint, label, checked, onChange }: { icon: IconName; tint: Tint; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="settings-row is-button">
      <span className={`row-icon tint-${tint}-solid`}>
        <Icon name={icon} size={18} />
      </span>
      <span className="row-label">{label}</span>
      <input type="checkbox" className="ios-switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
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
