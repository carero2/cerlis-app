import type { Household, NewItem, Recipe, RecipeDraft, ShoppingItem, SyncState } from '../types'

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

  subscribeSync(cb: (state: SyncState) => void): Unsubscribe
  dispose(): void
}

export interface HouseholdService {
  create(name: string): Promise<Household>
  join(code: string): Promise<Household>
  get(code: string): Promise<Household | null>
  rename(code: string, name: string): Promise<void>
}
