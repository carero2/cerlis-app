import type { ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { Page } from '../components/Page'
import { useData } from '../lib/data'
import { useMyCodigoTurn } from '../lib/codigoGame'
import { useMyGoTurn } from '../lib/goGame'
import { useMyJaipurTurn } from '../lib/jaipurGame'
import { usePeople } from '../lib/people'
import { navigate, paths } from '../lib/router'

/** Lista de juegos para dos, con el estado de cada partida. */
export function Games() {
  const { games } = useData()
  const { me, people } = usePeople()
  const turns = { go: useMyGoTurn(), jaipur: useMyJaipurTurn(), codigo: useMyCodigoTurn() }
  const nameOf = (id?: string) => (id === me ? 'ti' : (people.find((p) => p.id === id)?.name ?? 'tu pareja'))
  const partner = people.find((p) => p.id !== me)

  const score = (wins?: Record<string, number>) => {
    if (!partner || !wins) return undefined
    const mine = wins[me] ?? 0
    const theirs = wins[partner.id] ?? 0
    return mine || theirs ? `Tú ${mine} – ${theirs} ${partner.name}` : undefined
  }

  const go = games.go.game
  const goStatus = !go
    ? 'Sin partida'
    : go.status === 'finished'
      ? 'Partida terminada'
      : go.status === 'scoring'
        ? 'Recuento de puntos'
        : go.hotseat
          ? 'Partida en este móvil'
          : turns.go
            ? 'Te toca mover'
            : `Turno de ${nameOf(go.moves.length % 2 === 0 ? go.black : go.white)}`

  const jp = games.jaipur.game
  const jpStatus = !jp
    ? 'Sin partida'
    : jp.status === 'finished'
      ? 'Partida terminada'
      : jp.status === 'round-over'
        ? turns.jaipur
          ? `Empieza tú la ronda ${jp.roundNo + 1}`
          : `Fin de la ronda ${jp.roundNo}`
        : turns.jaipur
          ? 'Te toca'
          : `Turno de ${nameOf(jp.round.turn)}`

  const cg = games.codigo.game
  const cgStatus = !cg
    ? 'Sin partida'
    : cg.phase === 'won'
      ? '¡Lo conseguisteis!'
      : cg.phase === 'lost'
        ? 'Última partida perdida'
        : cg.phase === 'sudden'
          ? 'Muerte súbita'
          : cg.phase === 'clue'
            ? turns.codigo
              ? 'Te toca dar una pista'
              : `${nameOf(cg.giver)} está pensando una pista`
            : turns.codigo
              ? 'Te toca adivinar'
              : `${nameOf(cg.players.find((p) => p !== cg.giver))} está adivinando`
  const stats = games.codigo.stats
  const cgScore = stats && stats.won + stats.lost ? `${stats.won} ganadas · ${stats.lost} perdidas` : undefined

  return (
    <Page title="Juegos" className="theme-games" subtitle="Para jugar los dos, cada uno desde su móvil">
      <div className="games-list">
        <GameCard
          art={
            <span className="games-art-stones">
              <i className="stone-dot big black" />
              <i className="stone-dot big white" />
            </span>
          }
          tint="wood"
          title="Go"
          desc="Estrategia clásica: rodead más territorio que el otro."
          status={goStatus}
          score={score(games.go.wins)}
          myTurn={turns.go}
          onClick={() => navigate(paths.game('go'))}
        />
        <GameCard
          art="🐫"
          tint="sand"
          title="Jaipur"
          desc="Comerciad en el mercado: coged, cambiad y vended para ser el más rico."
          status={jpStatus}
          score={score(games.jaipur.wins)}
          myTurn={turns.jaipur}
          onClick={() => navigate(paths.game('jaipur'))}
        />
        <GameCard
          art="🕵️"
          tint="spy"
          title="Código secreto"
          desc="Cooperativo: dad pistas de una palabra para encontrar juntos a los 15 agentes."
          status={cgStatus}
          score={cgScore}
          myTurn={turns.codigo}
          onClick={() => navigate(paths.game('codigo'))}
        />
      </div>
    </Page>
  )
}

function GameCard({
  art,
  tint,
  title,
  desc,
  status,
  score,
  myTurn,
  onClick,
}: {
  art: ReactNode
  tint: 'wood' | 'sand' | 'spy'
  title: string
  desc: string
  status: string
  score?: string
  myTurn: boolean
  onClick: () => void
}) {
  return (
    <button className={`card game-card ${myTurn ? 'is-my-turn' : ''}`} onClick={onClick}>
      <span className={`game-card-art game-art-${tint}`} aria-hidden>
        {art}
      </span>
      <span className="game-card-text">
        <strong>{title}</strong>
        <span className="game-card-desc">{desc}</span>
        <span className="game-card-status">
          {myTurn && <i className="game-turn-dot" />}
          {status}
          {score && <span className="muted"> · {score}</span>}
        </span>
      </span>
      <Icon name="chevron" size={18} className="muted" />
    </button>
  )
}
