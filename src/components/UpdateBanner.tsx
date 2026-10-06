import { useEffect, useState } from 'react'
import { Icon } from './Icon'

const CHECK_EVERY = 15 * 60_000

/** ¿Hay publicada una versión distinta de la que se está ejecutando? */
async function newerBuildAvailable(): Promise<boolean> {
  const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) return false
  const { build } = (await res.json()) as { build?: string }
  return !!build && build !== __BUILD_ID__
}

/** Recarga con la versión nueva, sin restos de la anterior en caché. */
async function reloadToUpdate() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    await reg?.update()
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  } catch (e) {
    console.warn(e)
  }
  location.reload()
}

/**
 * Al abrir la app (y al volver a ella) comprueba si se ha publicado una
 * versión nueva y ofrece recargar.
 */
export function UpdateBanner() {
  const [available, setAvailable] = useState(false)
  const [reloading, setReloading] = useState(false)

  useEffect(() => {
    if (import.meta.env.DEV) return
    let cancelled = false
    const check = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return
      newerBuildAvailable()
        .then((yes) => !cancelled && yes && setAvailable(true))
        .catch(() => {})
    }
    check()
    const t = window.setInterval(check, CHECK_EVERY)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('online', check)
    return () => {
      cancelled = true
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('online', check)
    }
  }, [])

  if (!available) return null

  return (
    <div className="update-banner" role="status">
      <span className="update-icon">
        <Icon name="sparkles" size={18} />
      </span>
      <span className="update-text">
        <strong>Nueva versión disponible</strong>
        <span>Recarga para ver los cambios</span>
      </span>
      <button
        className="update-btn"
        disabled={reloading}
        onClick={() => {
          setReloading(true)
          void reloadToUpdate()
        }}
      >
        {reloading ? 'Cargando…' : 'Actualizar'}
      </button>
      <button className="update-close" onClick={() => setAvailable(false)} aria-label="Ahora no">
        <Icon name="x" size={14} />
      </button>
    </div>
  )
}
