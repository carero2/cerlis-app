import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Shell, useThemeEffect } from './App'
import { ToastProvider } from './components/Toast'
import { DataProvider, useNeedsHousehold } from './lib/data'
import './styles.css'

function Root() {
  useThemeEffect()
  const needsHousehold = useNeedsHousehold()
  return (
    <ToastProvider>
      {needsHousehold ? (
        <Shell />
      ) : (
        <DataProvider>
          <Shell />
        </DataProvider>
      )}
    </ToastProvider>
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
