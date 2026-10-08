import { useEffect, useState } from 'react'
import { useData } from '../lib/data'
import { setPrefs } from '../lib/prefs'
import { DEFAULT_CATEGORIES, OTHER_CATEGORY, slugId, useShopConfig, withOther } from '../lib/shopConfig'
import type { CategoryDef, ShopList } from '../lib/types'
import { Icon } from './Icon'
import { Segmented } from './Segmented'
import { ConfirmSheet, Sheet } from './Sheet'
import { useToast } from './Toast'

export type ManageTab = 'lists' | 'categories'

interface Props {
  open: boolean
  onClose: () => void
  tab: ManageTab
  onTabChange: (tab: ManageTab) => void
  /** Lista cuyos pasillos se muestran al abrir. */
  listId?: string
}

/** Solo el primer emoji (o nada) de lo que se escriba en el campo de icono. */
function firstGrapheme(value: string): string | undefined {
  const v = value.trim()
  if (!v) return undefined
  const it = new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(v)[Symbol.iterator]().next()
  return it.value?.segment
}

type Row = { id: string; name: string; emoji?: string }
type ListRow = Row & { cats: Row[] }

const toRows = (cats: CategoryDef[]): Row[] => cats.map((c) => ({ id: c.id, name: c.label, emoji: c.emoji }))
const toDefs = (rows: Row[]): CategoryDef[] =>
  withOther(rows.filter((r) => r.name.trim()).map((r) => ({ id: r.id, label: r.name.trim(), ...(r.emoji ? { emoji: r.emoji } : {}) })))

/**
 * Gestión de listas (tiendas) y de los pasillos de cada una. Los cambios
 * se guardan al momento y los veis los dos.
 */
export function ShoppingManageSheet({ open, onClose, tab, onTabChange, listId }: Props) {
  const { store, items, releasePhotos } = useData()
  const config = useShopConfig()
  const toast = useToast()
  const [lists, setLists] = useState<ListRow[]>([])
  const [aisleList, setAisleList] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [deleting, setDeleting] = useState<Row | null>(null)
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null)

  useEffect(() => {
    if (!open) return
    setLists(config.lists.map((l) => ({ id: l.id, name: l.name, emoji: l.emoji, cats: toRows(l.categories ?? []) })))
    setAisleList(listId ?? config.activeListId)
    // Solo al abrir: así no se pisa lo que se está escribiendo.
  }, [open])

  useEffect(() => {
    setNewName('')
    setNewEmoji('')
  }, [tab, open, aisleList])

  const fail = (e: unknown) => {
    console.error(e)
    toast((e as { code?: string }).code === 'permission-denied' ? 'Firebase no deja guardar: revisa las reglas.' : 'No se ha podido guardar')
  }

  /** Guarda todas las listas, cada una con sus pasillos. */
  const saveLists = (rows: ListRow[]) => {
    setLists(rows)
    const clean: ShopList[] = rows
      .filter((r) => r.name.trim())
      .map((r) => ({ id: r.id, name: r.name.trim(), ...(r.emoji ? { emoji: r.emoji } : {}), categories: toDefs(r.cats) }))
    store.updateShopping({ lists: clean }).catch(fail)
  }

  const current = lists.find((l) => l.id === aisleList) ?? lists[0]
  const cats = current?.cats ?? []
  const saveCats = (rows: Row[]) => {
    // "Otros" solo tiene sentido si hay más pasillos.
    const next = rows.some((r) => r.id !== OTHER_CATEGORY) ? rows : []
    saveLists(lists.map((l) => (l.id === current.id ? { ...l, cats: next } : l)))
  }

  const isLists = tab === 'lists'
  const rows: Row[] = isLists ? lists : cats
  const save = (next: Row[]) => (isLists ? saveLists(next as ListRow[]) : saveCats(next))
  const setRows = (next: Row[]) =>
    isLists ? setLists(next as ListRow[]) : setLists(lists.map((l) => (l.id === current.id ? { ...l, cats: next } : l)))

  const update = (id: string, patch: Partial<Row>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= rows.length) return
    const next = [...rows]
    ;[next[i], next[j]] = [next[j], next[i]]
    save(next)
  }

  const add = () => {
    const name = newName.trim()
    if (!name) return
    const row: Row = { id: slugId(name), name, emoji: firstGrapheme(newEmoji) }
    if (isLists) {
      // Las listas nuevas empiezan sin pasillos: todo junto.
      saveLists([...lists, { ...row, cats: [] }])
      setPrefs({ activeList: row.id })
      toast(`Lista “${name}” creada`)
    } else {
      // Los pasillos nuevos van antes de "Otros" (que se añade si no estaba).
      const base: Row[] = cats.length ? cats : [{ id: OTHER_CATEGORY, name: 'Otros', emoji: '🛒' }]
      const otherAt = base.findIndex((c) => c.id === OTHER_CATEGORY)
      saveCats(otherAt === -1 ? [...base, row] : [...base.slice(0, otherAt), row, ...base.slice(otherAt)])
    }
    setNewName('')
    setNewEmoji('')
  }

  const itemsIn = (row: Row) =>
    isLists
      ? items.filter((i) => config.listOf(i) === row.id)
      : items.filter((i) => config.listOf(i) === current.id && config.categoryOf(i.category, current.id).id === row.id)

  const confirmDelete = async () => {
    const row = deleting
    if (!row) return
    if (isLists) {
      const inList = items.filter((i) => config.listOf(i) === row.id)
      if (inList.length) {
        try {
          await store.deleteItems(inList.map((i) => i.id))
          releasePhotos(inList.map((i) => i.photo?.id))
        } catch (e) {
          return fail(e)
        }
      }
      saveLists(lists.filter((l) => l.id !== row.id))
      if (config.activeListId === row.id) setPrefs({ activeList: undefined })
    } else {
      saveCats(cats.filter((c) => c.id !== row.id))
    }
    toast(`“${row.name}” eliminado`)
  }

  const deletingCount = deleting ? itemsIn(deleting).length : 0
  // Otras listas con pasillos, para copiarlos.
  const donors = lists.filter((l) => l.id !== current?.id && l.cats.length)

  return (
    <Sheet open={open} onClose={onClose} title="Listas y pasillos">
      <Segmented<ManageTab>
        value={tab}
        onChange={onTabChange}
        options={[
          { value: 'lists', label: 'Listas' },
          { value: 'categories', label: 'Pasillos' },
        ]}
      />

      {!isLists && lists.length > 1 && (
        <div className="chips-scroll manage-list-pick" role="tablist" aria-label="Lista">
          {lists.map((l) => (
            <button
              key={l.id}
              role="tab"
              aria-selected={l.id === current?.id}
              className={`chip ${l.id === current?.id ? 'is-selected' : ''}`}
              onClick={() => setAisleList(l.id)}
            >
              {l.emoji && <span>{l.emoji}</span>} {l.name}
            </button>
          ))}
        </div>
      )}

      <p className="muted small sheet-intro manage-intro">
        {isLists
          ? 'Una lista por tienda o tipo de tienda: súper, farmacia, mercado… El icono es opcional: escribe un emoji.'
          : cats.length
            ? `Pasillos de “${current?.name}”, en el orden en que los recorréis. Si cambias el pasillo de un producto, la app lo recordará.`
            : `“${current?.name ?? ''}” no usa pasillos: sus productos salen todos juntos. Añade alguno si quieres agruparlos.`}
      </p>

      {!isLists && !cats.length && (
        <div className="manage-empty-actions">
          {donors.map((d) => (
            <button key={d.id} className="btn btn-small btn-soft" onClick={() => saveCats(d.cats.map((c) => ({ ...c })))}>
              Copiar los de {d.emoji ? `${d.emoji} ` : ''}
              {d.name}
            </button>
          ))}
          <button className="btn btn-small btn-soft" onClick={() => saveCats(toRows(DEFAULT_CATEGORIES))}>
            Usar los predefinidos
          </button>
        </div>
      )}

      <div className="card manage-list">
        {rows.map((r, i) => {
          const locked = !isLists && r.id === OTHER_CATEGORY
          const count = itemsIn(r).length
          return (
            <div className="manage-row" key={r.id}>
              <input
                className="emoji-input"
                value={r.emoji ?? ''}
                placeholder="·"
                aria-label={`Icono de ${r.name}`}
                onChange={(e) => update(r.id, { emoji: e.target.value })}
                onBlur={(e) => save(rows.map((x) => (x.id === r.id ? { ...x, emoji: firstGrapheme(e.target.value) } : x)))}
              />
              <input
                className="manage-name"
                value={r.name}
                aria-label="Nombre"
                onChange={(e) => update(r.id, { name: e.target.value })}
                onBlur={() => save(rows)}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
              {count > 0 && <span className="manage-count">{count}</span>}
              <div className="manage-actions">
                <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">
                  <Icon name="chevron" size={16} className="rot--90" />
                </button>
                <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Bajar">
                  <Icon name="chevron" size={16} className="rot-90" />
                </button>
                <button
                  className="icon-btn icon-btn-danger"
                  onClick={() => setDeleting(r)}
                  disabled={locked || (isLists && rows.length === 1)}
                  aria-label={`Eliminar ${r.name}`}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </div>
          )
        })}

        <form
          className="manage-row manage-new"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <input
            className="emoji-input"
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value)}
            placeholder="＋"
            aria-label="Icono (opcional)"
          />
          <input
            className="manage-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={isLists ? 'Nueva lista (p. ej. Farmacia)' : 'Nuevo pasillo'}
            enterKeyHint="done"
            aria-label={isLists ? 'Nombre de la nueva lista' : 'Nombre del nuevo pasillo'}
          />
          <button type="submit" className="btn btn-small btn-soft" disabled={!newName.trim()}>
            Añadir
          </button>
        </form>
      </div>

      {!isLists && cats.length > 0 && (
        <div className="manage-footer-links">
          <button className="link-btn" onClick={() => setConfirm('reset')}>
            Restablecer los predefinidos
          </button>
          <button className="link-btn" onClick={() => setConfirm('clear')}>
            Quitar todos los pasillos
          </button>
        </div>
      )}

      <ConfirmSheet
        open={!!deleting}
        title={`¿Eliminar “${deleting?.name}”?`}
        message={
          isLists
            ? deletingCount
              ? `Se borrarán también los ${deletingCount} productos de esta lista.`
              : 'La lista está vacía.'
            : deletingCount
              ? `Sus ${deletingCount} productos pasarán a “Otros”.`
              : undefined
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      />
      <ConfirmSheet
        open={confirm === 'reset'}
        title={`¿Restablecer los pasillos de “${current?.name}”?`}
        message="Vuelven los pasillos originales y se pierden los que habéis creado o renombrado en esta lista."
        confirmLabel="Restablecer"
        destructive
        onConfirm={() => saveCats(toRows(DEFAULT_CATEGORIES))}
        onClose={() => setConfirm(null)}
      />
      <ConfirmSheet
        open={confirm === 'clear'}
        title={`¿Quitar los pasillos de “${current?.name}”?`}
        message="Los productos de esta lista saldrán todos juntos, sin agrupar. Podrás volver a añadirlos cuando quieras."
        confirmLabel="Quitar pasillos"
        destructive
        onConfirm={() => saveCats([])}
        onClose={() => setConfirm(null)}
      />
    </Sheet>
  )
}
