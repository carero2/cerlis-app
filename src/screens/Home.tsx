import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Page } from '../components/Page'
import { QuickAdd } from '../components/QuickAdd'
import { SyncBadge } from '../components/SyncBadge'
import { CATEGORY_BY_ID } from '../lib/categories'
import { useData } from '../lib/data'
import { usePrefs } from '../lib/prefs'
import { formatTime, recipeTint } from '../lib/recipes'
import { navigate, paths, switchTab } from '../lib/router'
import { sortItems } from '../lib/shopping'
import { RecipeCard } from './Recipes'

function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

const dateFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

export function Home() {
  const { items, recipes, sync } = useData()
  const { name } = usePrefs()
  const [seed, setSeed] = useState(() => Math.random())

  const pending = useMemo(() => sortItems(items.filter((i) => !i.checked)), [items])
  const done = items.length - pending.length
  const progress = items.length ? done / items.length : 0

  const favorites = useMemo(
    () => [...recipes].sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt).slice(0, 8),
    [recipes],
  )

  // Sugerencia del día: prioriza favoritas, y se puede volver a tirar el dado.
  const suggestion = useMemo(() => {
    if (!recipes.length) return null
    const pool = recipes.filter((r) => r.favorite).length >= 3 ? recipes.filter((r) => r.favorite) : recipes
    return pool[Math.floor(seed * pool.length) % pool.length]
  }, [recipes, seed])

  const today = dateFmt.format(new Date())

  return (
    <Page
      title={name ? `${greeting()}, ${name}` : greeting()}
      className="theme-home"
      subtitle={
        <span className="home-subtitle">
          <span className="capitalize">{today}</span>
          <SyncBadge state={sync} />
        </span>
      }
    >
      {/* Lista de la compra */}
      <section className="home-card home-list">
        <button className="home-card-head" onClick={() => switchTab(paths.list)}>
          <ProgressRing value={progress} pending={pending.length} empty={items.length === 0} />
          <span className="home-card-title">
            <strong>Lista de la compra</strong>
            <span className="muted">
              {items.length === 0
                ? 'Vacía por ahora'
                : pending.length === 0
                  ? '¡Todo comprado! 🎉'
                  : `${pending.length} pendiente${pending.length === 1 ? '' : 's'}${done ? ` · ${done} en el carrito` : ''}`}
            </span>
          </span>
          <Icon name="chevron" size={18} className="muted" />
        </button>

        {pending.length > 0 && (
          <div className="home-preview">
            {pending.slice(0, 6).map((i) => (
              <span key={i.id} className="preview-chip">
                <span>{CATEGORY_BY_ID[i.category]?.emoji}</span>
                {i.name}
                {i.quantity && <em>{i.quantity}</em>}
              </span>
            ))}
            {pending.length > 6 && <span className="preview-chip preview-more">+{pending.length - 6}</span>}
          </div>
        )}
        <QuickAdd compact />
      </section>

      {/* Qué cocinamos */}
      <section className="home-card home-cook">
        <div className="home-section-head">
          <h2>¿Qué cocinamos hoy?</h2>
          {recipes.length > 1 && (
            <button className="icon-btn" onClick={() => setSeed(Math.random())} aria-label="Otra sugerencia">
              <Icon name="dice" size={20} />
            </button>
          )}
        </div>
        {suggestion ? (
          <button className="suggestion" onClick={() => navigate(paths.recipe(suggestion.id))}>
            <span className={`suggestion-art ${recipeTint(suggestion)}`}>{suggestion.emoji}</span>
            <span className="suggestion-text">
              <strong>{suggestion.title}</strong>
              <span className="muted small">
                {[formatTime(suggestion.time), `${suggestion.ingredients.length} ingredientes`].filter(Boolean).join(' · ')}
              </span>
            </span>
            <Icon name="chevron" size={18} className="muted" />
          </button>
        ) : (
          <button className="suggestion suggestion-empty" onClick={() => navigate(paths.recipeNew)}>
            <span className="suggestion-art tint-peach">📝</span>
            <span className="suggestion-text">
              <strong>Añade vuestra primera receta</strong>
              <span className="muted small">Y aquí os propondremos qué cocinar</span>
            </span>
            <Icon name="plus" size={18} className="muted" />
          </button>
        )}
      </section>

      {favorites.length > 0 && (
        <section className="home-recipes">
          <div className="home-section-head">
            <h2>Vuestras recetas</h2>
            <button className="link-btn" onClick={() => switchTab(paths.recipes)}>
              Ver todas
            </button>
          </div>
          <div className="h-scroll">
            {favorites.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
            <button className="recipe-card recipe-card-new" onClick={() => navigate(paths.recipeNew)}>
              <Icon name="plus" size={26} />
              <span>Nueva</span>
            </button>
          </div>
        </section>
      )}

      <section className="home-card home-ai">
        <span className="ai-teaser-icon">
          <Icon name="sparkles" size={20} />
        </span>
        <span>
          <strong>Muy pronto: recetas con IA</strong>
          <span className="muted small block">
            Pega un enlace, un texto o una foto y Cerlis extraerá los ingredientes y la preparación por vosotros.
          </span>
        </span>
      </section>
    </Page>
  )
}

function ProgressRing({ value, pending, empty }: { value: number; pending: number; empty: boolean }) {
  const r = 20
  const c = 2 * Math.PI * r
  return (
    <span className="ring">
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden>
        <circle cx="26" cy="26" r={r} className="ring-track" />
        <circle
          cx="26"
          cy="26"
          r={r}
          className="ring-value"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
          transform="rotate(-90 26 26)"
        />
      </svg>
      <span className="ring-label">
        {empty ? <Icon name="cart" size={20} /> : pending === 0 ? <Icon name="check" size={20} strokeWidth={2.6} /> : pending}
      </span>
    </span>
  )
}
