import { useEffect, useState } from 'react'
import { useData } from '../lib/data'
import { setPrefs } from '../lib/prefs'
import { DEFAULT_CATEGORIES, OTHER_CATEGORY, slugId, useShopConfig } from '../lib/shopConfig'
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
}

/** Solo el primer emoji (o nada) de lo que se escriba en el campo de icono. */
function firstGrapheme(value: string): string | undefined {
  const v = value.trim()
  if (!v) return undefined
  const it = new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(v)[Symbol.iterator]().next()
  return it.value?.segment
}

type Row = { id: string; name: string; emoji?: string }

/**
 * Gestión de listas (tiendas) y pasillos. Los cambios se guardan al
 * momento y los veis los dos.
 */
export function ShoppingManageSheet({ open, onClose, tab, onTabChange }: Props) {
  const { store, items, releasePhotos } = useData()
  const config = useShopConfig()
  const toast = useToast()
  const [lists, setLists] = useState<Row[]>([])
  const [cats, setCats] = useState<Row[]>([])
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [deleting, setDeleting] = useState<Row | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (!open) return
    setLists(config.lists.map((l) => ({ id: l.id, name: l.name, emoji: l.emoji })))
    setCats(config.categories.map((c) => ({ id: c.id, name: c.label, emoji: c.emoji })))
    // Solo al abrir: así no se pisa lo que se está escribiendo.
  }, [open])

  useEffect(() => {
    setNewName('')
    setNewEmoji('')
  }, [tab, open])

  const fail = (e: unknown) => {
    console.error(e)
    toast((e as { code?: string }).code === 'permission-denied' ? 'Firebase no deja guardar: revisa las reglas.' : 'No se ha podido guardar')
  }

  const saveLists = (rows: Row[]) => {
    setLists(rows)
    const clean: ShopList[] = rows.filter((r) => r.name.trim()).map((r) => ({ id: r.id, name: r.name.trim(), ...(r.emoji ? { emoji: r.emoji } : {}) }))
    store.updateShopping({ lists: clean }).catch(fail)
  }
  const saveCats = (rows: Row[]) => {
    setCats(rows)
    const clean: CategoryDef[] = rows.filter((r) => r.name.trim()).map((r) => ({ id: r.id, label: r.name.trim(), ...(r.emoji ? { emoji: r.emoji } : {}) }))
    store.updateShopping({ categories: clean }).catch(fail)
  }

  const isLists = tab === 'lists'
  const rows = isLists ? lists : cats
  const setRows = isLists ? setLists : setCats
  const save = isLists ? saveLists : saveCats

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
      saveLists([...lists, row])
      setPrefs({ activeList: row.id })
      toast(`Lista “${name}” creada`)
    } else {
      // Los pasillos nuevos van antes de "Otros".
      const otherAt = cats.findIndex((c) => c.id === OTHER_CATEGORY)
      const next = otherAt === -1 ? [...cats, row] : [...cats.slice(0, otherAt), row, ...cats.slice(otherAt)]
      saveCats(next)
    }
    setNewName('')
    setNewEmoji('')
  }

  const itemsIn = (row: Row) =>
    isLists ? items.filter((i) => config.listOf(i) === row.id) : items.filter((i) => config.categoryOf(i.category).id === row.id)

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
      <p className="muted small sheet-intro manage-intro">
        {isLists
          ? 'Una lista por tienda o tipo de tienda: súper, farmacia, mercado… El icono es opcional: escribe un emoji.'
          : 'Ordena los pasillos como los recorréis en la tienda. Si cambias el pasillo de un producto, la app lo recordará.'}
      </p>

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

      {!isLists && (
        <button className="link-btn center manage-reset" onClick={() => setConfirmReset(true)}>
          Restablecer los pasillos predefinidos
        </button>
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
        open={confirmReset}
        title="¿Restablecer los pasillos?"
        message="Vuelven los pasillos originales y se pierden los que habéis creado o renombrado."
        confirmLabel="Restablecer"
        destructive
        onConfirm={() => saveCats(DEFAULT_CATEGORIES.map((c) => ({ id: c.id, name: c.label, emoji: c.emoji })))}
        onClose={() => setConfirmReset(false)}
      />
    </Sheet>
  )
}
