import { firebaseConfig } from './store/config'
import type { HouseholdService } from './store/types'

let service: Promise<HouseholdService> | null = null

/** Servicio de hogares (solo disponible con Firebase configurado). */
export function householdService(): Promise<HouseholdService> {
  if (!firebaseConfig) return Promise.reject(new Error('La sincronización no está configurada.'))
  service ??= import('./store/firebase').then((m) => m.createHouseholdService(firebaseConfig!))
  return service
}

export async function shareHouseholdCode(code: string, name: string): Promise<'shared' | 'copied' | 'failed'> {
  const url = `${location.origin}${location.pathname}`
  const text = `¡Únete a “${name}” en Cerlis! Abre ${url}, ve a Ajustes → Unirme a un hogar y usa el código: ${code}`
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Cerlis', text })
      return 'shared'
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'failed'
  }
  try {
    await navigator.clipboard.writeText(code)
    return 'copied'
  } catch {
    return 'failed'
  }
}
