import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Page } from '../components/Page'
import { QuickAdd } from '../components/QuickAdd'
import { useUser } from '../lib/auth'
import { fromKey, relativeDay, timeLabel, upcoming } from '../lib/calendar'
import { countdownDateFmt, remaining, useNow } from '../lib/countdown'
import { useData } from '../lib/data'
import { useMyGoTurn } from '../lib/goGame'
import { usePeople } from '../lib/people'
import { useShopConfig } from '../lib/shopConfig'
import { usePhoto } from '../lib/photos'
import { setPrefs, usePrefs } from '../lib/prefs'
import { formatTime, recipeTint } from '../lib/recipes'
import { navigate, paths, switchTab } from '../lib/router'
import { sortItems, useShoppingActions } from '../lib/shopping'
import type { CalendarEvent, HomeSettings, Recipe } from '../lib/types'

function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

const dateFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const PREVIEW = 5

export function Home() {
  const { items, recipes, home, events } = useData()
  const { name, hideHomeTip } = usePrefs()
  const user = useUser()
  const { toggle } = useShoppingActions()
  const { categoryOf, lists, listOf } = useShopConfig()
  const listName = (id: string) => lists.find((l) => l.id === id)
  const now = useNow()
  const heroPhoto = usePhoto(home.photo)
  const goTurn = useMyGoTurn()
  const { me, people } = usePeople()
  const partnerName = people.find((p) => p.id !== me)?.name

  const pending = useMemo(() => sortItems(items.filter((i) => !i.checked)), [items])
  const done = items.length - pending.length
  const countdown = home.countdown && !remaining(home.countdown.date, now).expired ? home.countdown : undefined
  const showTip = !hideHomeTip && !home.photo && !home.message && !home.countdown
  // Con foto, la cuenta atrás va encima de ella (arriba o abajo); sin foto, como tarjeta.
  const glassPos = heroPhoto && countdown ? (countdown.position ?? 'bottom') : null

  return (
    <Page title="Inicio" className="theme-home home-page" hideLargeTitle overlay>
      <header className={`home-hero ${heroPhoto ? 'has-photo' : ''} ${glassPos ? `glass-${glassPos}` : ''}`}>
        {heroPhoto && (
          <div className="home-hero-photo">
            <img src={heroPhoto} alt="" />
          </div>
        )}
        <div className="home-hero-top">
          <button className="home-avatar" onClick={() => switchTab(paths.settings)} aria-label="Ajustes">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span>{(name || '?').charAt(0).toUpperCase()}</span>
            )}
          </button>
        </div>
        {glassPos === 'top' && <CountdownGlass countdown={countdown!} now={now} />}
        <div className="home-hero-text">
          <p className="home-date capitalize">{dateFmt.format(now)}</p>
          <h1>{name ? `${greeting(new Date(now))}, ${name}` : greeting(new Date(now))}</h1>
          <div className="home-pills">
            <button className="pill" onClick={() => switchTab(paths.list)}>
              <Icon name="cart" size={15} /> {pending.length} por comprar
            </button>
            <button className="pill" onClick={() => switchTab(paths.recipes)}>
              <Icon name="book" size={15} /> {recipes.length} {recipes.length === 1 ? 'receta' : 'recetas'}
            </button>
          </div>
        </div>
        {glassPos === 'bottom' && <CountdownGlass countdown={countdown!} now={now} />}
      </header>

      <div className="home-feed">
        {home.message && <MessageCard message={home.message} />}
        {countdown && !glassPos && <CountdownCard countdown={countdown} now={now} />}

        {showTip && (
          <div className="home-tip">
            <button className="home-tip-main" onClick={() => switchTab(paths.settings)}>
              <span className="home-tip-icons">📸 💌 ⏳</span>
              <span>
                <strong>Personalizad vuestro inicio</strong>
                <span className="muted small block">Una foto de los dos, un mensaje o una cuenta atrás.</span>
              </span>
            </button>
            <button className="icon-btn" onClick={() => setPrefs({ hideHomeTip: true })} aria-label="Ocultar">
              <Icon name="x" size={16} />
            </button>
          </div>
        )}

        {goTurn && (
          <button className="home-go" onClick={() => switchTab(paths.games)}>
            <span className="home-go-stones" aria-hidden>
              <i className="stone-dot big black" />
              <i className="stone-dot big white" />
            </span>
            <span className="home-go-text">
              <strong>Te toca mover</strong>
              <span className="muted small block">{partnerName ?? 'Tu pareja'} ya ha jugado en el Go</span>
            </span>
            <Icon name="chevron" size={18} />
          </button>
        )}

        <AgendaBlock events={events} />

        {/* Lista de la compra */}
        <section className="home-block">
          <div className="home-section-head">
            <h2>Para comprar</h2>
            {items.length > 0 && (
              <button className="link-btn link-green" onClick={() => switchTab(paths.list)}>
                Ver lista{done ? ` · ${done} en el carrito` : ''}
              </button>
            )}
          </div>
          <div className="card home-list-card">
            {pending.length === 0 ? (
              <p className="home-list-empty">{items.length ? '¡Todo comprado! 🎉' : 'Nada pendiente. Añade lo que haga falta 👇'}</p>
            ) : (
              <ul>
                {pending.slice(0, PREVIEW).map((i) => (
                  <li key={i.id}>
                    <button className="home-item" onClick={() => void toggle(i)}>
                      <span className="checkbox checkbox-small">
                        <Icon name="check" size={13} strokeWidth={3} />
                      </span>
                      {i.photo ? (
                        <img className="home-item-thumb" src={i.photo.thumb} alt="" />
                      ) : (
                        <span className="home-item-emoji">{categoryOf(i.category).emoji}</span>
                      )}
                      <span className="home-item-name">{i.name}</span>
                      {lists.length > 1 && (
                        <span className="home-item-list">{listName(listOf(i))?.emoji ?? listName(listOf(i))?.name}</span>
                      )}
                      {i.quantity && <span className="qty-pill">{i.quantity}</span>}
                    </button>
                  </li>
                ))}
                {pending.length > PREVIEW && (
                  <li>
                    <button className="home-more" onClick={() => switchTab(paths.list)}>
                      y {pending.length - PREVIEW} más
                      <Icon name="chevron" size={14} />
                    </button>
                  </li>
                )}
              </ul>
            )}
            <div className="home-list-add">
              <QuickAdd compact />
            </div>
          </div>
        </section>

        <RecipesBlock recipes={recipes} aiAvailable={!!user} />
      </div>
    </Page>
  )
}

function MessageCard({ message }: { message: NonNullable<HomeSettings['message']> }) {
  return (
    <figure className="message-card">
      <span className="message-quote" aria-hidden>
        “
      </span>
      <blockquote>{message.text}</blockquote>
      {message.author && <figcaption>— {message.author}</figcaption>}
    </figure>
  )
}

function CountdownCard({ countdown, now }: { countdown: NonNullable<HomeSettings['countdown']>; now: number }) {
  const r = remaining(countdown.date, now)
  return (
    <section className="countdown-card">
      <div className="countdown-head">
        <span className="countdown-emoji">
          <Icon name="clock" size={22} />
        </span>
        <span>
          <strong>{countdown.title}</strong>
          <span className="countdown-date capitalize">{countdownDateFmt.format(countdown.date)}</span>
        </span>
      </div>
      {r.arrived ? (
        <p className="countdown-arrived">¡Ha llegado el día! 🎉</p>
      ) : (
        <>
          <div className="countdown-units">
            {r.days > 0 && <Unit value={r.days} label={r.days === 1 ? 'día' : 'días'} />}
            <Unit value={r.hours} label={r.hours === 1 ? 'hora' : 'horas'} />
            <Unit value={r.minutes} label="min" />
          </div>
          {r.days > 0 && <p className="countdown-total">o, lo que es lo mismo, {r.totalHours.toLocaleString('es-ES')} horas</p>}
        </>
      )}
    </section>
  )
}

/** Cuenta atrás translúcida que se superpone a la foto de Inicio. */
function CountdownGlass({ countdown, now }: { countdown: NonNullable<HomeSettings['countdown']>; now: number }) {
  const r = remaining(countdown.date, now)
  return (
    <section className="countdown-glass" aria-label={`Cuenta atrás: ${countdown.title}`}>
      <div className="glass-head">
        <Icon name="clock" size={16} />
        <strong>{countdown.title}</strong>
        <span className="glass-date capitalize">{glassDateFmt.format(countdown.date)}</span>
      </div>
      {r.arrived ? (
        <p className="glass-arrived">¡Ha llegado el día! 🎉</p>
      ) : (
        <div className="glass-units">
          {r.days > 0 && <GlassUnit value={r.days} label={r.days === 1 ? 'día' : 'días'} />}
          <GlassUnit value={r.hours} label={r.hours === 1 ? 'hora' : 'horas'} />
          <GlassUnit value={r.minutes} label="min" />
        </div>
      )}
    </section>
  )
}

const glassDateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })

function GlassUnit({ value, label }: { value: number; label: string }) {
  return (
    <span className="glass-unit">
      <span className="glass-value">{value}</span>
      <span className="glass-label">{label}</span>
    </span>
  )
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <span className="countdown-unit">
      <span className="countdown-value">{value}</span>
      <span className="countdown-label">{label}</span>
    </span>
  )
}

/** Próximos planes del calendario (solo si hay alguno en las próximas semanas). */
function AgendaBlock({ events }: { events: CalendarEvent[] }) {
  const next = useMemo(() => upcoming(events, 3, 30), [events])
  const { colorOf } = usePeople()
  if (!next.length) return null
  return (
    <section className="home-block home-agenda">
      <div className="home-section-head">
        <h2>Próximos planes</h2>
        <button className="link-btn" onClick={() => switchTab(paths.calendar)}>
          Calendario
        </button>
      </div>
      <div className="card agenda-card">
        {next.map((o) => (
          <button
            key={o.event.id + o.date}
            className="agenda-row"
            style={{ ['--ev' as string]: colorOf(o.event.who) }}
            onClick={() => switchTab(paths.calendarDay(o.date))}
          >
            <span className="agenda-date">
              <span className="agenda-num">{fromKey(o.date).getDate()}</span>
              <span className="agenda-dow">{weekdayFmt.format(fromKey(o.date))}</span>
            </span>
            <span className="agenda-text">
              <strong>{o.event.title}</strong>
              <span className="muted small">
                {relativeDay(o.date)} · {o.event.allDay ? (o.endDate !== o.date ? 'varios días' : 'todo el día') : timeLabel(o.event)}
              </span>
            </span>
            <Icon name="chevron" size={16} className="muted" />
          </button>
        ))}
      </div>
    </section>
  )
}

const weekdayFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short' })

/** Recetas en pequeño: sugerencia del día y un carrusel compacto. */
function RecipesBlock({ recipes, aiAvailable }: { recipes: Recipe[]; aiAvailable: boolean }) {
  const [seed, setSeed] = useState(() => Math.random())
  const newPath = aiAvailable ? paths.recipeAi : paths.recipeNew

  const latest = useMemo(
    () => [...recipes].sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt).slice(0, 10),
    [recipes],
  )
  const suggestion = useMemo(() => {
    if (!recipes.length) return null
    const favs = recipes.filter((r) => r.favorite)
    const pool = favs.length >= 3 ? favs : recipes
    return pool[Math.floor(seed * pool.length) % pool.length]
  }, [recipes, seed])

  return (
    <section className="home-block home-recipes">
      <div className="home-section-head">
        <h2>Recetas</h2>
        {recipes.length > 0 && (
          <button className="link-btn" onClick={() => switchTab(paths.recipes)}>
            Ver todas
          </button>
        )}
      </div>

      {suggestion ? (
        <div className="card today-card">
          <button className="today-main" onClick={() => navigate(paths.recipe(suggestion.id))}>
            <RecipeThumb recipe={suggestion} className="today-thumb" />
            <span className="today-text">
              <span className="today-kicker">¿Qué cocinamos hoy?</span>
              <strong>{suggestion.title}</strong>
              <span className="muted small">
                {[formatTime(suggestion.time), `${suggestion.ingredients.length} ingredientes`].filter(Boolean).join(' · ')}
              </span>
            </span>
          </button>
          {recipes.length > 1 && (
            <button className="icon-btn today-dice" onClick={() => setSeed(Math.random())} aria-label="Otra sugerencia">
              <Icon name="dice" size={20} />
            </button>
          )}
        </div>
      ) : (
        <button className="card today-card today-empty" onClick={() => navigate(newPath)}>
          <span className="today-thumb tint-peach">🧑‍🍳</span>
          <span className="today-text">
            <strong>Añadid vuestra primera receta</strong>
            <span className="muted small">{aiAvailable ? 'Describe un plato y la IA la escribe.' : 'Y aquí os propondremos qué cocinar.'}</span>
          </span>
          <Icon name="plus" size={18} className="muted" />
        </button>
      )}

      {latest.length > 1 && (
        <div className="h-scroll mini-scroll">
          {latest.map((r) => (
            <button key={r.id} className="mini-recipe" onClick={() => navigate(paths.recipe(r.id))}>
              <RecipeThumb recipe={r} className="mini-thumb" />
              <span className="mini-title">{r.title}</span>
            </button>
          ))}
          <button className="mini-recipe mini-new" onClick={() => navigate(newPath)}>
            <span className="mini-thumb">
              {aiAvailable ? <Icon name="sparkles" size={22} /> : <Icon name="plus" size={22} />}
            </span>
            <span className="mini-title">Nueva</span>
          </button>
        </div>
      )}
    </section>
  )
}

function RecipeThumb({ recipe, className }: { recipe: Recipe; className: string }) {
  return recipe.photo ? (
    <img className={className} src={recipe.photo.thumb} alt="" loading="lazy" />
  ) : (
    <span className={`${className} ${recipeTint(recipe)}`}>{recipe.emoji}</span>
  )
}
