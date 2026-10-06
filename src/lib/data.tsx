import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cloudEnabled, firebaseConfig } from './store/config'
import { createLocalStore } from './store/local'
import type { DataStore } from './store/types'
import type { Recipe, ShoppingItem, SyncState } from './types'
import { usePrefs } from './prefs'

interface DataContextValue {
  store: DataStore
  items: ShoppingItem[]
  recipes: Recipe[]
  sync: SyncState
  /** true cuando ya llegó la primera tanda de datos. */
  ready: boolean
}

const DataContext = createContext<DataContextValue | null>(null)

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData fuera de <DataProvider>')
  return ctx
}

/** ¿Hay que mostrar la bienvenida para crear o unirse a un hogar? */
export function useNeedsHousehold(): boolean {
  const { householdId } = usePrefs()
  return cloudEnabled && !householdId
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { householdId } = usePrefs()
  const [store, setStore] = useState<DataStore | null>(null)
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
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
      if (cloudEnabled && householdId) {
        // Carga diferida: en modo local no se descarga el SDK de Firebase.
        const fb = await import('./store/firebase')
        await fb.ensureUser(firebaseConfig!)
        return fb.createFirebaseStore(firebaseConfig!, householdId)
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
  }, [householdId])

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
      store.subscribeSync(setSync),
    ]
    return () => offs.forEach((off) => off())
  }, [store])

  const value = useMemo<DataContextValue | null>(
    () => (store ? { store, items, recipes, sync, ready: loaded.items && loaded.recipes } : null),
    [store, items, recipes, sync, loaded],
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
