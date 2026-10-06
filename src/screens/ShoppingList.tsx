import { useCallback, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { ItemSheet } from '../components/ItemSheet'
import { Page } from '../components/Page'
import { PhotoViewer } from '../components/Photo'
import { QuickAdd } from '../components/QuickAdd'
import { ConfirmSheet } from '../components/Sheet'
import { ShoppingManageSheet, type ManageTab } from '../components/ShoppingManageSheet'
import { SwipeRow } from '../components/SwipeRow'
import { useData } from '../lib/data'
import { usePhoto } from '../lib/photos'
import { setPrefs, usePrefs } from '../lib/prefs'
import { navigate, paths } from '../lib/router'
import { useShopConfig } from '../lib/shopConfig'
import { sortItems, useShoppingActions } from '../lib/shopping'
import type { ShoppingItem } from '../lib/types'

export function ShoppingList() {
  const { items, recipes, store } = useData()
  const { groupByCategory, name: me } = usePrefs()
  const { toggle, remove } = useShoppingActions()
  const [editing, setEditing] = useState<ShoppingItem | null>(null)
  const [confirmClear, setConfirmClear] = useState<'checked' | 'all' | null>(null)
  const [showChecked, setShowChecked] = useState(true)
  const [viewing, setViewing] = useState<ShoppingItem | null>(null)
  const viewingPhoto = usePhoto(viewing?.photo)
  const closeViewer = useCallback(() => setViewing(null), [])
  const [manage, setManage] = useState<ManageTab | null>(null)
  const config = useShopConfig()
  const activeList = config.lists.find((l) => l.id === config.activeListId)!

  // Productos de la lista abierta.
  const listItems = useMemo(() => items.filter((i) => config.listOf(i) === config.activeListId), [items, config])
  const pendingByList = useMemo(() => {
    const map = new Map<string, number>()
    for (const i of items) if (!i.checked) map.set(config.listOf(i), (map.get(config.listOf(i)) ?? 0) + 1)
    return map
  }, [items, config])

  const pending = useMemo(() => sortItems(listItems.filter((i) => !i.checked)), [listItems])
  const checked = useMemo(
    () => [...listItems.filter((i) => i.checked)].sort((a, b) => (b.checkedAt ?? 0) - (a.checkedAt ?? 0)),
    [listItems],
  )

  const groups = useMemo(() => {
    if (!groupByCategory) return [{ id: 'all', label: '', emoji: '' as string | undefined, items: pending }]
    return config.categories
      .map((c) => ({ ...c, items: pending.filter((i) => config.categoryOf(i.category).id === c.id) }))
      .filter((g) => g.items.length)
  }, [pending, groupByCategory, config])

  const recipeTitle = (id?: string) => (id ? recipes.find((r) => r.id === id)?.title : undefined)
  const total = listItems.length
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
            {item.photo && (
              <span
                className="item-thumb"
                role="button"
                aria-label={`Ver foto de ${item.name}`}
                onClick={(e) => {
                  // Ver la foto no debe marcar el producto.
                  e.stopPropagation()
                  setViewing(item)
                }}
              >
                <img src={item.photo.thumb} alt="" />
              </span>
            )}
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
        <>
          {total > 0 && (
            <button
              className="nav-btn nav-icon"
              onClick={() => setPrefs({ groupByCategory: !groupByCategory })}
              aria-label={groupByCategory ? 'Ver como lista simple' : 'Agrupar por pasillos'}
            >
              <Icon name={groupByCategory ? 'list' : 'layers'} size={22} />
            </button>
          )}
          <button className="nav-btn nav-icon" onClick={() => setManage('lists')} aria-label="Listas y pasillos">
            <Icon name="sliders" size={22} />
          </button>
        </>
      }
    >
      <div className="list-tabs" role="tablist" aria-label="Listas">
        {config.lists.map((l) => {
          const n = pendingByList.get(l.id) ?? 0
          const active = l.id === config.activeListId
          return (
            <button
              key={l.id}
              role="tab"
              aria-selected={active}
              className={`list-tab ${active ? 'is-active' : ''}`}
              onClick={() => setPrefs({ activeList: l.id })}
            >
              {l.emoji && <span className="list-tab-emoji">{l.emoji}</span>}
              {l.name}
              {n > 0 && <span className="list-tab-count">{n}</span>}
            </button>
          )
        })}
        <button className="list-tab list-tab-add" onClick={() => setManage('lists')} aria-label="Nueva lista">
          <Icon name="plus" size={16} />
          {config.lists.length === 1 && 'Nueva lista'}
        </button>
      </div>

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
          emoji={activeList.emoji ?? '🧺'}
          title={config.lists.length > 1 ? `${activeList.name}: nada pendiente` : 'La lista está vacía'}
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

      <PhotoViewer src={viewing ? viewingPhoto : null} alt={viewing?.name} onClose={closeViewer} />
      <ShoppingManageSheet open={manage !== null} tab={manage ?? 'lists'} onTabChange={setManage} onClose={() => setManage(null)} />
      <ItemSheet
        item={editing}
        onManage={() => {
          setEditing(null)
          setManage('categories')
        }}
        onClose={() => setEditing(null)}
        onSave={(patch) => editing && void store.updateItem(editing.id, patch)}
        onDelete={() => editing && void remove([editing])}
      />
      <ConfirmSheet
        open={confirmClear !== null}
        title={confirmClear === 'all' ? '¿Borrar toda la lista?' : '¿Vaciar el carrito?'}
        message={
          confirmClear === 'all'
            ? `Se eliminarán los ${total} productos de “${activeList.name}”. Podrás deshacerlo justo después.`
            : `Se quitarán ${checked.length} producto${checked.length === 1 ? '' : 's'} ya comprado${checked.length === 1 ? '' : 's'}.`
        }
        confirmLabel={confirmClear === 'all' ? 'Borrar todo' : 'Vaciar carrito'}
        destructive
        onConfirm={() =>
          void remove(confirmClear === 'all' ? listItems : checked, confirmClear === 'all' ? 'Lista borrada' : 'Carrito vaciado')
        }
        onClose={() => setConfirmClear(null)}
      />
    </Page>
  )
}
