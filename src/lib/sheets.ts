/** Contact sheet + presentation-ready collection sheet, drawn with Canvas 2D. */
import type { Design, ProjectInfo } from './types'
import { PRODUCT_MAP } from '../three/catalogue'
import { useStudio } from '../state/studio'
import { relativeLuminance } from './utils'
import { loadImage } from '../three/engine/textures'

export interface SheetItem {
  design: Design
  image: HTMLCanvasElement
}

const FONT = "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const para of text.split(/\n+/)) {
    const words = para.split(/\s+/).filter(Boolean)
    let line = ''
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line)
        line = w
      } else line = test
    }
    if (line) lines.push(line)
    lines.push('')
  }
  while (lines.length && lines[lines.length - 1] === '') lines.pop()
  return lines
}

function brandPalette(items: SheetItem[]): string[] {
  const counts = new Map<string, number>()
  const brand = useStudio.getState().brandColors
  for (const c of [brand.primary, brand.secondary]) if (c) counts.set(c.toLowerCase(), 100)
  for (const { design } of items) {
    const def = PRODUCT_MAP[design.productId]
    for (const slot of def.colorSlots) {
      const c = design.colors[slot.id]?.toLowerCase()
      if (c) counts.set(c, (counts.get(c) ?? 0) + (slot.id === 'primary' ? 3 : 1))
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c)
}

function mainLogoSrc(items: SheetItem[]): string | null {
  const logos = useStudio.getState().logos
  const counts = new Map<string, number>()
  for (const { design } of items) for (const l of design.layers) if (l.logoId && logos[l.logoId]) counts.set(l.logoId, (counts.get(l.logoId) ?? 0) + 1)
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return best ? logos[best[0]].dataUrl : null
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawContain(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const k = Math.min(w / img.width, h / img.height)
  const dw = img.width * k
  const dh = img.height * k
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

function itemName(d: Design) {
  return d.title?.trim() || PRODUCT_MAP[d.productId].shortName
}

/* ------------------------------------------------------------------ */

export async function buildPresentationSheet(items: SheetItem[], project: ProjectInfo): Promise<HTMLCanvasElement> {
  const W = 3508
  const H = 2480 // A4 landscape @ 300 dpi
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#f4f6f9'
  ctx.fillRect(0, 0, W, H)

  // header band
  const HB = 360
  ctx.fillStyle = '#0b111d'
  ctx.fillRect(0, 0, W, HB)
  ctx.fillStyle = '#ff7a1a'
  ctx.fillRect(0, HB - 12, W, 12)
  let tx = 140
  const logoSrc = mainLogoSrc(items)
  if (logoSrc) {
    try {
      const img = await loadImage(logoSrc)
      drawContain(ctx, img, 130, 60, 230, 230)
      tx = 420
    } catch {
      /* ignore */
    }
  }
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 120px ${FONT}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(project.orgName || 'Esports organisation', tx, 190)
  ctx.font = `500 58px ${FONT}`
  ctx.fillStyle = '#b8c4d8'
  ctx.fillText(project.projectName || 'Merchandise collection', tx, 275)
  ctx.textAlign = 'right'
  ctx.font = `700 44px ${FONT}`
  ctx.fillStyle = '#ff7a1a'
  ctx.fillText('MERCHANDISE COLLECTION', W - 140, 175)
  ctx.font = `500 40px ${FONT}`
  ctx.fillStyle = '#93a2bb'
  ctx.fillText(`${items.length} product${items.length === 1 ? '' : 's'} · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, W - 140, 245)
  ctx.textAlign = 'left'

  // left column
  const LX = 140
  const LW = 860
  let y = HB + 140
  ctx.fillStyle = '#0b111d'
  ctx.font = `800 46px ${FONT}`
  ctx.fillText('BRAND COLOURS', LX, y)
  y += 50
  const palette = brandPalette(items)
  const sw = 250
  palette.forEach((col, i) => {
    const cx = LX + (i % 3) * (sw + 50)
    const cy = y + Math.floor(i / 3) * (sw + 110)
    roundRect(ctx, cx, cy, sw, sw, 28)
    ctx.fillStyle = col
    ctx.fill()
    ctx.strokeStyle = '#00000018'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#334155'
    ctx.font = `600 38px ${FONT}`
    ctx.fillText(col.toUpperCase(), cx, cy + sw + 56)
  })
  y += Math.ceil(palette.length / 3) * (sw + 110) + 60

  ctx.fillStyle = '#0b111d'
  ctx.font = `800 46px ${FONT}`
  ctx.fillText('DESIGN RATIONALE', LX, y)
  y += 70
  ctx.font = `400 38px ${FONT}`
  ctx.fillStyle = '#334155'
  const rationale = project.rationale.trim() || 'Add your design rationale in the Project tab to explain your colour, logo and product choices.'
  if (!project.rationale.trim()) ctx.fillStyle = '#94a3b8'
  const lines = wrap(ctx, rationale, LW)
  const maxLines = Math.floor((H - 160 - y) / 56)
  lines.slice(0, maxLines).forEach((l, i) => ctx.fillText(i === maxLines - 1 && lines.length > maxLines ? l.replace(/\s+\S*$/, ' …') : l, LX, y + i * 56))

  // product grid
  const GX = LX + LW + 140
  const GY = HB + 90
  const GW = W - GX - 140
  const GH = H - GY - 130
  const n = Math.max(1, items.length)
  let best = { cols: 1, rows: 1, cell: 0 }
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols)
    const cw = (GW - (cols - 1) * 50) / cols
    const ch = (GH - (rows - 1) * 50) / rows
    const cell = Math.min(cw, ch / 1.18)
    if (cell > best.cell) best = { cols, rows, cell }
  }
  const cellW = (GW - (best.cols - 1) * 50) / best.cols
  const cellH = (GH - (best.rows - 1) * 50) / best.rows
  items.forEach((it, i) => {
    const col = i % best.cols
    const row = Math.floor(i / best.cols)
    const x = GX + col * (cellW + 50)
    const yy = GY + row * (cellH + 50)
    roundRect(ctx, x, yy, cellW, cellH, 30)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = '#0b111d14'
    ctx.lineWidth = 3
    ctx.stroke()
    const labelH = Math.min(150, cellH * 0.2)
    ctx.save()
    roundRect(ctx, x + 18, yy + 18, cellW - 36, cellH - labelH - 36, 22)
    ctx.clip()
    drawContain(ctx, it.image, x + 18, yy + 18, cellW - 36, cellH - labelH - 36)
    ctx.restore()
    const fs = Math.max(26, Math.min(48, cellW / 14))
    ctx.fillStyle = '#0b111d'
    ctx.font = `700 ${fs}px ${FONT}`
    ctx.fillText(fit(ctx, itemName(it.design), cellW - 60), x + 30, yy + cellH - labelH + fs * 0.9)
    // colour dots
    const def = PRODUCT_MAP[it.design.productId]
    def.colorSlots.forEach((s, k) => {
      const col2 = it.design.colors[s.id]
      if (!col2) return
      ctx.beginPath()
      ctx.arc(x + 30 + fs * 0.42 + k * fs * 1.1, yy + cellH - labelH + fs * 1.75, fs * 0.38, 0, Math.PI * 2)
      ctx.fillStyle = col2
      ctx.fill()
      ctx.strokeStyle = '#0000002a'
      ctx.lineWidth = 2
      ctx.stroke()
    })
    ctx.fillStyle = '#64748b'
    ctx.font = `500 ${fs * 0.62}px ${FONT}`
    ctx.textAlign = 'right'
    ctx.fillText(def.shortName, x + cellW - 30, yy + cellH - labelH + fs * 1.95)
    ctx.textAlign = 'left'
  })

  ctx.fillStyle = '#94a3b8'
  ctx.font = `500 30px ${FONT}`
  ctx.fillText('Created with Merch Forge Studio · 3D renders of student designs', 140, H - 60)
  return c
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1)
  return t + '…'
}

/* ------------------------------------------------------------------ */

export async function buildContactSheet(items: SheetItem[], project: ProjectInfo): Promise<HTMLCanvasElement> {
  const cols = items.length <= 4 ? Math.max(1, items.length) : items.length <= 9 ? 3 : 4
  const rows = Math.ceil(items.length / cols)
  const cell = 760
  const gap = 40
  const pad = 100
  const header = 220
  const label = 150
  const W = pad * 2 + cols * cell + (cols - 1) * gap
  const H = pad + header + rows * (cell + label) + (rows - 1) * gap + pad
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#0b111d'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 72px ${FONT}`
  ctx.fillText(project.orgName || 'Merchandise collection', pad, pad + 70)
  ctx.font = `500 38px ${FONT}`
  ctx.fillStyle = '#93a2bb'
  ctx.fillText(`Contact sheet · ${items.length} product${items.length === 1 ? '' : 's'}${project.projectName ? ' · ' + project.projectName : ''}`, pad, pad + 135)
  items.forEach((it, i) => {
    const x = pad + (i % cols) * (cell + gap)
    const y = pad + header + Math.floor(i / cols) * (cell + label + gap)
    ctx.save()
    roundRect(ctx, x, y, cell, cell, 24)
    ctx.clip()
    drawContain(ctx, it.image, x, y, cell, cell)
    ctx.restore()
    ctx.fillStyle = '#ffffff'
    ctx.font = `700 40px ${FONT}`
    ctx.fillText(fit(ctx, `${i + 1}. ${itemName(it.design)}`, cell), x, y + cell + 56)
    const def = PRODUCT_MAP[it.design.productId]
    let dx = x
    ctx.font = `500 26px ${FONT}`
    for (const s of def.colorSlots) {
      const col = it.design.colors[s.id]
      if (!col) continue
      roundRect(ctx, dx, y + cell + 80, 150, 44, 10)
      ctx.fillStyle = col
      ctx.fill()
      ctx.fillStyle = relativeLuminance(col) > 0.45 ? '#0b111d' : '#ffffff'
      ctx.fillText(col.toUpperCase(), dx + 16, y + cell + 111)
      dx += 165
      if (dx > x + cell - 150) break
    }
  })
  return c
}
