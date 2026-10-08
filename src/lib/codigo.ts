/**
 * Motor del juego cooperativo al estilo Código Secreto Dúo: 25 palabras,
 * cada uno ve su tarjeta clave (agentes, neutrales y asesinos) y da
 * pistas para que el otro encuentre sus agentes. Ganáis al encontrar los
 * 15 agentes antes de que se acaben los turnos.
 */
import { normalize } from './categories'
import { CODIGO_WORDS } from './codigoWords'
import { shuffle } from './jaipur'
import type { CodigoGame } from './types'

export const AGENTS = 15
export const TURNS = 9

/**
 * Reparto de las dos claves, como en el juego original: cada lado tiene 9
 * agentes y 3 asesinos; 3 agentes son comunes y un asesino también.
 * Cada par es [clave de A, clave de B].
 */
const LAYOUT: [string, number][] = [
  ['gg', 3],
  ['ga', 1],
  ['gn', 5],
  ['ag', 1],
  ['ng', 5],
  ['aa', 1],
  ['an', 1],
  ['na', 1],
  ['nn', 7],
]

export function newGame(id: string, players: [string, string]): CodigoGame {
  const words = shuffle(CODIGO_WORDS).slice(0, 25)
  const cells = shuffle(LAYOUT.flatMap(([pair, n]) => new Array<string>(n).fill(pair)))
  const [a, b] = players
  const now = Date.now()
  return {
    id,
    words,
    players,
    keys: { [a]: cells.map((c) => c[0]).join(''), [b]: cells.map((c) => c[1]).join('') },
    found: [],
    neutral: { [a]: [], [b]: [] },
    timer: TURNS,
    phase: 'clue',
    giver: players[Math.floor(Math.random() * 2)],
    guesses: 0,
    history: [],
    createdAt: now,
    updatedAt: now,
  }
}

export const partnerOf = (game: Pick<CodigoGame, 'players'>, uid: string) =>
  game.players[0] === uid ? game.players[1] : game.players[0]

/** Agentes de una clave que aún no se han encontrado. */
export function remaining(game: CodigoGame, keyOf: string): number[] {
  const key = game.keys[keyOf]
  const found = new Set(game.found)
  return [...key].flatMap((c, i) => (c === 'g' && !found.has(i) ? [i] : []))
}

export type CodigoResult = { game: CodigoGame } | { error: string }

const clone = (g: CodigoGame): CodigoGame => JSON.parse(JSON.stringify(g)) as CodigoGame

export function giveClue(game: CodigoGame, uid: string, word: string, n: number): CodigoResult {
  if (game.phase !== 'clue' || game.giver !== uid) return { error: 'Ahora no te toca dar pista.' }
  const clean = word.trim().replace(/\s+/g, ' ')
  if (!clean) return { error: 'Escribe una palabra.' }
  if (clean.includes(' ')) return { error: 'La pista tiene que ser una sola palabra.' }
  const found = new Set(game.found)
  const key = normalize(clean)
  if (game.words.some((w, i) => !found.has(i) && normalize(w) === key)) return { error: 'No vale usar una palabra del tablero.' }
  const g = clone(game)
  g.clue = { word: clean, n }
  g.phase = 'guess'
  g.guesses = 0
  g.history.push({ giver: uid, word: clean, n, results: '' })
  return { game: g }
}

/** ¿Se puede tocar esta palabra con la pista actual? */
export function canGuess(game: CodigoGame, idx: number): boolean {
  if (game.found.includes(idx)) return false
  // Ya se sabe que es neutral para la clave de quien da la pista.
  if (game.phase === 'guess') return !game.neutral[game.giver].includes(idx)
  return true
}

function endTurn(g: CodigoGame) {
  g.timer -= 1
  g.clue = undefined
  g.guesses = 0
  if (g.found.length >= AGENTS) {
    g.phase = 'won'
    return
  }
  if (g.timer <= 0) {
    g.phase = 'sudden'
    return
  }
  // Se alterna quién da la pista, salvo que alguien ya no tenga agentes por señalar.
  const next = partnerOf(g, g.giver)
  if (remaining(g, next).length) g.giver = next
  g.phase = 'clue'
}

/** Tocar una palabra: se mira en la clave de quien dio la pista. */
export function guess(game: CodigoGame, uid: string, idx: number): CodigoResult {
  if (game.phase === 'sudden') return suddenGuess(game, uid, idx)
  if (game.phase !== 'guess' || game.giver === uid) return { error: 'Ahora no te toca adivinar.' }
  if (!canGuess(game, idx)) return { error: 'Esa palabra ya está descubierta.' }
  const g = clone(game)
  const kind = g.keys[g.giver][idx]
  const last = g.history[g.history.length - 1]
  last.results += kind
  g.guesses += 1
  if (kind === 'a') {
    g.phase = 'lost'
    g.lostAt = idx
  } else if (kind === 'n') {
    g.neutral[g.giver].push(idx)
    endTurn(g)
  } else {
    g.found.push(idx)
    if (g.found.length >= AGENTS) g.phase = 'won'
    // Si ya no quedan agentes en esa clave, el turno termina solo.
    else if (!remaining(g, g.giver).length) endTurn(g)
  }
  return { game: g }
}

/** Terminar el turno voluntariamente (tras al menos un intento). */
export function stop(game: CodigoGame, uid: string): CodigoResult {
  if (game.phase !== 'guess' || game.giver === uid) return { error: 'Ahora no te toca.' }
  if (game.guesses < 1) return { error: 'Hay que intentar al menos una palabra.' }
  const g = clone(game)
  endTurn(g)
  return { game: g }
}

/** Muerte súbita: sin pistas, cada uno busca agentes de la clave del otro. Un fallo y se pierde. */
function suddenGuess(game: CodigoGame, uid: string, idx: number): CodigoResult {
  if (game.found.includes(idx)) return { error: 'Esa palabra ya está descubierta.' }
  const g = clone(game)
  const owner = partnerOf(g, uid)
  if (g.keys[owner][idx] === 'g') {
    g.found.push(idx)
    if (g.found.length >= AGENTS) g.phase = 'won'
  } else {
    g.phase = 'lost'
    g.lostAt = idx
  }
  return { game: g }
}

/** Abandonar la partida (cuenta como perdida). */
export function giveUp(game: CodigoGame): CodigoGame {
  return { ...game, phase: 'lost', clue: undefined }
}
