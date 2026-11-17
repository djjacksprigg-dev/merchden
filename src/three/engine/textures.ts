/**
 * Procedural textures generated in the browser with Canvas 2D:
 *  - micro-surface normal maps for each fabric / material finish
 *  - jersey pattern textures (real material maps, not thumbnails)
 *  - logo textures, repeated strap prints and die-cut sticker artwork
 * Nothing is downloaded, so the studio works offline and on locked-down networks.
 */
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
} from 'three'
import type { StickerShape } from '../../lib/types'
import type { Finish } from './types'

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D is not available')
  return { c, ctx }
}

/* ------------------------------------------------------------------ */
/* Height-field → normal map                                           */
/* ------------------------------------------------------------------ */

type HeightFn = (x: number, y: number, size: number) => number

function rand(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function valueNoise(size: number, cell: number, seed: number) {
  const r = rand(seed)
  const n = Math.ceil(size / cell)
  const grid: number[] = []
  for (let i = 0; i < n * n; i++) grid.push(r())
  const g = (x: number, y: number) => grid[((y % n) + n) % n * n + (((x % n) + n) % n)]
  return (x: number, y: number) => {
    const gx = x / cell
    const gy = y / cell
    const x0 = Math.floor(gx)
    const y0 = Math.floor(gy)
    const tx = gx - x0
    const ty = gy - y0
    const sx = tx * tx * (3 - 2 * tx)
    const sy = ty * ty * (3 - 2 * ty)
    const a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * sx
    const b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * sx
    return a + (b - a) * sy
  }
}

function normalMapFromHeight(size: number, height: HeightFn, strength: number): CanvasTexture {
  const { c, ctx } = canvas(size, size)
  const hgt = new Float32Array(size * size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) hgt[y * size + x] = height(x, y, size)
  const img = ctx.createImageData(size, size)
  const at = (x: number, y: number) => hgt[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength
      let nx = -dx
      let ny = dy
      let nz = 1
      const l = Math.hypot(nx, ny, nz)
      nx /= l
      ny /= l
      nz /= l
      const i = (y * size + x) * 4
      img.data[i] = (nx * 0.5 + 0.5) * 255
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.generateMipmaps = true
  t.minFilter = LinearMipmapLinearFilter
  t.anisotropy = 4
  return t
}

const heights: Partial<Record<Finish, { fn: () => HeightFn; strength: number; size?: number }>> = {
  knit: {
    // fine jersey knit: staggered V-loops plus fibre noise
    fn: () => {
      const n = valueNoise(256, 4, 7)
      return (x, y) => {
        const col = x % 8
        const row = Math.floor(y / 6)
        const v = Math.abs(col - 4) / 4
        const loop = Math.sin(((y + (row % 2) * 3) / 6) * Math.PI * 2) * 0.5 + 0.5
        return v * 0.6 + loop * 0.25 + n(x, y) * 0.35
      }
    },
    strength: 2.2,
  },
  cotton: {
    fn: () => {
      const n = valueNoise(256, 3, 11)
      const m = valueNoise(256, 16, 12)
      return (x, y) => (Math.sin(x * 0.9) * Math.sin(y * 0.9)) * 0.25 + n(x, y) * 0.5 + m(x, y) * 0.4
    },
    strength: 1.8,
  },
  fleece: {
    fn: () => {
      const n = valueNoise(256, 2, 21)
      const m = valueNoise(256, 10, 22)
      return (x, y) => n(x, y) * 0.6 + m(x, y) * 0.6
    },
    strength: 2.4,
  },
  rib: {
    fn: () => {
      const n = valueNoise(256, 4, 31)
      return (x, y) => Math.pow(Math.abs(Math.sin((x / 256) * Math.PI * 32)), 0.6) + n(x, y) * 0.15
    },
    strength: 5,
  },
  pique: {
    fn: () => {
      const n = valueNoise(256, 3, 41)
      return (x, y) => {
        const cx = (x % 8) - 4
        const cy = (y % 8) - 4
        return Math.max(0, 1 - Math.hypot(cx, cy) / 4) * 0.8 + n(x, y) * 0.3
      }
    },
    strength: 3,
  },
  tricot: {
    fn: () => {
      const n = valueNoise(256, 2, 51)
      return (x, y) => Math.sin((x + y) * 0.8) * 0.3 + Math.sin((x - y) * 0.8) * 0.3 + n(x, y) * 0.3
    },
    strength: 1.4,
  },
  twill: {
    fn: () => {
      const n = valueNoise(256, 3, 61)
      return (x, y) => (((x + y) % 6) / 6) * 0.7 + n(x, y) * 0.3
    },
    strength: 2.6,
  },
  canvas: {
    fn: () => {
      const n = valueNoise(256, 3, 71)
      return (x, y) => {
        const wx = Math.sin((x / 256) * Math.PI * 64)
        const wy = Math.sin((y / 256) * Math.PI * 64)
        return (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? wx * 0.5 : wy * 0.5 + n(x, y) * 0.3
      }
    },
    strength: 2.2,
  },
  nylon: {
    fn: () => {
      const n = valueNoise(256, 2, 81)
      return (x, y) => ((Math.floor(x / 3) + Math.floor(y / 3)) % 2) * 0.4 + n(x, y) * 0.2
    },
    strength: 1.6,
  },
  cloth: {
    fn: () => {
      const n = valueNoise(256, 1, 91)
      return (x, y) => n(x, y) * 0.5 + ((x + y) % 2) * 0.2
    },
    strength: 0.9,
  },
  leather: {
    fn: () => {
      const n = valueNoise(256, 5, 101)
      const m = valueNoise(256, 2, 102)
      return (x, y) => n(x, y) * 0.7 + m(x, y) * 0.3
    },
    strength: 1.4,
  },
  rubber: {
    fn: () => {
      const n = valueNoise(256, 2, 111)
      return (x, y) => n(x, y)
    },
    strength: 0.8,
  },
  powder: {
    fn: () => {
      const n = valueNoise(256, 2, 121)
      return (x, y) => n(x, y)
    },
    strength: 0.5,
  },
  metal: {
    fn: () => {
      const n = valueNoise(256, 1, 131)
      return (x, y) => n(x * 0.02, y) * 0.8
    },
    strength: 0.6,
  },
}

const normalCache = new Map<Finish, CanvasTexture>()

export function getNormalMap(finish: Finish): CanvasTexture | null {
  const def = heights[finish]
  if (!def) return null
  let t = normalCache.get(finish)
  if (!t) {
    t = normalMapFromHeight(def.size ?? 256, def.fn(), def.strength)
    normalCache.set(finish, t)
  }
  return t
}

/* ------------------------------------------------------------------ */
/* Logo textures                                                       */
/* ------------------------------------------------------------------ */

const imageCache = new Map<string, HTMLImageElement>()
const textureCache = new Map<string, Texture>()

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src)
  if (cached && cached.complete && cached.naturalWidth) return Promise.resolve(cached)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      imageCache.set(src, img)
      resolve(img)
    }
    img.onerror = () => reject(new Error('Image failed to load'))
    img.src = src
  })
}

export function getCachedImage(src: string) {
  const img = imageCache.get(src)
  return img && img.complete && img.naturalWidth ? img : null
}

export function getLogoTexture(id: string, img: HTMLImageElement): Texture {
  let t = textureCache.get(id)
  if (!t || t.image !== img) {
    t?.dispose()
    t = new Texture(img)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
    t.wrapS = t.wrapT = ClampToEdgeWrapping
    t.needsUpdate = true
    textureCache.set(id, t)
  }
  return t
}

export function disposeLogoTexture(id: string) {
  textureCache.get(id)?.dispose()
  textureCache.delete(id)
}

/** Strap print: logo repeated along a ribbon (lanyard). */
export function createRepeatTexture(img: HTMLImageElement | null, background: string, scale: number, rotationDeg: number): CanvasTexture {
  const w = 128
  const h = 2048
  const { c, ctx } = canvas(w, h)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, w, h)
  if (img) {
    const aspect = img.naturalWidth / img.naturalHeight
    const lw = w * 0.78 * Math.min(1.25, Math.max(0.3, scale))
    const lh = lw / aspect
    const step = Math.max(lh, lw) * 1.6
    for (let y = step / 2; y < h; y += step) {
      ctx.save()
      ctx.translate(w / 2, y)
      ctx.rotate(((rotationDeg + 90) * Math.PI) / 180)
      ctx.drawImage(img, -lw / 2, -lh / 2, lw, lh)
      ctx.restore()
    }
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  t.wrapS = ClampToEdgeWrapping
  t.wrapT = RepeatWrapping
  return t
}

/**
 * Sticker artwork. Die-cut stickers get a border that follows the logo's own
 * silhouette (a dilated alpha mask); circles and rounded squares get a backing.
 */
export function createStickerTexture(
  img: HTMLImageElement | null,
  shape: StickerShape,
  border: string,
  scale: number,
  rotationDeg: number,
): { texture: CanvasTexture; alpha: CanvasTexture; aspect: number } {
  const S = 1024
  const { c, ctx } = canvas(S, S)
  const pad = S * 0.08
  const drawLogo = (target: CanvasRenderingContext2D, extra = 1) => {
    if (!img) return
    const aspect = img.naturalWidth / img.naturalHeight
    const box = (S - pad * 2) * (shape === 'die-cut' ? 1 : 0.72) * Math.min(1, scale) * extra
    const lw = aspect >= 1 ? box : box * aspect
    const lh = aspect >= 1 ? box / aspect : box
    target.save()
    target.translate(S / 2, S / 2)
    target.rotate((rotationDeg * Math.PI) / 180)
    target.drawImage(img, -lw / 2, -lh / 2, lw, lh)
    target.restore()
  }
  if (shape === 'die-cut') {
    // build silhouette mask
    const { c: mc, ctx: mctx } = canvas(S, S)
    drawLogo(mctx)
    mctx.globalCompositeOperation = 'source-in'
    mctx.fillStyle = '#fff'
    mctx.fillRect(0, 0, S, S)
    // dilate by stamping the mask around a circle
    const r = S * 0.035
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      ctx.drawImage(mc, Math.cos(a) * r, Math.sin(a) * r)
      ctx.drawImage(mc, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5)
    }
    ctx.drawImage(mc, 0, 0)
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = border
    ctx.fillRect(0, 0, S, S)
    ctx.globalCompositeOperation = 'source-over'
    if (!img) {
      ctx.fillStyle = border
      ctx.beginPath()
      ctx.arc(S / 2, S / 2, S * 0.4, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    ctx.fillStyle = border
    ctx.beginPath()
    if (shape === 'circle') ctx.arc(S / 2, S / 2, S / 2 - pad * 0.5, 0, Math.PI * 2)
    else {
      const r = S * 0.12
      const x = pad * 0.5
      const w = S - pad
      ctx.moveTo(x + r, x)
      ctx.arcTo(x + w, x, x + w, x + w, r)
      ctx.arcTo(x + w, x + w, x, x + w, r)
      ctx.arcTo(x, x + w, x, x, r)
      ctx.arcTo(x, x, x + w, x, r)
      ctx.closePath()
    }
    ctx.fill()
  }
  drawLogo(ctx)
  // alpha map: white where sticker exists
  const { c: ac, ctx: actx } = canvas(S, S)
  actx.fillStyle = '#000'
  actx.fillRect(0, 0, S, S)
  actx.drawImage(c, 0, 0)
  const id = actx.getImageData(0, 0, S, S)
  for (let i = 0; i < id.data.length; i += 4) {
    // read original alpha from colour canvas
    id.data[i] = id.data[i + 1] = id.data[i + 2] = 0
  }
  const src = ctx.getImageData(0, 0, S, S)
  for (let i = 0; i < id.data.length; i += 4) {
    const a = src.data[i + 3]
    id.data[i] = id.data[i + 1] = id.data[i + 2] = a
    id.data[i + 3] = 255
  }
  actx.putImageData(id, 0, 0)
  const texture = new CanvasTexture(c)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  const alpha = new CanvasTexture(ac)
  return { texture, alpha, aspect: 1 }
}
