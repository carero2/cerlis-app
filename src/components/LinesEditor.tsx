import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { splitLines } from '../lib/recipes'
import { Icon } from './Icon'

interface Props {
  lines: string[]
  onChange: (lines: string[]) => void
  placeholder: string
  /** Pasos: numerados y con textarea multilínea. */
  numbered?: boolean
}

/**
 * Editor de una lista de líneas (ingredientes o pasos). Pegar un bloque de
 * texto lo divide automáticamente en varias líneas.
 */
export function LinesEditor({ lines, onChange, placeholder, numbered }: Props) {
  const [draft, setDraft] = useState('')
  const newInput = useRef<HTMLTextAreaElement>(null)

  const update = (i: number, value: string) => onChange(lines.map((l, j) => (j === i ? value : l)))
  const remove = (i: number) => onChange(lines.filter((_, j) => j !== i))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= lines.length) return
    const next = [...lines]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  const commit = (keepFocus = true) => {
    const parts = splitLines(draft, numbered)
    if (parts.length) onChange([...lines, ...parts])
    setDraft('')
    if (keepFocus) newInput.current?.focus()
  }

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text')
    if (!text.includes('\n')) return
    e.preventDefault()
    onChange([...lines, ...splitLines(draft + text, numbered)])
    setDraft('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commit()
    }
  }

  return (
    <div className={`lines-editor ${numbered ? 'is-numbered' : ''}`}>
      {lines.map((line, i) => (
        <div className="line-row" key={i}>
          <span className="line-marker">{numbered ? i + 1 : '•'}</span>
          <AutoTextarea value={line} onChange={(v) => update(i, v)} ariaLabel={`${numbered ? 'Paso' : 'Ingrediente'} ${i + 1}`} />
          <div className="line-actions">
            {numbered && i > 0 && (
              <button type="button" className="icon-btn" onClick={() => move(i, -1)} aria-label="Subir">
                <Icon name="chevron" size={16} className="rot--90" />
              </button>
            )}
            <button type="button" className="icon-btn icon-btn-danger" onClick={() => remove(i)} aria-label="Quitar">
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>
      ))}
      <div className="line-row line-new">
        <span className="line-marker">
          <Icon name="plus" size={16} />
        </span>
        <textarea
          ref={newInput}
          rows={1}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => draft.trim() && commit(false)}
          enterKeyHint="enter"
        />
      </div>
    </div>
  )
}

function AutoTextarea({ value, onChange, ariaLabel }: { value: string; onChange: (v: string) => void; ariaLabel: string }) {
  return (
    <textarea
      rows={1}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      ref={(el) => {
        if (el) {
          el.style.height = 'auto'
          el.style.height = `${el.scrollHeight}px`
        }
      }}
      onInput={(e) => {
        const el = e.currentTarget
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight}px`
      }}
    />
  )
}
