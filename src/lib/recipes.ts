import type { Recipe, RecipeDraft } from './types'

export const FOOD_EMOJIS = [
  '🍝', '🍲', '🥘', '🍛', '🍜', '🥗', '🍕', '🌮', '🌯', '🥙', '🍔', '🥪',
  '🍳', '🥞', '🧇', '🍗', '🥩', '🍖', '🐟', '🍤', '🦐', '🍣', '🍱', '🥟',
  '🍚', '🥔', '🥕', '🍆', '🥦', '🍄', '🫑', '🧄', '🥑', '🍅', '🫘', '🧀',
  '🍞', '🥐', '🥧', '🍰', '🎂', '🧁', '🍪', '🍩', '🍫', '🍮', '🍨', '🍓',
  '🍋', '🍎', '🥤', '🍹', '☕', '🍵',
]

export const SUGGESTED_TAGS = ['Rápida', 'Cena', 'Comida', 'Desayuno', 'Postre', 'Snack', 'Vegetariana', 'Batch cooking', 'Para invitados']

const tagKey = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
const MAIN_TAGS = new Set(['comida', 'cena', 'almuerzo'])

/**
 * Recetas para "¿Qué cocinamos hoy?": solo las etiquetadas como comida o
 * cena (nada de postres, desayunos ni snacks). Si hay suficientes
 * favoritas entre ellas, solo las favoritas.
 */
export function mealPool(recipes: Recipe[]): Recipe[] {
  const mains = recipes.filter((r) => r.tags.some((t) => MAIN_TAGS.has(tagKey(t))))
  const favs = mains.filter((r) => r.favorite)
  return favs.length >= 3 ? favs : mains
}

// Fondos suaves para las tarjetas, derivados del título.
const TINTS = ['tint-peach', 'tint-mint', 'tint-sky', 'tint-lilac', 'tint-butter', 'tint-rose', 'tint-sage']

export function recipeTint(recipe: Pick<Recipe, 'id' | 'title'>): string {
  let h = 0
  for (const ch of recipe.id + recipe.title) h = (h * 31 + ch.charCodeAt(0)) | 0
  return TINTS[Math.abs(h) % TINTS.length]
}

export function formatTime(min?: number): string | null {
  if (!min) return null
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export function emptyDraft(): RecipeDraft {
  return {
    title: '',
    emoji: '🍲',
    ingredients: [],
    steps: [],
    tags: [],
    favorite: false,
  }
}

/** Limpia viñetas y numeración al pegar texto copiado de una web. */
export function splitLines(text: string, numbered = false): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => {
      let s = line.trim().replace(/^[-–•*·▢☐□✓]\s*/, '')
      if (numbered) s = s.replace(/^(?:paso\s*)?\d+\s*[.):-]\s*/i, '')
      return s.trim()
    })
    .filter(Boolean)
}

/**
 * Separa "200 g de harina" en cantidad y nombre para añadirlo a la lista.
 * Si no hay cantidad reconocible, devuelve el texto completo como nombre.
 */
export function parseIngredient(line: string): { name: string; quantity?: string } {
  const text = line.trim().replace(/\s+/g, ' ')
  const m = text.match(
    /^((?:\d+(?:[.,/]\d+)?|½|¼|¾|un|una|media|medio)\s*(?:kg|g|gr|gramos?|l|litros?|ml|cl|cucharadas?|cucharaditas?|cdas?|cdtas?|tazas?|vasos?|dientes?|latas?|botes?|sobres?|pizcas?|puñados?|ramas?|hojas?|rodajas?|lonchas?|unidad(?:es)?|ud?s?\.?)?)\s+(?:de\s+)?(.+)$/i,
  )
  if (!m) return { name: capitalizeFirst(text) }
  const name = m[2].replace(/\s*\(.*?\)\s*/g, ' ').replace(/,.*$/, '').trim()
  return { name: capitalizeFirst(name), quantity: m[1].trim() }
}

function capitalizeFirst(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}
