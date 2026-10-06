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
  category: CategoryId
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
  notes?: string
  createdBy?: string
  createdAt: number
  updatedAt: number
}

export type EventDraft = Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>

/** Personalización compartida de la pantalla de inicio (todo opcional). */
export interface HomeSettings {
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
