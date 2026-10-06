import { uid } from '../ids'
import type { NewItem, Recipe, RecipeDraft, ShoppingItem } from '../types'
import type { DataStore } from './types'

const ITEMS_KEY = 'cerlis:items'
const RECIPES_KEY = 'cerlis:recipes'

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

    subscribeSync(cb) {
      cb('local')
      return () => {}
    },
    dispose() {
      window.removeEventListener('storage', onStorage)
      itemListeners.clear()
      recipeListeners.clear()
    },
  }
}
