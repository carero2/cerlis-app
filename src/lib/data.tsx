import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { firebaseConfig } from './store/config'
import { createLocalStore } from './store/local'
import type { DataStore } from './store/types'
import type { HomeSettings, Recipe, ShoppingItem, SyncState } from './types'
import { useUser } from './auth'

interface DataContextValue {
  store: DataStore
  items: ShoppingItem[]
  recipes: Recipe[]
  home: HomeSettings
  sync: SyncState
  /** true cuando ya llegó la primera tanda de datos. */
  ready: boolean
  /**
   * Borra las fotos indicadas cuando ya no las usa nada. Espera a que pase
   * el plazo de "Deshacer" para no perder la foto si se recupera el elemento.
   */
  releasePhotos: (ids: (string | undefined)[]) => void
}

const DataContext = createContext<DataContextValue | null>(null)

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData fuera de <DataProvider>')
  return ctx
}

/**
 * Carga los datos con el backend que toque: Firebase si hay sesión iniciada
 * (lo decide <Shell>) o almacenamiento local si no hay Firebase configurado.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const user = useUser()
  const userId = user?.uid ?? null
  const [store, setStore] = useState<DataStore | null>(null)
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [home, setHome] = useState<HomeSettings>({})
  const [sync, setSync] = useState<SyncState>('connecting')
  const [loaded, setLoaded] = useState({ items: false, recipes: false })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let created: DataStore | null = null
    setStore(null)
    setLoaded({ items: false, recipes: false })
    setError(null)

    async function boot() {
      if (userId) {
        // Carga diferida: en modo local no se descarga el SDK de Firebase.
        const fb = await import('./store/firebase')
        return fb.createFirebaseStore(firebaseConfig!)
      }
      return createLocalStore()
    }

    boot()
      .then((s) => {
        if (cancelled) return s.dispose()
        created = s
        setStore(s)
      })
      .catch((e: unknown) => {
        console.error(e)
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })

    return () => {
      cancelled = true
      created?.dispose()
    }
  }, [userId])

  useEffect(() => {
    if (!store) return
    const offs = [
      store.subscribeItems((next) => {
        setItems(next)
        setLoaded((l) => (l.items ? l : { ...l, items: true }))
      }),
      store.subscribeRecipes((next) => {
        setRecipes(next)
        setLoaded((l) => (l.recipes ? l : { ...l, recipes: true }))
      }),
      store.subscribeHome(setHome),
      store.subscribeSync(setSync),
    ]
    return () => offs.forEach((off) => off())
  }, [store])

  const latest = useRef({ items, recipes, home })
  latest.current = { items, recipes, home }

  const releasePhotos = useCallback(
    (ids: (string | undefined)[]) => {
      const candidates = ids.filter((id): id is string => !!id)
      if (!store || !candidates.length) return
      window.setTimeout(() => {
        const { items, recipes, home } = latest.current
        const used = new Set([...items, ...recipes].map((x) => x.photo?.id).concat(home.photo?.id))
        candidates.filter((id) => !used.has(id)).forEach((id) => void store.deletePhoto(id).catch(console.error))
      }, 8_000)
    },
    [store],
  )

  const value = useMemo<DataContextValue | null>(
    () => (store ? { store, items, recipes, home, sync, ready: loaded.items && loaded.recipes, releasePhotos } : null),
    [store, items, recipes, home, sync, loaded, releasePhotos],
  )

  if (error) {
    return (
      <div className="boot-screen">
        <div className="boot-card">
          <div className="boot-emoji">😵‍💫</div>
          <h2>No hemos podido conectar</h2>
          <p className="muted">{error}</p>
          <button className="btn btn-primary" onClick={() => location.reload()}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!value) {
    return (
      <div className="boot-screen">
        <div className="spinner" aria-label="Cargando" />
      </div>
    )
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
