import { useMemo } from 'react'
import { CATEGORIES, guessCategory, normalize } from './categories'
import { useData } from './data'
import { usePrefs } from './prefs'
import type { CategoryDef, ShopList, ShoppingItem } from './types'

export const OTHER_CATEGORY = 'otros'

const OTHER_DEF: CategoryDef = { id: OTHER_CATEGORY, label: 'Otros', emoji: '🛒' }

export const DEFAULT_LISTS: ShopList[] = [{ id: 'super', name: 'Supermercado', emoji: '🛒' }]

export const DEFAULT_CATEGORIES: CategoryDef[] = CATEGORIES.map(({ id, label, emoji }) => ({ id, label, emoji }))

/**
 * Pasillos con "Otros" siempre al final si hay alguno. Una lista sin
 * pasillos (o solo con "Otros") se queda sin ninguno: todo junto.
 */
export function withOther(cats: CategoryDef[]): CategoryDef[] {
  if (!cats.some((c) => c.id !== OTHER_CATEGORY)) return []
  return cats.some((c) => c.id === OTHER_CATEGORY) ? cats : [...cats, OTHER_DEF]
}

/**
 * Listas (tiendas) y los pasillos de cada una: los vuestros si los habéis
 * editado, o los predefinidos.
 */
export function useShopConfig() {
  const { shopping } = useData()
  const { activeList } = usePrefs()

  return useMemo(() => {
    const stored = shopping.lists?.length ? shopping.lists : DEFAULT_LISTS
    // Datos antiguos: los pasillos generales son los del súper (o de la primera lista).
    const legacy = shopping.categories?.length ? shopping.categories : DEFAULT_CATEGORIES
    const legacyOwner = stored.some((l) => l.id === 'super') ? 'super' : stored[0].id
    const lists: ShopList[] = stored.map((l) => ({
      ...l,
      categories: withOther(l.categories ?? (l.id === legacyOwner ? legacy : [])),
    }))

    const byList = new Map(lists.map((l) => [l.id, new Map(l.categories!.map((c) => [c.id, c]))]))
    // Para buscar el icono de un pasillo sin saber la lista.
    const anyById = new Map<string, CategoryDef>(DEFAULT_CATEGORIES.map((c) => [c.id, c]))
    for (const l of lists) for (const c of l.categories!) anyById.set(c.id, c)

    const listIds = new Set(lists.map((l) => l.id))
    const defaultList = lists[0].id
    const activeListId = activeList && listIds.has(activeList) ? activeList : defaultList

    const categoriesOf = (listId: string): CategoryDef[] => lists.find((l) => l.id === listId)?.categories ?? []

    return {
      lists,
      activeListId,
      defaultList,
      /** Pasillos de una lista ([] si no usa pasillos). */
      categoriesOf,
      /** ¿La lista agrupa por pasillos? */
      hasAisles: (listId: string) => categoriesOf(listId).length > 0,
      /** Pasillo de un producto (los borrados o de otra lista caen en "Otros"). */
      categoryOf: (id: string, listId?: string): CategoryDef =>
        (listId ? byList.get(listId)?.get(id) : anyById.get(id)) ?? OTHER_DEF,
      /** Lista de un producto (sin lista o con lista borrada → la primera). */
      listOf: (item: Pick<ShoppingItem, 'listId'>) => (item.listId && listIds.has(item.listId) ? item.listId : defaultList),
      /** Pasillo para un producto nuevo en una lista: lo aprendido o, si no, por palabras clave. */
      guess: (name: string, listId: string = activeListId) => {
        const cats = byList.get(listId)
        if (!cats?.size) return OTHER_CATEGORY
        const learned = shopping.learned?.[normalize(name)]
        if (learned && cats.has(learned)) return learned
        const guessed = guessCategory(name)
        return cats.has(guessed) ? guessed : OTHER_CATEGORY
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
