import { useSyncExternalStore } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'

export interface Prefs {
  name: string
  householdId: string | null
  householdName: string | null
  theme: ThemePref
  /** Agrupar la lista de la compra por pasillos. */
  groupByCategory: boolean
}

const KEY = 'cerlis:prefs'
const DEFAULTS: Prefs = {
  name: '',
  householdId: null,
  householdName: null,
  theme: 'system',
  groupByCategory: true,
}

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

let current = load()
const listeners = new Set<() => void>()

export function getPrefs(): Prefs {
  return current
}

export function setPrefs(patch: Partial<Prefs>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* almacenamiento no disponible: se mantiene en memoria */
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, getPrefs, getPrefs)
}
