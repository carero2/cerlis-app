import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
  type FirestoreError,
} from 'firebase/firestore'
import { uid } from '../ids'
import type { CalendarEvent, HomeSettings, Recipe, ShoppingItem, SyncState } from '../types'
import type { DataStore } from './types'
import type { FirebaseConfig } from './config'

let app: FirebaseApp | null = null
let db: Firestore | null = null

/** En Firestore un campo `undefined` se ignora; para borrarlo hay que usar deleteField(). */
function toUpdate(patch: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v === undefined ? deleteField() : v]))
}

function init(config: FirebaseConfig) {
  if (!app) {
    app = initializeApp(config)
    db = initializeFirestore(app, {
      // Caché persistente: la lista funciona sin cobertura en el súper y
      // sincroniza en cuanto vuelve la conexión.
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    })
  }
  return { app: app!, db: db! }
}

/** App de Firebase ya inicializada (la usa también el módulo de IA). */
export function firebaseApp(config: FirebaseConfig): FirebaseApp {
  return init(config).app
}

// ---------- Autenticación ----------

export function watchUser(config: FirebaseConfig, cb: (user: User | null) => void) {
  return onAuthStateChanged(getAuth(init(config).app), cb)
}

/**
 * Inicio de sesión con Google. Se llama directamente desde el toque del
 * usuario para que Safari no bloquee la ventana emergente.
 */
export async function signInWithGoogle(config: FirebaseConfig) {
  const auth = getAuth(init(config).app)
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(auth, provider)
  } catch (e) {
    const code = (e as { code?: string }).code
    // Si el navegador no permite ventanas emergentes, probamos con redirección.
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider)
      return
    }
    throw e
  }
}

export function signOutUser(config: FirebaseConfig) {
  return signOut(getAuth(init(config).app))
}

// ---------- Datos ----------

/**
 * Lista y recetas compartidas. El acceso lo controlan las reglas de
 * Firestore: solo las cuentas de Google permitidas pueden leer o escribir.
 */
export function createFirebaseStore(config: FirebaseConfig): DataStore {
  const { db } = init(config)
  const itemsCol = collection(db, 'items')
  const recipesCol = collection(db, 'recipes')
  const photosCol = collection(db, 'photos')
  const eventsCol = collection(db, 'events')
  // Un único documento con la personalización compartida de Inicio.
  const homeDoc = doc(db, 'settings', 'home')

  const syncListeners = new Set<(s: SyncState) => void>()
  let sync: SyncState = navigator.onLine ? 'connecting' : 'offline'
  const setSync = (s: SyncState) => {
    // "Sin acceso" es definitivo para esta sesión.
    if (s === sync || sync === 'denied') return
    sync = s
    syncListeners.forEach((cb) => cb(s))
  }
  const onOnline = () => setSync('connecting')
  const onOffline = () => setSync('offline')
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  const trackMeta = (fromCache: boolean) => {
    if (!navigator.onLine) setSync('offline')
    else setSync(fromCache ? 'connecting' : 'online')
  }
  const onError = (e: FirestoreError) => {
    console.error(e)
    setSync(e.code === 'permission-denied' ? 'denied' : 'error')
  }

  /**
   * Escucha opcional: si falla (p. ej. reglas aún sin publicar para una
   * colección nueva) la app sigue funcionando y se reintenta cada poco.
   */
  const listenOptional = (label: string, subscribe: (onFail: (e: FirestoreError) => void) => () => void) => {
    let off: (() => void) | null = null
    let retry: number | undefined
    let closed = false
    const listen = () => {
      off = subscribe((e) => {
        console.warn(label, e)
        if (!closed) retry = window.setTimeout(listen, 15_000)
      })
    }
    listen()
    return () => {
      closed = true
      window.clearTimeout(retry)
      off?.()
    }
  }

  return {
    kind: 'firebase',

    subscribeItems(cb) {
      return onSnapshot(
        itemsCol,
        { includeMetadataChanges: true },
        (snap) => {
          trackMeta(snap.metadata.fromCache)
          cb(snap.docs.map((d) => ({ ...(d.data() as Omit<ShoppingItem, 'id'>), id: d.id })))
        },
        onError,
      )
    },
    async addItems(items) {
      const batch = writeBatch(db)
      const now = Date.now()
      items.forEach((it, i) => {
        batch.set(doc(itemsCol, uid()), { checked: false, ...it, createdAt: now + i })
      })
      await batch.commit()
    },
    async updateItem(id, patch) {
      await updateDoc(doc(itemsCol, id), toUpdate(patch))
    },
    async deleteItems(ids) {
      const batch = writeBatch(db)
      ids.forEach((id) => batch.delete(doc(itemsCol, id)))
      await batch.commit()
    },
    async restoreItems(items) {
      const batch = writeBatch(db)
      items.forEach(({ id, ...data }) => batch.set(doc(itemsCol, id), data))
      await batch.commit()
    },

    subscribeRecipes(cb) {
      return onSnapshot(
        recipesCol,
        (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as Omit<Recipe, 'id'>), id: d.id }))),
        onError,
      )
    },
    async createRecipe(draft) {
      const id = uid()
      const now = Date.now()
      await setDoc(doc(recipesCol, id), { ...draft, createdAt: now, updatedAt: now })
      return id
    },
    async updateRecipe(id, patch) {
      await updateDoc(doc(recipesCol, id), toUpdate({ ...patch, updatedAt: Date.now() }))
    },
    async deleteRecipe(id) {
      await deleteDoc(doc(recipesCol, id))
    },

    subscribeEvents(cb) {
      return listenOptional('events', (onFail) =>
        onSnapshot(eventsCol, (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as Omit<CalendarEvent, 'id'>), id: d.id }))), onFail),
      )
    },
    async createEvent(draft) {
      const id = uid()
      const now = Date.now()
      await setDoc(doc(eventsCol, id), { ...draft, createdAt: now, updatedAt: now })
      return id
    },
    async updateEvent(id, patch) {
      await updateDoc(doc(eventsCol, id), toUpdate({ ...patch, updatedAt: Date.now() }))
    },
    async deleteEvent(id) {
      await deleteDoc(doc(eventsCol, id))
    },

    subscribeHome(cb) {
      return listenOptional('settings/home', (onFail) =>
        onSnapshot(homeDoc, (snap) => cb((snap.data() as HomeSettings | undefined) ?? {}), onFail),
      )
    },
    async updateHome(patch) {
      await setDoc(homeDoc, toUpdate(patch), { merge: true })
    },

    async savePhoto(dataUrl) {
      const id = uid()
      await setDoc(doc(photosCol, id), { data: dataUrl, createdAt: Date.now() })
      return id
    },
    async getPhoto(id) {
      const snap = await getDoc(doc(photosCol, id))
      return snap.exists() ? (snap.data().data as string) : null
    },
    async deletePhoto(id) {
      await deleteDoc(doc(photosCol, id))
    },
    async listPhotoIds() {
      // Descarga las fotos completas: solo se usa al limpiar a mano desde Ajustes.
      const snap = await getDocs(photosCol)
      return snap.docs.map((d) => d.id)
    },

    subscribeSync(cb) {
      syncListeners.add(cb)
      cb(sync)
      return () => syncListeners.delete(cb)
    },
    dispose() {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      syncListeners.clear()
    },
  }
}
