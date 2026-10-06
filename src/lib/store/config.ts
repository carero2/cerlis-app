export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket?: string
  messagingSenderId?: string
  appId: string
}

const env = import.meta.env

export const firebaseConfig: FirebaseConfig | null =
  env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID
    ? {
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
        appId: env.VITE_FIREBASE_APP_ID,
      }
    : null

export const cloudEnabled = firebaseConfig !== null
