import { useEffect, useState } from 'react'
import { CodigoHelp } from '../components/CodigoHelp'
import { GameHeaderButtons, GameIntro, GamesBack, saveError } from '../components/GameChrome'
import { Page } from '../components/Page'
import { ConfirmSheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { AGENTS, TURNS, canGuess, partnerOf, remaining } from '../lib/codigo'
import { useCodigo } from '../lib/codigoGame'
import type { CodigoGame } from '../lib/types'

const RESULT_ICON: Record<string, string> = { g: '✅', n: '✋', a: '💀' }

export function CodigoScreen() {
  const c = useCodigo()
  const toast = useToast()
  const [help, setHelp] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [showKey, setShowKey] = useState(true)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const [busy, setBusy] = useState(false)
  const game = c.game

  useEffect(() => setSelected(null), [game?.updatedAt])

  const askNew = () => {
    if (!c.finished) return toast('Primero terminad la partida actual para empezar otra.')
    if (!c.partner) return toast('Tu pareja tiene que entrar en la app al menos una vez para poder jugar.')
    void c.newGame().catch((e) => toast(saveError(e)))
  }

  const run = async (p: Promise<string | null>) => {
    setBusy(true)
    try {
      const err = await p
      if (err) toast(err)
    } catch (e) {
      toast(saveError(e))
    } finally {
      setBusy(false)
    }
  }

  const header = <GameHeaderButtons onNew={askNew} onHelp={() => setHelp(true)} />
  const statsLine = c.stats.won + c.stats.lost ? `${c.stats.won} ganadas · ${c.stats.lost} perdidas` : 'Cooperativo: ganáis o perdéis juntos'

  if (!game || !c.playing) {
    return (
      <Page title="Código secreto" className="theme-games theme-codigo" left={<GamesBack />} right={header} subtitle={statsLine}>
        <GameIntro art="🕵️" title="Código secreto para dos" onStart={askNew} onHelp={() => setHelp(true)} disabled={!c.partner}>
          <p>
            Hay 25 palabras y cada uno ve en su móvil cuáles son sus <b>agentes</b>. Por turnos, uno da una pista de una
            sola palabra y el otro intenta adivinarlos. Encontrad los 15 agentes antes de que se acaben los turnos… y
            sin tocar a un <b>asesino</b>.
          </p>
          {!c.partner && <p>Para jugar, tu pareja tiene que haber entrado en la app al menos una vez.</p>}
        </GameIntro>
        <CodigoHelp open={help} onClose={() => setHelp(false)} />
      </Page>
    )
  }

  const me = c.me
  const partner = partnerOf(game, me)
  const pName = c.nameOf(partner)
  const myKey = game.keys[me]
  const found = new Set(game.found)
  const ended = game.phase === 'won' || game.phase === 'lost'
  const iGuess = (game.phase === 'guess' && game.giver !== me) || game.phase === 'sudden'

  const tap = (i: number) => {
    if (ended) return
    if (!iGuess) {
      if (game.phase === 'clue' && game.giver === me) return toast('Primero escribe tu pista abajo.')
      return toast(game.phase === 'guess' ? `${pName} está adivinando tu pista.` : `${pName} está pensando una pista.`)
    }
    if (found.has(i)) return
    if (game.phase === 'guess' && !canGuess(game, i)) return toast(`Ya sabéis que es neutral en la clave de ${pName}.`)
    setSelected(selected === i ? null : i)
  }

  return (
    <Page title="Código secreto" className="theme-games theme-codigo" left={<GamesBack />} right={header} subtitle={statsLine}>
      <Status game={game} me={me} nameOf={c.nameOf} />

      <div className="cg-counters">
        <span>
          🕵️ <b>{game.found.length}</b>/{AGENTS} agentes
        </span>
        <span className="cg-timer" aria-label={`Quedan ${game.timer} turnos`}>
          {Array.from({ length: TURNS }, (_, k) => (
            <i key={k} className={k < game.timer ? 'is-left' : ''} />
          ))}
        </span>
      </div>

      <div className={`cg-grid ${showKey ? 'show-key' : ''}`}>
        {game.words.map((w, i) => {
          const isFound = found.has(i)
          const k = myKey[i]
          const nMine = game.neutral[me]?.includes(i)
          const nTheirs = game.neutral[partner]?.includes(i)
          const theirKey = ended ? game.keys[partner][i] : undefined
          return (
            <button
              key={i}
              className={[
                'cg-card',
                isFound && 'is-found',
                game.lostAt === i && 'is-assassin',
                !isFound && `key-${k}`,
                ended && !isFound && (k === 'g' || theirKey === 'g') && 'is-missed',
                nMine && nTheirs && 'is-dead',
                selected === i && 'is-selected',
                w.length > 8 && 'is-long',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => tap(i)}
              aria-pressed={selected === i}
            >
              <span className="cg-word">{w}</span>
              {(nMine || nTheirs) && (
                <span className="cg-marks">
                  {nMine && <span title="Neutral en tu clave">tú</span>}
                  {nTheirs && <span title={`Neutral en la clave de ${pName}`}>{pName.slice(0, 1)}</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="cg-legend">
        <label className="cg-toggle">
          <input type="checkbox" className="ios-switch" checked={showKey} onChange={(e) => setShowKey(e.target.checked)} />
          Ver mi clave
        </label>
        {showKey && (
          <span className="muted small">
            <i className="cg-dot g" /> mis agentes · <i className="cg-dot a" /> mis asesinos
          </span>
        )}
      </div>

      {game.phase === 'clue' && game.giver === me && <ClueForm game={game} me={me} busy={busy} onSend={(w, n) => run(c.giveClue(w, n))} />}

      {iGuess && !ended && (
        <div className={`go-actions ${selected !== null ? 'is-confirming' : ''}`}>
          {selected !== null ? (
            <>
              <button className="btn btn-elev" onClick={() => setSelected(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary btn-grow"
                disabled={busy}
                onClick={() => {
                  const i = selected
                  setSelected(null)
                  void run(c.guess(i))
                }}
              >
                Tocar «{game.words[selected]}»
              </button>
            </>
          ) : (
            game.phase === 'guess' && (
              <button className="btn btn-soft btn-block" disabled={game.guesses < 1 || busy} onClick={() => void run(c.stop())}>
                {game.guesses < 1 ? 'Toca al menos una palabra' : 'Terminar turno'}
              </button>
            )
          )}
        </div>
      )}

      {ended && (
        <div className="go-actions">
          <button className="btn btn-primary btn-block" onClick={askNew}>
            Nueva partida
          </button>
        </div>
      )}

      {game.history.length > 0 && (
        <section className="cg-history">
          <div className="section-label">Pistas</div>
          <ul className="card">
            {[...game.history].reverse().map((h, k) => (
              <li key={game.history.length - k}>
                <span className="cg-h-who">{c.nameOf(h.giver)}</span>
                <span className="cg-h-clue">
                  {h.word} · {h.n}
                </span>
                <span className="cg-h-res">{[...h.results].map((r) => RESULT_ICON[r]).join('') || '…'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!ended && (
        <button className="link-btn center jp-resign" onClick={() => setConfirmQuit(true)}>
          Abandonar partida
        </button>
      )}

      <CodigoHelp open={help} onClose={() => setHelp(false)} />
      <ConfirmSheet
        open={confirmQuit}
        tone="wood"
        title="¿Abandonar la partida?"
        message="Contará como partida perdida para los dos."
        confirmLabel="Abandonar"
        destructive
        onConfirm={() => void run(c.giveUp().then(() => null))}
        onClose={() => setConfirmQuit(false)}
      />
    </Page>
  )
}

function Status({ game, me, nameOf }: { game: CodigoGame; me: string; nameOf: (id: string) => string }) {
  const partner = partnerOf(game, me)
  const pName = nameOf(partner)
  let icon = '⏳'
  let title = ''
  let sub = ''
  let mine = false
  switch (game.phase) {
    case 'clue':
      mine = game.giver === me
      icon = mine ? '💡' : '⏳'
      title = mine ? 'Te toca dar una pista' : `${pName} está pensando una pista`
      sub = mine
        ? `Te quedan ${remaining(game, me).length} agentes por señalar en tu clave.`
        : 'Mientras, mira tus agentes: luego te tocará a ti.'
      break
    case 'guess':
      mine = game.giver !== me
      icon = mine ? '🔎' : '⏳'
      title = mine ? `Pista: «${game.clue?.word}» · ${game.clue?.n}` : `${pName} adivina «${game.clue?.word}» · ${game.clue?.n}`
      sub = mine
        ? `Toca las palabras que creas. Llevas ${game.guesses}. Si fallas con una neutral, se acaba el turno.`
        : `Lleva ${game.guesses} ${game.guesses === 1 ? 'intento' : 'intentos'}.`
      break
    case 'sudden':
      mine = true
      icon = '⚡'
      title = '¡Muerte súbita!'
      sub = `Se acabaron los turnos. Sin más pistas: tocad palabras que creáis agentes de la clave del otro. Un fallo y perdéis.`
      break
    case 'won':
      icon = '🏆'
      title = '¡Lo habéis conseguido!'
      sub = `Los 15 agentes encontrados con ${game.timer} ${game.timer === 1 ? 'turno' : 'turnos'} de sobra.`
      break
    case 'lost':
      icon = '💀'
      title = game.lostAt !== undefined ? `Habéis tocado a un asesino: «${game.words[game.lostAt]}»` : 'Partida perdida'
      sub = 'Las palabras con borde discontinuo eran agentes que faltaban.'
      break
  }
  return (
    <div className={`go-status ${mine ? 'is-my-turn' : ''} ${game.phase === 'won' ? 'is-finished' : ''}`}>
      <span className="go-status-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <span className="muted small block">{sub}</span>
      </span>
    </div>
  )
}

function ClueForm({
  game,
  me,
  busy,
  onSend,
}: {
  game: CodigoGame
  me: string
  busy: boolean
  onSend: (word: string, n: number) => Promise<void>
}) {
  const [word, setWord] = useState('')
  const [n, setN] = useState(1)
  const left = remaining(game, me).length
  return (
    <form
      className="card cg-clue"
      onSubmit={(e) => {
        e.preventDefault()
        if (word.trim()) void onSend(word, n)
      }}
    >
      <label className="field">
        <span>Tu pista (una palabra)</span>
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Ej. Playa"
          autoCapitalize="sentences"
          autoComplete="off"
          enterKeyHint="send"
        />
      </label>
      <div className="cg-clue-row">
        <span className="small muted">¿Cuántas palabras?</span>
        <span className="jp-stepper">
          <button type="button" className="icon-btn" onClick={() => setN(Math.max(1, n - 1))} disabled={n <= 1} aria-label="Menos">
            −
          </button>
          <b>{n}</b>
          <button type="button" className="icon-btn" onClick={() => setN(Math.min(left, n + 1))} disabled={n >= left} aria-label="Más">
            +
          </button>
        </span>
        <button type="submit" className="btn btn-primary btn-small" disabled={!word.trim() || busy}>
          Enviar pista
        </button>
      </div>
    </form>
  )
}
