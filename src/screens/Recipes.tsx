import { useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { Page } from '../components/Page'
import { normalize } from '../lib/categories'
import { useData } from '../lib/data'
import { formatTime, recipeTint } from '../lib/recipes'
import { navigate, paths } from '../lib/router'
import type { Recipe } from '../lib/types'

type Filter = { kind: 'all' } | { kind: 'fav' } | { kind: 'tag'; tag: string }

export function Recipes() {
  const { recipes, store } = useData()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>({ kind: 'all' })

  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    recipes.forEach((r) => r.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
  }, [recipes])

  const visible = useMemo(() => {
    const q = normalize(query)
    return recipes
      .filter((r) => {
        if (filter.kind === 'fav' && !r.favorite) return false
        if (filter.kind === 'tag' && !r.tags.includes(filter.tag)) return false
        if (!q) return true
        return (
          normalize(r.title).includes(q) ||
          r.tags.some((t) => normalize(t).includes(q)) ||
          r.ingredients.some((i) => normalize(i).includes(q))
        )
      })
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt)
  }, [recipes, query, filter])

  const isActive = (f: Filter) =>
    f.kind === filter.kind && (f.kind !== 'tag' || (filter.kind === 'tag' && filter.tag === f.tag))

  return (
    <Page
      title="Recetas"
      className="theme-recipes"
      subtitle={recipes.length ? `${recipes.length} receta${recipes.length === 1 ? '' : 's'} en vuestro recetario` : undefined}
      right={
        <button className="nav-btn nav-icon nav-accent" onClick={() => navigate(paths.recipeNew)} aria-label="Nueva receta">
          <Icon name="plus" size={24} />
        </button>
      }
    >
      {recipes.length === 0 ? (
        <EmptyState
          emoji="📖"
          title="Vuestro recetario está vacío"
          action={
            <button className="btn btn-primary" onClick={() => navigate(paths.recipeNew)}>
              <Icon name="plus" size={18} /> Añadir la primera receta
            </button>
          }
        >
          Guarda aquí vuestros platos favoritos con sus ingredientes y pasos. Desde cada receta podréis mandar los
          ingredientes a la lista de la compra.
        </EmptyState>
      ) : (
        <>
          <div className="search">
            <Icon name="search" size={18} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar recetas o ingredientes"
              aria-label="Buscar recetas"
            />
            {query && (
              <button className="search-clear" onClick={() => setQuery('')} aria-label="Borrar búsqueda">
                <Icon name="x" size={14} strokeWidth={3} />
              </button>
            )}
          </div>

          <div className="chips-scroll">
            <button className={`chip ${isActive({ kind: 'all' }) ? 'is-selected' : ''}`} onClick={() => setFilter({ kind: 'all' })}>
              Todas
            </button>
            <button className={`chip ${isActive({ kind: 'fav' }) ? 'is-selected' : ''}`} onClick={() => setFilter({ kind: 'fav' })}>
              <Icon name="heart" size={14} filled /> Favoritas
            </button>
            {tags.map((t) => (
              <button
                key={t}
                className={`chip ${isActive({ kind: 'tag', tag: t }) ? 'is-selected' : ''}`}
                onClick={() => setFilter(isActive({ kind: 'tag', tag: t }) ? { kind: 'all' } : { kind: 'tag', tag: t })}
              >
                {t}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyState emoji="🔍" title="Sin resultados">
              No hay recetas que coincidan{query ? ` con “${query}”` : ''}.
            </EmptyState>
          ) : (
            <div className="recipe-grid">
              {visible.map((r) => (
                <RecipeCard key={r.id} recipe={r} onToggleFav={() => void store.updateRecipe(r.id, { favorite: !r.favorite })} />
              ))}
            </div>
          )}

          <button className="ai-teaser" disabled>
            <span className="ai-teaser-icon">
              <Icon name="sparkles" size={20} />
            </span>
            <span>
              <strong>Importar con IA</strong>
              <span className="muted">Próximamente: pega un enlace o una foto y se rellena sola.</span>
            </span>
          </button>
        </>
      )}
    </Page>
  )
}

export function RecipeCard({ recipe, onToggleFav }: { recipe: Recipe; onToggleFav?: () => void }) {
  const time = formatTime(recipe.time)
  return (
    <div className="recipe-card" role="link" tabIndex={0} onClick={() => navigate(paths.recipe(recipe.id))}
      onKeyDown={(e) => e.key === 'Enter' && navigate(paths.recipe(recipe.id))}>
      <div className={`recipe-card-art ${recipeTint(recipe)}`}>
        <span>{recipe.emoji}</span>
        {onToggleFav && (
          <button
            className={`fav-btn ${recipe.favorite ? 'is-fav' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggleFav()
            }}
            aria-label={recipe.favorite ? 'Quitar de favoritas' : 'Marcar como favorita'}
          >
            <Icon name="heart" size={18} filled={recipe.favorite} />
          </button>
        )}
      </div>
      <div className="recipe-card-body">
        <h3>{recipe.title}</h3>
        <div className="recipe-card-meta">
          {time && (
            <span>
              <Icon name="clock" size={13} /> {time}
            </span>
          )}
          <span>{recipe.ingredients.length} ingred.</span>
        </div>
      </div>
    </div>
  )
}
