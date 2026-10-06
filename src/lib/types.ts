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

/** `denied`: la cuenta de Google no está en la lista de cuentas permitidas. */
export type SyncState = 'local' | 'connecting' | 'online' | 'offline' | 'error' | 'denied'
