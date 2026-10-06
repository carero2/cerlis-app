import { useEffect, useState } from 'react'
import { CATEGORIES } from '../lib/categories'
import type { CategoryId, ShoppingItem } from '../lib/types'
import { Sheet } from './Sheet'

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

  useEffect(() => {
    if (item) {
      setName(item.name)
      setQuantity(item.quantity ?? '')
      setCategory(item.category)
    }
  }, [item])

  const save = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), quantity: quantity.trim() || undefined, category })
    onClose()
  }

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
          <button className="btn btn-primary btn-grow" onClick={save} disabled={!name.trim()}>
            Guardar
          </button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
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
