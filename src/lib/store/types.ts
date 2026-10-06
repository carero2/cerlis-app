import type { CalendarEvent, EventDraft, HomeSettings, NewItem, ShoppingConfig, Recipe, RecipeDraft, ShoppingItem, SyncState } from '../types'

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

  subscribeEvents(cb: (events: CalendarEvent[]) => void): Unsubscribe
  createEvent(draft: EventDraft): Promise<string>
  updateEvent(id: string, patch: Partial<EventDraft>): Promise<void>
  deleteEvent(id: string): Promise<void>

  subscribeShopping(cb: (config: ShoppingConfig) => void): Unsubscribe
  /** Sustituye los campos indicados; `learned` se fusiona. */
  updateShopping(patch: Partial<ShoppingConfig>): Promise<void>

  subscribeHome(cb: (home: HomeSettings) => void): Unsubscribe
  /** Un campo a `undefined` lo elimina. */
  updateHome(patch: Partial<HomeSettings>): Promise<void>

  /** Guarda una foto grande (data URL) y devuelve su id. */
  savePhoto(dataUrl: string): Promise<string>
  getPhoto(id: string): Promise<string | null>
  deletePhoto(id: string): Promise<void>
  /** Todos los ids de fotos guardadas (para limpiar las que no usa nada). */
  listPhotoIds(): Promise<string[]>

  subscribeSync(cb: (state: SyncState) => void): Unsubscribe
  dispose(): void
}
