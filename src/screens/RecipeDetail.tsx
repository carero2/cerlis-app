import { useCallback, useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { PhotoViewer } from '../components/Photo'
import { BackButton, NavIconButton, Page } from '../components/Page'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { normalize } from '../lib/categories'
import { useData } from '../lib/data'
import { usePhoto } from '../lib/photos'
import { formatTime, parseIngredient, recipeTint } from '../lib/recipes'
import { goBack, navigate, paths } from '../lib/router'
import { useShoppingActions } from '../lib/shopping'
import type { Recipe } from '../lib/types'

export function RecipeDetail({ id }: { id: string }) {
  const { recipes, store, ready } = useData()
  const recipe = recipes.find((r) => r.id === id)

  if (!recipe) {
    return (
      <Page title="Receta" left={<BackButton onClick={() => goBack(paths.recipes)} label="Recetas" />}>
        {ready && (
          <EmptyState emoji="🫥" title="Esta receta ya no existe">
            Puede que se haya borrado desde el otro dispositivo.
          </EmptyState>
        )}
      </Page>
    )
  }
  return <RecipeView recipe={recipe} onToggleFav={() => void store.updateRecipe(recipe.id, { favorite: !recipe.favorite })} />
}

function RecipeView({ recipe, onToggleFav }: { recipe: Recipe; onToggleFav: () => void }) {
  const [doneIngredients, setDoneIngredients] = useState<Set<number>>(new Set())
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set())
  const [shopOpen, setShopOpen] = useState(false)
  const cooking = useWakeLock()
  const photo = usePhoto(recipe.photo)
  const [viewer, setViewer] = useState(false)
  const closeViewer = useCallback(() => setViewer(false), [])
  const time = formatTime(recipe.time)

  const toggleIn = (set: Set<number>, i: number) => {
    const next = new Set(set)
    if (next.has(i)) next.delete(i)
    else next.add(i)
    return next
  }

  return (
    <Page
      title={recipe.title}
      className="theme-recipes recipe-page"
      hideLargeTitle
      overlay
      left={<BackButton onClick={() => goBack(paths.recipes)} label="Recetas" iconOnly />}
      right={
        <>
          <NavIconButton icon="heart" label="Favorita" active={recipe.favorite} onClick={onToggleFav} />
          <NavIconButton icon="edit" label="Editar" onClick={() => navigate(paths.recipeEdit(recipe.id))} />
        </>
      }
    >
      <div className={`recipe-hero ${recipeTint(recipe)} ${photo ? 'has-photo' : ''}`}>
        {photo ? (
          <button className="recipe-hero-photo" onClick={() => setViewer(true)} aria-label="Ver foto">
            <img src={photo} alt={recipe.title} />
          </button>
        ) : (
          <span className="recipe-hero-emoji">{recipe.emoji}</span>
        )}
      </div>
      <PhotoViewer src={viewer ? photo : null} alt={recipe.title} onClose={closeViewer} />

      <div className="recipe-head">
        <h1>{recipe.title}</h1>
        <div className="meta-row">
          {time && (
            <span className="meta-chip">
              <Icon name="clock" size={15} /> {time}
            </span>
          )}
          {recipe.servings && (
            <span className="meta-chip">
              <Icon name="users" size={15} /> {recipe.servings} {recipe.servings === 1 ? 'ración' : 'raciones'}
            </span>
          )}
          {recipe.tags.map((t) => (
            <span key={t} className="meta-chip meta-tag">
              {t}
            </span>
          ))}
        </div>
      </div>

      {cooking.supported && (
        <button className={`cook-toggle ${cooking.active ? 'is-on' : ''}`} onClick={cooking.toggle}>
          <Icon name="flame" size={18} />
          <span>{cooking.active ? 'Modo cocina activado · la pantalla no se apagará' : 'Activar modo cocina'}</span>
          <span className="switch" aria-hidden>
            <span />
          </span>
        </button>
      )}

      <section className="recipe-section">
        <div className="recipe-section-head">
          <h2>Ingredientes</h2>
          {recipe.ingredients.length > 0 && (
            <button className="btn btn-small btn-list" onClick={() => setShopOpen(true)}>
              <Icon name="cart" size={16} /> A la compra
            </button>
          )}
        </div>
        {recipe.ingredients.length === 0 ? (
          <p className="muted">Sin ingredientes todavía.</p>
        ) : (
          <ul className="card ingredient-list">
            {recipe.ingredients.map((ing, i) => (
              <li key={i}>
                <button
                  className={`ingredient ${doneIngredients.has(i) ? 'is-done' : ''}`}
                  onClick={() => setDoneIngredients((s) => toggleIn(s, i))}
                >
                  <span className="checkbox checkbox-small">
                    <Icon name="check" size={13} strokeWidth={3} />
                  </span>
                  <span>{ing}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="recipe-section">
        <div className="recipe-section-head">
          <h2>Preparación</h2>
          {doneSteps.size > 0 && (
            <span className="muted small">
              {doneSteps.size}/{recipe.steps.length}
            </span>
          )}
        </div>
        {recipe.steps.length === 0 ? (
          <p className="muted">Sin pasos todavía.</p>
        ) : (
          <ol className="steps">
            {recipe.steps.map((step, i) => (
              <li key={i}>
                <button className={`step ${doneSteps.has(i) ? 'is-done' : ''}`} onClick={() => setDoneSteps((s) => toggleIn(s, i))}>
                  <span className="step-num">{doneSteps.has(i) ? <Icon name="check" size={16} strokeWidth={3} /> : i + 1}</span>
                  <span className="step-text">{step}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {(recipe.notes || recipe.source) && (
        <section className="recipe-section">
          <h2>Notas</h2>
          <div className="card notes">
            {recipe.notes && <p>{recipe.notes}</p>}
            {recipe.source && (
              <a href={recipe.source} target="_blank" rel="noreferrer" className="source-link">
                <Icon name="link" size={16} /> {prettyUrl(recipe.source)}
              </a>
            )}
          </div>
        </section>
      )}

      <AddToListSheet recipe={recipe} open={shopOpen} onClose={() => setShopOpen(false)} />
    </Page>
  )
}

function AddToListSheet({ recipe, open, onClose }: { recipe: Recipe; open: boolean; onClose: () => void }) {
  const { items } = useData()
  const { addMany } = useShoppingActions()
  const toast = useToast()
  const parsed = useMemo(() => recipe.ingredients.map(parseIngredient), [recipe.ingredients])
  const inList = useMemo(() => new Set(items.filter((i) => !i.checked).map((i) => normalize(i.name))), [items])
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (open) setSelected(new Set(parsed.map((_, i) => i).filter((i) => !inList.has(normalize(parsed[i].name)))))
    // Solo al abrir: no queremos resetear la selección si la lista cambia mientras tanto.
  }, [open])

  const toggle = (i: number) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  const submit = async () => {
    const entries = [...selected].sort((a, b) => a - b).map((i) => ({ ...parsed[i], recipeId: recipe.id }))
    const added = await addMany(entries)
    onClose()
    toast(added ? `${added} producto${added === 1 ? '' : 's'} añadido${added === 1 ? '' : 's'} a la compra` : 'Ya estaba todo en la lista', {
      action: added ? { label: 'Ver lista', onClick: () => navigate(paths.list) } : undefined,
    })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="¿Qué os falta?"
      footer={
        <button className="btn btn-primary btn-block btn-list-solid" disabled={!selected.size} onClick={() => void submit()}>
          Añadir {selected.size || ''} a la compra
        </button>
      }
    >
      <p className="muted small sheet-intro">Desmarca lo que ya tengáis en casa.</p>
      <div className="row-between">
        <button className="link-btn" onClick={() => setSelected(new Set(parsed.map((_, i) => i)))}>
          Seleccionar todo
        </button>
        <button className="link-btn" onClick={() => setSelected(new Set())}>
          Ninguno
        </button>
      </div>
      <ul className="card ingredient-list">
        {parsed.map((p, i) => (
          <li key={i}>
            <button className={`ingredient ${selected.has(i) ? 'is-selected' : ''}`} onClick={() => toggle(i)}>
              <span className="checkbox checkbox-small">
                <Icon name="check" size={13} strokeWidth={3} />
              </span>
              <span className="ingredient-text">
                {p.name}
                {inList.has(normalize(p.name)) && <span className="tag-inline">ya en la lista</span>}
              </span>
              {p.quantity && <span className="qty-pill">{p.quantity}</span>}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

function prettyUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Mantiene la pantalla encendida mientras se cocina (Safari iOS 16.4+). */
function useWakeLock() {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const [sentinel, setSentinel] = useState<WakeLockSentinel | null>(null)
  const [wanted, setWanted] = useState(false)

  useEffect(() => {
    if (!wanted || !supported) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) return void lock.release()
        setSentinel(lock)
        lock.addEventListener('release', () => setSentinel(null))
      } catch {
        setWanted(false)
      }
    }
    // Al volver a la app el sistema libera el bloqueo: lo recuperamos.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && (!lock || lock.released)) void acquire()
    }
    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
      setSentinel(null)
    }
  }, [wanted, supported])

  return { supported, active: wanted && !!sentinel, toggle: () => setWanted((w) => !w) }
}
