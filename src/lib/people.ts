import { useEffect, useMemo } from 'react'
import { useUser } from './auth'
import { useData } from './data'
import { usePrefs } from './prefs'
import type { ColorKey, Member } from './types'

export const BOTH = 'both'

/** Colores que puede elegir cada uno. "Los dos" siempre va en morado. */
export const COLORS: Record<ColorKey, string> = {
  blue: '#3a7bd5',
  pink: '#e0609a',
  green: '#2f9e64',
  orange: '#ea7a35',
  teal: '#1f9fb0',
  red: '#e5484d',
}
export const COLOR_NAMES: Record<ColorKey, string> = {
  blue: 'Azul',
  pink: 'Rosa',
  green: 'Verde',
  orange: 'Naranja',
  teal: 'Turquesa',
  red: 'Rojo',
}
export const BOTH_COLOR = '#8a63d2'

export interface Person {
  id: string
  name: string
  color: string
  colorKey?: ColorKey
}

/** Id del usuario de este móvil (en modo local no hay cuenta). */
export function useMyId(): string {
  return useUser()?.uid ?? 'local'
}

/**
 * Personas del calendario: "Los dos" y cada miembro registrado, con su
 * color. Yo siempre aparezco aunque aún no esté registrado.
 */
export function usePeople() {
  const { home } = useData()
  const { name } = usePrefs()
  const me = useMyId()

  return useMemo(() => {
    const members: Record<string, Member> = { ...home.members }
    if (!members[me]) members[me] = { name: name || 'Yo', color: defaultColor(home.members, me) }
    const people: Person[] = Object.entries(members)
      // Yo primero, luego el resto por nombre.
      .sort(([a, ma], [b, mb]) => (a === me ? -1 : b === me ? 1 : ma.name.localeCompare(mb.name)))
      .map(([id, m]) => ({ id, name: id === me ? name || m.name : m.name, color: COLORS[m.color] ?? COLORS.blue, colorKey: m.color }))
    const both: Person = { id: BOTH, name: 'Los dos', color: BOTH_COLOR }
    const byId = new Map(people.map((p) => [p.id, p]))
    const colorOf = (who?: string) => (who && who !== BOTH ? (byId.get(who)?.color ?? BOTH_COLOR) : BOTH_COLOR)
    const labelOf = (who?: string) => (who && who !== BOTH ? (byId.get(who)?.name ?? 'Los dos') : 'Los dos')
    return { me, people, both, options: [both, ...people], colorOf, labelOf }
  }, [home.members, me, name])
}

function defaultColor(members: Record<string, Member> | undefined, me: string): ColorKey {
  const taken = new Set(Object.entries(members ?? {}).filter(([id]) => id !== me).map(([, m]) => m.color))
  return (['blue', 'pink', 'green', 'orange', 'teal', 'red'] as ColorKey[]).find((c) => !taken.has(c)) ?? 'blue'
}

/**
 * Registra (o actualiza) a quien usa este móvil en la personalización
 * compartida, para que el otro vea su nombre y color en el calendario.
 */
export function useRegisterMember() {
  const { home, homeReady, store } = useData()
  const user = useUser()
  const { name } = usePrefs()

  useEffect(() => {
    if (!homeReady) return
    const id = user?.uid ?? 'local'
    const current = home.members?.[id]
    const wantedName = name.trim() || user?.name?.split(' ')[0] || 'Yo'
    if (current && current.name === wantedName && (current.email ?? '') === (user?.email ?? '')) return
    // Pequeña espera para no escribir en cada letra mientras se edita el nombre.
    const t = window.setTimeout(() => {
      const member: Member = {
        name: wantedName,
        color: current?.color ?? defaultColor(home.members, id),
        ...(user?.email ? { email: user.email } : {}),
      }
      store.updateHome({ members: { [id]: member } }).catch((e) => console.warn('members', e))
    }, 1500)
    return () => window.clearTimeout(t)
  }, [homeReady, home.members, user, name, store])
}

/** Cambia mi color en el calendario. */
export async function setMyColor(
  store: { updateHome(patch: { members: Record<string, Member> }): Promise<void> },
  id: string,
  current: Member | undefined,
  name: string,
  color: ColorKey,
) {
  await store.updateHome({ members: { [id]: { ...(current ?? { name }), name: current?.name ?? name, color } } })
}
