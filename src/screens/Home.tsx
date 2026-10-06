import { useCallback, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Page } from '../components/Page'
import { PhotoViewer } from '../components/Photo'
import { QuickAdd } from '../components/QuickAdd'
import { useUser } from '../lib/auth'
import { CATEGORY_BY_ID } from '../lib/categories'
import { countdownDateFmt, remaining, useNow } from '../lib/countdown'
import { useData } from '../lib/data'
import { usePhoto } from '../lib/photos'
import { setPrefs, usePrefs } from '../lib/prefs'
import { formatTime, recipeTint } from '../lib/recipes'
import { navigate, paths, switchTab } from '../lib/router'
import { sortItems, useShoppingActions } from '../lib/shopping'
import type { HomeSettings, Recipe } from '../lib/types'

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
  const { items, recipes, home } = useData()
  const { name, hideHomeTip } = usePrefs()
  const user = useUser()
  const { toggle } = useShoppingActions()
  const now = useNow()
  const [viewer, setViewer] = useState(false)
  const closeViewer = useCallback(() => setViewer(false), [])
  const heroPhoto = usePhoto(home.photo)

  const pending = useMemo(() => sortItems(items.filter((i) => !i.checked)), [items])
  const done = items.length - pending.length
  const countdown = home.countdown && !remaining(home.countdown.date, now).expired ? home.countdown : undefined
  const showTip = !hideHomeTip && !home.photo && !home.message && !home.countdown

  return (
    <Page title="Inicio" className="theme-home home-page" hideLargeTitle overlay>
      <header className={`home-hero ${heroPhoto ? 'has-photo' : ''}`}>
        {heroPhoto && (
          <button className="home-hero-photo" onClick={() => setViewer(true)} aria-label="Ver foto">
            <img src={heroPhoto} alt="" />
          </button>
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
      </header>
      {heroPhoto && <PhotoViewer src={viewer ? heroPhoto : null} onClose={closeViewer} />}

      <div className="home-feed">
        {home.message && <MessageCard message={home.message} />}
        {countdown && <CountdownCard countdown={countdown} now={now} />}

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
                        <span className="home-item-emoji">{CATEGORY_BY_ID[i.category]?.emoji}</span>
                      )}
                      <span className="home-item-name">{i.name}</span>
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

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <span className="countdown-unit">
      <span className="countdown-value">{value}</span>
      <span className="countdown-label">{label}</span>
    </span>
  )
}

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
