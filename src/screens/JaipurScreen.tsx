import { useState } from 'react'
import { GameHeaderButtons, GameIntro, GamesBack, saveError } from '../components/GameChrome'
import { JaipurHelp } from '../components/JaipurHelp'
import { Page } from '../components/Page'
import { ConfirmSheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { CAMEL_BONUS, CARD_INFO, GOODS, HAND_LIMIT, exchangeError, scoreOf, sellError } from '../lib/jaipur'
import { useJaipur } from '../lib/jaipurGame'
import type { JaipurCard, JaipurGood } from '../lib/types'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** "ha cogido…" → "has cogido…" cuando la jugada es mía. */
const asMine = (text: string) => text.replace(/^se ha /, 'te has ').replace(/^ha /, 'has ')

export function JaipurScreen() {
  const j = useJaipur()
  const toast = useToast()
  const [help, setHelp] = useState(false)
  const [confirmResign, setConfirmResign] = useState(false)
  // La selección va ligada a la versión de la partida: si cambia, se descarta.
  const [sel, setSel] = useState({ at: 0, m: [] as number[], h: [] as number[], c: 0 })
  const [busy, setBusy] = useState(false)
  const game = j.game

  const fresh = sel.at === (game?.updatedAt ?? 0)
  const selM = fresh ? sel.m : []
  const selH = fresh ? sel.h : []
  const camels = fresh ? sel.c : 0
  const at = game?.updatedAt ?? 0
  const setSelM = (m: number[]) => setSel((s) => ({ ...(s.at === at ? s : { h: [], c: 0 }), at, m }))
  const setSelH = (h: number[]) => setSel((s) => ({ ...(s.at === at ? s : { m: [], c: 0 }), at, h }))
  const setCamels = (c: number) => setSel((s) => ({ ...(s.at === at ? s : { m: [], h: [] }), at, c }))

  const inProgress = !!game && game.status !== 'finished'
  const askNew = () => {
    if (inProgress) return toast('Primero terminad la partida actual (o ríndete) para empezar otra.')
    if (!j.partner) return toast('Tu pareja tiene que entrar en la app al menos una vez para poder jugar.')
    void j.newGame().catch((e) => toast(saveError(e)))
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

  if (!game || !j.playing) {
    return (
      <Page title="Jaipur" className="theme-games theme-jaipur" left={<GamesBack />} right={header}>
        <GameIntro
          art="🐫💎"
          title="Comerciantes en Jaipur"
          onStart={askNew}
          onHelp={() => setHelp(true)}
          disabled={!j.partner}
        >
          <p>
            Coged mercancías del mercado, juntad varias del mismo tipo y vendedlas en el mejor momento. Gana la ronda
            quien más rupias reúne, y la partida quien gana dos rondas.
          </p>
          {!j.partner && <p>Para jugar, tu pareja tiene que haber entrado en la app al menos una vez.</p>}
        </GameIntro>
        <JaipurHelp open={help} onClose={() => setHelp(false)} />
      </Page>
    )
  }

  const round = game.round
  const me = round.players[j.me]
  const oppId = j.opponent!
  const opp = round.players[oppId]
  const myTurn = j.myTurn && !busy
  const oppName = j.nameOf(oppId)

  // Mano ordenada por tipo (conservando el índice real).
  const hand = me.hand.map((c, i) => ({ c, i })).sort((a, b) => GOODS.indexOf(a.c) - GOODS.indexOf(b.c))

  const tapMarket = (i: number) => {
    if (!myTurn) return toast(game.status === 'playing' ? `Le toca a ${oppName}` : 'La ronda ha terminado')
    const card = round.market[i]
    if (card === 'camel') {
      const all = round.market.flatMap((c, k) => (c === 'camel' ? [k] : []))
      const already = selM.length && selM.every((k) => round.market[k] === 'camel')
      setSelM(already ? [] : all)
      setSelH([])
      setCamels(0)
      return
    }
    const goodsOnly = selM.filter((k) => round.market[k] !== 'camel')
    setSelM(goodsOnly.includes(i) ? goodsOnly.filter((k) => k !== i) : [...goodsOnly, i])
  }
  const tapHand = (i: number) => {
    if (!myTurn) return toast(`Le toca a ${oppName}`)
    if (selM.some((k) => round.market[k] === 'camel')) setSelM([])
    setSelH(selH.includes(i) ? selH.filter((k) => k !== i) : [...selH, i])
  }

  const action: Act = game.status === 'playing' ? jaipurAction({ round, uid: j.me, selM, selH, camels }) : { hint: '' }

  const doAction = () => {
    if (!action.run) return
    const kind = action.run
    if (kind === 'camels') void run(j.takeCamels())
    else if (kind === 'take') void run(j.take(selM[0]))
    else if (kind === 'exchange') void run(j.exchange(selM, selH, camels))
    else void run(j.sell(me.hand[selH[0]], selH.length))
  }

  const oppScore = scoreOf(opp)
  const myScore = scoreOf(me)
  const last = round.last

  return (
    <Page
      title="Jaipur"
      className="theme-games theme-jaipur"
      left={<GamesBack />}
      right={header}
      subtitle={<Seals game={game} me={j.me} nameOf={j.nameOf} />}
    >
      {game.status === 'playing' && (
        <div className={`go-status ${j.myTurn ? 'is-my-turn' : ''}`}>
          <span className="go-status-icon">{j.myTurn ? '🫵' : '⏳'}</span>
          <span>
            <strong>{j.myTurn ? 'Te toca' : `Turno de ${oppName}`}</strong>
            <span className="muted small block">
              {last
                ? last.by === j.me
                  ? `Tú: ${asMine(last.text)}`
                  : `${j.nameOf(last.by)} ${last.text}`
                : `Ronda ${game.roundNo} · ${j.myTurn ? 'empiezas tú' : `empieza ${oppName}`}`}
            </span>
          </span>
        </div>
      )}

      {game.status !== 'playing' && <RoundOver j={j} onNew={askNew} />}

      {/* Rival */}
      <div className="jp-opp card">
        <span className="jp-opp-name">{oppName}</span>
        <span className="jp-chip" title="Cartas en la mano">
          🂠 {opp.hand.length}
        </span>
        <span className="jp-chip" title="Camellos">
          🐫 {opp.herd}
        </span>
        <span className="jp-chip" title="Rupias (sin contar bonus)">
          💰 {oppScore.tokens}
          {opp.bonus.length > 0 && <small> +{opp.bonus.length} bonus</small>}
        </span>
      </div>

      {/* Fichas que quedan */}
      <div className="jp-piles" aria-label="Fichas que quedan">
        {GOODS.map((g) => {
          const pile = round.piles[g]
          return (
            <span key={g} className={`jp-pile jp-${g} ${pile.length ? '' : 'is-empty'}`}>
              <span>{CARD_INFO[g].emoji}</span>
              <b>{pile.length ? pile[0] : '–'}</b>
              <small>×{pile.length}</small>
            </span>
          )
        })}
      </div>

      {/* Mercado */}
      <div className="jp-section-head">
        <span>Mercado</span>
        <span className="muted small">Mazo: {plural(round.deck.length, 'carta', 'cartas')}</span>
      </div>
      <div className="jp-market">
        {round.market.map((c, i) => (
          <Card key={i} card={c} selected={selM.includes(i)} onClick={() => tapMarket(i)} />
        ))}
      </div>

      {/* Mi zona */}
      <div className="jp-section-head">
        <span>Tu mano</span>
        <span className="muted small">
          {me.hand.length}/{HAND_LIMIT} · 💰 {myScore.tokens}
          {me.bonus.length > 0 && ` + ${myScore.bonus} de bonus`}
        </span>
      </div>
      <div className="jp-hand">
        {hand.length === 0 && <p className="muted small jp-empty">Sin cartas en la mano.</p>}
        {hand.map(({ c, i }) => (
          <Card key={i} card={c} small selected={selH.includes(i)} onClick={() => tapHand(i)} />
        ))}
      </div>
      <div className="jp-herd card">
        <span className="jp-herd-icon">🐫</span>
        <span className="jp-herd-text">
          <strong>{plural(me.herd, 'camello', 'camellos')}</strong>
          <span className="muted small block">Sirven para cambiar sin dar cartas de la mano</span>
        </span>
        {myTurn && me.herd > 0 && (
          <span className="jp-stepper">
            <button className="icon-btn" onClick={() => setCamels(Math.max(0, camels - 1))} disabled={!camels} aria-label="Dar un camello menos">
              −
            </button>
            <b>{camels}</b>
            <button
              className="icon-btn"
              onClick={() => {
                if (selM.some((k) => round.market[k] === 'camel')) setSelM([])
                setCamels(Math.min(me.herd, camels + 1))
              }}
              disabled={camels >= me.herd}
              aria-label="Dar un camello más"
            >
              +
            </button>
          </span>
        )}
      </div>

      {game.status === 'playing' && j.myTurn && (
        <>
          <p className="go-hint">{action.hint}</p>
          {action.label && (
            <div className="go-actions is-confirming">
              <button
                className="btn btn-elev"
                onClick={() => {
                  setSelM([])
                  setSelH([])
                  setCamels(0)
                }}
              >
                Limpiar
              </button>
              <button className="btn btn-primary btn-grow" disabled={!action.run || busy} onClick={doAction}>
                {action.label}
              </button>
            </div>
          )}
        </>
      )}

      {game.status === 'playing' && (
        <button className="link-btn center jp-resign" onClick={() => setConfirmResign(true)}>
          Rendirse
        </button>
      )}

      <JaipurHelp open={help} onClose={() => setHelp(false)} />
      <ConfirmSheet
        open={confirmResign}
        tone="wood"
        title="¿Rendirse?"
        message={`La partida termina y gana ${oppName}.`}
        confirmLabel="Rendirme"
        destructive
        onConfirm={() => void run(j.resign().then(() => null))}
        onClose={() => setConfirmResign(false)}
      />
    </Page>
  )
}

type Act = { label?: string; hint: string; run?: 'take' | 'camels' | 'exchange' | 'sell' }

/** Qué jugada forma la selección actual, y si es válida. */
function jaipurAction({
  round,
  uid,
  selM,
  selH,
  camels,
}: {
  round: NonNullable<ReturnType<typeof useJaipur>['game']>['round']
  uid: string
  selM: number[]
  selH: number[]
  camels: number
}): Act {
  {
    const me = round.players[uid]
    const market = selM.map((i) => round.market[i])
    if (!selM.length && !selH.length && !camels) {
      return { hint: 'Toca cartas del mercado para cogerlas, o cartas de tu mano para venderlas.' }
    }
    if (market.length && market.every((c) => c === 'camel')) {
      return { label: `Coger ${plural(market.length, 'camello', 'camellos')}`, hint: 'Los camellos van todos juntos a tu corral.', run: 'camels' }
    }
    if (selM.length === 1 && !selH.length && !camels) {
      const c = market[0]
      if (me.hand.length >= HAND_LIMIT) {
        return { label: `Coger ${CARD_INFO[c].name.toLowerCase()}`, hint: `Ya tienes ${HAND_LIMIT} cartas: vende o cambia antes.` }
      }
      return {
        label: `Coger ${CARD_INFO[c].emoji} ${CARD_INFO[c].name.toLowerCase()}`,
        hint: 'O elige más cartas del mercado y cartas tuyas para hacer un cambio.',
        run: 'take',
      }
    }
    if (selM.length) {
      if (!selH.length && !camels) {
        return { label: 'Cambiar', hint: `Para cambiar, elige también ${selM.length} cartas de tu mano o camellos para dar.` }
      }
      const err = exchangeError(round, uid, selM, selH, camels)
      return { label: `Cambiar ${selM.length} por ${selH.length + camels}`, hint: err ?? 'Las cartas que das quedan en el mercado.', run: err ? undefined : 'exchange' }
    }
    if (camels) return { hint: 'Los camellos solo se usan para cambiar: elige también cartas del mercado.' }
    const goods = new Set(selH.map((i) => me.hand[i]))
    if (goods.size > 1) return { hint: 'Para vender, elige cartas de un solo tipo.' }
    const good = me.hand[selH[0]] as JaipurGood
    const n = selH.length
    const err = sellError(round, uid, good, n)
    const tokens = round.piles[good].slice(0, n)
    const rupees = tokens.reduce((a, b) => a + b, 0)
    const bonus = n >= 3 ? ' + ficha de bonus' : ''
    return {
      label: `Vender ${n} ${CARD_INFO[good].emoji}`,
      hint: err ?? `Te llevas ${rupees} rupias${bonus}.${tokens.length < n ? ' (Ya no quedan fichas para todas.)' : ''}`,
      run: err ? undefined : 'sell',
    }
  }
}

function Card({ card, selected, small, onClick }: { card: JaipurCard; selected?: boolean; small?: boolean; onClick?: () => void }) {
  const info = CARD_INFO[card]
  return (
    <button
      className={`jp-card jp-${card} ${selected ? 'is-selected' : ''} ${small ? 'is-small' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={info.name}
    >
      <span className="jp-card-emoji">{info.emoji}</span>
      <span className="jp-card-name">{info.name}</span>
    </button>
  )
}

function Seals({
  game,
  me,
  nameOf,
}: {
  game: NonNullable<ReturnType<typeof useJaipur>['game']>
  me: string
  nameOf: (id: string) => string
}) {
  const opp = game.players.find((p) => p !== me)!
  const dots = (n: number) => '●'.repeat(n) + '○'.repeat(Math.max(0, 2 - n))
  return (
    <span className="jp-seals">
      Ronda {game.roundNo} · Tú <b>{dots(game.seals[me] ?? 0)}</b> · {nameOf(opp)} <b>{dots(game.seals[opp] ?? 0)}</b>
    </span>
  )
}

/** Resumen al terminar una ronda o la partida. */
function RoundOver({ j, onNew }: { j: ReturnType<typeof useJaipur>; onNew: () => void }) {
  const game = j.game!
  const toast = useToast()
  const opp = j.opponent!
  const result = game.lastRound
  const finished = game.status === 'finished'
  const iWon = (finished ? game.winner : result?.winner) === j.me
  const starter = result ? game.players.find((p) => p !== result.winner)! : j.me

  if (game.resigned) {
    return (
      <div className="go-status is-finished">
        <span className="go-status-icon">🏳️</span>
        <span>
          <strong>{game.resigned === j.me ? `Te has rendido: gana ${j.nameOf(opp)}` : `${j.nameOf(opp)} se ha rendido: ¡ganas!`}</strong>
          <span className="muted small block">
            <button className="link-btn" onClick={onNew}>
              Empezar otra partida
            </button>
          </span>
        </span>
      </div>
    )
  }
  if (!result) return null
  const rows = game.players.map((p) => {
    const s = scoreOf(game.round.players[p])
    return { p, tokens: s.tokens, bonus: s.bonus, camel: result.camels === p ? CAMEL_BONUS : 0, total: result.points[p] }
  })

  return (
    <div className="card jp-result">
      <div className="jp-result-title">
        <span>{finished ? '🏆' : iWon ? '🎉' : '🐪'}</span>
        <strong>
          {finished
            ? iWon
              ? '¡Has ganado la partida!'
              : `${j.nameOf(opp)} gana la partida`
            : iWon
              ? `Ganas la ronda ${game.roundNo}`
              : `${j.nameOf(opp)} gana la ronda ${game.roundNo}`}
        </strong>
      </div>
      <table className="jp-table">
        <thead>
          <tr>
            <th />
            {rows.map((r) => (
              <th key={r.p}>{j.nameOf(r.p)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Fichas</td>
            {rows.map((r) => (
              <td key={r.p}>{r.tokens}</td>
            ))}
          </tr>
          <tr>
            <td>Bonus</td>
            {rows.map((r) => (
              <td key={r.p}>{r.bonus}</td>
            ))}
          </tr>
          <tr>
            <td>🐫 Más camellos</td>
            {rows.map((r) => (
              <td key={r.p}>{r.camel || '–'}</td>
            ))}
          </tr>
          <tr className="jp-total">
            <td>Total</td>
            {rows.map((r) => (
              <td key={r.p}>{r.total}</td>
            ))}
          </tr>
        </tbody>
      </table>
      {!finished &&
        (starter === j.me ? (
          <button className="btn btn-primary btn-block" onClick={() => void j.nextRound().catch((e) => toast(saveError(e)))}>
            Empezar la ronda {game.roundNo + 1}
          </button>
        ) : (
          <p className="muted small center">Empieza la siguiente ronda {j.nameOf(starter)}.</p>
        ))}
      {finished && (
        <button className="btn btn-primary btn-block" onClick={onNew}>
          Nueva partida
        </button>
      )}
    </div>
  )
}
