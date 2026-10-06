import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Shell, useThemeEffect } from './App'
import { ToastProvider } from './components/Toast'
import { AuthProvider } from './lib/auth'
import './styles.css'

function Root() {
  useThemeEffect()
  return (
    <AuthProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(console.error)
  })
}
