import { useEffect, useState } from 'react'
import {
  builtInConfig,
  customConfig,
  firebaseConfig,
  parseFirebaseConfig,
  setCustomConfig,
  type FirebaseConfig,
} from '../lib/store/config'
import { Segmented } from './Segmented'
import { ConfirmSheet, Sheet } from './Sheet'

/**
 * Conectar este móvil con otro proyecto de Firebase: otra pareja usa la
 * misma app (y recibe las mismas actualizaciones) con sus propios datos.
 * La configuración se guarda solo en este móvil.
 */
export function FirebaseConnectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState('')
  const [appCheckKey, setAppCheckKey] = useState('')
  const [provider, setProvider] = useState<'v3' | 'enterprise'>('enterprise')
  const [advanced, setAdvanced] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (!open) return
    setText('')
    setAppCheckKey(customConfig?.appCheckKey ?? '')
    setProvider(customConfig?.appCheckProvider ?? 'enterprise')
    setAdvanced(!!customConfig?.appCheckKey)
  }, [open])

  const parsed = text.trim() ? parseFirebaseConfig(text) : null
  // Si ya hay uno propio, se puede cambiar solo la clave de App Check sin volver a pegar nada.
  const base: FirebaseConfig | null = parsed ?? (text.trim() ? null : customConfig)
  const changed =
    !!parsed ||
    (!!customConfig && (appCheckKey.trim() !== (customConfig.appCheckKey ?? '') || provider !== (customConfig.appCheckProvider ?? 'enterprise')))

  const connect = () => {
    if (!base) return
    const key = appCheckKey.trim()
    setCustomConfig({ ...base, appCheckKey: key || undefined, appCheckProvider: key ? provider : undefined })
  }

  const domain = location.hostname

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Conectar con otro Firebase"
      tone="blue"
      footer={
        <button className="btn btn-primary btn-block" disabled={!base || !changed} onClick={connect}>
          {parsed ? `Conectar con “${parsed.projectId}”` : 'Guardar y reiniciar'}
        </button>
      }
    >
      <p className="muted small sheet-intro">
        Para que otra pareja use esta misma app con <b>sus propios datos</b>. Recibiréis las mismas actualizaciones,
        pero cada uno con su base de datos. La configuración se guarda solo en este móvil.
      </p>

      <div className="card fb-status">
        <span className={`fb-dot ${customConfig ? 'is-custom' : ''}`} />
        <span>
          Ahora conectado a <b>{firebaseConfig?.projectId ?? 'ninguno (modo local)'}</b>
          <span className="muted small block">
            {customConfig
              ? 'Firebase propio de este móvil'
              : firebaseConfig
                ? 'El Firebase con el que se publicó la app'
                : 'Los datos solo se guardan en este móvil'}
          </span>
        </span>
      </div>

      <div className="section-label">Antes, en vuestro Firebase</div>
      <ol className="fb-steps">
        <li>
          <b>Firestore → Reglas:</b> pegad las reglas de la app con <b>vuestros</b> dos correos y publicad.
        </li>
        <li>
          <b>Authentication:</b> activad Google y, en Configuración → Dominios autorizados, añadid <code>{domain}</code>.
        </li>
        <li>
          <b>AI Logic</b> (opcional, para las recetas con IA): Comenzar → Gemini Developer API.
        </li>
      </ol>

      <label className="field fb-field card">
        <span>Configuración de vuestro Firebase</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={'Pega aquí el bloque que da Firebase:\nconst firebaseConfig = {\n  apiKey: "…",\n  …\n}'}
        />
      </label>
      {text.trim() && (
        <p className={`small fb-parse ${parsed ? 'is-ok' : 'is-bad'}`}>
          {parsed
            ? `✓ Proyecto “${parsed.projectId}” detectado.`
            : 'No encuentro apiKey, projectId y appId. Copia el bloque completo de Configuración del proyecto → Tus apps.'}
        </p>
      )}

      <button className="link-btn fb-adv-toggle" onClick={() => setAdvanced(!advanced)}>
        {advanced ? 'Ocultar App Check' : 'App Check (opcional)'}
      </button>
      {advanced && (
        <div className="fb-adv">
          <label className="field card">
            <span>Clave de sitio (Fraud Defense / reCAPTCHA)</span>
            <input
              value={appCheckKey}
              onChange={(e) => setAppCheckKey(e.target.value)}
              placeholder="6Lc…"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <Segmented<'v3' | 'enterprise'>
            value={provider}
            onChange={setProvider}
            options={[
              { value: 'enterprise', label: 'Fraud Defense' },
              { value: 'v3', label: 'reCAPTCHA v3 clásico' },
            ]}
          />
          <p className="muted small">Solo si lo habéis activado en Firebase → App Check. Si no, dejadlo vacío.</p>
        </div>
      )}

      {customConfig && (
        <button className="link-btn center fb-reset" onClick={() => setConfirmReset(true)}>
          {builtInConfig ? 'Volver al Firebase original' : 'Desconectar este Firebase'}
        </button>
      )}

      <ConfirmSheet
        open={confirmReset}
        tone="blue"
        title={builtInConfig ? '¿Volver al Firebase original?' : '¿Desconectar este Firebase?'}
        message={`Este móvil dejará de usar “${customConfig?.projectId}”. Vuestros datos siguen allí: podéis volver a conectaros cuando queráis.`}
        confirmLabel={builtInConfig ? 'Volver al original' : 'Desconectar'}
        destructive
        onConfirm={() => setCustomConfig(null)}
        onClose={() => setConfirmReset(false)}
      />
    </Sheet>
  )
}
