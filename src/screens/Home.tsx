import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Page } from '../components/Page'
import { QuickAdd } from '../components/QuickAdd'
import { useUser } from '../lib/auth'
import { CATEGORY_BY_ID } from '../lib/categories'
import { useData } from '../lib/data'
import { usePhoto } from '../lib/photos'
import { usePrefs } from '../lib/prefs'
import { formatTime, recipeTint } from '../lib/recipes'
import { navigate, paths, switchTab } from '../lib/router'
import { sortItems, useShoppingActions } from '../lib/shopping'
import type { Recipe } from '../lib/types'
import { RecipeCard } from './Recipes'

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
  const { items, recipes } = useData()
  const { name } = usePrefs()
  const user = useUser()
  const { toggle } = useShoppingActions()
  const [seed, setSeed] = useState(() => Math.random())

  const pending = useMemo(() => sortItems(items.filter((i) => !i.checked)), [items])
  const done = items.length - pending.length

  const latest = useMemo(
    () => [...recipes].sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt).slice(0, 8),
    [recipes],
  )

  // Sugerencia del día: prioriza favoritas y se puede volver a tirar el dado.
  const suggestion = useMemo(() => {
    if (!recipes.length) return null
    const favs = recipes.filter((r) => r.favorite)
    const pool = favs.length >= 3 ? favs : recipes
    return pool[Math.floor(seed * pool.length) % pool.length]
  }, [recipes, seed])

  const title = name ? `${greeting()}, ${name}` : greeting()

  return (
    <Page title="Inicio" className="theme-home home-page" hideLargeTitle overlay>
      <header className="home-hero">
        <div className="home-hero-top">
          <div>
            <p className="home-date capitalize">{dateFmt.format(new Date())}</p>
            <h1>{title}</h1>
          </div>
          <button className="home-avatar" onClick={() => switchTab(paths.settings)} aria-label="Ajustes">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span>{(name || '?').charAt(0).toUpperCase()}</span>
            )}
          </button>
        </div>
        <div className="home-stats">
          <button className="stat stat-list" onClick={() => switchTab(paths.list)}>
            <span className="stat-icon">
              <Icon name="cart" size={20} />
            </span>
            <span className="stat-value">{pending.length}</span>
            <span className="stat-label">por comprar</span>
          </button>
          <button className="stat stat-recipes" onClick={() => switchTab(paths.recipes)}>
            <span className="stat-icon">
              <Icon name="book" size={20} />
            </span>
            <span className="stat-value">{recipes.length}</span>
            <span className="stat-label">{recipes.length === 1 ? 'receta' : 'recetas'}</span>
          </button>
        </div>
      </header>

      {/* ¿Qué cocinamos hoy? */}
      <section className="home-block">
        <div className="home-section-head">
          <h2>¿Qué cocinamos hoy?</h2>
          {recipes.length > 1 && (
            <button className="icon-btn" onClick={() => setSeed(Math.random())} aria-label="Otra sugerencia">
              <Icon name="dice" size={20} />
            </button>
          )}
        </div>
        {suggestion ? (
          <FeaturedRecipe recipe={suggestion} />
        ) : (
          <button className="ai-hero" onClick={() => navigate(user ? paths.recipeAi : paths.recipeNew)}>
            <span className="ai-hero-emoji">🧑‍🍳</span>
            <strong>Añadid vuestra primera receta</strong>
            <span>{user ? 'Describe un plato y la IA la escribe por vosotros.' : 'Y aquí os propondremos qué cocinar.'}</span>
          </button>
        )}
      </section>

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

      {user && recipes.length > 0 && (
        <button className="ai-banner home-ai-banner" onClick={() => navigate(paths.recipeAi)}>
          <span className="ai-teaser-icon">
            <Icon name="sparkles" size={20} />
          </span>
          <span className="ai-banner-text">
            <strong>Crear receta con IA</strong>
            <span>Dile qué te apetece o qué tienes en la nevera</span>
          </span>
          <Icon name="chevron" size={18} />
        </button>
      )}

      {latest.length > 0 && (
        <section className="home-block home-recipes">
          <div className="home-section-head">
            <h2>Vuestras recetas</h2>
            <button className="link-btn" onClick={() => switchTab(paths.recipes)}>
              Ver todas
            </button>
          </div>
          <div className="h-scroll">
            {latest.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
            <button className="recipe-card recipe-card-new" onClick={() => navigate(user ? paths.recipeAi : paths.recipeNew)}>
              <Icon name="plus" size={26} />
              <span>Nueva</span>
            </button>
          </div>
        </section>
      )}
    </Page>
  )
}

function FeaturedRecipe({ recipe }: { recipe: Recipe }) {
  const photo = usePhoto(recipe.photo)
  const meta = [formatTime(recipe.time), recipe.servings && `${recipe.servings} raciones`, `${recipe.ingredients.length} ingredientes`]
    .filter(Boolean)
    .join(' · ')
  return (
    <button className={`featured ${recipe.photo ? 'has-photo' : recipeTint(recipe)}`} onClick={() => navigate(paths.recipe(recipe.id))}>
      {photo ? <img src={photo} alt="" /> : <span className="featured-emoji">{recipe.emoji}</span>}
      <span className="featured-info">
        <strong>{recipe.title}</strong>
        <span>{meta}</span>
      </span>
    </button>
  )
}
