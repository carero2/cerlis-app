import { useMemo } from 'react'
import { useData } from './data'
import { uid } from './ids'
import * as J from './jaipur'
import { usePeople } from './people'
import type { JaipurGame, JaipurGood } from './types'

/** Partida compartida al estilo Jaipur: estado derivado y acciones. */
export function useJaipur() {
  const { games, store } = useData()
  const { me, people } = usePeople()
  const state = games.jaipur
  const game = state.game
  const partner = people.find((p) => p.id !== me)
  const playing = !!game && game.players.includes(me)
  const nameOf = (id: string) => (id === me ? 'Tú' : (people.find((p) => p.id === id)?.name ?? 'Tu pareja'))

  const save = (next: JaipurGame, wins = state.wins) =>
    store.saveGame('jaipur', { ...(wins ? { wins } : {}), game: { ...next, updatedAt: Date.now() } })

  /** Guarda una jugada (o el error, para mostrarlo). */
  const apply = async (res: J.MoveResult): Promise<string | null> => {
    if (!game) return null
    if ('error' in res) return res.error
    const round = { ...res.round, last: { by: me, text: res.text } }
    if (!res.ended) {
      await save({ ...game, round })
      return null
    }
    const closed = J.closeRound(game, round)
    const wins = { ...(state.wins ?? {}) }
    if (closed.status === 'finished' && closed.winner) wins[closed.winner] = (wins[closed.winner] ?? 0) + 1
    await save(closed, wins)
    return null
  }

  const myTurn = !!game && game.status === 'playing' && game.round.turn === me

  return {
    game,
    me,
    partner,
    playing,
    myTurn,
    nameOf,
    wins: state.wins ?? {},
    opponent: game && playing ? J.other(game, me) : partner?.id,

    async newGame() {
      if (!partner || (game && game.status !== 'finished')) return
      await save(J.newGame(uid(), [me, partner.id]))
    },
    take: (idx: number) => apply(game && myTurn ? J.take(game.round, me, game.players, idx) : { error: 'No es tu turno.' }),
    takeCamels: () => apply(game && myTurn ? J.takeCamels(game.round, me, game.players) : { error: 'No es tu turno.' }),
    exchange: (market: number[], hand: number[], camels: number) =>
      apply(game && myTurn ? J.exchange(game.round, me, game.players, market, hand, camels) : { error: 'No es tu turno.' }),
    sell: (good: JaipurGood, n: number) =>
      apply(game && myTurn ? J.sell(game.round, me, game.players, good, n) : { error: 'No es tu turno.' }),
    async nextRound() {
      if (!game || game.status !== 'round-over') return
      await save(J.nextRound(game))
    },
    async resign() {
      if (!game || game.status === 'finished' || !playing) return
      const winner = J.other(game, me)
      const wins = { ...(state.wins ?? {}), [winner]: (state.wins?.[winner] ?? 0) + 1 }
      await save({ ...game, status: 'finished', winner, resigned: me }, wins)
    },
  }
}

/** ¿Me toca en el Jaipur? (también al tener que empezar la siguiente ronda). */
export function useMyJaipurTurn(): boolean {
  const { games } = useData()
  const { me } = usePeople()
  return useMemo(() => {
    const g = games.jaipur.game
    if (!g || !g.players.includes(me)) return false
    if (g.status === 'playing') return g.round.turn === me
    if (g.status === 'round-over' && g.lastRound) return J.other(g, g.lastRound.winner) === me
    return false
  }, [games.jaipur.game, me])
}
