import { useCallback } from 'react'
import { useToast } from '../components/Toast'
import { guessCategory, normalize, parseItemInput } from './categories'
import { useData } from './data'
import { savePendingPhoto, type PendingPhoto } from './photos'
import { getPrefs } from './prefs'
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
  const { store, items } = useData()
  const toast = useToast()

  const add = useCallback(
    async (raw: string, pendingPhoto?: PendingPhoto) => {
      const { name, quantity } = parseItemInput(raw)
      if (!name) return
      const key = normalize(name)
      const existing = items.find((it) => normalize(it.name) === key)
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
          category: guessCategory(name),
          addedBy: getPrefs().name || undefined,
        },
      ])
    },
    [items, store, toast],
  )

  const addMany = useCallback(
    async (entries: { name: string; quantity?: string; recipeId?: string }[]) => {
      const pending = new Set(items.filter((i) => !i.checked).map((i) => normalize(i.name)))
      const fresh = entries.filter((e) => !pending.has(normalize(e.name)))
      const author = getPrefs().name || undefined
      // Los que estaban ya comprados se reactivan.
      const reactivate = items.filter(
        (i) => i.checked && fresh.some((e) => normalize(e.name) === normalize(i.name)),
      )
      await Promise.all(reactivate.map((i) => store.updateItem(i.id, { checked: false, checkedAt: undefined })))
      const reactivated = new Set(reactivate.map((i) => normalize(i.name)))
      const toCreate = fresh.filter((e) => !reactivated.has(normalize(e.name)))
      if (toCreate.length) {
        await store.addItems(
          toCreate.map((e) => ({ ...e, category: guessCategory(e.name), addedBy: author })),
        )
      }
      remember(entries.map((e) => e.name))
      return fresh.length
    },
    [items, store],
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
      toast(message ?? (toRemove.length === 1 ? `${toRemove[0].name} eliminado` : `${toRemove.length} productos eliminados`), {
        action: { label: 'Deshacer', onClick: () => void store.restoreItems(toRemove) },
      })
    },
    [store, toast],
  )

  return { add, addMany, toggle, remove }
}
