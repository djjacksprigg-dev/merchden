/**
 * Printed patterns for every product.
 *
 * Patterns are drawn on a canvas sized to the real proportions of each part's
 * surface (measured from its geometry), so a 6 cm stripe is 6 cm on a hoodie,
 * a mug or a mouse mat. Each part says how its surface is laid out:
 *  - body   garment torso: u runs around (0.5 = centre front), v up
 *  - sleeve tubes (sleeves, legs): u around, v along
 *  - wrap   round products (mugs, bottles, hats): u around, `patternFront` marks the front
 *  - flat   flat-ish panels (mats, bags, phone backs, cushions): u across, v up
 */
import { BufferGeometry, CanvasTexture, ClampToEdgeWrapping, RepeatWrapping, SRGBColorSpace, Vector2, Vector3 } from 'three'
import type { PatternId } from '../../lib/types'

export type PatternMode = 'body' | 'sleeve' | 'wrap' | 'flat'

export type PatternGroup = 'classic' | 'esports'

export const PATTERNS: { id: PatternId; label: string; group: PatternGroup }[] = [
  { id: 'solid', label: 'Solid', group: 'classic' },
  { id: 'two-tone', label: 'Two-tone', group: 'classic' },
  { id: 'color-block', label: 'Colour-blocked', group: 'classic' },
  { id: 'gradient', label: 'Gradient', group: 'classic' },
  { id: 'diagonal', label: 'Diagonal stripes', group: 'classic' },
  { id: 'pinstripe', label: 'Pinstripe', group: 'classic' },
  { id: 'hoops', label: 'Hoops', group: 'classic' },
  { id: 'geometric', label: 'Geometric', group: 'classic' },
  { id: 'hex', label: 'Hex grid', group: 'classic' },
  { id: 'halftone', label: 'Halftone', group: 'classic' },
  { id: 'camo', label: 'Camo', group: 'classic' },
  { id: 'carbon', label: 'Carbon fibre', group: 'classic' },
  { id: 'split', label: 'Split colour', group: 'classic' },
  { id: 'racing', label: 'Racing stripes', group: 'classic' },
  { id: 'minimal', label: 'Minimalist', group: 'classic' },
  { id: 'logo-repeat', label: 'Team logo monogram', group: 'esports' },
  { id: 'crosshair', label: 'Crosshairs', group: 'esports' },
  { id: 'controller', label: 'Controllers', group: 'esports' },
  { id: 'arcade', label: 'Arcade icons', group: 'esports' },
  { id: 'wasd', label: 'WASD keycaps', group: 'esports' },
  { id: 'circuit', label: 'Circuit board', group: 'esports' },
  { id: 'lightning', label: 'Lightning', group: 'esports' },
  { id: 'pixel', label: 'Pixel fade', group: 'esports' },
  { id: 'glitch', label: 'Glitch', group: 'esports' },
  { id: 'binary', label: 'Binary code', group: 'esports' },
  { id: 'esports-camo', label: 'Gamer camo', group: 'esports' },
  { id: 'abstract', label: 'Abstract esports', group: 'esports' },
]

/* ------------------------------------------------------------------ */
/* Original esports symbols (drawn with canvas paths, no fonts/brands)  */
/* ------------------------------------------------------------------ */

type Ctx = CanvasRenderingContext2D

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function symCrosshair(ctx: Ctx, s: number, col: string, accent: string) {
  const lw = s * 0.09
  ctx.strokeStyle = col
  ctx.lineWidth = lw
  ctx.beginPath()
  ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    ctx.moveTo(dx * s * 0.3, dy * s * 0.3)
    ctx.lineTo(dx * s, dy * s)
  }
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.arc(0, 0, s * 0.11, 0, Math.PI * 2)
  ctx.fill()
}

function symController(ctx: Ctx, s: number, col: string, cut: string, accent: string) {
  // generic gamepad silhouette
  ctx.fillStyle = col
  ctx.beginPath()
  ctx.moveTo(-s * 0.55, -s * 0.38)
  ctx.lineTo(s * 0.55, -s * 0.38)
  ctx.bezierCurveTo(s * 0.95, -s * 0.38, s * 1.1, s * 0.1, s * 1.05, s * 0.45)
  ctx.bezierCurveTo(s * 1.0, s * 0.72, s * 0.72, s * 0.72, s * 0.58, s * 0.5)
  ctx.lineTo(s * 0.4, s * 0.25)
  ctx.lineTo(-s * 0.4, s * 0.25)
  ctx.lineTo(-s * 0.58, s * 0.5)
  ctx.bezierCurveTo(-s * 0.72, s * 0.72, -s * 1.0, s * 0.72, -s * 1.05, s * 0.45)
  ctx.bezierCurveTo(-s * 1.1, s * 0.1, -s * 0.95, -s * 0.38, -s * 0.55, -s * 0.38)
  ctx.closePath()
  ctx.fill()
  // d-pad
  ctx.fillStyle = cut
  const d = s * 0.1
  ctx.fillRect(-s * 0.62 - d * 1.5, -s * 0.06 - d * 0.5, d * 3, d)
  ctx.fillRect(-s * 0.62 - d * 0.5, -s * 0.06 - d * 1.5, d, d * 3)
  // face buttons (plain dots)
  ctx.fillStyle = accent
  for (const [bx, by] of [
    [0.62, -0.2],
    [0.62, 0.08],
    [0.48, -0.06],
    [0.76, -0.06],
  ]) {
    ctx.beginPath()
    ctx.arc(bx * s, by * s, s * 0.065, 0, Math.PI * 2)
    ctx.fill()
  }
  // sticks
  ctx.fillStyle = cut
  for (const sx of [-0.25, 0.25]) {
    ctx.beginPath()
    ctx.arc(sx * s, s * 0.08, s * 0.11, 0, Math.PI * 2)
    ctx.fill()
  }
}

function symBolt(ctx: Ctx, s: number, col: string) {
  ctx.fillStyle = col
  ctx.beginPath()
  ctx.moveTo(s * 0.15, -s)
  ctx.lineTo(-s * 0.5, s * 0.12)
  ctx.lineTo(-s * 0.02, s * 0.12)
  ctx.lineTo(-s * 0.22, s)
  ctx.lineTo(s * 0.5, -s * 0.2)
  ctx.lineTo(s * 0.02, -s * 0.2)
  ctx.closePath()
  ctx.fill()
}

function symHeart(ctx: Ctx, s: number, col: string) {
  // pixel-art heart (health)
  const px = s / 3.5
  const rows = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']
  ctx.fillStyle = col
  rows.forEach((r, j) =>
    [...r].forEach((ch, i) => {
      if (ch === 'X') ctx.fillRect((i - 3.5) * px, (j - 3) * px, px + 0.5, px + 0.5)
    }),
  )
}

function symStar(ctx: Ctx, s: number, col: string) {
  ctx.fillStyle = col
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? s * 0.42 : s
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  ctx.closePath()
  ctx.fill()
}

function symTrophy(ctx: Ctx, s: number, col: string) {
  ctx.fillStyle = col
  ctx.strokeStyle = col
  ctx.lineWidth = s * 0.12
  ctx.beginPath()
  ctx.moveTo(-s * 0.5, -s * 0.8)
  ctx.lineTo(s * 0.5, -s * 0.8)
  ctx.lineTo(s * 0.42, -s * 0.1)
  ctx.quadraticCurveTo(0, s * 0.35, -s * 0.42, -s * 0.1)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.arc(-s * 0.55, -s * 0.5, s * 0.22, Math.PI * 0.5, Math.PI * 1.5)
  ctx.moveTo(s * 0.55, -s * 0.72)
  ctx.arc(s * 0.55, -s * 0.5, s * 0.22, -Math.PI * 0.5, Math.PI * 0.5)
  ctx.stroke()
  ctx.fillRect(-s * 0.08, s * 0.1, s * 0.16, s * 0.4)
  ctx.fillRect(-s * 0.4, s * 0.5, s * 0.8, s * 0.18)
}

function symDpad(ctx: Ctx, s: number, col: string) {
  ctx.fillStyle = col
  const w = s * 0.38
  roundRectPath(ctx, -w / 2, -s, w, s * 2, w * 0.25)
  ctx.fill()
  roundRectPath(ctx, -s, -w / 2, s * 2, w, w * 0.25)
  ctx.fill()
}

function symKeycap(ctx: Ctx, s: number, col: string, label: string, text: string) {
  ctx.fillStyle = col
  roundRectPath(ctx, -s, -s, s * 2, s * 2, s * 0.28)
  ctx.fill()
  ctx.globalAlpha *= 0.35
  ctx.fillStyle = text
  roundRectPath(ctx, -s * 0.78, -s * 0.85, s * 1.56, s * 1.45, s * 0.2)
  ctx.fill()
  ctx.globalAlpha /= 0.35
  ctx.fillStyle = text
  ctx.font = `800 ${s * 1.05}px Arial, Helvetica, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 0, -s * 0.08)
}

/** Places a symbol at (x, y) with rotation */
function at(ctx: Ctx, x: number, y: number, rot: number, fn: () => void) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  fn()
  ctx.restore()
}

export interface PatternColors {
  base: string
  a: string
  b: string
  /** The team logo (monogram pattern) or the student's uploaded pattern image */
  logo?: HTMLImageElement | null
  /** Custom pattern: stretch one image over the whole print area instead of tiling */
  fill?: boolean
}

function rand(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.replace('#', ''), 16)
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * k)))
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`
}

/**
 * @param unit pixels per model unit (≈ 1 m ≈ product scale)
 * @param front canvas x fraction (0–1) that faces the front of the product
 */
export function drawPattern(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  id: PatternId,
  c: PatternColors,
  mode: PatternMode,
  unit: number,
  scale = 1,
) {
  const U = unit * scale
  ctx.save()
  ctx.fillStyle = c.base
  ctx.fillRect(0, 0, w, h)
  switch (id) {
    case 'solid':
      break

    case 'two-tone': {
      ctx.fillStyle = c.a
      if (mode === 'sleeve') {
        ctx.fillRect(0, 0, w, h)
      } else if (mode === 'body') {
        // contrasting shoulder yoke with a chevron on the front
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(w, 0)
        ctx.lineTo(w, h * 0.3)
        ctx.lineTo(w * 0.75, h * 0.3)
        ctx.lineTo(w * 0.5, h * 0.42)
        ctx.lineTo(w * 0.25, h * 0.3)
        ctx.lineTo(0, h * 0.3)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = c.b
        ctx.lineWidth = Math.max(2, 0.012 * U)
        ctx.stroke()
      } else {
        // angled split: top in pattern colour
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(w, 0)
        ctx.lineTo(w, h * 0.32)
        ctx.lineTo(0, h * 0.5)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = c.b
        ctx.lineWidth = Math.max(2, 0.012 * U)
        ctx.beginPath()
        ctx.moveTo(w, h * 0.32 + ctx.lineWidth)
        ctx.lineTo(0, h * 0.5 + ctx.lineWidth)
        ctx.stroke()
      }
      break
    }

    case 'color-block': {
      ctx.fillStyle = c.a
      if (mode === 'sleeve') {
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = c.b
        ctx.fillRect(w * 0.45, 0, w * 0.1, h)
      } else if (mode === 'body' || mode === 'wrap') {
        // side panels (canvas 0.25 / 0.75 are the sides) + lower block
        ctx.fillRect(w * 0.18, 0, w * 0.14, h)
        ctx.fillRect(w * 0.68, 0, w * 0.14, h)
        ctx.fillRect(0, h * 0.82, w, h * 0.18)
        ctx.fillStyle = c.b
        const lw = Math.max(2, 0.01 * U)
        ctx.fillRect(w * 0.32, 0, lw, h * 0.82)
        ctx.fillRect(w * 0.68 - lw, 0, lw, h * 0.82)
        ctx.fillRect(0, h * 0.82, w, lw)
      } else {
        ctx.fillRect(0, 0, w * 0.2, h)
        ctx.fillRect(w * 0.8, 0, w * 0.2, h)
        ctx.fillRect(0, h * 0.8, w, h * 0.2)
        ctx.fillStyle = c.b
        const lw = Math.max(2, 0.01 * U)
        ctx.fillRect(w * 0.2, 0, lw, h * 0.8)
        ctx.fillRect(w * 0.8 - lw, 0, lw, h * 0.8)
        ctx.fillRect(w * 0.2, h * 0.8, w * 0.6, lw)
      }
      break
    }

    case 'gradient': {
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, c.a)
      g.addColorStop(0.12, c.a)
      g.addColorStop(0.88, c.base)
      g.addColorStop(1, c.base)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      break
    }

    case 'diagonal': {
      const step = 0.16 * U
      ctx.translate(w / 2, h / 2)
      ctx.rotate(-Math.PI / 5)
      const R = Math.hypot(w, h)
      for (let x = -R; x < R; x += step) {
        ctx.fillStyle = c.a
        ctx.fillRect(x, -R, step * 0.38, R * 2)
        ctx.fillStyle = c.b
        ctx.fillRect(x + step * 0.38, -R, Math.max(1.5, step * 0.06), R * 2)
      }
      break
    }

    case 'pinstripe': {
      const step = 0.045 * U
      const lw = Math.max(1.5, 0.006 * U)
      for (let x = (w / 2) % step; x < w; x += step) {
        ctx.fillStyle = Math.round((x - w / 2) / step) % 4 === 0 ? c.b : c.a
        ctx.fillRect(x - lw / 2, 0, lw, h)
      }
      break
    }

    case 'split': {
      // half and half – on garments the split runs down centre front and back
      ctx.fillStyle = c.a
      if (mode === 'body') ctx.fillRect(w * 0.5, 0, w * 0.5, h)
      else if (mode === 'wrap') ctx.fillRect(w * 0.5, 0, w * 0.5, h)
      else if (mode === 'flat') ctx.fillRect(w * 0.5, 0, w * 0.5, h)
      if (mode !== 'sleeve') {
        ctx.fillStyle = c.b
        const lw = Math.max(2, 0.008 * U)
        ctx.fillRect(w * 0.5 - lw / 2, 0, lw, h)
        if (mode === 'body') {
          ctx.fillRect(0, 0, lw / 2, h)
          ctx.fillRect(w - lw / 2, 0, lw / 2, h)
        }
      }
      break
    }

    case 'racing': {
      // twin stripes: centre front and centre back on garments, along the length on sleeves
      const sw = 0.055 * U
      const gap = 0.03 * U
      const stripes = (cx: number, len: 'v' | 'h') => {
        for (const [off, col] of [
          [-(gap / 2 + sw), c.a],
          [gap / 2, c.a],
        ] as [number, string][]) {
          ctx.fillStyle = col
          if (len === 'v') ctx.fillRect(cx + off, 0, sw, h)
          else ctx.fillRect(0, cx + off, w, sw)
        }
        ctx.fillStyle = c.b
        const lw = Math.max(1.5, 0.006 * U)
        for (const off of [-(gap / 2 + sw) - lw, -gap / 2, gap / 2 - lw, gap / 2 + sw]) {
          if (len === 'v') ctx.fillRect(cx + off, 0, lw, h)
          else ctx.fillRect(0, cx + off, w, lw)
        }
      }
      if (mode === 'body') {
        stripes(w * 0.5, 'v')
        stripes(0, 'v')
        stripes(w, 'v')
      } else if (mode === 'sleeve') stripes(w * 0.5, 'v')
      else stripes(w * 0.5, 'v')
      break
    }

    case 'minimal': {
      // one fine chest band with a short accent tick
      const lw = Math.max(2, 0.012 * U)
      const y = mode === 'body' ? h * 0.3 : mode === 'sleeve' ? h * 0.12 : h * 0.3
      ctx.fillStyle = c.a
      ctx.fillRect(0, y, w, lw)
      ctx.fillStyle = c.b
      if (mode === 'body') ctx.fillRect(w * 0.6, y + lw * 2, 0.08 * U, lw)
      else ctx.fillRect(w * 0.55, y + lw * 2, 0.06 * U, lw)
      break
    }

    case 'abstract': {
      // sharp angular shards sweeping across – a classic sublimated esports look
      const r = rand(4242)
      ctx.save()
      ctx.translate(w / 2, h / 2)
      ctx.rotate(-0.5)
      const R = Math.hypot(w, h) / 2
      const n = Math.ceil((R * 2) / (0.22 * U)) + 2
      for (let i = 0; i < n; i++) {
        const y0 = -R + i * 0.22 * U + (r() - 0.5) * 0.1 * U
        const len = (0.4 + r() * 0.9) * U
        const x0 = -R + r() * R * 2
        const th = (0.03 + r() * 0.07) * U
        ctx.fillStyle = r() > 0.72 ? c.b : c.a
        ctx.globalAlpha = 0.55 + r() * 0.45
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x0 + len, y0 - th * 0.4)
        ctx.lineTo(x0 + len - th * 1.6, y0 + th)
        ctx.lineTo(x0 - th * 0.8, y0 + th * 1.2)
        ctx.closePath()
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.restore()
      break
    }

    case 'hoops': {
      const step = 0.14 * U
      for (let y = 0; y < h; y += step) {
        ctx.fillStyle = c.a
        ctx.fillRect(0, y, w, step * 0.5)
        ctx.fillStyle = c.b
        ctx.fillRect(0, y + step * 0.5, w, Math.max(1.5, step * 0.05))
      }
      break
    }

    case 'geometric': {
      const r = rand(1337)
      const cell = 0.11 * U
      for (let y = 0; y < h; y += cell) {
        for (let x = 0; x < w; x += cell) {
          const k = r()
          if (k < 0.45) continue
          ctx.globalAlpha = k > 0.85 ? 1 : 0.55
          ctx.fillStyle = k > 0.93 ? c.b : c.a
          ctx.beginPath()
          if (r() > 0.5) {
            ctx.moveTo(x, y)
            ctx.lineTo(x + cell, y)
            ctx.lineTo(x, y + cell)
          } else {
            ctx.moveTo(x + cell, y)
            ctx.lineTo(x + cell, y + cell)
            ctx.lineTo(x, y + cell)
          }
          ctx.closePath()
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      break
    }

    case 'hex': {
      const s = 0.05 * U // hexagon radius
      const hw = Math.sqrt(3) * s
      const r = rand(77)
      ctx.lineWidth = Math.max(1.5, 0.006 * U)
      for (let row = 0, y = 0; y < h + s * 2; row++, y += s * 1.5) {
        for (let x = row % 2 ? hw / 2 : 0; x < w + hw; x += hw) {
          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const a = Math.PI / 6 + (i * Math.PI) / 3
            const px = x + Math.cos(a) * s * 0.92
            const py = y + Math.sin(a) * s * 0.92
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.closePath()
          // fade the grid in toward the bottom, with a few solid cells
          const t = y / h
          if (r() > 0.93) {
            ctx.fillStyle = c.b
            ctx.globalAlpha = 0.85
            ctx.fill()
          }
          ctx.globalAlpha = 0.25 + 0.75 * t
          ctx.strokeStyle = c.a
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }
      break
    }

    case 'halftone': {
      const step = 0.03 * U
      ctx.fillStyle = c.a
      for (let y = step / 2, row = 0; y < h; y += step, row++) {
        const t = Math.pow(y / h, 1.3)
        const rad = (step / 2) * 0.95 * t
        if (rad < 0.4) continue
        for (let x = row % 2 ? step : step / 2; x < w; x += step) {
          ctx.beginPath()
          ctx.arc(x, y, rad, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }

    case 'camo': {
      const r = rand(2024)
      const layers = [shade(c.base, 0.72), c.a, c.b]
      for (const [li, col] of layers.entries()) {
        ctx.fillStyle = col
        const count = Math.ceil(((w * h) / (U * U)) * (li === 2 ? 14 : 22))
        for (let i = 0; i < count; i++) {
          const cx = r() * w
          const cy = r() * h
          const size = (0.05 + r() * 0.06) * U * (li === 2 ? 0.7 : 1)
          ctx.beginPath()
          // blob = cluster of overlapping ellipses
          for (let k = 0; k < 5; k++) {
            const ox = (r() - 0.5) * size * 1.6
            const oy = (r() - 0.5) * size
            ctx.ellipse(cx + ox, cy + oy, size * (0.5 + r() * 0.6), size * (0.35 + r() * 0.4), r() * Math.PI, 0, Math.PI * 2)
          }
          ctx.fill()
        }
      }
      break
    }

    case 'carbon': {
      const cell = 0.022 * U
      const dark = shade(c.base, 0.55)
      const light = c.a
      for (let y = 0, j = 0; y < h; y += cell, j++) {
        for (let x = 0, i = 0; x < w; x += cell, i++) {
          const horizontal = (Math.floor(i / 2) + Math.floor(j / 2)) % 2 === 0
          const g = horizontal ? ctx.createLinearGradient(x, y, x, y + cell) : ctx.createLinearGradient(x, y, x + cell, y)
          g.addColorStop(0, dark)
          g.addColorStop(0.5, light)
          g.addColorStop(1, dark)
          ctx.fillStyle = g
          ctx.fillRect(x, y, cell + 0.5, cell + 0.5)
        }
      }
      ctx.globalAlpha = 0.35
      ctx.fillStyle = c.base
      ctx.fillRect(0, 0, w, h)
      ctx.globalAlpha = 1
      break
    }

    case 'custom': {
      const img = c.logo
      if (!img || !img.naturalWidth) break
      const ar = img.naturalWidth / img.naturalHeight
      if (c.fill) {
        // one artwork across the print area (sublimation style), centred on the front
        const k = Math.max(w / img.naturalWidth, h / img.naturalHeight) * scale
        const iw = img.naturalWidth * k
        const ih = img.naturalHeight * k
        ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih)
      } else {
        // seamless-style repeat at real size (~25 cm tiles at 100 %)
        const th = 0.25 * U
        const tw = th * ar
        for (let y = 0; y < h; y += th) for (let x = (w / 2) % tw - tw; x < w; x += tw) ctx.drawImage(img, x, y, tw, th)
      }
      break
    }

    /* ---------------- esports ---------------- */

    case 'logo-repeat': {
      // monogram print of the team's own logo, like a luxury-brand repeat
      const step = 0.16 * U
      const img = c.logo
      for (let row = 0, y = step / 2; y < h + step; row++, y += step * 0.86) {
        for (let x = (row % 2 ? step / 2 : 0); x < w + step; x += step) {
          if (img && img.naturalWidth) {
            const k = Math.min((step * 0.55) / img.naturalWidth, (step * 0.55) / img.naturalHeight)
            const iw = img.naturalWidth * k
            const ih = img.naturalHeight * k
            ctx.globalAlpha = 0.9
            at(ctx, x, y, -0.18, () => ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih))
          } else {
            ctx.globalAlpha = 0.8
            at(ctx, x, y, 0, () => symStar(ctx, step * 0.2, row % 2 ? c.a : c.b))
          }
        }
      }
      ctx.globalAlpha = 1
      break
    }

    case 'crosshair': {
      const step = 0.13 * U
      for (let row = 0, y = step / 2; y < h + step; row++, y += step) {
        for (let x = (row % 2 ? step / 2 : 0); x < w + step; x += step) {
          ctx.globalAlpha = 0.85
          at(ctx, x, y, 0, () => symCrosshair(ctx, step * 0.28, c.a, c.b))
          // small hit-markers between reticles
          ctx.globalAlpha = 0.5
          at(ctx, x + step / 2, y + step / 2, Math.PI / 4, () => {
            ctx.strokeStyle = c.b
            ctx.lineWidth = step * 0.025
            ctx.beginPath()
            for (const sgn of [-1, 1]) {
              ctx.moveTo(sgn * step * 0.04, 0)
              ctx.lineTo(sgn * step * 0.1, 0)
              ctx.moveTo(0, sgn * step * 0.04)
              ctx.lineTo(0, sgn * step * 0.1)
            }
            ctx.stroke()
          })
        }
      }
      ctx.globalAlpha = 1
      break
    }

    case 'controller': {
      const r = rand(31)
      const step = 0.17 * U
      for (let row = 0, y = step / 2; y < h + step; row++, y += step * 0.8) {
        for (let x = (row % 2 ? step / 2 : 0); x < w + step; x += step) {
          ctx.globalAlpha = 0.9
          at(ctx, x, y, (r() - 0.5) * 0.9, () => symController(ctx, step * 0.32, c.a, c.base, c.b))
        }
      }
      ctx.globalAlpha = 1
      break
    }

    case 'arcade': {
      const r = rand(99)
      const step = 0.11 * U
      const icons = [
        (z: number) => symCrosshair(ctx, z, c.a, c.b),
        (z: number) => symBolt(ctx, z, c.b),
        (z: number) => symHeart(ctx, z, c.a),
        (z: number) => symStar(ctx, z, c.b),
        (z: number) => symTrophy(ctx, z, c.a),
        (z: number) => symDpad(ctx, z, c.a),
        (z: number) => symController(ctx, z * 0.9, c.a, c.base, c.b),
      ]
      for (let row = 0, y = step / 2; y < h + step; row++, y += step) {
        for (let x = (row % 2 ? step / 2 : 0); x < w + step; x += step) {
          const k = Math.floor(r() * icons.length)
          ctx.globalAlpha = 0.65 + r() * 0.35
          at(ctx, x + (r() - 0.5) * step * 0.2, y + (r() - 0.5) * step * 0.2, (r() - 0.5) * 0.8, () => icons[k](step * 0.26))
        }
      }
      ctx.globalAlpha = 1
      break
    }

    case 'wasd': {
      // WASD cluster repeated, with scattered spare keys
      const k = 0.045 * U
      const gap = k * 2.3
      const blockW = gap * 3 + k * 2
      const blockH = gap * 2 + k * 3
      const r = rand(5)
      for (let row = 0, y = 0; y < h + blockH; row++, y += blockH) {
        for (let x = (row % 2 ? -blockW / 2 : 0); x < w + blockW; x += blockW) {
          const keys: [number, number, string, boolean][] = [
            [x + gap, y, 'W', true],
            [x, y + gap, 'A', true],
            [x + gap, y + gap, 'S', true],
            [x + gap * 2, y + gap, 'D', true],
            [x + gap * 2.6, y - gap * 0.4, ['Q', 'E', 'R', 'F'][Math.floor(r() * 4)], false],
          ]
          for (const [kx, ky, label, main] of keys) {
            ctx.globalAlpha = main ? 0.95 : 0.4
            at(ctx, kx + k, ky + k, 0, () => symKeycap(ctx, k, main ? c.a : c.b, label, main ? c.b : c.base))
          }
        }
      }
      ctx.globalAlpha = 1
      break
    }

    case 'circuit': {
      const r = rand(8086)
      const g = 0.035 * U // grid pitch
      const lw = Math.max(1.5, g * 0.16)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const traces = Math.ceil(((w * h) / (g * g)) * 0.05)
      for (let i = 0; i < traces; i++) {
        let x = Math.round((r() * w) / g) * g
        let y = Math.round((r() * h) / g) * g
        ctx.strokeStyle = r() > 0.8 ? c.b : c.a
        ctx.globalAlpha = 0.55 + r() * 0.45
        ctx.lineWidth = lw * (r() > 0.85 ? 2 : 1)
        ctx.beginPath()
        ctx.moveTo(x, y)
        let dir = Math.floor(r() * 4) * 2 // 0..6, even = orthogonal
        const steps = 3 + Math.floor(r() * 9)
        for (let s2 = 0; s2 < steps; s2++) {
          if (r() < 0.35) dir = (dir + (r() > 0.5 ? 1 : 7)) % 8 // 45° bend
          const a = (dir * Math.PI) / 4
          x += Math.round(Math.cos(a)) * g
          y += Math.round(Math.sin(a)) * g
          ctx.lineTo(x, y)
        }
        ctx.stroke()
        // solder pad at the end
        ctx.fillStyle = c.b
        ctx.beginPath()
        ctx.arc(x, y, lw * 1.8, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = c.base
        ctx.beginPath()
        ctx.arc(x, y, lw * 0.8, 0, Math.PI * 2)
        ctx.fill()
      }
      // a few chips
      for (let i = 0; i < Math.ceil(((w * h) / (U * U)) * 3); i++) {
        const cw = g * (2 + Math.floor(r() * 3))
        const ch = g * (2 + Math.floor(r() * 2))
        const x = Math.round((r() * w) / g) * g
        const y = Math.round((r() * h) / g) * g
        ctx.globalAlpha = 0.9
        ctx.fillStyle = c.a
        roundRectPath(ctx, x, y, cw, ch, g * 0.2)
        ctx.fill()
        ctx.fillStyle = c.b
        for (let p2 = g * 0.5; p2 < cw; p2 += g * 0.5) {
          ctx.fillRect(x + p2 - lw / 2, y - g * 0.3, lw, g * 0.3)
          ctx.fillRect(x + p2 - lw / 2, y + ch, lw, g * 0.3)
        }
      }
      ctx.globalAlpha = 1
      break
    }

    case 'lightning': {
      const r = rand(77)
      const step = 0.14 * U
      for (let row = 0, y = step / 2; y < h + step; row++, y += step) {
        for (let x = (row % 2 ? step / 2 : 0); x < w + step; x += step) {
          ctx.globalAlpha = 0.6 + r() * 0.4
          const big = r() > 0.7
          at(ctx, x + (r() - 0.5) * step * 0.3, y, -0.35 + (r() - 0.5) * 0.3, () => symBolt(ctx, step * (big ? 0.32 : 0.2), big ? c.a : c.b))
        }
      }
      ctx.globalAlpha = 1
      break
    }

    case 'pixel': {
      // 8-bit dissolve rising from the hem
      const px = 0.022 * U
      const r = rand(64)
      for (let y = 0; y < h; y += px) {
        const t = y / h
        for (let x = 0; x < w; x += px) {
          const k = r()
          if (k < Math.pow(t, 1.6)) {
            ctx.fillStyle = k < Math.pow(t, 1.6) * 0.18 ? c.b : c.a
            ctx.fillRect(x, y, px - 0.6, px - 0.6)
          }
        }
      }
      break
    }

    case 'glitch': {
      const r = rand(404)
      const bars = Math.ceil((h / U) * 26)
      for (let i = 0; i < bars; i++) {
        const y = r() * h
        const bh = (0.004 + r() * 0.03) * U
        const x = r() * w
        const bw = (0.05 + r() * 0.5) * U
        const shift = (0.006 + r() * 0.012) * U
        ctx.globalAlpha = 0.85
        ctx.fillStyle = c.b
        ctx.fillRect(x - shift, y, bw, bh)
        ctx.fillStyle = c.a
        ctx.fillRect(x, y, bw, bh)
      }
      // scanlines
      ctx.globalAlpha = 0.12
      ctx.fillStyle = '#000000'
      for (let y = 0; y < h; y += Math.max(2, 0.006 * U)) ctx.fillRect(0, y, w, Math.max(1, 0.002 * U))
      ctx.globalAlpha = 1
      break
    }

    case 'binary': {
      const fs = 0.042 * U
      const r = rand(1010)
      ctx.font = `700 ${fs}px "Courier New", Courier, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let x = fs / 2; x < w; x += fs * 0.9) {
        const len = 6 + Math.floor(r() * 20)
        const start = r() * h
        for (let j = 0; j < len; j++) {
          const y = (start + j * fs * 1.05) % h
          ctx.globalAlpha = 0.4 + 0.6 * (j / len)
          ctx.fillStyle = j === len - 1 ? c.b : c.a
          ctx.fillText(r() > 0.5 ? '1' : '0', x, y)
        }
      }
      ctx.globalAlpha = 1
      break
    }

    case 'esports-camo': {
      // pixelated "digital" camo
      const px = 0.03 * U
      const r = rand(1337)
      const cols = Math.ceil(w / px)
      const rows = Math.ceil(h / px)
      const field = new Float32Array(cols * rows)
      // blobby noise from random seeds
      const seeds = Array.from({ length: Math.ceil(((w * h) / (U * U)) * 40) }, () => [r() * cols, r() * rows, 2 + r() * 4, Math.floor(r() * 3)] as const)
      const layer = new Int8Array(cols * rows).fill(-1)
      for (const [sx, sy, rad, l] of seeds) {
        for (let j = Math.max(0, Math.floor(sy - rad)); j < Math.min(rows, sy + rad); j++) {
          for (let i = Math.max(0, Math.floor(sx - rad)); i < Math.min(cols, sx + rad); i++) {
            const d = Math.hypot(i - sx, (j - sy) * 1.4)
            if (d < rad * (0.7 + 0.3 * r()) && d < (field[j * cols + i] || 99)) {
              field[j * cols + i] = d
              layer[j * cols + i] = l
            }
          }
        }
      }
      const palette = [shade(c.base, 0.65), c.a, c.b]
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const l = layer[j * cols + i]
          if (l < 0) continue
          ctx.fillStyle = palette[l]
          ctx.fillRect(i * px, j * px, px + 0.5, px + 0.5)
        }
      }
      break
    }
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Measuring a part's surface                                          */
/* ------------------------------------------------------------------ */

const spanCache = new WeakMap<BufferGeometry, { u: number; v: number }>()

/** Average physical length (model units) covered by uv 0→1 in u and in v. */
export function uvSpan(g: BufferGeometry): { u: number; v: number } {
  const hit = spanCache.get(g)
  if (hit) return hit
  const pos = g.getAttribute('position')
  const uv = g.getAttribute('uv') as import('three').BufferAttribute
  if (!uv) return { u: 1, v: 1 }
  const idx = g.index
  const triCount = (idx ? idx.count : pos.count) / 3
  const stride = Math.max(1, Math.floor(triCount / 4000))
  const p0 = new Vector3()
  const p1 = new Vector3()
  const p2 = new Vector3()
  const t0 = new Vector2()
  const t1 = new Vector2()
  const t2 = new Vector2()
  let su = 0
  let sv = 0
  let n = 0
  for (let t = 0; t < triCount; t += stride) {
    const a = idx ? idx.getX(t * 3) : t * 3
    const b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1
    const c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2
    p0.fromBufferAttribute(pos, a)
    p1.fromBufferAttribute(pos, b)
    p2.fromBufferAttribute(pos, c)
    t0.fromBufferAttribute(uv, a)
    t1.fromBufferAttribute(uv, b)
    t2.fromBufferAttribute(uv, c)
    const e1 = p1.clone().sub(p0)
    const e2 = p2.clone().sub(p0)
    const du1 = t1.x - t0.x
    const dv1 = t1.y - t0.y
    const du2 = t2.x - t0.x
    const dv2 = t2.y - t0.y
    const det = du1 * dv2 - du2 * dv1
    if (Math.abs(det) < 1e-9) continue
    const r = 1 / det
    const Ju = e1.clone().multiplyScalar(dv2 * r).addScaledVector(e2, -dv1 * r)
    const Jv = e2.clone().multiplyScalar(du1 * r).addScaledVector(e1, -du2 * r)
    const lu = Ju.length()
    const lv = Jv.length()
    if (!Number.isFinite(lu) || !Number.isFinite(lv) || lu > 50 || lv > 50) continue
    // weight by area so large visible panels (a mug wall) outweigh tiny caps
    const area = e1.clone().cross(e2).length()
    su += lu * area
    sv += lv * area
    n += area
  }
  const out = n > 0 ? { u: su / n, v: sv / n } : { u: 1, v: 1 }
  spanCache.set(g, out)
  return out
}

/** Pattern texture for one part, sized to its real proportions. */
export function createPatternTexture(
  id: PatternId,
  colors: PatternColors,
  mode: PatternMode,
  geometry: BufferGeometry,
  front: number,
  scale: number,
  quality: 'high' | 'low',
): CanvasTexture {
  const span = uvSpan(geometry)
  const H = quality === 'high' ? 1024 : 512
  const W = Math.round(Math.min(4096, Math.max(128, (H * span.u) / Math.max(1e-3, span.v))))
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const unit = H / Math.max(1e-3, span.v)
  drawPattern(ctx, W, H, id, colors, mode, unit, scale)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.wrapS = mode === 'flat' ? ClampToEdgeWrapping : RepeatWrapping
  t.wrapT = ClampToEdgeWrapping
  t.anisotropy = 8
  // put the centre of the artwork on the front of the product
  t.offset.x = mode === 'flat' ? 0 : 0.5 - front
  return t
}
