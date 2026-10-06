/**
 * Motor del Go: colocar piedras, capturas, suicidio, ko y recuento por
 * área (piedras + territorio, como en las reglas chinas).
 */

export const EMPTY = 0
export const BLACK = 1
export const WHITE = 2
export type Color = typeof BLACK | typeof WHITE
export type Cell = typeof EMPTY | Color
export type Board = Cell[]

/** Jugada: índice de la intersección, o PASS. */
export const PASS = -1

export const opponent = (c: Color): Color => (c === BLACK ? WHITE : BLACK)

export function emptyBoard(size: number): Board {
  return new Array(size * size).fill(EMPTY)
}

export function neighbors(idx: number, size: number): number[] {
  const x = idx % size
  const y = Math.floor(idx / size)
  const out: number[] = []
  if (x > 0) out.push(idx - 1)
  if (x < size - 1) out.push(idx + 1)
  if (y > 0) out.push(idx - size)
  if (y < size - 1) out.push(idx + size)
  return out
}

/** Grupo de piedras conectadas y sus libertades (intersecciones vacías vecinas). */
export function groupAt(board: Board, size: number, idx: number): { stones: number[]; liberties: Set<number> } {
  const color = board[idx]
  const stones: number[] = []
  const liberties = new Set<number>()
  const seen = new Set([idx])
  const stack = [idx]
  while (stack.length) {
    const cur = stack.pop()!
    stones.push(cur)
    for (const n of neighbors(cur, size)) {
      if (board[n] === EMPTY) liberties.add(n)
      else if (board[n] === color && !seen.has(n)) {
        seen.add(n)
        stack.push(n)
      }
    }
  }
  return { stones, liberties }
}

export type IllegalReason = 'occupied' | 'suicide' | 'ko'

export const ILLEGAL_TEXT: Record<IllegalReason, string> = {
  occupied: 'Ese punto ya está ocupado.',
  suicide: 'No se puede: la piedra se quedaría sin libertades (suicidio).',
  ko: 'Ko: no puedes recapturar justo ahora. Juega en otro sitio primero.',
}

/**
 * Coloca una piedra. Devuelve el tablero resultante y cuántas piedras
 * captura, o el motivo por el que la jugada no es legal.
 * `koBoard` es la posición de hace dos jugadas (para la regla del ko).
 */
export function place(
  board: Board,
  size: number,
  idx: number,
  color: Color,
  koBoard?: Board,
): { board: Board; captured: number } | { illegal: IllegalReason } {
  if (board[idx] !== EMPTY) return { illegal: 'occupied' }
  const next = board.slice() as Board
  next[idx] = color
  let captured = 0
  for (const n of neighbors(idx, size)) {
    if (next[n] === opponent(color)) {
      const g = groupAt(next, size, n)
      if (g.liberties.size === 0) {
        for (const s of g.stones) next[s] = EMPTY
        captured += g.stones.length
      }
    }
  }
  if (groupAt(next, size, idx).liberties.size === 0) return { illegal: 'suicide' }
  if (koBoard && sameBoard(next, koBoard)) return { illegal: 'ko' }
  return { board: next, captured }
}

export function sameBoard(a: Board, b: Board): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export interface Position {
  board: Board
  /** Posición anterior a la última jugada (para el ko). */
  prevBoard: Board
  /** Piedras capturadas por cada color. */
  captures: Record<Color, number>
  /** A quién le toca. */
  turn: Color
  lastMove: number | null
  /** Pases seguidos al final de la partida. */
  passes: number
}

/** Reconstruye la partida a partir de la lista de jugadas. */
export function replay(size: number, moves: number[]): Position {
  let board = emptyBoard(size)
  let prevBoard = board
  const captures: Record<Color, number> = { [BLACK]: 0, [WHITE]: 0 } as Record<Color, number>
  let turn: Color = BLACK
  let passes = 0
  let lastMove: number | null = null
  for (const m of moves) {
    if (m === PASS) {
      passes++
      lastMove = PASS
    } else {
      const r = place(board, size, m, turn)
      if ('illegal' in r) continue // no debería ocurrir: se valida antes de guardar
      prevBoard = board
      board = r.board
      captures[turn] += r.captured
      passes = 0
      lastMove = m
    }
    turn = opponent(turn)
  }
  return { board, prevBoard, captures, turn, lastMove, passes }
}

export interface Score {
  black: number
  white: number
  /** Dueño de cada intersección vacía (o de las piedras muertas) para pintarlo. */
  territory: Cell[]
  winner: Color
  margin: number
}

/**
 * Recuento por área: piedras vivas + intersecciones vacías rodeadas solo
 * por un color. Las piedras marcadas como muertas se quitan antes.
 */
export function score(board: Board, size: number, dead: Set<number>, komi: number): Score {
  const b = board.map((c, i) => (dead.has(i) ? EMPTY : c)) as Board
  const territory: Cell[] = new Array(b.length).fill(EMPTY)
  const seen = new Set<number>()
  for (let i = 0; i < b.length; i++) {
    if (b[i] !== EMPTY || seen.has(i)) continue
    const region: number[] = []
    const borders = new Set<Cell>()
    const stack = [i]
    seen.add(i)
    while (stack.length) {
      const cur = stack.pop()!
      region.push(cur)
      for (const n of neighbors(cur, size)) {
        if (b[n] === EMPTY) {
          if (!seen.has(n)) {
            seen.add(n)
            stack.push(n)
          }
        } else borders.add(b[n])
      }
    }
    if (borders.size === 1) {
      const owner = [...borders][0]
      for (const r of region) territory[r] = owner
    }
  }
  let black = 0
  let white = komi
  for (let i = 0; i < b.length; i++) {
    const owner = b[i] !== EMPTY ? b[i] : territory[i]
    if (owner === BLACK) black++
    else if (owner === WHITE) white++
  }
  const winner: Color = black > white ? BLACK : WHITE
  return { black, white, territory, winner, margin: Math.abs(black - white) }
}

/** Puntos de referencia (hoshi) del tablero. */
export function starPoints(size: number): number[] {
  if (size < 9) return []
  const pts = size === 9 ? [2, 6] : size === 13 ? [3, 9] : [3, 9, 15]
  const out: number[] = []
  for (const y of pts) for (const x of pts) out.push(y * size + x)
  const c = (size - 1) / 2
  if (size !== 19) out.push(c * size + c)
  return out
}

export const KOMI: Record<number, number> = { 9: 7.5, 13: 7.5, 19: 7.5 }
