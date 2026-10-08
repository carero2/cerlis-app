export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket?: string
  messagingSenderId?: string
  appId: string
  /** Clave de sitio de reCAPTCHA para App Check (opcional, es pública). */
  appCheckKey?: string
  /** Tipo de clave: Fraud Defense / reCAPTCHA Enterprise (por defecto) o reCAPTCHA v3 clásico. */
  appCheckProvider?: 'v3' | 'enterprise'
}

const env = import.meta.env

/** La configuración con la que se publica la app (.env.production). */
export const builtInConfig: FirebaseConfig | null =
  env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID
    ? {
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
        appId: env.VITE_FIREBASE_APP_ID,
        appCheckKey: env.VITE_APPCHECK_SITE_KEY || undefined,
        appCheckProvider: env.VITE_APPCHECK_PROVIDER === 'v3' ? 'v3' : 'enterprise',
      }
    : null

const CUSTOM_KEY = 'cerlis:firebase-config'

function readCustom(): FirebaseConfig | null {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    const cfg = raw ? (JSON.parse(raw) as FirebaseConfig) : null
    return cfg?.apiKey && cfg.projectId && cfg.appId ? cfg : null
  } catch {
    return null
  }
}

/**
 * Firebase propio guardado en este móvil (otra pareja que usa la misma app
 * con sus propios datos). Nunca se sube al repositorio.
 */
export const customConfig = readCustom()

export const firebaseConfig: FirebaseConfig | null = customConfig ?? builtInConfig

export const cloudEnabled = firebaseConfig !== null

/** Guarda (o quita, con null) el Firebase propio y recarga la app. */
export function setCustomConfig(cfg: FirebaseConfig | null) {
  try {
    if (cfg) localStorage.setItem(CUSTOM_KEY, JSON.stringify(cfg))
    else localStorage.removeItem(CUSTOM_KEY)
  } catch {
    /* sin almacenamiento no se puede cambiar */
  }
  location.reload()
}

/**
 * Lee la configuración tal cual la copia Firebase: el bloque
 * `const firebaseConfig = { apiKey: "…", … }`, un JSON o líneas VITE_…=….
 */
export function parseFirebaseConfig(text: string): FirebaseConfig | null {
  const pick = (name: string, envName: string) => {
    const js = new RegExp(`["']?${name}["']?\\s*:\\s*["'\`]([^"'\`]+)["'\`]`).exec(text)
    const dotenv = new RegExp(`${envName}\\s*=\\s*["']?([^\\s"']+)`).exec(text)
    return (js?.[1] ?? dotenv?.[1])?.trim()
  }
  const apiKey = pick('apiKey', 'VITE_FIREBASE_API_KEY')
  const projectId = pick('projectId', 'VITE_FIREBASE_PROJECT_ID')
  const appId = pick('appId', 'VITE_FIREBASE_APP_ID')
  if (!apiKey || !projectId || !appId) return null
  return {
    apiKey,
    authDomain: pick('authDomain', 'VITE_FIREBASE_AUTH_DOMAIN') || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: pick('storageBucket', 'VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: pick('messagingSenderId', 'VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId,
  }
}
