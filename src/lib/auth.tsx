import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { getPrefs, setPrefs } from './prefs'
import { cloudEnabled, firebaseConfig } from './store/config'

export interface AppUser {
  uid: string
  email: string | null
  name: string | null
  photoURL: string | null
}

export type AuthState =
  /** Sin Firebase configurado: no hay cuentas, todo es local. */
  | { status: 'local' }
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: AppUser }

interface AuthContextValue {
  state: AuthState
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fuera de <AuthProvider>')
  return ctx
}

export function useUser(): AppUser | null {
  const { state } = useAuth()
  return state.status === 'signed-in' ? state.user : null
}

type FirebaseModule = typeof import('./store/firebase')

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(cloudEnabled ? { status: 'loading' } : { status: 'local' })
  // Guardamos el módulo ya cargado para poder abrir la ventana de Google
  // sin esperas dentro del toque (si no, Safari la bloquea).
  const fb = useRef<FirebaseModule | null>(null)

  useEffect(() => {
    if (!cloudEnabled) return
    let off: (() => void) | undefined
    let cancelled = false
    import('./store/firebase').then((mod) => {
      if (cancelled) return
      fb.current = mod
      off = mod.watchUser(firebaseConfig!, (u) => {
        if (!u) return setState({ status: 'signed-out' })
        // Primer inicio de sesión: usamos el nombre de pila de Google.
        if (!getPrefs().name && u.displayName) setPrefs({ name: u.displayName.split(' ')[0] })
        setState({
          status: 'signed-in',
          user: { uid: u.uid, email: u.email, name: u.displayName, photoURL: u.photoURL },
        })
      })
    })
    return () => {
      cancelled = true
      off?.()
    }
  }, [])

  const signIn = useCallback(async () => {
    const mod = fb.current ?? (await import('./store/firebase'))
    await mod.signInWithGoogle(firebaseConfig!)
  }, [])

  const signOut = useCallback(async () => {
    const mod = fb.current ?? (await import('./store/firebase'))
    await mod.signOutUser(firebaseConfig!)
  }, [])

  return <AuthContext.Provider value={{ state, signIn, signOut }}>{children}</AuthContext.Provider>
}
