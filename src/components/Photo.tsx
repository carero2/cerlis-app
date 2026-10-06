import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { preparePhoto, type PendingPhoto } from '../lib/photos'
import { Icon } from './Icon'
import { useToast } from './Toast'

/**
 * Botón que abre la cámara o la fototeca del iPhone y devuelve la foto ya
 * comprimida. `children` es el contenido visible del botón.
 */
export function PhotoInput({
  onPhoto,
  children,
  className,
  label = 'Añadir foto',
}: {
  onPhoto: (photo: PendingPhoto) => void
  children: ReactNode
  className?: string
  label?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={label}
        aria-busy={busy}
      >
        {busy ? <span className="spinner spinner-small" /> : children}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setBusy(true)
          try {
            onPhoto(await preparePhoto(file))
          } catch (err) {
            console.error(err)
            toast('No se ha podido leer la foto')
          } finally {
            setBusy(false)
          }
        }}
      />
    </>
  )
}

/** Visor a pantalla completa. Se cierra con un toque. */
export function PhotoViewer({ src, alt, onClose }: { src: string | null | undefined; alt?: string; onClose: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!src) return setVisible(false)
    const raf = requestAnimationFrame(() => setVisible(true))
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [src, onClose])

  if (!src) return null
  return createPortal(
    <div className={`photo-viewer ${visible ? 'is-open' : ''}`} onClick={onClose} role="dialog" aria-label={alt ?? 'Foto'}>
      <img src={src} alt={alt ?? ''} />
      <button className="photo-viewer-close" aria-label="Cerrar">
        <Icon name="x" size={20} />
      </button>
    </div>,
    document.body,
  )
}
