import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

interface ToastOptions {
  action?: { label: string; onClick: () => void }
  duration?: number
}

interface ToastState extends ToastOptions {
  id: number
  message: string
}

type ShowToast = (message: string, opts?: ToastOptions) => void

const ToastContext = createContext<ShowToast>(() => {})

export function useToast(): ShowToast {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback<ShowToast>((message, opts = {}) => {
    window.clearTimeout(timer.current)
    const id = Date.now()
    setToast({ id, message, ...opts })
    timer.current = window.setTimeout(
      () => setToast((t) => (t?.id === id ? null : t)),
      opts.duration ?? (opts.action ? 5000 : 2600),
    )
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.id}>
            <span>{toast.message}</span>
            {toast.action && (
              <button
                className="toast-action"
                onClick={() => {
                  toast.action!.onClick()
                  setToast(null)
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
