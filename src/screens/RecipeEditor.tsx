import { useMemo, useState } from 'react'
import { AiComposer } from '../components/AiComposer'
import { Icon } from '../components/Icon'
import { PhotoInput } from '../components/Photo'
import { LinesEditor } from '../components/LinesEditor'
import { Page } from '../components/Page'
import { ConfirmSheet, Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { useUser } from '../lib/auth'
import { useData } from '../lib/data'
import { savePendingPhoto, usePhoto, type PendingPhoto } from '../lib/photos'
import { getPrefs } from '../lib/prefs'
import { FOOD_EMOJIS, SUGGESTED_TAGS, emptyDraft, recipeTint } from '../lib/recipes'
import { goBack, navigate, paths } from '../lib/router'
import type { RecipeDraft } from '../lib/types'

export function RecipeEditor({ id, aiFocus }: { id?: string; aiFocus?: boolean }) {
  const { recipes, store } = useData()
  const toast = useToast()
  // La IA va a través de Firebase: solo disponible con sesión iniciada.
  const aiAvailable = !!useUser()
  const existing = id ? recipes.find((r) => r.id === id) : undefined

  const initial = useMemo<RecipeDraft>(() => {
    if (!existing) return emptyDraft()
    const { id: _id, createdAt: _c, updatedAt: _u, ...draft } = existing
    return draft
    // Solo la versión al abrir el editor.
  }, [existing?.id])

  const [draft, setDraft] = useState<RecipeDraft>(initial)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [confirm, setConfirm] = useState<'discard' | 'delete' | null>(null)
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null)
  const storedPhoto = usePhoto(draft.photo)
  const photoSrc = pendingPhoto?.full ?? storedPhoto

  const set = <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const dirty = !!pendingPhoto || JSON.stringify(draft) !== JSON.stringify(initial)
  const canSave = draft.title.trim().length > 0 && !saving

  const allTags = useMemo(() => {
    const s = new Set([...SUGGESTED_TAGS, ...recipes.flatMap((r) => r.tags), ...draft.tags])
    return [...s]
  }, [recipes, draft.tags])

  const toggleTag = (t: string) =>
    set('tags', draft.tags.includes(t) ? draft.tags.filter((x) => x !== t) : [...draft.tags, t])

  const cancel = () => (dirty ? setConfirm('discard') : goBack(id ? paths.recipe(id) : paths.recipes))

  const applyAi = (result: Partial<RecipeDraft>) => {
    const previous = draft
    const defined = Object.fromEntries(Object.entries(result).filter(([, v]) => v !== undefined))
    setDraft((d) => ({ ...d, ...defined }))
    toast('Receta rellenada ✨ Revísala y guarda', {
      action: { label: 'Deshacer', onClick: () => setDraft(previous) },
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    const clean: RecipeDraft = {
      ...draft,
      title: draft.title.trim(),
      ingredients: draft.ingredients.map((l) => l.trim()).filter(Boolean),
      steps: draft.steps.map((l) => l.trim()).filter(Boolean),
      notes: draft.notes?.trim() || undefined,
      source: draft.source?.trim() || undefined,
    }
    try {
      if (pendingPhoto) clean.photo = await savePendingPhoto(store, pendingPhoto)
      // La foto anterior ya no se usa: la borramos para no ocupar espacio.
      if (initial.photo && initial.photo.id !== clean.photo?.id) void store.deletePhoto(initial.photo.id).catch(console.error)
      if (existing) {
        await store.updateRecipe(existing.id, clean)
        toast('Receta guardada')
        goBack(paths.recipe(existing.id))
      } else {
        const newId = await store.createRecipe({ ...clean, createdBy: getPrefs().name || undefined })
        toast('Receta creada 🎉')
        navigate(paths.recipe(newId), { replace: true })
      }
    } catch (e) {
      console.error(e)
      toast('No se ha podido guardar. Inténtalo de nuevo.')
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!existing) return
    await store.deleteRecipe(existing.id)
    toast(`“${existing.title}” eliminada`, {
      action: {
        label: 'Deshacer',
        onClick: () => {
          const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = existing
          void store.createRecipe(rest)
        },
      },
    })
    navigate(paths.recipes, { replace: true })
  }

  return (
    <Page
      title={existing ? 'Editar receta' : 'Nueva receta'}
      className="theme-recipes editor-page"
      hideLargeTitle
      left={
        <button className="nav-btn nav-text" onClick={cancel}>
          Cancelar
        </button>
      }
      right={
        <button className="nav-btn nav-text nav-strong" onClick={() => void save()} disabled={!canSave}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      }
    >
      {aiAvailable && <AiComposer draft={draft} onResult={applyAi} autoFocus={aiFocus} />}

      {photoSrc ? (
        <div className="editor-photo">
          <img src={photoSrc} alt="" />
          <div className="editor-photo-actions">
            <PhotoInput className="btn btn-small btn-glass" onPhoto={setPendingPhoto} label="Cambiar foto">
              <Icon name="camera" size={16} /> Cambiar
            </PhotoInput>
            <button
              className="btn btn-small btn-glass"
              onClick={() => {
                setPendingPhoto(null)
                set('photo', undefined)
              }}
            >
              <Icon name="trash" size={16} /> Quitar
            </button>
          </div>
        </div>
      ) : null}

      <div className="editor-head">
        {!photoSrc && (
          <button className={`emoji-picker-btn ${recipeTint({ id: id ?? '', title: draft.title })}`} onClick={() => setEmojiOpen(true)} aria-label="Cambiar icono">
            <span>{draft.emoji}</span>
            <span className="emoji-edit">
              <Icon name="edit" size={12} />
            </span>
          </button>
        )}
        <textarea
          className="title-input"
          rows={1}
          value={draft.title}
          onChange={(e) => set('title', e.target.value.replace(/\n/g, ''))}
          placeholder="Nombre de la receta"
          autoFocus={!existing && !aiAvailable}
          aria-label="Nombre de la receta"
        />
      </div>
      {!photoSrc && (
        <PhotoInput className="photo-add" onPhoto={setPendingPhoto}>
          <Icon name="camera" size={20} />
          <span>Añadir foto del plato</span>
        </PhotoInput>
      )}

      <div className="card field-group">
        <label className="field field-inline">
          <span>
            <Icon name="clock" size={18} /> Tiempo
          </span>
          <div className="input-suffix">
            <input
              inputMode="numeric"
              value={draft.time ?? ''}
              onChange={(e) => set('time', Number(e.target.value.replace(/\D/g, '')) || undefined)}
              placeholder="—"
            />
            <span>min</span>
          </div>
        </label>
        <div className="field field-inline">
          <span>
            <Icon name="users" size={18} /> Raciones
          </span>
          <div className="stepper">
            <button type="button" onClick={() => set('servings', Math.max(1, (draft.servings ?? 2) - 1))} aria-label="Menos raciones">
              −
            </button>
            <span>{draft.servings ?? '—'}</span>
            <button type="button" onClick={() => set('servings', Math.min(50, (draft.servings ?? 1) + 1))} aria-label="Más raciones">
              +
            </button>
          </div>
        </div>
      </div>

      <h2 className="form-title">Ingredientes</h2>
      <div className="card">
        <LinesEditor
          lines={draft.ingredients}
          onChange={(v) => set('ingredients', v)}
          placeholder="Ej. 200 g de harina (o pega una lista)"
        />
      </div>

      <h2 className="form-title">Preparación</h2>
      <div className="card">
        <LinesEditor lines={draft.steps} onChange={(v) => set('steps', v)} placeholder="Describe el siguiente paso" numbered />
      </div>

      <h2 className="form-title">Etiquetas</h2>
      <div className="chip-grid">
        {allTags.map((t) => (
          <button key={t} type="button" className={`chip ${draft.tags.includes(t) ? 'is-selected' : ''}`} onClick={() => toggleTag(t)}>
            {t}
          </button>
        ))}
        <form
          className="chip chip-input"
          onSubmit={(e) => {
            e.preventDefault()
            const t = newTag.trim()
            if (t && !draft.tags.includes(t)) set('tags', [...draft.tags, t])
            setNewTag('')
          }}
        >
          <Icon name="plus" size={14} />
          <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Nueva" enterKeyHint="done" aria-label="Nueva etiqueta" />
        </form>
      </div>

      <h2 className="form-title">Notas y origen</h2>
      <div className="card field-group">
        <label className="field">
          <span>Notas</span>
          <textarea
            rows={3}
            value={draft.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Trucos, variaciones, con qué acompañarla…"
          />
        </label>
        <label className="field">
          <span>Enlace</span>
          <input
            type="url"
            inputMode="url"
            value={draft.source ?? ''}
            onChange={(e) => set('source', e.target.value)}
            placeholder="https://"
            autoCapitalize="off"
          />
        </label>
      </div>

      {existing && (
        <button className="btn btn-block btn-danger-soft editor-delete" onClick={() => setConfirm('delete')}>
          <Icon name="trash" size={18} /> Eliminar receta
        </button>
      )}

      <Sheet open={emojiOpen} onClose={() => setEmojiOpen(false)} title="Elige un icono" tone="orange">
        <div className="emoji-grid">
          {FOOD_EMOJIS.map((e) => (
            <button
              key={e}
              className={`emoji-option ${draft.emoji === e ? 'is-selected' : ''}`}
              onClick={() => {
                set('emoji', e)
                setEmojiOpen(false)
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirm === 'discard'}
        title="¿Descartar los cambios?"
        message="Lo que has escrito no se guardará."
        confirmLabel="Descartar"
        destructive
        onConfirm={() => goBack(id ? paths.recipe(id) : paths.recipes)}
        onClose={() => setConfirm(null)}
      />
      <ConfirmSheet
        open={confirm === 'delete'}
        title="¿Eliminar esta receta?"
        message="Se borrará para los dos."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => void remove()}
        onClose={() => setConfirm(null)}
      />
    </Page>
  )
}
