import type { CategoryId } from './types'

export interface Category {
  id: CategoryId
  label: string
  emoji: string
  keywords: string[]
}

// El orden refleja un recorrido típico por el supermercado.
export const CATEGORIES: Category[] = [
  {
    id: 'fruta',
    label: 'Fruta y verdura',
    emoji: '🥬',
    keywords: [
      'manzana', 'pera', 'platano', 'banana', 'naranja', 'mandarina', 'limon', 'lima', 'fresa', 'uva',
      'melon', 'sandia', 'kiwi', 'pina', 'mango', 'aguacate', 'tomate', 'lechuga', 'cebolla', 'ajo',
      'patata', 'zanahoria', 'pimiento', 'calabacin', 'berenjena', 'pepino', 'espinaca', 'brocoli',
      'coliflor', 'champinon', 'seta', 'puerro', 'apio', 'calabaza', 'perejil', 'cilantro', 'albahaca',
      'rucula', 'canonigo', 'fruta', 'verdura', 'jengibre', 'boniato', 'alcachofa', 'judia verde',
      'esparrago', 'melocoton', 'cereza', 'frambuesa', 'arandano', 'hierbabuena', 'menta',
    ],
  },
  {
    id: 'carne',
    label: 'Carne',
    emoji: '🥩',
    keywords: [
      'pollo', 'pechuga', 'muslo', 'ternera', 'cerdo', 'cordero', 'carne', 'filete', 'hamburguesa',
      'salchicha', 'chorizo', 'jamon', 'bacon', 'beicon', 'pavo', 'lomo', 'costilla', 'embutido',
      'salami', 'fuet', 'morcilla', 'picada', 'solomillo', 'secreto',
    ],
  },
  {
    id: 'pescado',
    label: 'Pescado y marisco',
    emoji: '🐟',
    keywords: [
      'pescado', 'salmon', 'merluza', 'atun', 'bacalao', 'gamba', 'langostino', 'mejillon', 'calamar',
      'sepia', 'pulpo', 'dorada', 'lubina', 'sardina', 'boqueron', 'almeja', 'marisco', 'anchoa',
      'rape', 'trucha', 'surimi',
    ],
  },
  {
    id: 'lacteos',
    label: 'Lácteos y huevos',
    emoji: '🧀',
    keywords: [
      'leche', 'yogur', 'queso', 'mantequilla', 'nata', 'huevo', 'kefir', 'requeson', 'mozzarella',
      'parmesano', 'burrata', 'cuajada', 'natillas', 'flan', 'margarina', 'bebida de avena',
    ],
  },
  {
    id: 'panaderia',
    label: 'Panadería',
    emoji: '🥖',
    keywords: [
      'pan', 'baguette', 'barra', 'tostada', 'croissant', 'bolleria', 'magdalena', 'galleta', 'bizcocho',
      'tortilla de trigo', 'wrap', 'pan rallado', 'picos', 'regañas',
    ],
  },
  {
    id: 'congelados',
    label: 'Congelados',
    emoji: '🧊',
    keywords: ['congelad', 'helado', 'hielo', 'pizza', 'croqueta', 'nugget', 'guisantes'],
  },
  {
    id: 'despensa',
    label: 'Despensa',
    emoji: '🥫',
    keywords: [
      'arroz', 'pasta', 'espagueti', 'macarron', 'fideo', 'lenteja', 'garbanzo', 'alubia', 'judion',
      'harina', 'azucar', 'sal', 'aceite', 'vinagre', 'tomate frito', 'atun en lata', 'conserva', 'lata',
      'cafe', 'te', 'infusion', 'cacao', 'chocolate', 'cereales', 'avena', 'miel', 'mermelada',
      'especia', 'pimienta', 'oregano', 'pimenton', 'comino', 'curry', 'canela', 'caldo', 'levadura',
      'frutos secos', 'almendra', 'nuez', 'cacahuete', 'pipas', 'patatas fritas', 'quinoa', 'cuscus',
      'salsa', 'mayonesa', 'ketchup', 'mostaza', 'soja', 'aceituna', 'legumbre', 'snack', 'tomate triturado',
    ],
  },
  {
    id: 'bebidas',
    label: 'Bebidas',
    emoji: '🥤',
    keywords: [
      'agua', 'zumo', 'refresco', 'cola', 'cerveza', 'vino', 'cava', 'tonica', 'gaseosa', 'batido',
      'bebida', 'licor', 'ginebra', 'ron', 'vermut', 'kombucha',
    ],
  },
  {
    id: 'limpieza',
    label: 'Limpieza y hogar',
    emoji: '🧽',
    keywords: [
      'detergente', 'suavizante', 'lejia', 'friegasuelos', 'lavavajillas', 'fregona', 'estropajo',
      'bayeta', 'papel de cocina', 'servilleta', 'bolsa de basura', 'basura', 'limpiador', 'pastillas',
      'papel de aluminio', 'papel film', 'film', 'ambientador', 'bombilla', 'pila', 'vela',
    ],
  },
  {
    id: 'higiene',
    label: 'Higiene y cuidado',
    emoji: '🧴',
    keywords: [
      'papel higienico', 'champu', 'gel', 'jabon', 'pasta de dientes', 'dentifrico', 'cepillo',
      'desodorante', 'compresa', 'tampon', 'crema', 'colonia', 'cuchilla', 'maquinilla', 'algodon',
      'bastoncillo', 'toallita', 'panuelo', 'protector solar', 'enjuague', 'hilo dental', 'acondicionador',
      'ibuprofeno', 'paracetamol', 'aspirina', 'tirita', 'vitamina', 'jarabe', 'suero', 'gasa', 'betadine',
      'mascarilla', 'termometro', 'antiseptico', 'colirio', 'pastillas para', 'crema solar',
    ],
  },
  { id: 'otros', label: 'Otros', emoji: '🛒', keywords: [] },
]

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  Category
>

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/** Deduce la categoría por palabras clave. La coincidencia más larga gana. */
export function guessCategory(name: string): CategoryId {
  const n = ` ${normalize(name)} `
  let best: { id: CategoryId; len: number } | null = null
  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      // Coincidencia al inicio de palabra para evitar falsos positivos ("te" en "aceite").
      // Las claves cortas además deben ser palabra completa (admitiendo plural).
      const idx = n.indexOf(` ${kw}`)
      if (idx === -1) continue
      if (kw.length <= 4 && !/^(?:e?s)?\s/.test(n.slice(idx + 1 + kw.length))) continue
      if (!best || kw.length > best.len) best = { id: cat.id, len: kw.length }
    }
  }
  return best?.id ?? 'otros'
}

const QTY_UNITS =
  '(?:kg|g|gr|l|ml|cl|ud|uds|unidad(?:es)?|paquete(?:s)?|bote(?:s)?|lata(?:s)?|docena(?:s)?|bolsa(?:s)?|botella(?:s)?|brick(?:s)?|caja(?:s)?)'
// La unidad solo cuenta si va seguida de espacio o fin ("2 l" sí, "2 leche" no).
const QTY = `\\d+(?:[.,]\\d+)?(?:\\s*${QTY_UNITS}(?=\\s|$))?`
const LEADING_QTY = new RegExp(`^(${QTY})\\s+(?:x\\s+|de\\s+)?(.+)$`, 'i')
const TRAILING_QTY = new RegExp(`^(.+?)\\s+(?:x\\s*)?(${QTY})$`, 'i')

/**
 * Interpreta lo que se escribe en el campo rápido:
 * "2 leche" → { name: "Leche", quantity: "2" }
 * "tomates 1 kg" → { name: "Tomates", quantity: "1 kg" }
 */
export function parseItemInput(raw: string): { name: string; quantity?: string } {
  const text = raw.trim().replace(/\s+/g, ' ')
  let name = text
  let quantity: string | undefined
  const lead = text.match(LEADING_QTY)
  const trail = text.match(TRAILING_QTY)
  if (lead) {
    quantity = lead[1].trim()
    name = lead[2]
  } else if (trail) {
    name = trail[1]
    quantity = trail[2].trim()
  }
  return { name: capitalize(name), quantity }
}

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}
