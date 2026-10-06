import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from '../components/Icon'
import { Page } from '../components/Page'
import { ConfirmSheet, Sheet } from '../components/Sheet'
import { SyncBadge } from '../components/SyncBadge'
import { useToast } from '../components/Toast'
import { useData } from '../lib/data'
import { householdService, shareHouseholdCode } from '../lib/household'
import { normalizeCode } from '../lib/ids'
import { setPrefs, usePrefs, type ThemePref } from '../lib/prefs'
import { cloudEnabled } from '../lib/store/config'
import type { Recipe } from '../lib/types'

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export function Settings() {
  const prefs = usePrefs()
  const { sync, recipes, items, store } = useData()
  const toast = useToast()
  const [sheet, setSheet] = useState<'rename' | 'join' | 'leave' | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const hasHousehold = cloudEnabled && !!prefs.householdId

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
        <div className="avatar">{(prefs.name || '?').charAt(0).toUpperCase()}</div>
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

      <Group title="Hogar compartido">
        {hasHousehold ? (
          <>
            <Row icon="home" tint="green" label="Nombre" value={prefs.householdName ?? '—'} onClick={() => setSheet('rename')} />
            <div className="settings-row code-row">
              <span className="row-icon tint-blue-solid">
                <Icon name="users" size={18} />
              </span>
              <span className="row-label">
                Código
                <span className="code-small">{prefs.householdId}</span>
              </span>
              <button
                className="btn btn-small btn-soft"
                onClick={async () => {
                  const r = await shareHouseholdCode(prefs.householdId!, prefs.householdName ?? 'Nuestra casa')
                  if (r === 'copied') toast('Código copiado')
                }}
              >
                <Icon name="share" size={16} /> Invitar
              </button>
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
                {cloudEnabled
                  ? 'Todavía no estás en ningún hogar.'
                  : 'Los datos se guardan solo en este dispositivo. Para compartirlos con tu pareja en tiempo real, configura Firebase (ver README del proyecto).'}
              </p>
            </div>
          </div>
        )}
      </Group>
      {hasHousehold && (
        <div className="group-actions">
          <button className="link-btn" onClick={() => setSheet('join')}>
            Unirme a otro hogar
          </button>
          <button className="link-btn link-danger" onClick={() => setSheet('leave')}>
            Salir del hogar
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

      <RenameSheet open={sheet === 'rename'} onClose={() => setSheet(null)} />
      <JoinSheet open={sheet === 'join'} onClose={() => setSheet(null)} />
      <ConfirmSheet
        open={sheet === 'leave'}
        title="¿Salir del hogar?"
        message="Dejarás de ver la lista y las recetas compartidas en este dispositivo. Podrás volver con el código."
        confirmLabel="Salir"
        destructive
        onConfirm={() => setPrefs({ householdId: null, householdName: null })}
        onClose={() => setSheet(null)}
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

function RenameSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const prefs = usePrefs()
  const toast = useToast()
  const [name, setName] = useState(prefs.householdName ?? '')
  useEffect(() => {
    if (open) setName(prefs.householdName ?? '')
  }, [open, prefs.householdName])
  const save = async () => {
    const n = name.trim()
    if (!n || !prefs.householdId) return
    try {
      await (await householdService()).rename(prefs.householdId, n)
      setPrefs({ householdName: n })
      onClose()
    } catch {
      toast('No se ha podido cambiar el nombre')
    }
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nombre del hogar"
      tone="blue"
      footer={
        <button className="btn btn-primary btn-block" onClick={() => void save()} disabled={!name.trim()}>
          Guardar
        </button>
      }
    >
      <label className="field field-solo">
        <span>Nombre</span>
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void save()} />
      </label>
    </Sheet>
  )
}

function JoinSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (open) {
      setCode('')
      setError(null)
    }
  }, [open])
  const join = async () => {
    setBusy(true)
    setError(null)
    try {
      const h = await (await householdService()).join(code)
      setPrefs({ householdId: h.id, householdName: h.name })
      toast(`Ahora estás en ${h.name}`)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido unir')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Unirme a otro hogar"
      tone="blue"
      footer={
        <button className="btn btn-primary btn-block" onClick={() => void join()} disabled={busy || code.replace('-', '').length !== 8}>
          {busy ? 'Uniéndome…' : 'Unirme'}
        </button>
      }
    >
      <label className="field field-solo">
        <span>Código</span>
        <input
          className="code-input"
          value={code}
          onChange={(e) => setCode(normalizeCode(e.target.value).slice(0, 9))}
          placeholder="ABCD-1234"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>
      {error && <p className="form-error">{error}</p>}
    </Sheet>
  )
}
