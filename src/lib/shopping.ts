import { useCallback } from 'react'
import { useToast } from '../components/Toast'
import { normalize, parseItemInput } from './categories'
import { useData } from './data'
import { savePendingPhoto, type PendingPhoto } from './photos'
import { getPrefs } from './prefs'
import { useShopConfig } from './shopConfig'
import type { ShoppingItem } from './types'

const HISTORY_KEY = 'cerlis:history'
type History = Record<string, { name: string; count: number; last: number }>

function readHistory(): History {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '{}') as History
  } catch {
    return {}
  }
}

function remember(names: string[]) {
  const h = readHistory()
  const now = Date.now()
  for (const name of names) {
    const key = normalize(name)
    h[key] = { name, count: (h[key]?.count ?? 0) + 1, last: now }
  }
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h))
  } catch {
    /* ignorado */
  }
}

/** Sugerencias de autocompletado a partir de lo que se ha comprado antes. */
export function suggestFromHistory(query: string, exclude: Set<string>, limit = 6): string[] {
  const q = normalize(query)
  const entries = Object.entries(readHistory()).filter(([key]) => !exclude.has(key))
  const scored = entries
    .filter(([key]) => (q ? key.includes(q) && key !== q : true))
    .sort(([ka, a], [kb, b]) => {
      if (q) {
        const sa = ka.startsWith(q) ? 1 : 0
        const sb = kb.startsWith(q) ? 1 : 0
        if (sa !== sb) return sb - sa
      }
      return b.count - a.count || b.last - a.last
    })
  return scored.slice(0, limit).map(([, v]) => v.name)
}

export function sortItems(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort((a, b) => a.createdAt - b.createdAt)
}

export function useShoppingActions() {
  const { store, items, releasePhotos } = useData()
  const toast = useToast()
  const config = useShopConfig()

  const add = useCallback(
    async (raw: string, pendingPhoto?: PendingPhoto, listId = config.activeListId) => {
      const { name, quantity } = parseItemInput(raw)
      if (!name) return
      const key = normalize(name)
      // Cada lista es independiente: el mismo producto puede estar en el súper y en la farmacia.
      const existing = items.find((it) => normalize(it.name) === key && config.listOf(it) === listId)
      remember([name])
      const photo = pendingPhoto ? await savePendingPhoto(store, pendingPhoto) : undefined
      if (existing) {
        const withPhoto = photo ? { photo } : {}
        // Si ya estaba en el carrito lo devolvemos a pendientes en vez de duplicar.
        if (existing.checked) {
          await store.updateItem(existing.id, { checked: false, checkedAt: undefined, quantity: quantity ?? existing.quantity, ...withPhoto })
          toast(`${existing.name} vuelve a la lista`)
        } else if ((quantity && quantity !== existing.quantity) || photo) {
          await store.updateItem(existing.id, { quantity: quantity ?? existing.quantity, ...withPhoto })
          toast(`${existing.name} actualizado`)
        } else {
          toast(`${existing.name} ya está en la lista`)
        }
        return
      }
      await store.addItems([
        {
          name,
          quantity,
          photo,
          category: config.guess(name, listId),
          listId,
          addedBy: getPrefs().name || undefined,
        },
      ])
    },
    [items, store, toast, config],
  )

  const addMany = useCallback(
    async (entries: { name: string; quantity?: string; recipeId?: string }[], listId = config.activeListId) => {
      const inList = items.filter((i) => config.listOf(i) === listId)
      const pending = new Set(inList.filter((i) => !i.checked).map((i) => normalize(i.name)))
      const fresh = entries.filter((e) => !pending.has(normalize(e.name)))
      const author = getPrefs().name || undefined
      // Los que estaban ya comprados se reactivan.
      const reactivate = inList.filter(
        (i) => i.checked && fresh.some((e) => normalize(e.name) === normalize(i.name)),
      )
      await Promise.all(reactivate.map((i) => store.updateItem(i.id, { checked: false, checkedAt: undefined })))
      const reactivated = new Set(reactivate.map((i) => normalize(i.name)))
      const toCreate = fresh.filter((e) => !reactivated.has(normalize(e.name)))
      if (toCreate.length) {
        await store.addItems(
          toCreate.map((e) => ({ ...e, category: config.guess(e.name, listId), listId, addedBy: author })),
        )
      }
      remember(entries.map((e) => e.name))
      return fresh.length
    },
    [items, store, config],
  )

  const toggle = useCallback(
    (item: ShoppingItem) =>
      store.updateItem(item.id, item.checked ? { checked: false, checkedAt: undefined } : { checked: true, checkedAt: Date.now() }),
    [store],
  )

  const remove = useCallback(
    async (toRemove: ShoppingItem[], message?: string) => {
      if (!toRemove.length) return
      await store.deleteItems(toRemove.map((i) => i.id))
      releasePhotos(toRemove.map((i) => i.photo?.id))
      toast(message ?? (toRemove.length === 1 ? `${toRemove[0].name} eliminado` : `${toRemove.length} productos eliminados`), {
        action: { label: 'Deshacer', onClick: () => void store.restoreItems(toRemove) },
      })
    },
    [store, toast, releasePhotos],
  )

  return { add, addMany, toggle, remove }
}
