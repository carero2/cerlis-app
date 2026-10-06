import { uid } from '../ids'
import type { CalendarEvent, GoState, HomeSettings, NewItem, ShoppingConfig, Recipe, RecipeDraft, ShoppingItem } from '../types'
import type { DataStore } from './types'

const ITEMS_KEY = 'cerlis:items'
const RECIPES_KEY = 'cerlis:recipes'
const PHOTO_PREFIX = 'cerlis:photo:'
const HOME_KEY = 'cerlis:home'
const EVENTS_KEY = 'cerlis:events'
const SHOPPING_KEY = 'cerlis:shopping'
const GO_KEY = 'cerlis:go'

function readHome(): HomeSettings {
  try {
    return JSON.parse(localStorage.getItem(HOME_KEY) ?? '{}') as HomeSettings
  } catch {
    return {}
  }
}

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

/**
 * Backend local (localStorage). Sirve para probar la app sin configurar nada
 * y se sincroniza entre pestañas del mismo navegador, pero no entre móviles.
 */
export function createLocalStore(): DataStore {
  const itemListeners = new Set<(items: ShoppingItem[]) => void>()
  const recipeListeners = new Set<(recipes: Recipe[]) => void>()
  const homeListeners = new Set<(home: HomeSettings) => void>()
  const eventListeners = new Set<(events: CalendarEvent[]) => void>()
  const shoppingListeners = new Set<(config: ShoppingConfig) => void>()
  const readShopping = (): ShoppingConfig => {
    try {
      return JSON.parse(localStorage.getItem(SHOPPING_KEY) ?? '{}') as ShoppingConfig
    } catch {
      return {}
    }
  }
  let shopping = readShopping()
  const goListeners = new Set<(state: GoState) => void>()
  const readGo = (): GoState => {
    try {
      return JSON.parse(localStorage.getItem(GO_KEY) ?? '{}') as GoState
    } catch {
      return {}
    }
  }
  let go = readGo()
  let events = read<CalendarEvent>(EVENTS_KEY)
  const saveEvents = (next: CalendarEvent[]) => {
    events = next
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
    eventListeners.forEach((cb) => cb(events))
  }
  let home = readHome()

  let items = read<ShoppingItem>(ITEMS_KEY)
  let recipes = read<Recipe>(RECIPES_KEY)

  const emitItems = () => itemListeners.forEach((cb) => cb(items))
  const emitRecipes = () => recipeListeners.forEach((cb) => cb(recipes))

  const saveItems = (next: ShoppingItem[]) => {
    items = next
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items))
    emitItems()
  }
  const saveRecipes = (next: Recipe[]) => {
    recipes = next
    localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes))
    emitRecipes()
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key === ITEMS_KEY) {
      items = read(ITEMS_KEY)
      emitItems()
    } else if (e.key === RECIPES_KEY) {
      recipes = read(RECIPES_KEY)
      emitRecipes()
    } else if (e.key === EVENTS_KEY) {
      events = read(EVENTS_KEY)
      eventListeners.forEach((cb) => cb(events))
    } else if (e.key === SHOPPING_KEY) {
      shopping = readShopping()
      shoppingListeners.forEach((cb) => cb(shopping))
    } else if (e.key === GO_KEY) {
      go = readGo()
      goListeners.forEach((cb) => cb(go))
    } else if (e.key === HOME_KEY) {
      home = readHome()
      homeListeners.forEach((cb) => cb(home))
    }
  }
  window.addEventListener('storage', onStorage)

  return {
    kind: 'local',

    subscribeItems(cb) {
      itemListeners.add(cb)
      cb(items)
      return () => itemListeners.delete(cb)
    },
    async addItems(newItems: NewItem[]) {
      const now = Date.now()
      const created = newItems.map((it, i) => ({
        checked: false,
        ...it,
        id: uid(),
        createdAt: now + i,
      }))
      saveItems([...items, ...created])
    },
    async updateItem(id, patch) {
      saveItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))
    },
    async deleteItems(ids) {
      const set = new Set(ids)
      saveItems(items.filter((it) => !set.has(it.id)))
    },
    async restoreItems(restored) {
      const ids = new Set(restored.map((r) => r.id))
      saveItems([...items.filter((it) => !ids.has(it.id)), ...restored])
    },

    subscribeRecipes(cb) {
      recipeListeners.add(cb)
      cb(recipes)
      return () => recipeListeners.delete(cb)
    },
    async createRecipe(draft: RecipeDraft) {
      const now = Date.now()
      const recipe: Recipe = { ...draft, id: uid(), createdAt: now, updatedAt: now }
      saveRecipes([...recipes, recipe])
      return recipe.id
    },
    async updateRecipe(id, patch) {
      saveRecipes(recipes.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r)))
    },
    async deleteRecipe(id) {
      saveRecipes(recipes.filter((r) => r.id !== id))
    },

    subscribeEvents(cb) {
      eventListeners.add(cb)
      cb(events)
      return () => eventListeners.delete(cb)
    },
    async createEvent(draft) {
      const now = Date.now()
      const event: CalendarEvent = { ...draft, id: uid(), createdAt: now, updatedAt: now }
      saveEvents([...events, event])
      return event.id
    },
    async updateEvent(id, patch) {
      saveEvents(events.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e)))
    },
    async deleteEvent(id) {
      saveEvents(events.filter((e) => e.id !== id))
    },

    subscribeShopping(cb) {
      shoppingListeners.add(cb)
      cb(shopping)
      return () => shoppingListeners.delete(cb)
    },
    async updateShopping(patch) {
      const learned = patch.learned ? { ...shopping.learned, ...patch.learned } : shopping.learned
      shopping = JSON.parse(JSON.stringify({ ...shopping, ...patch, learned })) as ShoppingConfig
      localStorage.setItem(SHOPPING_KEY, JSON.stringify(shopping))
      shoppingListeners.forEach((cb) => cb(shopping))
    },

    subscribeGo(cb) {
      goListeners.add(cb)
      cb(go)
      return () => goListeners.delete(cb)
    },
    async saveGo(state) {
      go = JSON.parse(JSON.stringify(state)) as GoState
      localStorage.setItem(GO_KEY, JSON.stringify(go))
      goListeners.forEach((cb) => cb(go))
    },

    subscribeHome(cb) {
      homeListeners.add(cb)
      cb(home)
      return () => homeListeners.delete(cb)
    },
    async updateHome(patch) {
      const members = patch.members ? { ...home.members, ...patch.members } : home.members
      home = JSON.parse(JSON.stringify({ ...home, ...patch, members })) as HomeSettings
      localStorage.setItem(HOME_KEY, JSON.stringify(home))
      homeListeners.forEach((cb) => cb(home))
    },

    async savePhoto(dataUrl) {
      const id = uid()
      // Puede fallar si se llena el almacenamiento del navegador (~5 MB).
      localStorage.setItem(PHOTO_PREFIX + id, dataUrl)
      return id
    },
    async getPhoto(id) {
      return localStorage.getItem(PHOTO_PREFIX + id)
    },
    async deletePhoto(id) {
      localStorage.removeItem(PHOTO_PREFIX + id)
    },
    async listPhotoIds() {
      return Object.keys(localStorage)
        .filter((k) => k.startsWith(PHOTO_PREFIX))
        .map((k) => k.slice(PHOTO_PREFIX.length))
    },

    subscribeSync(cb) {
      cb('local')
      return () => {}
    },
    dispose() {
      window.removeEventListener('storage', onStorage)
      itemListeners.clear()
      recipeListeners.clear()
      homeListeners.clear()
      eventListeners.clear()
      shoppingListeners.clear()
      goListeners.clear()
    },
  }
}
