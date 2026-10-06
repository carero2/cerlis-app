import { useId, type MouseEvent } from 'react'
import { BLACK, EMPTY, PASS, WHITE, starPoints, type Board, type Cell } from '../lib/go'

interface Props {
  size: number
  board: Board
  lastMove?: number | null
  /** Piedra "fantasma" de la jugada que se está preparando. */
  ghost?: { idx: number; color: Cell } | null
  /** Dueño de cada punto en el recuento (se pinta un cuadradito). */
  territory?: Cell[]
  dead?: Set<number>
  /** Marcas numeradas o con letra (para los ejemplos de las reglas). */
  labels?: Record<number, string>
  onTap?: (idx: number) => void
  className?: string
}

const CELL = 10

/** Tablero de Go en SVG: se adapta al ancho disponible. */
export function GoBoard({ size, board, lastMove, ghost, territory, dead, labels, onTap, className }: Props) {
  const id = useId().replace(/:/g, '')
  const pad = CELL * 0.75
  const span = (size - 1) * CELL
  const view = span + pad * 2
  const pos = (i: number) => ({
    x: pad + (i % size) * CELL,
    y: pad + Math.floor(i / size) * CELL,
  })
  const r = CELL * 0.47

  const handleClick = (e: MouseEvent<SVGSVGElement>) => {
    if (!onTap) return
    const rect = e.currentTarget.getBoundingClientRect()
    const scale = view / rect.width
    const x = Math.round(((e.clientX - rect.left) * scale - pad) / CELL)
    const y = Math.round(((e.clientY - rect.top) * scale - pad) / CELL)
    if (x < 0 || y < 0 || x >= size || y >= size) return
    onTap(y * size + x)
  }

  const lines = []
  for (let i = 0; i < size; i++) {
    const p = pad + i * CELL
    lines.push(<line key={`h${i}`} x1={pad} y1={p} x2={pad + span} y2={p} />)
    lines.push(<line key={`v${i}`} x1={p} y1={pad} x2={p} y2={pad + span} />)
  }

  return (
    <svg
      className={`go-board ${onTap ? 'is-interactive' : ''} ${className ?? ''}`}
      viewBox={`0 0 ${view} ${view}`}
      onClick={handleClick}
      role={onTap ? 'grid' : 'img'}
      aria-label={`Tablero de Go de ${size} por ${size}`}
    >
      <defs>
        <radialGradient id={`b${id}`} cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#5a5f66" />
          <stop offset="1" stopColor="#0d0f12" />
        </radialGradient>
        <radialGradient id={`w${id}`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d5d2c8" />
        </radialGradient>
      </defs>
      <rect className="go-wood" x="0" y="0" width={view} height={view} rx={CELL * 0.4} />
      <g className="go-lines">{lines}</g>
      {starPoints(size).map((i) => {
        const p = pos(i)
        return <circle key={`s${i}`} className="go-star" cx={p.x} cy={p.y} r={CELL * 0.1} />
      })}

      {territory?.map((owner, i) => {
        if (owner === EMPTY || (board[i] !== EMPTY && !dead?.has(i))) return null
        const p = pos(i)
        const s = CELL * 0.32
        return (
          <rect
            key={`t${i}`}
            x={p.x - s / 2}
            y={p.y - s / 2}
            width={s}
            height={s}
            className={owner === BLACK ? 'go-terr-black' : 'go-terr-white'}
          />
        )
      })}

      {board.map((c, i) => {
        if (c === EMPTY) return null
        const p = pos(i)
        return (
          <g key={i} className={dead?.has(i) ? 'go-dead' : undefined}>
            <circle cx={p.x + 0.4} cy={p.y + 0.6} r={r} className="go-shadow" />
            <circle
              cx={p.x}
              cy={p.y}
              r={r}
              fill={`url(#${c === BLACK ? 'b' : 'w'}${id})`}
              className={c === WHITE ? 'go-white' : undefined}
            />
          </g>
        )
      })}

      {ghost &&
        board[ghost.idx] === EMPTY &&
        (() => {
          const p = pos(ghost.idx)
          return (
            <circle
              cx={p.x}
              cy={p.y}
              r={r}
              fill={`url(#${ghost.color === BLACK ? 'b' : 'w'}${id})`}
              className="go-ghost"
            />
          )
        })()}

      {lastMove != null &&
        lastMove !== PASS &&
        board[lastMove] !== EMPTY &&
        (() => {
          const p = pos(lastMove)
          return (
            <circle
              cx={p.x}
              cy={p.y}
              r={r * 0.4}
              className={board[lastMove] === BLACK ? 'go-last-on-black' : 'go-last-on-white'}
            />
          )
        })()}

      {labels &&
        Object.entries(labels).map(([i, text]) => {
          const p = pos(Number(i))
          const onStone = board[Number(i)]
          return (
            <g key={`l${i}`}>
              {!onStone && <circle cx={p.x} cy={p.y} r={CELL * 0.32} className="go-label-bg" />}
              <text
                x={p.x}
                y={p.y}
                className={`go-label ${onStone === BLACK ? 'on-black' : onStone === WHITE ? 'on-white' : 'on-empty'}`}
              >
                {text}
              </text>
            </g>
          )
        })}
    </svg>
  )
}
