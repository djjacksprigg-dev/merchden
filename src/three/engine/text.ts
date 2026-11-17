/**
 * Text artwork for names, gamer tags, numbers and slogans.
 * Rendered to a transparent canvas (with outline, letter-spacing and arc) and
 * then printed onto the product like any other graphic.
 */
import type { TextStyle } from '../../lib/types'

export interface FontDef {
  id: string
  label: string
  family: string
  weight: number
  /** Uppercase fonts look odd in lowercase – shown as a hint */
  caps?: boolean
}

// All fonts are SIL Open Font License, bundled via @fontsource (see ASSET_LICENCES.md)
export const FONTS: FontDef[] = [
  { id: 'orbitron', label: 'Orbitron', family: 'Orbitron', weight: 800 },
  { id: 'russo', label: 'Russo One', family: 'Russo One', weight: 400 },
  { id: 'audiowide', label: 'Audiowide', family: 'Audiowide', weight: 400 },
  { id: 'black-ops', label: 'Black Ops One', family: 'Black Ops One', weight: 400 },
  { id: 'bebas', label: 'Bebas Neue', family: 'Bebas Neue', weight: 400, caps: true },
  { id: 'anton', label: 'Anton', family: 'Anton', weight: 400 },
  { id: 'oswald', label: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'teko', label: 'Teko', family: 'Teko', weight: 600 },
  { id: 'press-start', label: 'Press Start 2P', family: '"Press Start 2P"', weight: 400 },
  { id: 'inter', label: 'Clean sans', family: '"Inter Variable", Inter, Arial, sans-serif', weight: 800 },
]

export const FONT_MAP: Record<string, FontDef> = Object.fromEntries(FONTS.map((f) => [f.id, f]))

export const DEFAULT_TEXT: TextStyle = {
  content: 'TEAM NAME',
  font: 'orbitron',
  color: '#ffffff',
  outlineColor: '#0b0f17',
  outline: 0,
  spacing: 0.04,
  arc: 0,
}

function fontCss(f: FontDef, px: number, style?: Pick<TextStyle, 'bold' | 'italic'>) {
  // fonts without a bold/italic cut are synthesised by the browser
  const weight = style?.bold ? Math.max(800, f.weight + 300) : f.weight
  return `${style?.italic ? 'italic ' : ''}${weight} ${px}px ${f.family}`
}

/** Waits until the browser has the font ready (they load on first use). */
export async function ensureFont(fontId: string) {
  const f = FONT_MAP[fontId] ?? FONTS[0]
  try {
    await document.fonts.load(fontCss(f, 64), 'ABCabc0123')
    await document.fonts.load(fontCss(f, 64, { bold: true }), 'ABCabc0123')
  } catch {
    /* fall back to whatever is available */
  }
}

/** Renders the text to a tightly-cropped transparent canvas. */
export function renderTextCanvas(style: TextStyle): HTMLCanvasElement {
  const f = FONT_MAP[style.font] ?? FONTS[0]
  const PX = 220 // letter height in pixels – plenty for 4096 px exports
  const lines = [style.content.trim() || ' ', ...(style.subline?.trim() ? [style.subline.trim()] : [])]
  const sizes = [PX, PX * 0.48]
  const outline = Math.max(0, Math.min(0.2, style.outline)) * PX

  const meas = document.createElement('canvas').getContext('2d')!
  const measureLine = (text: string, size: number) => {
    meas.font = fontCss(f, size, style)
    const sp = style.spacing * size
    let w = 0
    const widths: number[] = []
    for (const ch of text) {
      const cw = meas.measureText(ch).width
      widths.push(cw)
      w += cw + sp
    }
    return { width: Math.max(1, w - sp), widths, sp }
  }
  const metrics = lines.map((l, i) => measureLine(l, sizes[i]))
  const mainW = metrics[0].width
  const arc = (Math.max(-180, Math.min(180, style.arc)) * Math.PI) / 180
  const radius = Math.abs(arc) > 0.01 ? mainW / Math.abs(arc) : Infinity

  const pad = outline + PX * 0.3
  const lineGap = PX * 0.25
  const totalH = sizes[0] * 1.15 + (lines.length > 1 ? lineGap + sizes[1] * 1.15 : 0)
  const sag = Number.isFinite(radius) ? radius * (1 - Math.cos(Math.abs(arc) / 2)) : 0
  const W = Math.ceil(Math.max(...metrics.map((m) => m.width)) + pad * 2 + (Number.isFinite(radius) ? PX * 0.4 : 0))
  const H = Math.ceil(totalH + pad * 2 + sag + PX * 0.2)

  const c = document.createElement('canvas')
  c.width = Math.min(4096, W)
  c.height = Math.min(2048, H)
  const ctx = c.getContext('2d')!
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2

  const drawGlyph = (ch: string, x: number, y: number, rot: number, size: number, pass: 'stroke' | 'fill') => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.font = fontCss(f, size, style)
    if (pass === 'stroke') {
      ctx.strokeStyle = style.outlineColor
      ctx.lineWidth = outline * 2 * (size / PX)
      ctx.strokeText(ch, 0, 0)
    } else {
      ctx.fillStyle = style.color
      ctx.fillText(ch, 0, 0)
    }
    ctx.restore()
  }

  const cx = c.width / 2
  const mainY = pad + sizes[0] * 0.58 + (arc > 0 ? sag : 0)
  for (const pass of (outline > 0 ? ['stroke', 'fill'] : ['fill']) as ('stroke' | 'fill')[]) {
    lines.forEach((text, li) => {
      const size = sizes[li]
      const m = metrics[li]
      const chars = [...text]
      if (li === 0 && Number.isFinite(radius)) {
        // letters along an arc; positive arc = crest shape (curving up)
        const dir = arc > 0 ? 1 : -1
        const centreY = arc > 0 ? mainY + radius : mainY - radius
        let s = -m.width / 2
        chars.forEach((ch, i) => {
          const mid = s + m.widths[i] / 2
          const a = mid / radius
          const x = cx + Math.sin(a) * radius
          const y = centreY - dir * Math.cos(a) * radius
          drawGlyph(ch, x, y, dir * a, size, pass)
          s += m.widths[i] + m.sp
        })
      } else {
        const y = li === 0 ? mainY : mainY + (arc < 0 ? sag : 0) + sizes[0] * 0.5 + lineGap + size * 0.6
        // lines of different widths line up left, centre or right
        const blockW = Math.max(...metrics.map((mm) => mm.width))
        const align = style.align ?? 'center'
        let x = align === 'left' ? cx - blockW / 2 : align === 'right' ? cx + blockW / 2 - m.width : cx - m.width / 2
        chars.forEach((ch, i) => {
          drawGlyph(ch, x + m.widths[i] / 2, y, 0, size, pass)
          x += m.widths[i] + m.sp
        })
      }
    })
  }
  return trim(c)
}

function trim(c: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = c.getContext('2d')!
  const { width, height } = c
  const d = ctx.getImageData(0, 0, width, height).data
  let x0 = width
  let y0 = height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (d[(y * width + x) * 4 + 3] > 6) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  if (x1 < 0) {
    const e = document.createElement('canvas')
    e.width = e.height = 4
    return e
  }
  const p = 6
  x0 = Math.max(0, x0 - p)
  y0 = Math.max(0, y0 - p)
  x1 = Math.min(width - 1, x1 + p)
  y1 = Math.min(height - 1, y1 + p)
  const out = document.createElement('canvas')
  out.width = x1 - x0 + 1
  out.height = y1 - y0 + 1
  out.getContext('2d')!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
  return out
}

/* ---------------- cache (so exports can wait for fonts) ---------------- */

const cache = new Map<string, HTMLCanvasElement>()
const pending = new Map<string, Promise<HTMLCanvasElement>>()
export const textKey = (s: TextStyle) => JSON.stringify([s.content, s.subline ?? '', s.font, s.color, s.outlineColor, s.outline, s.spacing, s.arc, !!s.bold, !!s.italic, s.align ?? 'center'])

export function getTextCanvas(s: TextStyle): HTMLCanvasElement | null {
  return cache.get(textKey(s)) ?? null
}

export function loadTextCanvas(s: TextStyle): Promise<HTMLCanvasElement> {
  const k = textKey(s)
  const hit = cache.get(k)
  if (hit) return Promise.resolve(hit)
  let p = pending.get(k)
  if (!p) {
    p = ensureFont(s.font).then(() => {
      const c = renderTextCanvas(s)
      cache.set(k, c)
      if (cache.size > 80) cache.delete(cache.keys().next().value as string)
      pending.delete(k)
      return c
    })
    pending.set(k, p)
  }
  return p
}
