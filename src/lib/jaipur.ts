/**
 * Motor del juego de comercio al estilo Jaipur: coger, cambiar y vender
 * mercancías; gana la ronda quien más rupias consigue y la partida quien
 * gana dos rondas.
 */
import type { JaipurCard, JaipurGame, JaipurGood, JaipurPlayer, JaipurRound, JaipurRoundResult } from './types'

export const GOODS: JaipurGood[] = ['diamond', 'gold', 'silver', 'cloth', 'spice', 'leather']

/** Las mercancías caras solo se venden de dos en dos como mínimo. */
export const PRECIOUS = new Set<JaipurGood>(['diamond', 'gold', 'silver'])

export const HAND_LIMIT = 7
export const MARKET_SIZE = 5
export const CAMEL_BONUS = 5

export const CARD_INFO: Record<JaipurCard, { name: string; plural: string; emoji: string }> = {
  diamond: { name: 'Diamante', plural: 'Diamantes', emoji: '💎' },
  gold: { name: 'Oro', plural: 'Oro', emoji: '🥇' },
  silver: { name: 'Plata', plural: 'Plata', emoji: '🥈' },
  cloth: { name: 'Tela', plural: 'Telas', emoji: '🧵' },
  spice: { name: 'Especia', plural: 'Especias', emoji: '🌶️' },
  leather: { name: 'Cuero', plural: 'Cueros', emoji: '👞' },
  camel: { name: 'Camello', plural: 'Camellos', emoji: '🐫' },
}

const TOKENS: Record<JaipurGood, number[]> = {
  diamond: [7, 7, 5, 5, 5],
  gold: [6, 6, 5, 5, 5],
  silver: [5, 5, 5, 5, 5],
  cloth: [5, 3, 3, 2, 2, 1, 1],
  spice: [5, 3, 3, 2, 2, 1, 1],
  leather: [4, 3, 2, 1, 1, 1, 1, 1, 1],
}

const BONUS = { b3: [1, 1, 2, 2, 2, 3, 3], b4: [4, 4, 5, 5, 6, 6], b5: [8, 8, 9, 10, 10] }

const DECK: [JaipurCard, number][] = [
  ['diamond', 6],
  ['gold', 6],
  ['silver', 6],
  ['cloth', 8],
  ['spice', 8],
  ['leather', 10],
  // 11 camellos: 3 empiezan en el mercado.
  ['camel', 8],
]

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function newRound(players: [string, string], starter: string): JaipurRound {
  const deck = shuffle(DECK.flatMap(([card, n]) => new Array<JaipurCard>(n).fill(card)))
  const market: JaipurCard[] = ['camel', 'camel', 'camel', deck.pop()!, deck.pop()!]
  const seats: Record<string, JaipurPlayer> = {}
  for (const p of players) {
    const cards = deck.splice(-5)
    seats[p] = {
      hand: cards.filter((c): c is JaipurGood => c !== 'camel'),
      herd: cards.filter((c) => c === 'camel').length,
      tokens: [],
      bonus: [],
    }
  }
  return {
    deck,
    market,
    players: seats,
    piles: Object.fromEntries(GOODS.map((g) => [g, TOKENS[g].slice()])) as Record<JaipurGood, number[]>,
    bonus: { b3: shuffle(BONUS.b3), b4: shuffle(BONUS.b4), b5: shuffle(BONUS.b5) },
    turn: starter,
  }
}

export function newGame(id: string, players: [string, string]): JaipurGame {
  const starter = players[Math.floor(Math.random() * 2)]
  const now = Date.now()
  return {
    id,
    players,
    seals: { [players[0]]: 0, [players[1]]: 0 },
    roundNo: 1,
    round: newRound(players, starter),
    status: 'playing',
    createdAt: now,
    updatedAt: now,
  }
}

export const other = (game: Pick<JaipurGame, 'players'>, uid: string) =>
  game.players[0] === uid ? game.players[1] : game.players[0]

const clone = (r: JaipurRound): JaipurRound => JSON.parse(JSON.stringify(r)) as JaipurRound

const count = (n: number, card: JaipurCard) =>
  `${n} ${n === 1 ? CARD_INFO[card].name.toLowerCase() : CARD_INFO[card].plural.toLowerCase()}`

/** Resultado de una jugada: la ronda nueva y una frase para el rival. */
export type MoveResult = { round: JaipurRound; text: string; ended: boolean } | { error: string }

/** Rellena el mercado. Si se acaba el mazo y no se puede, la ronda termina. */
function refill(r: JaipurRound): boolean {
  while (r.market.length < MARKET_SIZE && r.deck.length) r.market.push(r.deck.pop()!)
  return r.market.length < MARKET_SIZE
}

function finishMove(r: JaipurRound, uid: string, players: [string, string], text: string, deckOut: boolean): MoveResult {
  const emptyPiles = GOODS.filter((g) => r.piles[g].length === 0).length
  r.turn = players[0] === uid ? players[1] : players[0]
  return { round: r, text, ended: deckOut || emptyPiles >= 3 }
}

/** Coger una mercancía del mercado. */
export function take(round: JaipurRound, uid: string, players: [string, string], idx: number): MoveResult {
  const card = round.market[idx]
  if (!card) return { error: 'Esa carta ya no está.' }
  if (card === 'camel') return takeCamels(round, uid, players)
  const me = round.players[uid]
  if (me.hand.length >= HAND_LIMIT) return { error: `Ya tienes ${HAND_LIMIT} cartas en la mano: vende o cambia antes.` }
  const r = clone(round)
  r.market.splice(idx, 1)
  r.players[uid].hand.push(card)
  const deckOut = refill(r)
  return finishMove(r, uid, players, `ha cogido ${CARD_INFO[card].emoji} ${CARD_INFO[card].name.toLowerCase()}`, deckOut)
}

/** Llevarse todos los camellos del mercado al corral. */
export function takeCamels(round: JaipurRound, uid: string, players: [string, string]): MoveResult {
  const n = round.market.filter((c) => c === 'camel').length
  if (!n) return { error: 'No hay camellos en el mercado.' }
  const r = clone(round)
  r.market = r.market.filter((c) => c !== 'camel')
  r.players[uid].herd += n
  const deckOut = refill(r)
  return finishMove(r, uid, players, `se ha llevado ${count(n, 'camel')} 🐫`, deckOut)
}

/** Validación del cambio: devuelve el motivo si no se puede. */
export function exchangeError(round: JaipurRound, uid: string, marketIdx: number[], handIdx: number[], camels: number): string | null {
  const me = round.players[uid]
  const takeCards = marketIdx.map((i) => round.market[i])
  if (takeCards.length < 2) return 'Para cambiar hay que coger al menos 2 cartas del mercado.'
  if (takeCards.some((c) => c === 'camel')) return 'Los camellos del mercado no se cogen en un cambio: se cogen todos juntos.'
  const give = handIdx.length + camels
  if (give !== takeCards.length) {
    return `Coges ${takeCards.length}: elige ${takeCards.length} cartas tuyas o camellos para dar (llevas ${give}).`
  }
  if (camels > me.herd) return 'No tienes tantos camellos.'
  const given = new Set(handIdx.map((i) => me.hand[i]))
  if (takeCards.some((c) => given.has(c as JaipurGood))) return 'No se puede dar y coger el mismo tipo de mercancía.'
  if (me.hand.length - handIdx.length + takeCards.length > HAND_LIMIT) return `Te quedarías con más de ${HAND_LIMIT} cartas en la mano.`
  return null
}

/** Cambiar varias cartas del mercado por cartas de la mano y/o camellos. */
export function exchange(
  round: JaipurRound,
  uid: string,
  players: [string, string],
  marketIdx: number[],
  handIdx: number[],
  camels: number,
): MoveResult {
  const err = exchangeError(round, uid, marketIdx, handIdx, camels)
  if (err) return { error: err }
  const r = clone(round)
  const me = r.players[uid]
  const taken = marketIdx.map((i) => r.market[i] as JaipurGood)
  const given: JaipurCard[] = [...handIdx.map((i) => me.hand[i]), ...new Array<JaipurCard>(camels).fill('camel')]
  // Las cartas dadas ocupan los huecos de las cogidas.
  marketIdx.forEach((mi, k) => (r.market[mi] = given[k]))
  const drop = new Set(handIdx)
  me.hand = me.hand.filter((_, i) => !drop.has(i)).concat(taken)
  me.herd -= camels
  const emojis = (cards: JaipurCard[]) => cards.map((c) => CARD_INFO[c].emoji).join('')
  return finishMove(r, uid, players, `ha cambiado ${emojis(given)} por ${emojis(taken)}`, false)
}

export function sellError(round: JaipurRound, uid: string, good: JaipurGood, n: number): string | null {
  const have = round.players[uid].hand.filter((c) => c === good).length
  if (n < 1 || n > have) return 'No tienes esas cartas.'
  if (PRECIOUS.has(good) && n < 2) return `Las cartas de ${CARD_INFO[good].name.toLowerCase()} se venden de dos en dos como mínimo.`
  return null
}

/** Vender cartas de un tipo: fichas de esa mercancía y, desde 3, una de bonus. */
export function sell(round: JaipurRound, uid: string, players: [string, string], good: JaipurGood, n: number): MoveResult {
  const err = sellError(round, uid, good, n)
  if (err) return { error: err }
  const r = clone(round)
  const me = r.players[uid]
  let removed = 0
  me.hand = me.hand.filter((c) => (c === good && removed < n ? (removed++, false) : true))
  const won = r.piles[good].splice(0, n)
  me.tokens.push(...won)
  const pile = n >= 5 ? r.bonus.b5 : n === 4 ? r.bonus.b4 : n === 3 ? r.bonus.b3 : null
  const bonus = pile?.pop()
  if (bonus !== undefined) me.bonus.push(bonus)
  const rupees = won.reduce((a, b) => a + b, 0)
  const text = `ha vendido ${count(n, good)} ${CARD_INFO[good].emoji} por ${rupees} rupias${bonus !== undefined ? ' + bonus' : ''}`
  return finishMove(r, uid, players, text, false)
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

/** Puntos visibles (sin bonus) y totales de cada jugador. */
export function scoreOf(p: JaipurPlayer) {
  return { tokens: sum(p.tokens), bonus: sum(p.bonus), total: sum(p.tokens) + sum(p.bonus) }
}

/** Recuento al final de la ronda. */
export function roundResult(round: JaipurRound, players: [string, string]): JaipurRoundResult {
  const [a, b] = players
  const pa = round.players[a]
  const pb = round.players[b]
  const camels = pa.herd > pb.herd ? a : pb.herd > pa.herd ? b : undefined
  const points = {
    [a]: scoreOf(pa).total + (camels === a ? CAMEL_BONUS : 0),
    [b]: scoreOf(pb).total + (camels === b ? CAMEL_BONUS : 0),
  }
  // Empate: más fichas de bonus; si sigue, más fichas de mercancía.
  let winner: string
  if (points[a] !== points[b]) winner = points[a] > points[b] ? a : b
  else if (pa.bonus.length !== pb.bonus.length) winner = pa.bonus.length > pb.bonus.length ? a : b
  else if (pa.tokens.length !== pb.tokens.length) winner = pa.tokens.length > pb.tokens.length ? a : b
  else winner = round.turn // quien no hizo la última jugada
  return { points, camels, winner }
}

/** Aplica el final de ronda a la partida (sellos, siguiente ronda o final). */
export function closeRound(game: JaipurGame, round: JaipurRound): JaipurGame {
  const result = roundResult(round, game.players)
  const seals = { ...game.seals, [result.winner]: (game.seals[result.winner] ?? 0) + 1 }
  const finished = seals[result.winner] >= 2
  return {
    ...game,
    round,
    seals,
    lastRound: result,
    status: finished ? 'finished' : 'round-over',
    winner: finished ? result.winner : undefined,
  }
}

/** Empieza la siguiente ronda: sale quien perdió la anterior. */
export function nextRound(game: JaipurGame): JaipurGame {
  const loser = game.lastRound ? other(game, game.lastRound.winner) : game.players[0]
  return { ...game, roundNo: game.roundNo + 1, round: newRound(game.players, loser), status: 'playing' }
}
