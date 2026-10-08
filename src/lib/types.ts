export type CategoryId =
  | 'fruta'
  | 'carne'
  | 'pescado'
  | 'lacteos'
  | 'panaderia'
  | 'despensa'
  | 'congelados'
  | 'bebidas'
  | 'limpieza'
  | 'higiene'
  | 'otros'

/**
 * Foto guardada en Firestore: la miniatura va dentro del documento (para
 * listas y tarjetas) y la imagen grande en `photos/{id}`, que se carga solo
 * al verla.
 */
export interface PhotoRef {
  id: string
  /** data URL JPEG pequeño (~360 px). */
  thumb: string
}

export interface ShoppingItem {
  id: string
  name: string
  /** Cantidad libre: "2", "500 g", "1 docena"… */
  quantity?: string
  /** Id del pasillo (de los predefinidos o creado por vosotros). */
  category: string
  /** Lista (tienda) a la que pertenece; sin valor = la primera lista. */
  listId?: string
  checked: boolean
  addedBy?: string
  /** Receta de la que procede el ingrediente, si aplica. */
  recipeId?: string
  photo?: PhotoRef
  createdAt: number
  checkedAt?: number
}

/**
 * Formato canónico de receta. La futura importación con IA debe producir
 * exactamente esta forma: ingredientes y pasos de preparación.
 */
export interface Recipe {
  id: string
  title: string
  emoji: string
  ingredients: string[]
  steps: string[]
  servings?: number
  /** Minutos totales. */
  time?: number
  tags: string[]
  notes?: string
  favorite: boolean
  photo?: PhotoRef
  source?: string
  createdBy?: string
  createdAt: number
  updatedAt: number
}

export type NewItem = Omit<ShoppingItem, 'id' | 'createdAt' | 'checked'> & { checked?: boolean }
export type RecipeDraft = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>

/** Una lista de la compra por tienda o tipo de tienda. */
export interface ShopList {
  id: string
  name: string
  emoji?: string
  /**
   * Pasillos propios de la lista ([] = sin pasillos, todo junto). Si falta
   * (datos antiguos), la lista principal usa los pasillos generales.
   */
  categories?: CategoryDef[]
}

/** Pasillo o categoría de productos. */
export interface CategoryDef {
  id: string
  label: string
  emoji?: string
}

/** Configuración compartida de la compra (settings/shopping). */
export interface ShoppingConfig {
  lists?: ShopList[]
  /** Pasillos de antes de que cada lista tuviera los suyos (los hereda la lista principal). */
  categories?: CategoryDef[]
  /** Pasillo aprendido por producto (nombre normalizado → id de pasillo). */
  learned?: Record<string, string>
}

/** Partida de Go compartida (settings/go). */
export interface GoGame {
  id: string
  size: 9 | 13 | 19
  /** uid de quien lleva cada color. */
  black: string
  white: string
  /** Los dos juegan en el mismo móvil. */
  hotseat?: boolean
  /** Jugadas en orden: índice de la intersección o -1 para pasar. */
  moves: number[]
  status: 'playing' | 'scoring' | 'finished'
  /** Piedras marcadas como muertas durante el recuento. */
  dead?: number[]
  komi: number
  result?: { winner: 1 | 2; by: 'score' | 'resign'; black?: number; white?: number }
  createdAt: number
  updatedAt: number
}

export interface GoState {
  game?: GoGame
  /** Partidas ganadas por cada uid. */
  wins?: Record<string, number>
}

// ---------- Juego estilo Jaipur (settings/jaipur) ----------

export type JaipurGood = 'diamond' | 'gold' | 'silver' | 'cloth' | 'spice' | 'leather'
export type JaipurCard = JaipurGood | 'camel'

export interface JaipurPlayer {
  hand: JaipurGood[]
  /** Camellos en el corral. */
  herd: number
  /** Fichas de mercancía ganadas (valores). */
  tokens: number[]
  /** Fichas de bonificación (valores ocultos para el rival). */
  bonus: number[]
}

export interface JaipurRound {
  deck: JaipurCard[]
  market: JaipurCard[]
  players: Record<string, JaipurPlayer>
  /** Fichas que quedan de cada mercancía, la de más valor primero. */
  piles: Record<JaipurGood, number[]>
  bonus: { b3: number[]; b4: number[]; b5: number[] }
  /** uid de quien juega. */
  turn: string
  /** Lo último que pasó, para quien vuelve a la app. */
  last?: { by: string; text: string }
}

export interface JaipurRoundResult {
  points: Record<string, number>
  /** uid que se lleva la ficha de camellos (5 puntos), si no hay empate. */
  camels?: string
  winner: string
}

export interface JaipurGame {
  id: string
  players: [string, string]
  /** Sellos de excelencia: gana quien consigue 2. */
  seals: Record<string, number>
  roundNo: number
  round: JaipurRound
  status: 'playing' | 'round-over' | 'finished'
  lastRound?: JaipurRoundResult
  winner?: string
  /** uid de quien se rindió. */
  resigned?: string
  createdAt: number
  updatedAt: number
}

export interface JaipurState {
  game?: JaipurGame
  wins?: Record<string, number>
}

// ---------- Juego estilo Código Secreto Dúo (settings/codigo) ----------

/** Tarjeta clave de cada uno: 25 letras, g = agente, n = neutral, a = asesino. */
export type CodigoKey = string

export interface CodigoClue {
  giver: string
  word: string
  n: number
  /** Resultado de cada intento: g = agente, n = neutral, a = asesino. */
  results: string
}

export interface CodigoGame {
  id: string
  words: string[]
  players: [string, string]
  keys: Record<string, CodigoKey>
  /** Palabras descubiertas como agente. */
  found: number[]
  /** Palabras tocadas que eran neutrales según la clave de quien dio la pista. */
  neutral: Record<string, number[]>
  /** Turnos que quedan (empieza en 9). */
  timer: number
  phase: 'clue' | 'guess' | 'sudden' | 'won' | 'lost'
  /** Quien da la pista este turno. */
  giver: string
  clue?: { word: string; n: number }
  guesses: number
  history: CodigoClue[]
  /** Palabra que hizo perder (asesino). */
  lostAt?: number
  createdAt: number
  updatedAt: number
}

export interface CodigoState {
  game?: CodigoGame
  stats?: { won: number; lost: number }
}

export interface GameStates {
  go: GoState
  jaipur: JaipurState
  codigo: CodigoState
}

export type GameId = keyof GameStates

export type Repeat = 'weekly' | 'monthly' | 'yearly'

/**
 * Plan del calendario compartido. Las fechas van como texto local
 * ("2026-12-05") para que no cambien de día por las zonas horarias.
 */
export interface CalendarEvent {
  id: string
  title: string
  /** Día de inicio, AAAA-MM-DD. */
  date: string
  /** Último día (incluido) si dura varios días, AAAA-MM-DD. */
  endDate?: string
  allDay: boolean
  /** Hora de inicio y fin, HH:mm (solo si no es todo el día). */
  start?: string
  end?: string
  repeat?: Repeat
  /** De quién es el plan: "both" (los dos, por defecto) o el uid de uno. */
  who?: string
  notes?: string
  createdBy?: string
  createdAt: number
  updatedAt: number
}

export type EventDraft = Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>

export type ColorKey = 'blue' | 'pink' | 'green' | 'orange' | 'teal' | 'red'

/** Cada uno de los dos, registrado al entrar (para los colores del calendario). */
export interface Member {
  name: string
  email?: string
  color: ColorKey
}

/** Personalización compartida de la pantalla de inicio (todo opcional). */
export interface HomeSettings {
  /** Miembros por uid. Cada móvil escribe solo su propia entrada. */
  members?: Record<string, Member>
  /** Foto de los dos que encabeza Inicio. */
  photo?: PhotoRef
  message?: { text: string; author?: string; updatedAt: number }
  countdown?: {
    title: string
    /** Fecha objetivo en ms. */
    date: number
    /** Dónde va sobre la foto de Inicio (si la hay). Por defecto, abajo. */
    position?: 'top' | 'bottom'
  }
}

/** `denied`: la cuenta de Google no está en la lista de cuentas permitidas. */
export type SyncState = 'local' | 'connecting' | 'online' | 'offline' | 'error' | 'denied'
