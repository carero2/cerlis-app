import { useMemo } from 'react'
import * as C from './codigo'
import { useData } from './data'
import { uid } from './ids'
import { usePeople } from './people'
import type { CodigoGame } from './types'

/** Partida cooperativa compartida al estilo Código Secreto Dúo. */
export function useCodigo() {
  const { games, store } = useData()
  const { me, people } = usePeople()
  const state = games.codigo
  const game = state.game
  const partner = people.find((p) => p.id !== me)
  const playing = !!game && game.players.includes(me)
  const nameOf = (id: string) => (id === me ? 'Tú' : (people.find((p) => p.id === id)?.name ?? 'Tu pareja'))
  const stats = state.stats ?? { won: 0, lost: 0 }

  const save = async (next: CodigoGame) => {
    const ended = (next.phase === 'won' || next.phase === 'lost') && game?.phase !== next.phase
    const nextStats = ended ? { ...stats, [next.phase === 'won' ? 'won' : 'lost']: stats[next.phase === 'won' ? 'won' : 'lost'] + 1 } : state.stats
    await store.saveGame('codigo', { ...(nextStats ? { stats: nextStats } : {}), game: { ...next, updatedAt: Date.now() } })
  }
  const apply = async (res: C.CodigoResult): Promise<string | null> => {
    if ('error' in res) return res.error
    await save(res.game)
    return null
  }

  const finished = !game || game.phase === 'won' || game.phase === 'lost'

  return {
    game,
    me,
    partner,
    playing,
    finished,
    nameOf,
    stats,
    async newGame() {
      if (!partner || !finished) return
      await save(C.newGame(uid(), [me, partner.id]))
    },
    giveClue: (word: string, n: number) => apply(game ? C.giveClue(game, me, word, n) : { error: 'No hay partida.' }),
    guess: (idx: number) => apply(game ? C.guess(game, me, idx) : { error: 'No hay partida.' }),
    stop: () => apply(game ? C.stop(game, me) : { error: 'No hay partida.' }),
    async giveUp() {
      if (game && !finished) await save(C.giveUp(game))
    },
  }
}

/** ¿Tengo que hacer algo en el Código secreto? */
export function useMyCodigoTurn(): boolean {
  const { games } = useData()
  const { me } = usePeople()
  return useMemo(() => {
    const g = games.codigo.game
    if (!g || !g.players.includes(me)) return false
    if (g.phase === 'clue') return g.giver === me
    if (g.phase === 'guess') return g.giver !== me
    return g.phase === 'sudden'
  }, [games.codigo.game, me])
}
