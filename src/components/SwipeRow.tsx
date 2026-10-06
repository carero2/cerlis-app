import { useRef, useState, type ReactNode, type PointerEvent } from 'react'
import { Icon } from './Icon'

interface Props {
  children: ReactNode
  onDelete: () => void
  onEdit?: () => void
}

const ACTION_WIDTH = 72

/**
 * Fila con gesto de deslizar a la izquierda para mostrar acciones.
 * Un deslizamiento largo borra directamente (con "Deshacer" en el aviso).
 */
export function SwipeRow({ children, onDelete, onEdit }: Props) {
  const actions = onEdit ? 2 : 1
  const openX = -ACTION_WIDTH * actions
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [removing, setRemoving] = useState(false)
  const start = useRef<{ x: number; y: number; base: number; locked: 'h' | 'v' | null } | null>(null)
  const moved = useRef(false)

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    start.current = { x: e.clientX, y: e.clientY, base: x, locked: null }
    moved.current = false
  }

  const onPointerMove = (e: PointerEvent) => {
    const s = start.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (!s.locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      s.locked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      if (s.locked === 'h') {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        setDragging(true)
      }
    }
    if (s.locked !== 'h') return
    moved.current = true
    const next = Math.min(0, s.base + dx)
    // Resistencia elástica más allá de las acciones.
    setX(next < openX ? openX + (next - openX) * 0.6 : next)
  }

  const onPointerUp = () => {
    const s = start.current
    start.current = null
    if (!s || s.locked !== 'h') return
    setDragging(false)
    const width = (rowRef.current?.offsetWidth ?? 320) * 0.55
    if (x < -width) {
      setRemoving(true)
      setX(-(rowRef.current?.offsetWidth ?? 400))
      window.setTimeout(onDelete, 180)
    } else if (x < openX / 2) {
      setX(openX)
    } else {
      setX(0)
    }
  }

  const rowRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={rowRef} className={`swipe-row ${removing ? 'is-removing' : ''}`}>
      <div className="swipe-actions" style={{ width: Math.max(-x, 0) }}>
        {onEdit && (
          <button
            className="swipe-action swipe-edit"
            onClick={() => {
              setX(0)
              onEdit()
            }}
            aria-label="Editar"
          >
            <Icon name="edit" size={20} />
          </button>
        )}
        <button className="swipe-action swipe-delete" onClick={onDelete} aria-label="Eliminar">
          <Icon name="trash" size={20} />
        </button>
      </div>
      <div
        className="swipe-content"
        style={{ transform: `translateX(${x}px)`, transition: dragging ? 'none' : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          // Evita que un gesto o un toque con la fila abierta active la fila.
          if (moved.current || x !== 0) {
            e.stopPropagation()
            e.preventDefault()
            if (!moved.current) setX(0)
            moved.current = false
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}
