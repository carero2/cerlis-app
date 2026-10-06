import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInAnonymously, type User } from 'firebase/auth'
import {
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { householdCode, normalizeCode, uid } from '../ids'
import type { Household, Recipe, ShoppingItem, SyncState } from '../types'
import type { DataStore, HouseholdService } from './types'
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

/** Sesión anónima persistente. Más adelante se podrá vincular a Google. */
export async function ensureUser(config: FirebaseConfig): Promise<User> {
  const { app } = init(config)
  const auth = getAuth(app)
  await auth.authStateReady()
  if (auth.currentUser) return auth.currentUser
  const cred = await signInAnonymously(auth)
  return cred.user
}

export function createHouseholdService(config: FirebaseConfig): HouseholdService {
  const { db } = init(config)

  async function get(code: string): Promise<Household | null> {
    const snap = await getDoc(doc(db, 'households', normalizeCode(code)))
    if (!snap.exists()) return null
    return { id: snap.id, name: (snap.data().name as string) ?? 'Nuestro hogar' }
  }

  return {
    get,
    async create(name) {
      const user = await ensureUser(config)
      const id = householdCode()
      await setDoc(doc(db, 'households', id), {
        name,
        members: [user.uid],
        createdAt: serverTimestamp(),
      })
      return { id, name }
    },
    async join(code) {
      const user = await ensureUser(config)
      const id = normalizeCode(code)
      const existing = await get(id)
      if (!existing) throw new Error('No existe ningún hogar con ese código.')
      await updateDoc(doc(db, 'households', id), { members: arrayUnion(user.uid) })
      return existing
    },
    async rename(code, name) {
      await updateDoc(doc(db, 'households', normalizeCode(code)), { name })
    },
  }
}

export function createFirebaseStore(config: FirebaseConfig, householdId: string): DataStore {
  const { db } = init(config)
  const itemsCol = collection(db, 'households', householdId, 'items')
  const recipesCol = collection(db, 'households', householdId, 'recipes')

  const syncListeners = new Set<(s: SyncState) => void>()
  let sync: SyncState = navigator.onLine ? 'connecting' : 'offline'
  const setSync = (s: SyncState) => {
    if (s === sync) return
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
        () => setSync('error'),
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
        () => setSync('error'),
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
