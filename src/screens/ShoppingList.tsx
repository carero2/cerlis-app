import { useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { ItemSheet } from '../components/ItemSheet'
import { Page } from '../components/Page'
import { QuickAdd } from '../components/QuickAdd'
import { ConfirmSheet } from '../components/Sheet'
import { SwipeRow } from '../components/SwipeRow'
import { CATEGORIES } from '../lib/categories'
import { useData } from '../lib/data'
import { setPrefs, usePrefs } from '../lib/prefs'
import { navigate, paths } from '../lib/router'
import { sortItems, useShoppingActions } from '../lib/shopping'
import type { ShoppingItem } from '../lib/types'

export function ShoppingList() {
  const { items, recipes, store } = useData()
  const { groupByCategory, name: me } = usePrefs()
  const { toggle, remove } = useShoppingActions()
  const [editing, setEditing] = useState<ShoppingItem | null>(null)
  const [confirmClear, setConfirmClear] = useState<'checked' | 'all' | null>(null)
  const [showChecked, setShowChecked] = useState(true)

  const pending = useMemo(() => sortItems(items.filter((i) => !i.checked)), [items])
  const checked = useMemo(
    () => [...items.filter((i) => i.checked)].sort((a, b) => (b.checkedAt ?? 0) - (a.checkedAt ?? 0)),
    [items],
  )

  const groups = useMemo(() => {
    if (!groupByCategory) return [{ id: 'all', label: '', emoji: '', items: pending }]
    return CATEGORIES.map((c) => ({ ...c, items: pending.filter((i) => i.category === c.id) })).filter(
      (g) => g.items.length,
    )
  }, [pending, groupByCategory])

  const recipeTitle = (id?: string) => (id ? recipes.find((r) => r.id === id)?.title : undefined)
  const total = items.length
  const progress = total ? checked.length / total : 0

  const renderItem = (item: ShoppingItem) => {
    const from = recipeTitle(item.recipeId)
    const meta = [from && `🍳 ${from}`, item.addedBy && item.addedBy !== me && `Añadido por ${item.addedBy}`]
      .filter(Boolean)
      .join(' · ')
    return (
      <li key={item.id}>
        <SwipeRow onDelete={() => void remove([item])} onEdit={() => setEditing(item)}>
          <button
            className={`item ${item.checked ? 'is-checked' : ''}`}
            onClick={() => void toggle(item)}
            aria-pressed={item.checked}
          >
            <span className="checkbox">
              <Icon name="check" size={16} strokeWidth={3} />
            </span>
            <span className="item-text">
              <span className="item-name">{item.name}</span>
              {meta && <span className="item-meta">{meta}</span>}
            </span>
            {item.quantity && <span className="qty-pill">{item.quantity}</span>}
          </button>
        </SwipeRow>
      </li>
    )
  }

  return (
    <Page
      title="Compra"
      className="theme-list"
      subtitle={
        total ? (
          <span>
            {pending.length ? `${pending.length} pendiente${pending.length === 1 ? '' : 's'}` : '¡Todo comprado! 🎉'}
            {checked.length > 0 && ` · ${checked.length} en el carrito`}
          </span>
        ) : undefined
      }
      right={
        total > 0 ? (
          <button
            className="nav-btn nav-text"
            onClick={() => setPrefs({ groupByCategory: !groupByCategory })}
            aria-label={groupByCategory ? 'Ver como lista simple' : 'Agrupar por pasillos'}
          >
            <Icon name={groupByCategory ? 'list' : 'layers'} size={22} />
          </button>
        ) : undefined
      }
    >
      {total > 0 && (
        <div className="progress" aria-hidden>
          <div className="progress-bar" style={{ transform: `scaleX(${progress})` }} />
        </div>
      )}

      <div className="sticky-add">
        <QuickAdd />
      </div>

      {total === 0 && (
        <EmptyState
          emoji="🧺"
          title="La lista está vacía"
          action={
            recipes.length > 0 ? (
              <button className="btn btn-soft" onClick={() => navigate(paths.recipes)}>
                Añadir desde una receta
              </button>
            ) : undefined
          }
        >
          Escribe arriba lo que necesitáis. Prueba con “2 leche” o “tomates 1 kg”: la cantidad y el pasillo se
          detectan solos.
        </EmptyState>
      )}

      {groups.map((g) => (
        <section key={g.id} className="list-section">
          {g.label && (
            <h2 className="list-section-title">
              <span className="list-section-emoji">{g.emoji}</span>
              {g.label}
              <span className="count">{g.items.length}</span>
            </h2>
          )}
          <ul className="card list-card">{g.items.map(renderItem)}</ul>
        </section>
      ))}

      {checked.length > 0 && (
        <section className="list-section">
          <div className="list-section-title list-section-row">
            <button className="disclosure" onClick={() => setShowChecked((s) => !s)} aria-expanded={showChecked}>
              <Icon name="chevron" size={16} className={showChecked ? 'rot-90' : ''} />
              <span>En el carrito</span>
              <span className="count">{checked.length}</span>
            </button>
            <button className="link-btn" onClick={() => setConfirmClear('checked')}>
              Vaciar
            </button>
          </div>
          {showChecked && <ul className="card list-card is-done">{checked.map(renderItem)}</ul>}
        </section>
      )}

      {total > 0 && (
        <p className="hint">
          Toca para marcar · Desliza a la izquierda para editar o borrar
          {pending.length > 0 && (
            <>
              {' · '}
              <button className="link-btn" onClick={() => setConfirmClear('all')}>
                Borrar todo
              </button>
            </>
          )}
        </p>
      )}

      <ItemSheet
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(patch) => editing && void store.updateItem(editing.id, patch)}
        onDelete={() => editing && void remove([editing])}
      />
      <ConfirmSheet
        open={confirmClear !== null}
        title={confirmClear === 'all' ? '¿Borrar toda la lista?' : '¿Vaciar el carrito?'}
        message={
          confirmClear === 'all'
            ? `Se eliminarán los ${total} productos. Podrás deshacerlo justo después.`
            : `Se quitarán ${checked.length} producto${checked.length === 1 ? '' : 's'} ya comprado${checked.length === 1 ? '' : 's'}.`
        }
        confirmLabel={confirmClear === 'all' ? 'Borrar todo' : 'Vaciar carrito'}
        destructive
        onConfirm={() =>
          void remove(confirmClear === 'all' ? items : checked, confirmClear === 'all' ? 'Lista borrada' : 'Carrito vaciado')
        }
        onClose={() => setConfirmClear(null)}
      />
    </Page>
  )
}
