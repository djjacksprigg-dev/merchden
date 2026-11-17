import { useEffect, useState } from 'react'
import { useStudio } from '../../state/studio'
import { getCachedImage, loadImage } from '../../three/engine/textures'
import { getTextCanvas, loadTextCanvas, textKey } from '../../three/engine/text'
import type { LogoLayer, TextStyle } from '../../lib/types'

/** Returns the decoded <img> for a logo id, loading it on demand. */
export function useLogoImage(logoId: string | null): HTMLImageElement | null {
  const src = useStudio((s) => (logoId ? s.logos[logoId]?.dataUrl : undefined))
  const [, force] = useState(0)
  const cached = src ? getCachedImage(src) : null
  useEffect(() => {
    if (!src || cached) return
    let alive = true
    loadImage(src)
      .then(() => alive && force((n) => n + 1))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [src, cached])
  return cached
}

/** Returns the rendered text artwork for a text style, rendering it once fonts are ready. */
export function useTextCanvas(style: TextStyle | undefined): HTMLCanvasElement | null {
  const [, force] = useState(0)
  const key = style ? textKey(style) : ''
  const cached = style ? getTextCanvas(style) : null
  useEffect(() => {
    if (!style || cached) return
    let alive = true
    loadTextCanvas(style).then(() => alive && force((n) => n + 1))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, cached])
  return cached
}

/** Renders all text layers of a design – used before exports. */
export async function preloadText(layers: LogoLayer[]) {
  await Promise.all(layers.filter((l) => l.text).map((l) => loadTextCanvas(l.text!)))
}

/** Preloads every logo used by a design – used before batch exports. */
export async function preloadLogos(ids: (string | null)[]) {
  const logos = useStudio.getState().logos
  await Promise.all(
    ids
      .filter((x): x is string => !!x && !!logos[x])
      .map((id) => loadImage(logos[id].dataUrl).catch(() => null)),
  )
}
