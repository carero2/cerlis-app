import { useEffect, useState } from 'react'
import { CATEGORIES } from '../lib/categories'
import { useData } from '../lib/data'
import { savePendingPhoto, type PendingPhoto } from '../lib/photos'
import type { CategoryId, PhotoRef, ShoppingItem } from '../lib/types'
import { Icon } from './Icon'
import { PhotoInput } from './Photo'
import { Sheet } from './Sheet'
import { useToast } from './Toast'

interface Props {
  item: ShoppingItem | null
  onClose: () => void
  onSave: (patch: Partial<ShoppingItem>) => void
  onDelete: () => void
}

export function ItemSheet({ item, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [category, setCategory] = useState<CategoryId>('otros')
  const [photo, setPhoto] = useState<PhotoRef | undefined>()
  const [pending, setPending] = useState<PendingPhoto | null>(null)
  const [saving, setSaving] = useState(false)
  const { store } = useData()
  const toast = useToast()

  useEffect(() => {
    if (item) {
      setName(item.name)
      setQuantity(item.quantity ?? '')
      setCategory(item.category)
      setPhoto(item.photo)
      setPending(null)
    }
  }, [item])

  const save = async () => {
    if (!name.trim() || !item) return
    setSaving(true)
    try {
      const nextPhoto = pending ? await savePendingPhoto(store, pending) : photo
      if (item.photo && item.photo.id !== nextPhoto?.id) void store.deletePhoto(item.photo.id).catch(console.error)
      onSave({ name: name.trim(), quantity: quantity.trim() || undefined, category, photo: nextPhoto })
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
        <div className="section-label">Pasillo</div>
        <div className="chip-grid">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`chip ${category === c.id ? 'is-selected' : ''}`}
              onClick={() => setCategory(c.id)}
            >
              <span>{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>
        <button type="submit" hidden />
      </form>
    </Sheet>
  )
}
