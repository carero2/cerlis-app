import { useEffect, useState } from 'react'
import { normalize } from '../lib/categories'
import { useData } from '../lib/data'
import { savePendingPhoto, type PendingPhoto } from '../lib/photos'
import { OTHER_CATEGORY, useShopConfig } from '../lib/shopConfig'
import type { PhotoRef, ShoppingItem } from '../lib/types'
import { Icon } from './Icon'
import { PhotoInput } from './Photo'
import { Sheet } from './Sheet'
import { useToast } from './Toast'

interface Props {
  item: ShoppingItem | null
  onClose: () => void
  onSave: (patch: Partial<ShoppingItem>) => void
  onDelete: () => void
  /** Abre la gestión de los pasillos de una lista. */
  onManage?: (listId: string) => void
}

export function ItemSheet({ item, onClose, onSave, onDelete, onManage }: Props) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [category, setCategory] = useState('otros')
  const [listId, setListId] = useState('')
  // Solo se aprende el pasillo si lo elige la persona (no al cambiar de lista).
  const [picked, setPicked] = useState(false)
  const config = useShopConfig()
  const [photo, setPhoto] = useState<PhotoRef | undefined>()
  const [pending, setPending] = useState<PendingPhoto | null>(null)
  const [saving, setSaving] = useState(false)
  const { store } = useData()
  const toast = useToast()

  useEffect(() => {
    if (item) {
      setName(item.name)
      setQuantity(item.quantity ?? '')
      const list = config.listOf(item)
      setCategory(config.categoryOf(item.category, list).id)
      setListId(list)
      setPicked(false)
      setPhoto(item.photo)
      setPending(null)
    }
    // Solo al abrir otro producto; la configuración puede cambiar mientras tanto.
  }, [item])

  const aisles = listId ? config.categoriesOf(listId) : []

  const changeList = (id: string) => {
    setListId(id)
    // En la nueva lista, el pasillo que tenga allí (o el que toque).
    const cats = config.categoriesOf(id)
    if (!cats.some((c) => c.id === category)) setCategory(config.guess(name || item?.name || '', id))
  }

  const save = async () => {
    if (!name.trim() || !item) return
    setSaving(true)
    try {
      const nextPhoto = pending ? await savePendingPhoto(store, pending) : photo
      if (item.photo && item.photo.id !== nextPhoto?.id) void store.deletePhoto(item.photo.id).catch(console.error)
      const finalCategory = aisles.length ? category : OTHER_CATEGORY
      onSave({ name: name.trim(), quantity: quantity.trim() || undefined, category: finalCategory, listId, photo: nextPhoto })
      // Si se corrige el pasillo, se recuerda para la próxima vez que se añada.
      if (picked && aisles.length && category !== item.category) {
        void store.updateShopping({ learned: { [normalize(name.trim())]: category } }).catch(console.error)
      }
      onClose()
    } catch (e) {
      console.error(e)
      toast('No se ha podido guardar la foto')
    } finally {
      setSaving(false)
    }
  }
  const thumb = pending?.thumb ?? photo?.thumb

  return (
    <Sheet
      open={!!item}
      onClose={onClose}
      title="Editar producto"
      footer={
        <div className="row-gap">
          <button
            className="btn btn-danger-soft"
            onClick={() => {
              onDelete()
              onClose()
            }}
          >
            Eliminar
          </button>
          <button className="btn btn-primary btn-grow" onClick={() => void save()} disabled={!name.trim() || saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <div className="field-group">
          <label className="field">
            <span>Producto</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          </label>
          <label className="field">
            <span>Cantidad</span>
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ej. 2, 500 g, 1 docena"
              autoComplete="off"
            />
          </label>
        </div>
        <div className="item-photo-row">
          {thumb ? (
            <>
              <img className="item-photo-preview" src={thumb} alt="" />
              <PhotoInput className="btn btn-small btn-soft" onPhoto={setPending} label="Cambiar foto">
                <Icon name="camera" size={16} /> Cambiar
              </PhotoInput>
              <button
                type="button"
                className="btn btn-small btn-ghost"
                onClick={() => {
                  setPending(null)
                  setPhoto(undefined)
                }}
              >
                Quitar
              </button>
            </>
          ) : (
            <PhotoInput className="photo-add photo-add-inline" onPhoto={setPending}>
              <Icon name="camera" size={20} />
              <span>Añadir foto (marca, envase…)</span>
            </PhotoInput>
          )}
        </div>
        {config.lists.length > 1 && (
          <>
            <div className="section-label">Lista</div>
            <div className="chip-grid chip-grid-lists">
              {config.lists.map((l) => (
                <button
                  type="button"
                  key={l.id}
                  className={`chip ${listId === l.id ? 'is-selected' : ''}`}
                  onClick={() => changeList(l.id)}
                >
                  {l.emoji && <span>{l.emoji}</span>} {l.name}
                </button>
              ))}
            </div>
          </>
        )}
        {aisles.length > 0 && (
          <>
            <div className="section-label section-label-row">
              Pasillo
              {onManage && (
                <button type="button" className="link-btn" onClick={() => onManage(listId)}>
                  Editar pasillos
                </button>
              )}
            </div>
            <div className="chip-grid">
              {aisles.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`chip ${category === c.id ? 'is-selected' : ''}`}
                  onClick={() => {
                    setCategory(c.id)
                    setPicked(true)
                  }}
                >
                  <span>{c.emoji}</span> {c.label}
                </button>
              ))}
            </div>
          </>
        )}
        <button type="submit" hidden />
      </form>
    </Sheet>
  )
}
