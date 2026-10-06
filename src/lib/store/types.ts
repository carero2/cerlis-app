import type { NewItem, Recipe, RecipeDraft, ShoppingItem, SyncState } from '../types'

export type Unsubscribe = () => void

/**
 * Contrato común para los backends de datos. La app solo habla con esta
 * interfaz, así podemos usar Firebase (sincronizado entre dispositivos) o
 * almacenamiento local sin tocar las pantallas.
 */
export interface DataStore {
  readonly kind: 'local' | 'firebase'

  subscribeItems(cb: (items: ShoppingItem[]) => void): Unsubscribe
  addItems(items: NewItem[]): Promise<void>
  updateItem(id: string, patch: Partial<Omit<ShoppingItem, 'id'>>): Promise<void>
  deleteItems(ids: string[]): Promise<void>
  restoreItems(items: ShoppingItem[]): Promise<void>

  subscribeRecipes(cb: (recipes: Recipe[]) => void): Unsubscribe
  createRecipe(draft: RecipeDraft): Promise<string>
  updateRecipe(id: string, patch: Partial<RecipeDraft>): Promise<void>
  deleteRecipe(id: string): Promise<void>

  /** Guarda una foto grande (data URL) y devuelve su id. */
  savePhoto(dataUrl: string): Promise<string>
  getPhoto(id: string): Promise<string | null>
  deletePhoto(id: string): Promise<void>

  subscribeSync(cb: (state: SyncState) => void): Unsubscribe
  dispose(): void
}
