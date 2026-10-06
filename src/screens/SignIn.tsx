import { useState, type ReactNode } from 'react'
import { useAuth, useUser } from '../lib/auth'

const AUTH_ERRORS: Record<string, string> = {
  'auth/popup-closed-by-user': 'Se cerró la ventana antes de terminar. Inténtalo otra vez.',
  'auth/cancelled-popup-request': 'Se cerró la ventana antes de terminar. Inténtalo otra vez.',
  'auth/network-request-failed': 'No hay conexión. Comprueba tu internet e inténtalo de nuevo.',
  'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).',
  'auth/operation-not-allowed': 'El inicio de sesión con Google no está activado en Firebase.',
}

function WelcomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="welcome">
      <div className="welcome-art" aria-hidden>
        <span className="float f1">🥑</span>
        <span className="float f2">🍋</span>
        <span className="float f3">🥖</span>
        <span className="float f4">🍅</span>
        <span className="float f5">🧀</span>
        <div className="welcome-logo">
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={84} height={84} />
        </div>
      </div>
      <div className="welcome-card">{children}</div>
    </div>
  )
}

/** Pantalla de entrada cuando la sincronización está activada. */
export function SignIn() {
  const { signIn } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setBusy(true)
    setError(null)
    try {
      await signIn()
    } catch (e) {
      console.error(e)
      const code = (e as { code?: string }).code ?? ''
      setError(AUTH_ERRORS[code] ?? 'No se ha podido iniciar sesión. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <WelcomeLayout>
      <h1>Hola 👋</h1>
      <p className="muted">
        Cerlis es vuestra lista de la compra y recetario compartido. Lo que añada uno aparece al momento en el móvil
        del otro.
      </p>
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-block btn-google" onClick={() => void start()} disabled={busy}>
        <GoogleLogo />
        {busy ? 'Abriendo Google…' : 'Continuar con Google'}
      </button>
      <p className="muted small center">Solo las cuentas autorizadas pueden ver vuestros datos.</p>
    </WelcomeLayout>
  )
}

/** La cuenta ha iniciado sesión pero no está en la lista de permitidas. */
export function NoAccess() {
  const { signOut } = useAuth()
  const user = useUser()
  return (
    <WelcomeLayout>
      <h1>Sin acceso 🔒</h1>
      <p className="muted">
        La cuenta <strong>{user?.email}</strong> no está autorizada para usar este Cerlis. Entra con la cuenta que
        está en la lista de permitidas.
      </p>
      <button className="btn btn-primary btn-block" onClick={() => void signOut()}>
        Usar otra cuenta
      </button>
    </WelcomeLayout>
  )
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
