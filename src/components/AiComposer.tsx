import { useEffect, useRef, useState } from 'react'
import type { RecipeDraft } from '../lib/types'
import { Icon } from './Icon'

const EXAMPLES_NEW = [
  'Una lasaña de carne',
  'Algo rápido para cenar con pollo y verduras',
  'Quiero usar algunos de estos (no hace falta todos): calabacín, huevos, queso, tomate, arroz',
]
const EXAMPLES_EDIT = ['Hazla vegetariana', 'Para 4 personas', 'Más rápida, en menos de 30 min']

const LOADING = ['Pensando en el plato…', 'Eligiendo ingredientes…', 'Escribiendo los pasos…', 'Casi lista…']

interface Props {
  draft: RecipeDraft
  /** Recibe la receta generada para volcarla en el formulario. */
  onResult: (result: Partial<RecipeDraft>) => void
  autoFocus?: boolean
}

const hasContent = (d: RecipeDraft) => !!(d.title.trim() || d.ingredients.length || d.steps.length)

/** Panel para describir una receta y que Gemini rellene el formulario. */
export function AiComposer({ draft, onResult, autoFocus }: Props) {
  // Con una receta ya escrita, la IA la modifica en lugar de crear otra.
  const editing = hasContent(draft)
  const [open, setOpen] = useState(!editing)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open && autoFocus) input.current?.focus()
  }, [open, autoFocus])

  useEffect(() => {
    if (!busy) return setStep(0)
    const t = window.setInterval(() => setStep((s) => Math.min(s + 1, LOADING.length - 1)), 2200)
    return () => window.clearInterval(t)
  }, [busy])

  const run = async () => {
    const request = text.trim()
    if (!request || busy) return
    setBusy(true)
    setError(null)
    input.current?.blur()
    try {
      // Carga diferida: el SDK de IA solo se descarga al usarlo.
      const ai = await import('../lib/ai')
      try {
        const result = await ai.generateRecipe(request, editing ? draft : undefined)
        onResult(result)
        setText('')
        // Plegamos el panel para que se vea la receta rellenada.
        setOpen(false)
      } catch (e) {
        console.error(e)
        setError(ai.aiErrorMessage(e))
      }
    } catch (e) {
      console.error(e)
      setError('No se ha podido cargar la IA. Comprueba la conexión.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button className="ai-toggle" onClick={() => setOpen(true)}>
        <span className="ai-teaser-icon ai-icon-small">
          <Icon name="sparkles" size={16} />
        </span>
        Modificar con IA
        <Icon name="chevron" size={16} className="rot-90 muted" />
      </button>
    )
  }

  const examples = editing ? EXAMPLES_EDIT : EXAMPLES_NEW

  return (
    <section className={`ai-card ${busy ? 'is-busy' : ''}`}>
      <div className="ai-card-head">
        <span className="ai-teaser-icon">
          <Icon name="sparkles" size={20} />
        </span>
        <div>
          <strong>{editing ? 'Modificar con IA' : 'Crear con IA'}</strong>
          <span className="muted small block">
            {editing ? 'Di qué quieres cambiar y la IA reescribe la receta.' : 'Describe lo que te apetece y la IA rellena la receta.'}
          </span>
        </div>
      </div>

      <textarea
        ref={input}
        className="ai-input"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={editing ? 'Ej. hazla sin gluten' : 'Ej. una lasaña, o pega aquí una receta o una lista de ingredientes'}
        disabled={busy}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void run()
        }}
      />

      {!text && !busy && (
        <div className="ai-examples">
          {examples.map((ex) => (
            <button key={ex} type="button" className="chip chip-ai" onClick={() => setText(ex)}>
              {ex}
            </button>
          ))}
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      <div className="ai-actions">
        {editing && !busy && (
          <button className="btn btn-small btn-ghost" onClick={() => setOpen(false)}>
            Cerrar
          </button>
        )}
        <button className="btn btn-ai" onClick={() => void run()} disabled={!text.trim() || busy}>
          {busy ? (
            <>
              <span className="spinner spinner-small spinner-light" /> {LOADING[step]}
            </>
          ) : (
            <>
              <Icon name="sparkles" size={18} /> {editing ? 'Aplicar cambios' : 'Crear receta'}
            </>
          )}
        </button>
      </div>
      {!editing && <p className="muted small ai-footnote">Revisa el resultado antes de guardar: la IA puede equivocarse.</p>}
    </section>
  )
}
