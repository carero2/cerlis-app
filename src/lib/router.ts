import { useSyncExternalStore } from 'react'

/**
 * Router mínimo basado en hash. Funciona en cualquier hosting estático
 * (GitHub Pages incluido) y conserva la pantalla al reabrir la app.
 */

export type Route =
  | { name: 'home' }
  | { name: 'list' }
  | { name: 'recipes' }
  | { name: 'recipe'; id: string }
  | { name: 'recipe-new'; ai?: boolean }
  | { name: 'recipe-edit'; id: string }
  | { name: 'calendar'; date?: string }
  | { name: 'games' }
  | { name: 'game'; game: 'go' | 'jaipur' | 'codigo' }
  | { name: 'settings' }

export type Tab = 'home' | 'list' | 'recipes' | 'calendar' | 'games' | 'settings'

function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  switch (parts[0]) {
    case 'lista':
      return { name: 'list' }
    case 'recetas':
      if (parts[1] === 'nueva') return { name: 'recipe-new', ai: parts[2] === 'ia' }
      if (parts[1] && parts[2] === 'editar') return { name: 'recipe-edit', id: parts[1] }
      if (parts[1]) return { name: 'recipe', id: parts[1] }
      return { name: 'recipes' }
    case 'calendario':
      return { name: 'calendar', date: /^\d{4}-\d{2}-\d{2}$/.test(parts[1] ?? '') ? parts[1] : undefined }
    case 'juegos':
      if (parts[1] === 'go' || parts[1] === 'jaipur' || parts[1] === 'codigo') return { name: 'game', game: parts[1] }
      return { name: 'games' }
    case 'ajustes':
      return { name: 'settings' }
    default:
      return { name: 'home' }
  }
}

export function routeTab(route: Route): Tab {
  switch (route.name) {
    case 'list':
      return 'list'
    case 'recipes':
    case 'recipe':
    case 'recipe-new':
    case 'recipe-edit':
      return 'recipes'
    case 'calendar':
      return 'calendar'
    case 'games':
    case 'game':
      return 'games'
    case 'settings':
      return 'settings'
    default:
      return 'home'
  }
}

export const paths = {
  home: '/',
  list: '/lista',
  recipes: '/recetas',
  recipe: (id: string) => `/recetas/${encodeURIComponent(id)}`,
  recipeNew: '/recetas/nueva',
  recipeAi: '/recetas/nueva/ia',
  recipeEdit: (id: string) => `/recetas/${encodeURIComponent(id)}/editar`,
  calendar: '/calendario',
  calendarDay: (date: string) => `/calendario/${date}`,
  games: '/juegos',
  game: (id: 'go' | 'jaipur' | 'codigo') => `/juegos/${id}`,
  settings: '/ajustes',
}

let current = parse(location.hash)
// Cuántas entradas hemos apilado dentro de la app: así "Atrás" nunca saca al usuario.
let depth = 0
const listeners = new Set<() => void>()

window.addEventListener('hashchange', () => {
  current = parse(location.hash)
  listeners.forEach((l) => l())
})

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  const hash = `#${path}`
  if (opts.replace) {
    history.replaceState(null, '', hash)
    current = parse(hash)
    listeners.forEach((l) => l())
  } else {
    depth++
    location.hash = hash
  }
  window.scrollTo({ top: 0 })
}

export function goBack(fallback: string) {
  if (depth > 0) {
    depth--
    history.back()
  } else {
    navigate(fallback, { replace: true })
  }
}

/** Cambio de pestaña: no apila historial, como en una app nativa. */
export function switchTab(path: string) {
  depth = 0
  navigate(path, { replace: true })
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}
