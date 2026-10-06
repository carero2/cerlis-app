import { useEffect, useState } from 'react'
import { useData } from './data'
import type { PhotoRef } from './types'

/** Foto lista para guardar: imagen grande + miniatura, ambas JPEG en data URL. */
export interface PendingPhoto {
  full: string
  thumb: string
}

// Un documento de Firestore admite como máximo 1 MiB.
const MAX_FULL_BYTES = 800_000

async function loadImage(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* algunos formatos no los decodifica createImageBitmap: probamos con <img> */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function render(img: ImageBitmap | HTMLImageElement, maxSide: number, quality: number, square = false): string {
  const w = img.width
  const h = img.height
  let sx = 0
  let sy = 0
  let sw = w
  let sh = h
  if (square) {
    const side = Math.min(w, h)
    sx = (w - side) / 2
    sy = (h - side) / 2
    sw = sh = side
  }
  const scale = Math.min(1, maxSide / Math.max(sw, sh))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw * scale)
  canvas.height = Math.round(sh * scale)
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

/**
 * Reduce la foto del móvil (varios MB) a algo que quepa en Firestore:
 * ~1280 px para verla grande y ~360 px cuadrada para listas y tarjetas.
 */
export async function preparePhoto(file: Blob): Promise<PendingPhoto> {
  const img = await loadImage(file)
  let full = render(img, 1280, 0.8)
  for (const [side, q] of [
    [1280, 0.65],
    [1024, 0.6],
    [800, 0.55],
  ] as const) {
    if (full.length <= MAX_FULL_BYTES) break
    full = render(img, side, q)
  }
  const thumb = render(img, 360, 0.7, true)
  if ('close' in img) img.close()
  return { full, thumb }
}

const cache = new Map<string, string>()

/**
 * Devuelve la imagen grande de una foto. Mientras carga (o si no existe)
 * devuelve la miniatura, así nunca se ve un hueco vacío.
 */
export function usePhoto(ref?: PhotoRef): string | undefined {
  const { store } = useData()
  const [full, setFull] = useState(() => (ref ? cache.get(ref.id) : undefined))

  useEffect(() => {
    if (!ref) return setFull(undefined)
    const cached = cache.get(ref.id)
    if (cached) return setFull(cached)
    setFull(undefined)
    let cancelled = false
    store
      .getPhoto(ref.id)
      .then((data) => {
        if (!data) return
        cache.set(ref.id, data)
        if (!cancelled) setFull(data)
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [ref?.id, store])

  return full ?? ref?.thumb
}

/** Guarda una foto pendiente y devuelve la referencia para el documento. */
export async function savePendingPhoto(
  store: { savePhoto(data: string): Promise<string> },
  photo: PendingPhoto,
): Promise<PhotoRef> {
  const id = await store.savePhoto(photo.full)
  cache.set(id, photo.full)
  return { id, thumb: photo.thumb }
}
