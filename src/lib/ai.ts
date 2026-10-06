import { GoogleAIBackend, Schema, getAI, getGenerativeModel, type GenerativeModel } from 'firebase/ai'
import { firebaseConfig } from './store/config'
import { firebaseApp } from './store/firebase'
import { FOOD_EMOJIS, SUGGESTED_TAGS } from './recipes'
import type { RecipeDraft } from './types'

/**
 * Modelos de Gemini que se prueban en orden. Si uno no existe o se queda
 * sin cuota gratuita, se pasa al siguiente. Se puede forzar uno con
 * VITE_GEMINI_MODEL.
 */
const MODELS = [
  import.meta.env.VITE_GEMINI_MODEL,
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
].filter(Boolean) as string[]

const SYSTEM = `Eres el asistente de cocina de una pareja que vive en España. Con lo que te pidan, escribe UNA receta casera, realista y fácil de seguir, en español de España.

Cómo interpretar la petición:
- Si solo dan el nombre de un plato ("una lasaña"), crea la versión clásica.
- Si dan una lista de ingredientes para usar, úsalos todos.
- Si dicen que pueden usar "algunos" de los ingredientes o que no hace falta usarlos todos, elige solo los que encajen bien y no fuerces el resto.
- Puedes añadir básicos de despensa (sal, pimienta, aceite de oliva, agua, especias comunes) aunque no los mencionen.
- Si pegan una receta ya escrita, respétala: solo ordénala en el formato y completa lo que falte.
- Si te pasan la receta actual y piden un cambio ("hazla vegetariana", "para 4"), devuelve la receta completa ya modificada.
- Respeta raciones, tiempo, dieta o utensilios que indiquen.

Formato:
- ingredients: un ingrediente por elemento, con la cantidad delante cuando tenga sentido: "200 g de harina", "2 huevos", "1 cebolla", "Sal". Usa unidades métricas.
- steps: un paso por elemento, frases claras en imperativo, sin numerarlos.
- servings: número de raciones (2 si no lo indican).
- time: minutos totales aproximados.
- emoji: un único emoji de comida que represente el plato. Preferiblemente uno de: ${FOOD_EMOJIS.join(' ')}
- tags: entre 1 y 3 etiquetas, preferiblemente de esta lista: ${SUGGESTED_TAGS.join(', ')}.
- notes: opcional, un consejo breve (conservación, variación o acompañamiento).`

const RECIPE_SCHEMA = Schema.object({
  properties: {
    title: Schema.string({ description: 'Nombre del plato' }),
    emoji: Schema.string(),
    servings: Schema.integer(),
    time: Schema.integer({ description: 'Minutos totales' }),
    ingredients: Schema.array({ items: Schema.string() }),
    steps: Schema.array({ items: Schema.string() }),
    tags: Schema.array({ items: Schema.string() }),
    notes: Schema.string(),
  },
  optionalProperties: ['notes', 'tags', 'time', 'servings', 'emoji'],
})

export class AiUnavailableError extends Error {}

let models: GenerativeModel[] | null = null

function getModels(): GenerativeModel[] {
  if (!firebaseConfig) throw new AiUnavailableError('La IA necesita la sincronización con Firebase.')
  if (!models) {
    const ai = getAI(firebaseApp(firebaseConfig), { backend: new GoogleAIBackend() })
    models = MODELS.map((model) =>
      getGenerativeModel(ai, {
        model,
        systemInstruction: SYSTEM,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RECIPE_SCHEMA,
          temperature: 0.7,
        },
      }),
    )
  }
  return models
}

function status(e: unknown): number | undefined {
  return (e as { customErrorData?: { status?: number } }).customErrorData?.status
}

/** ¿Merece la pena probar con el siguiente modelo? */
function shouldFallback(e: unknown): boolean {
  const s = status(e)
  return s === 404 || s === 429 || s === 400 || s === 503
}

/** Traduce los errores del SDK a mensajes comprensibles. */
export function aiErrorMessage(e: unknown): string {
  if (e instanceof AiUnavailableError) return e.message
  const code = String((e as { code?: string }).code ?? '')
  const s = status(e)
  // El SDK marca cualquier respuesta HTTP fallida como fetch-error: miramos antes el código.
  if (s === 429) return 'Se ha agotado la cuota gratuita de la IA por ahora. Prueba dentro de un rato o mañana.'
  if (code.includes('api-not-enabled') || s === 403)
    return 'La IA no está activada en Firebase. Ve a la consola → AI Logic → Comenzar → Gemini Developer API.'
  if (s === 404) return 'El modelo de IA no está disponible ahora mismo. Inténtalo más tarde.'
  if (!navigator.onLine || (code.includes('fetch-error') && !s)) return 'Sin conexión. La IA necesita internet.'
  return 'La IA no ha podido crear la receta. Prueba a reformular la petición.'
}

const clean = (lines: unknown): string[] =>
  Array.isArray(lines) ? lines.map((l) => String(l).trim()).filter(Boolean) : []

const positiveInt = (n: unknown, max: number): number | undefined => {
  const v = Math.round(Number(n))
  return Number.isFinite(v) && v > 0 && v <= max ? v : undefined
}

function firstGrapheme(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const seg = new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(value.trim())
  return seg[Symbol.iterator]().next().value?.segment
}

/**
 * Pide a Gemini una receta a partir de una descripción libre. Si se pasa
 * la receta actual, la IA la usa como punto de partida para modificarla.
 */
export async function generateRecipe(request: string, current?: RecipeDraft): Promise<Partial<RecipeDraft>> {
  const hasCurrent = !!current && (current.title.trim() || current.ingredients.length || current.steps.length)
  const prompt = hasCurrent
    ? `Receta actual:\n${JSON.stringify({
        title: current!.title,
        servings: current!.servings,
        time: current!.time,
        ingredients: current!.ingredients,
        steps: current!.steps,
        notes: current!.notes,
      })}\n\nPetición: ${request}`
    : request

  let lastError: unknown
  for (const model of getModels()) {
    try {
      const result = await model.generateContent(prompt)
      const data = JSON.parse(result.response.text()) as Record<string, unknown>
      const ingredients = clean(data.ingredients)
      const steps = clean(data.steps)
      if (!ingredients.length && !steps.length) throw new Error('Respuesta vacía')
      return {
        title: String(data.title ?? '').trim(),
        emoji: firstGrapheme(data.emoji),
        servings: positiveInt(data.servings, 50),
        time: positiveInt(data.time, 24 * 60),
        ingredients,
        steps,
        tags: clean(data.tags).slice(0, 3),
        notes: typeof data.notes === 'string' && data.notes.trim() ? data.notes.trim() : undefined,
      }
    } catch (e) {
      console.warn('Gemini', e)
      lastError = e
      if (!shouldFallback(e)) break
    }
  }
  throw lastError
}
