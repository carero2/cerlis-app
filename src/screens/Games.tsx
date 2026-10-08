import { useEffect, useState } from 'react'
import { GoBoard } from '../components/GoBoard'
import { GoHelp } from '../components/GoHelp'
import { Icon } from '../components/Icon'
import { Page } from '../components/Page'
import { Segmented } from '../components/Segmented'
import { ConfirmSheet, Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { BLACK, ILLEGAL_TEXT, PASS, WHITE, type Color, type IllegalReason } from '../lib/go'
import { useGo, type GoSize } from '../lib/goGame'

const num = (n: number) => n.toLocaleString('es-ES')
const captures = (n: number) => (n === 1 ? '1 captura' : `${n} capturas`)

function saveError(e: unknown): string {
  if ((e as { code?: string }).code === 'permission-denied') return 'Firebase no deja guardar: revisa las reglas.'
  if (!navigator.onLine) return 'Sin conexión: la jugada se enviará cuando vuelva internet.'
  return 'No se ha podido guardar la jugada.'
}

export function Games() {
  const go = useGo()
  const toast = useToast()
  const [help, setHelp] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [confirm, setConfirm] = useState<'resign' | 'pass' | null>(null)
  const [ghost, setGhost] = useState<number | null>(null)
  const game = go.game

  // Si cambia la partida (jugada del otro), se descarta la piedra preparada.
  useEffect(() => setGhost(null), [game?.moves.length, game?.id])

  const run = (p: Promise<unknown>) => p.catch((e) => toast(saveError(e)))

  const tap = (idx: number) => {
    if (!game || !go.pos) return
    if (game.status === 'scoring') return void run(go.toggleDead(idx))
    if (!go.canPlay)
      return toast(game.status === 'playing' ? `Le toca a ${go.nameOf(go.turnUid!)}` : 'La partida ha terminado')
    const illegal: IllegalReason | null = go.check(idx)
    if (illegal) return toast(ILLEGAL_TEXT[illegal])
    // Solo se marca: la piedra se pone con "Confirmar ficha".
    setGhost(idx)
  }

  const inProgress = !!game && game.status !== 'finished'
  const askNewGame = () =>
    inProgress ? toast('Primero terminad la partida actual (o rendíos) para empezar otra.') : setNewOpen(true)

  const headerButtons = (
    <>
      <button className="nav-btn nav-icon help-btn" onClick={askNewGame} aria-label="Nueva partida">
        <Icon name="plus" size={18} strokeWidth={2.6} />
      </button>
      <button className="nav-btn nav-icon help-btn" onClick={() => setHelp(true)} aria-label="Cómo se juega">
        ?
      </button>
    </>
  )

  return (
    <Page title="Go" className="theme-games" right={headerButtons} subtitle={<Scoreboard go={go} />}>
      {!game ? (
        <section className="go-intro card">
          <div className="go-intro-art" aria-hidden>
            ⚫⚪
          </div>
          <h2>Una partida de Go</h2>
          <p className="muted">
            Juego de estrategia por turnos: cada uno mueve desde su móvil cuando le toca. ¿Nunca habéis jugado? Tocad el{' '}
            <b>?</b> de arriba para ver las reglas.
          </p>
          <button className="btn btn-primary btn-block" onClick={() => setNewOpen(true)}>
            Empezar partida
          </button>
          <button className="btn btn-ghost btn-block" onClick={() => setHelp(true)}>
            Ver cómo se juega
          </button>
        </section>
      ) : (
        <>
          <GameStatus go={go} />
          <div className="go-board-wrap">
            <GoBoard
              size={game.size}
              board={go.pos!.board}
              lastMove={go.pos!.lastMove}
              ghost={ghost !== null ? { idx: ghost, color: go.pos!.turn } : null}
              territory={game.status !== 'playing' ? go.score!.territory : undefined}
              dead={go.dead}
              onTap={game.status === 'finished' ? undefined : tap}
            />
          </div>
          <div className="go-captures">
            <span>
              <i className="stone-dot black" /> {game.hotseat ? 'Negras' : go.nameOf(game.black)} ·{' '}
              {captures(go.pos!.captures[BLACK])}
            </span>
            <span>
              <i className="stone-dot white" /> {game.hotseat ? 'Blancas' : go.nameOf(game.white)} ·{' '}
              {captures(go.pos!.captures[WHITE])}
            </span>
          </div>

          {game.status === 'playing' && go.canPlay && (
            <p className="go-hint">
              {ghost === null
                ? 'Toca un cruce para elegir dónde poner tu piedra.'
                : 'Puedes tocar otro cruce para cambiarla. Cuando lo tengas claro, confirma.'}
            </p>
          )}

          {game.status === 'playing' && (
            <div className={`go-actions ${ghost !== null ? 'is-confirming' : ''}`}>
              {ghost !== null ? (
                <>
                  <button className="btn btn-elev" onClick={() => setGhost(null)}>
                    Cancelar
                  </button>
                  <button
                    className="btn btn-primary btn-grow"
                    onClick={() => {
                      const idx = ghost
                      setGhost(null)
                      void run(go.play(idx))
                    }}
                  >
                    Confirmar ficha
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-soft btn-grow" disabled={!go.canPlay} onClick={() => setConfirm('pass')}>
                    Pasar
                  </button>
                  <button className="btn btn-danger-soft" onClick={() => setConfirm('resign')}>
                    Rendirse
                  </button>
                </>
              )}
            </div>
          )}

          {game.status === 'scoring' && (
            <div className="go-scoring card">
              <p>
                <b>Recuento.</b> Tocad las piedras muertas (rodeadas sin salida) para marcarlas. Los cuadraditos
                muestran el territorio de cada uno.
              </p>
              <p className="go-score-line">
                <i className="stone-dot black" /> {num(go.score!.black)} · <i className="stone-dot white" />{' '}
                {num(go.score!.white)} <span className="muted small">(incluye {num(game.komi)} de komi)</span>
              </p>
              <div className="go-actions">
                <button className="btn btn-ghost" onClick={() => void run(go.resume())}>
                  Seguir jugando
                </button>
                <button className="btn btn-primary btn-grow" onClick={() => void run(go.confirmScore())}>
                  Confirmar resultado
                </button>
              </div>
            </div>
          )}

          {game.status === 'finished' && (
            <div className="go-actions">
              <button className="btn btn-primary btn-block" onClick={() => setNewOpen(true)}>
                Nueva partida
              </button>
            </div>
          )}
        </>
      )}

      <GoHelp open={help} onClose={() => setHelp(false)} />
      <NewGameSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        partnerName={go.partner?.name}
        onStart={(opts) => {
          setNewOpen(false)
          void run(go.newGame(opts))
        }}
      />
      <ConfirmSheet
        open={confirm === 'resign'}
        tone="wood"
        title="¿Rendirse?"
        message="La partida termina y gana tu pareja."
        confirmLabel="Rendirme"
        destructive
        onConfirm={() => void run(go.resign())}
        onClose={() => setConfirm(null)}
      />
      <ConfirmSheet
        open={confirm === 'pass'}
        tone="wood"
        title="¿Pasar el turno?"
        message={
          go.pos?.passes
            ? 'Tu pareja ya ha pasado: si pasas tú también, la partida termina y se cuentan los puntos.'
            : 'No colocas piedra este turno. Si los dos pasáis seguidos, la partida termina.'
        }
        confirmLabel="Pasar"
        onConfirm={() => void run(go.pass())}
        onClose={() => setConfirm(null)}
      />
    </Page>
  )
}

type GoApi = ReturnType<typeof useGo>

function Scoreboard({ go }: { go: GoApi }) {
  if (!go.partner) return null
  const mine = go.wins[go.me] ?? 0
  const theirs = go.wins[go.partner.id] ?? 0
  if (!mine && !theirs) return <span>Partidas por turnos entre los dos</span>
  return (
    <span className="go-scoreboard">
      Tú <b>{mine}</b> – <b>{theirs}</b> {go.partner.name}
    </span>
  )
}

function GameStatus({ go }: { go: GoApi }) {
  const game = go.game!
  const pos = go.pos!
  if (game.status === 'finished' && game.result) {
    const winnerUid = game.result.winner === BLACK ? game.black : game.white
    const winnerName = game.hotseat ? (game.result.winner === BLACK ? 'Negras' : 'Blancas') : go.nameOf(winnerUid)
    const how =
      game.result.by === 'resign'
        ? 'por abandono'
        : `por ${num(Math.abs((game.result.black ?? 0) - (game.result.white ?? 0)))} puntos`
    return (
      <div className="go-status is-finished">
        <span className="go-status-icon">🏆</span>
        <span>
          <strong>{winnerName === 'Tú' ? '¡Has ganado!' : `Gana ${winnerName}`}</strong>
          <span className="muted small block">{how}</span>
        </span>
      </div>
    )
  }
  if (game.status === 'scoring') {
    return (
      <div className="go-status">
        <span className="go-status-icon">🧮</span>
        <span>
          <strong>Los dos habéis pasado</strong>
          <span className="muted small block">Marcad las piedras muertas y confirmad</span>
        </span>
      </div>
    )
  }
  const colorName = (c: Color) => (c === BLACK ? 'negras' : 'blancas')
  const passed = pos.lastMove === PASS
  return (
    <div className={`go-status ${go.canPlay ? 'is-my-turn' : ''}`}>
      <i className={`stone-dot big ${pos.turn === BLACK ? 'black' : 'white'}`} />
      <span>
        <strong>
          {game.hotseat
            ? `Turno de ${colorName(pos.turn)}`
            : go.canPlay
              ? 'Te toca'
              : `Turno de ${go.nameOf(go.turnUid!)}`}
        </strong>
        <span className="muted small block">
          {passed ? 'El último jugador ha pasado · ' : ''}
          {game.hotseat ? 'Partida en este móvil' : `Juegas con ${colorName(go.myColor ?? BLACK)}`} · {game.size}×
          {game.size}
        </span>
      </span>
    </div>
  )
}

function NewGameSheet({
  open,
  onClose,
  onStart,
  partnerName,
}: {
  open: boolean
  onClose: () => void
  onStart: (opts: { size: GoSize; myColor: Color | 'random'; hotseat: boolean }) => void
  partnerName?: string
}) {
  const [size, setSize] = useState<'9' | '13' | '19'>('9')
  const [color, setColor] = useState<'black' | 'white' | 'random'>('random')
  const [mode, setMode] = useState<'turns' | 'hotseat'>(partnerName ? 'turns' : 'hotseat')

  useEffect(() => {
    if (open) setMode(partnerName ? 'turns' : 'hotseat')
  }, [open, partnerName])

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nueva partida"
      tone="wood"
      footer={
        <button
          className="btn btn-primary btn-block"
          onClick={() =>
            onStart({
              size: Number(size) as GoSize,
              myColor: color === 'black' ? BLACK : color === 'white' ? WHITE : 'random',
              hotseat: mode === 'hotseat',
            })
          }
        >
          Empezar
        </button>
      }
    >
      <div className="section-label">Cómo jugáis</div>
      <Segmented<'turns' | 'hotseat'>
        value={mode}
        onChange={setMode}
        options={[
          ...(partnerName ? [{ value: 'turns' as const, label: `Con ${partnerName}` }] : []),
          { value: 'hotseat' as const, label: 'En este móvil' },
        ]}
      />
      <p className="muted small sheet-intro go-opt-hint">
        {mode === 'turns'
          ? 'Cada uno juega desde su móvil cuando le toca.'
          : partnerName
            ? 'Os pasáis el móvil en cada turno.'
            : 'Cuando tu pareja entre en la app podréis jugar cada uno desde su móvil.'}
      </p>

      <div className="section-label">Tablero</div>
      <Segmented<'9' | '13' | '19'>
        value={size}
        onChange={setSize}
        options={[
          { value: '9', label: '9×9 · fácil' },
          { value: '13', label: '13×13' },
          { value: '19', label: '19×19' },
        ]}
      />

      {mode === 'turns' && (
        <>
          <div className="section-label go-opt-gap">Tu color</div>
          <Segmented<'black' | 'white' | 'random'>
            value={color}
            onChange={setColor}
            options={[
              { value: 'black', label: '⚫ Negras' },
              { value: 'white', label: '⚪ Blancas' },
              { value: 'random', label: 'Al azar' },
            ]}
          />
          <p className="muted small sheet-intro go-opt-hint">
            Las negras empiezan. Las blancas reciben 7,5 puntos de compensación.
          </p>
        </>
      )}
    </Sheet>
  )
}
