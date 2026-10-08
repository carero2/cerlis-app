import { useMemo } from 'react'
import { uid } from './ids'
import { useData } from './data'
import { BLACK, KOMI, PASS, WHITE, groupAt, place, replay, score, type Color, type IllegalReason } from './go'
import { usePeople } from './people'
import type { GoGame } from './types'

export type GoSize = GoGame['size']

/** Estado derivado de la partida de Go compartida y acciones para jugarla. */
export function useGo() {
  const { go, store } = useData()
  const { me, people } = usePeople()
  const game = go.game
  const partner = people.find((p) => p.id !== me)

  const derived = useMemo(() => {
    if (!game) return null
    const pos = replay(game.size, game.moves)
    const dead = new Set(game.dead ?? [])
    const sc = score(pos.board, game.size, dead, game.komi)
    const myColor: Color | null = game.hotseat ? null : game.black === me ? BLACK : game.white === me ? WHITE : null
    const turnUid = pos.turn === BLACK ? game.black : game.white
    const canPlay = game.status === 'playing' && (game.hotseat || turnUid === me)
    return { pos, dead, score: sc, myColor, turnUid, canPlay }
  }, [game, me])

  const nameOf = (id: string) => (id === me ? 'Tú' : (people.find((p) => p.id === id)?.name ?? 'Tu pareja'))

  const save = (next: GoGame) =>
    store.saveGo({ ...go, game: { ...next, updatedAt: Date.now() } })

  return {
    game,
    me,
    partner,
    wins: go.wins ?? {},
    nameOf,
    ...derived,

    /** Empieza una partida nueva (solo si no hay otra a medias). */
    async newGame(opts: { size: GoSize; myColor: Color | 'random'; hotseat: boolean }) {
      if (game && game.status !== 'finished') return
      const color = opts.myColor === 'random' ? (Math.random() < 0.5 ? BLACK : WHITE) : opts.myColor
      const other = opts.hotseat || !partner ? me : partner.id
      const now = Date.now()
      return store.saveGo({
        ...go,
        game: {
          id: uid(),
          size: opts.size,
          black: color === BLACK ? me : other,
          white: color === BLACK ? other : me,
          hotseat: opts.hotseat || !partner,
          moves: [],
          status: 'playing',
          komi: KOMI[opts.size],
          createdAt: now,
          updatedAt: now,
        },
      })
    },

    /** Comprueba si una jugada es legal sin guardarla. */
    check(idx: number): IllegalReason | null {
      if (!game || !derived) return null
      const r = place(derived.pos.board, game.size, idx, derived.pos.turn, derived.pos.prevBoard)
      return 'illegal' in r ? r.illegal : null
    },

    async play(idx: number) {
      if (!game || !derived?.canPlay) return
      const r = place(derived.pos.board, game.size, idx, derived.pos.turn, derived.pos.prevBoard)
      if ('illegal' in r) throw new Error(r.illegal)
      await save({ ...game, moves: [...game.moves, idx] })
    },

    /** Pasar. Dos pases seguidos terminan la partida y empieza el recuento. */
    async pass() {
      if (!game || !derived?.canPlay) return
      const ends = derived.pos.passes >= 1
      await save({ ...game, moves: [...game.moves, PASS], status: ends ? 'scoring' : 'playing', dead: [] })
    },

    async resign() {
      if (!game || !derived || game.status === 'finished') return
      // Se rinde quien pulsa (o quien tiene el turno si juegan en el mismo móvil).
      const loser: Color = game.hotseat ? derived.pos.turn : derived.myColor ?? derived.pos.turn
      const winner: Color = loser === BLACK ? WHITE : BLACK
      await finish({ ...game, status: 'finished', result: { winner, by: 'resign' } })
    },

    /** En el recuento: marca o desmarca un grupo como muerto. */
    async toggleDead(idx: number) {
      if (!game || !derived || game.status !== 'scoring' || derived.pos.board[idx] === 0) return
      const group = groupAt(derived.pos.board, game.size, idx).stones
      const dead = new Set(game.dead ?? [])
      const isDead = dead.has(idx)
      for (const s of group) {
        if (isDead) dead.delete(s)
        else dead.add(s)
      }
      await save({ ...game, dead: [...dead] })
    },

    /** Volver a jugar si no estáis de acuerdo con el recuento. */
    async resume() {
      if (!game) return
      await save({ ...game, status: 'playing', dead: [] })
    },

    async confirmScore() {
      if (!game || !derived) return
      const s = derived.score
      await finish({ ...game, status: 'finished', result: { winner: s.winner, by: 'score', black: s.black, white: s.white } })
    },
  }

  async function finish(next: GoGame) {
    const winnerUid = next.result?.winner === BLACK ? next.black : next.white
    const wins = { ...(go.wins ?? {}) }
    // En partidas en el mismo móvil no se lleva marcador.
    if (!next.hotseat) wins[winnerUid] = (wins[winnerUid] ?? 0) + 1
    await store.saveGo({ game: { ...next, updatedAt: Date.now() }, wins })
  }
}

/** ¿Le toca mover a quien usa este móvil? (para avisar en Inicio y en la pestaña). */
export function useMyGoTurn(): boolean {
  const { go } = useData()
  const { me } = usePeople()
  return useMemo(() => {
    const g = go.game
    if (!g || g.hotseat || g.status !== 'playing') return false
    const turn = g.moves.length % 2 === 0 ? g.black : g.white
    return turn === me
  }, [go.game, me])
}
