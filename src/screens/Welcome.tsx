import { useState } from 'react'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { normalizeCode } from '../lib/ids'
import { householdService, shareHouseholdCode } from '../lib/household'
import { setPrefs, usePrefs } from '../lib/prefs'
import type { Household } from '../lib/types'

type Step = 'intro' | 'choose' | 'create' | 'join' | 'created'

/** Primera apertura con sincronización activada: crear o unirse a un hogar. */
export function Welcome() {
  const prefs = usePrefs()
  const toast = useToast()
  const [step, setStep] = useState<Step>('intro')
  const [name, setName] = useState(prefs.name)
  const [homeName, setHomeName] = useState('Nuestra casa')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<Household | null>(null)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Algo ha fallado. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  const create = () =>
    run(async () => {
      const h = await (await householdService()).create(homeName.trim() || 'Nuestra casa')
      setCreated(h)
      setStep('created')
    })

  const join = () =>
    run(async () => {
      const h = await (await householdService()).join(code)
      setPrefs({ householdId: h.id, householdName: h.name })
      toast(`¡Bienvenido/a a ${h.name}!`)
    })

  return (
    <div className="welcome">
      <div className="welcome-art" aria-hidden>
        <span className="float f1">🥑</span>
        <span className="float f2">🍋</span>
        <span className="float f3">🥖</span>
        <span className="float f4">🍅</span>
        <span className="float f5">🧀</span>
        <div className="welcome-logo">
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={84} height={84} />
        </div>
      </div>

      <div className="welcome-card">
        {step === 'intro' && (
          <>
            <h1>Hola 👋</h1>
            <p className="muted">
              Cerlis es vuestra lista de la compra y recetario compartido. Lo que añada uno aparece al momento en el
              móvil del otro.
            </p>
            <label className="field field-solo">
              <span>¿Cómo te llamas?</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="given-name"
                enterKeyHint="next"
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && (setPrefs({ name: name.trim() }), setStep('choose'))}
              />
            </label>
            <button
              className="btn btn-primary btn-block"
              disabled={!name.trim()}
              onClick={() => {
                setPrefs({ name: name.trim() })
                setStep('choose')
              }}
            >
              Continuar
            </button>
          </>
        )}

        {step === 'choose' && (
          <>
            <h1>Encantados, {prefs.name}</h1>
            <p className="muted">Para compartir los datos con tu pareja, uno de los dos crea un hogar y el otro se une con su código.</p>
            <button className="choice" onClick={() => setStep('create')}>
              <span className="choice-icon tint-mint">🏡</span>
              <span>
                <strong>Crear un hogar</strong>
                <span className="muted">Soy quien empieza</span>
              </span>
              <Icon name="chevron" size={18} />
            </button>
            <button className="choice" onClick={() => setStep('join')}>
              <span className="choice-icon tint-peach">🔑</span>
              <span>
                <strong>Tengo un código</strong>
                <span className="muted">Mi pareja ya ha creado el hogar</span>
              </span>
              <Icon name="chevron" size={18} />
            </button>
            <button className="link-btn center" onClick={() => setStep('intro')}>
              Atrás
            </button>
          </>
        )}

        {step === 'create' && (
          <>
            <h1>Vuestro hogar</h1>
            <p className="muted">Ponle un nombre. Lo podréis cambiar luego.</p>
            <label className="field field-solo">
              <span>Nombre del hogar</span>
              <input value={homeName} onChange={(e) => setHomeName(e.target.value)} enterKeyHint="go" onKeyDown={(e) => e.key === 'Enter' && void create()} />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary btn-block" disabled={busy} onClick={() => void create()}>
              {busy ? 'Creando…' : 'Crear hogar'}
            </button>
            <button className="link-btn center" onClick={() => setStep('choose')}>
              Atrás
            </button>
          </>
        )}

        {step === 'join' && (
          <>
            <h1>Unirme</h1>
            <p className="muted">Pide a tu pareja el código que aparece en Ajustes → Hogar.</p>
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
                enterKeyHint="go"
                onKeyDown={(e) => e.key === 'Enter' && void join()}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-primary btn-block" disabled={busy || code.replace('-', '').length !== 8} onClick={() => void join()}>
              {busy ? 'Uniéndome…' : 'Unirme'}
            </button>
            <button className="link-btn center" onClick={() => setStep('choose')}>
              Atrás
            </button>
          </>
        )}

        {step === 'created' && created && (
          <>
            <h1>¡Listo! 🎉</h1>
            <p className="muted">Comparte este código con tu pareja para que se una a “{created.name}”.</p>
            <div className="code-display">{created.id}</div>
            <button
              className="btn btn-soft btn-block"
              onClick={async () => {
                const r = await shareHouseholdCode(created.id, created.name)
                if (r === 'copied') toast('Código copiado')
              }}
            >
              <Icon name="share" size={18} /> Compartir código
            </button>
            <button className="btn btn-primary btn-block" onClick={() => setPrefs({ householdId: created.id, householdName: created.name })}>
              Empezar
            </button>
            <p className="muted small center">Siempre lo tendrás a mano en Ajustes.</p>
          </>
        )}
      </div>
    </div>
  )
}
