import { useMemo, useRef, useState } from 'react'
import type { PendingPhoto } from '../lib/photos'
import { normalize, parseItemInput } from '../lib/categories'
import { useData } from '../lib/data'
import { useShopConfig } from '../lib/shopConfig'
import { suggestFromHistory, useShoppingActions } from '../lib/shopping'
import { Icon } from './Icon'
import { PhotoInput } from './Photo'

export function QuickAdd({ autoFocus, compact }: { autoFocus?: boolean; compact?: boolean }) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [photo, setPhoto] = useState<PendingPhoto | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const { items } = useData()
  const { add } = useShoppingActions()
  const config = useShopConfig()

  const parsed = text.trim() ? parseItemInput(text) : null
  const category = parsed ? config.categoryOf(config.guess(parsed.name)) : null

  const pendingNames = useMemo(
    () => new Set(items.filter((i) => !i.checked && config.listOf(i) === config.activeListId).map((i) => normalize(i.name))),
    [items, config],
  )
  const suggestions = useMemo(
    () => (focused ? suggestFromHistory(parsed?.name ?? '', pendingNames, 8) : []),
    [focused, parsed?.name, pendingNames],
  )

  const submit = async (value = text) => {
    if (!value.trim()) return
    const withPhoto = photo ?? undefined
    setText('')
    setPhoto(null)
    input.current?.focus()
    await add(value, withPhoto)
  }

  return (
    <div className={`quick-add ${focused ? 'is-focused' : ''} ${compact ? 'is-compact' : ''}`}>
      <form
        className="quick-add-bar"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {photo ? (
          <button type="button" className="quick-add-photo" onClick={() => setPhoto(null)} aria-label="Quitar foto">
            <img src={photo.thumb} alt="" />
            <span>
              <Icon name="x" size={10} strokeWidth={3} />
            </span>
          </button>
        ) : (
          <span className="quick-add-icon">{category ? category.emoji : <Icon name="plus" size={20} />}</span>
        )}
        <input
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          // Retraso para que un toque en una sugerencia llegue antes de ocultarlas.
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder={photo ? '¿Qué es? Escribe el nombre' : 'Añadir producto…'}
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="on"
          autoCapitalize="sentences"
          autoFocus={autoFocus}
          aria-label="Añadir producto"
        />
        {parsed?.quantity && <span className="qty-pill">{parsed.quantity}</span>}
        {!compact && !photo && (
          <PhotoInput
            className="quick-add-camera"
            label="Añadir con foto"
            onPhoto={(p) => {
              setPhoto(p)
              input.current?.focus()
            }}
          >
            <Icon name="camera" size={21} />
          </PhotoInput>
        )}
        {text.trim() && (
          <button type="submit" className="quick-add-submit" aria-label="Añadir">
            <Icon name="plus" size={20} />
          </button>
        )}
      </form>
      {suggestions.length > 0 && (
        <div className="suggestions" role="list">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              role="listitem"
              className="chip chip-suggestion"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => void submit(parsed?.quantity ? `${parsed.quantity} ${s}` : s)}
            >
              <Icon name="plus" size={14} /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
