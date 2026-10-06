import { useMemo } from 'react'
import { CATEGORIES, guessCategory, normalize } from './categories'
import { useData } from './data'
import { usePrefs } from './prefs'
import type { CategoryDef, ShopList, ShoppingItem } from './types'

export const OTHER_CATEGORY = 'otros'

export const DEFAULT_LISTS: ShopList[] = [{ id: 'super', name: 'Supermercado', emoji: '🛒' }]

export const DEFAULT_CATEGORIES: CategoryDef[] = CATEGORIES.map(({ id, label, emoji }) => ({ id, label, emoji }))

/**
 * Listas y pasillos en uso: los vuestros si los habéis editado, o los
 * predefinidos. "Otros" siempre existe para lo que no encaje.
 */
export function useShopConfig() {
  const { shopping } = useData()
  const { activeList } = usePrefs()

  return useMemo(() => {
    const lists = shopping.lists?.length ? shopping.lists : DEFAULT_LISTS
    let categories = shopping.categories?.length ? shopping.categories : DEFAULT_CATEGORIES
    if (!categories.some((c) => c.id === OTHER_CATEGORY)) {
      categories = [...categories, { id: OTHER_CATEGORY, label: 'Otros', emoji: '🛒' }]
    }
    const byId = new Map(categories.map((c) => [c.id, c]))
    const other = byId.get(OTHER_CATEGORY)!
    const listIds = new Set(lists.map((l) => l.id))
    const defaultList = lists[0].id
    const activeListId = activeList && listIds.has(activeList) ? activeList : defaultList

    return {
      lists,
      categories,
      activeListId,
      defaultList,
      /** Pasillo de un producto (los borrados caen en "Otros"). */
      categoryOf: (id: string) => byId.get(id) ?? other,
      /** Lista de un producto (sin lista o con lista borrada → la primera). */
      listOf: (item: Pick<ShoppingItem, 'listId'>) => (item.listId && listIds.has(item.listId) ? item.listId : defaultList),
      /** Pasillo para un producto nuevo: lo aprendido o, si no, por palabras clave. */
      guess: (name: string) => {
        const learned = shopping.learned?.[normalize(name)]
        if (learned && byId.has(learned)) return learned
        const guessed = guessCategory(name)
        return byId.has(guessed) ? guessed : OTHER_CATEGORY
      },
    }
  }, [shopping, activeList])
}

export type ShopConfig = ReturnType<typeof useShopConfig>

/** Id corto y legible a partir de un nombre ("Farmacia" → "farmacia-x1y2"). */
export function slugId(name: string): string {
  const base = normalize(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20) || 'item'
  return `${base}-${Math.random().toString(36).slice(2, 6)}`
}
