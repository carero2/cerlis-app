import { useMemo, useRef, useState } from 'react'
import { CATEGORY_BY_ID, guessCategory, normalize, parseItemInput } from '../lib/categories'
import { useData } from '../lib/data'
import { suggestFromHistory, useShoppingActions } from '../lib/shopping'
import { Icon } from './Icon'

export function QuickAdd({ autoFocus, compact }: { autoFocus?: boolean; compact?: boolean }) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const { items } = useData()
  const { add } = useShoppingActions()

  const parsed = text.trim() ? parseItemInput(text) : null
  const category = parsed ? CATEGORY_BY_ID[guessCategory(parsed.name)] : null

  const pendingNames = useMemo(
    () => new Set(items.filter((i) => !i.checked).map((i) => normalize(i.name))),
    [items],
  )
  const suggestions = useMemo(
    () => (focused ? suggestFromHistory(parsed?.name ?? '', pendingNames, 8) : []),
    [focused, parsed?.name, pendingNames],
  )

  const submit = async (value = text) => {
    if (!value.trim()) return
    setText('')
    input.current?.focus()
    await add(value)
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
        <span className="quick-add-icon">{category ? category.emoji : <Icon name="plus" size={20} />}</span>
        <input
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          // Retraso para que un toque en una sugerencia llegue antes de ocultarlas.
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder="Añadir producto…"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="on"
          autoCapitalize="sentences"
          autoFocus={autoFocus}
          aria-label="Añadir producto"
        />
        {parsed?.quantity && <span className="qty-pill">{parsed.quantity}</span>}
        <button type="submit" className="quick-add-submit" disabled={!text.trim()} aria-label="Añadir">
          <Icon name="plus" size={20} />
        </button>
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
