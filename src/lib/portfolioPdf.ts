/**
 * Builds the student portfolio as a PDF entirely in the browser (jsPDF, bundled
 * locally – nothing is uploaded). Only the student's own answers are used.
 */
import { jsPDF } from 'jspdf'
import { useStudio } from '../state/studio'
import { PRODUCT_MAP } from '../three/catalogue'
import { downloadBlob, safeName } from './utils'

const NAVY: [number, number, number] = [13, 17, 27]
const ORANGE: [number, number, number] = [255, 122, 26]
const INK: [number, number, number] = [30, 41, 59]
const MUTED: [number, number, number] = [120, 132, 150]

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** jsPDF takes PNG/JPEG – re-encode any image (WebP, SVG-derived PNGs…) through a canvas. */
async function asJpeg(src: string, maxSide = 1400, background = '#ffffff'): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const img = new Image()
    img.src = src
    await img.decode()
    const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(img.naturalWidth * k))
    c.height = Math.max(1, Math.round(img.naturalHeight * k))
    const x = c.getContext('2d')!
    x.fillStyle = background
    x.fillRect(0, 0, c.width, c.height)
    x.drawImage(img, 0, 0, c.width, c.height)
    return { data: c.toDataURL('image/jpeg', 0.9), w: c.width, h: c.height }
  } catch {
    return null
  }
}

export async function buildPortfolioPdf() {
  const st = useStudio.getState()
  st.setBusy({ label: 'Creating your portfolio PDF…' })
  try {
    const { portfolio, brandKit: kit, collection, logos, project } = st
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const W = 210
    const H = 297
    const M = 16
    let y = 0

    const footer = () => {
      const n = doc.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(...MUTED)
      doc.text(`${kit.orgName || 'Merch Forge'} · ${portfolio.studentProject || 'Merchandise portfolio'}`, M, H - 8)
      doc.text(`Page ${n}`, W - M, H - 8, { align: 'right' })
    }
    const newPage = () => {
      footer()
      doc.addPage()
      y = M
    }
    const ensure = (h: number) => {
      if (y + h > H - 18) newPage()
    }
    const heading = (t: string, size = 13) => {
      ensure(12)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(size)
      doc.setTextColor(...NAVY)
      doc.text(t, M, y)
      y += size * 0.5
    }
    const para = (t: string, empty = 'Not answered yet.') => {
      doc.setFont('helvetica', t.trim() ? 'normal' : 'italic')
      doc.setFontSize(10.5)
      doc.setTextColor(...(t.trim() ? INK : MUTED))
      const lines = doc.splitTextToSize(t.trim() || empty, W - M * 2) as string[]
      for (const line of lines) {
        ensure(6)
        doc.text(line, M, y)
        y += 5.2
      }
      y += 3
    }
    const swatches = (cols: string[], x0: number, yy: number, size = 12) => {
      cols.forEach((c, i) => {
        doc.setFillColor(...rgb(c))
        doc.setDrawColor(200, 205, 212)
        doc.roundedRect(x0 + i * (size + 14), yy, size, size, 2, 2, 'FD')
        doc.setFontSize(7.5)
        doc.setTextColor(...MUTED)
        doc.text(c.toUpperCase(), x0 + i * (size + 14), yy + size + 4)
      })
    }

    /* ---------------- cover ---------------- */
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, W, 92, 'F')
    doc.setFillColor(...ORANGE)
    doc.rect(0, 92, W, 2.2, 'F')
    const logo = kit.primaryLogoId && logos[kit.primaryLogoId] ? await asJpeg(logos[kit.primaryLogoId].dataUrl, 800, '#0d111b') : null
    let tx = M
    if (logo) {
      const k = Math.min(60 / logo.w, 42 / logo.h)
      const w = logo.w * k
      doc.addImage(logo.data, 'JPEG', M, 24 + (42 - logo.h * k) / 2, w, logo.h * k)
      tx = M + w + 10
    }
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(26)
    doc.text(doc.splitTextToSize(kit.orgName || 'Esports organisation', W - tx - M) as string[], tx, 40)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(13)
    doc.setTextColor(200, 210, 225)
    doc.text(portfolio.studentProject || 'Merchandise portfolio', tx, 58)
    if (kit.slogan) {
      doc.setFontSize(11)
      doc.setTextColor(...ORANGE)
      doc.text(kit.slogan, tx, 67)
    }
    doc.setFontSize(9)
    doc.setTextColor(150, 162, 182)
    doc.text(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), tx, 80)
    y = 108
    heading('Brand colours')
    swatches([kit.primary, kit.secondary, kit.accent], M, y)
    y += 26
    heading('Target audience')
    para(portfolio.audience)
    if (project.rationale.trim()) {
      heading('Design rationale')
      para(project.rationale)
    }
    if (collection.length) {
      heading(`My merchandise range (${collection.length} product${collection.length === 1 ? '' : 's'})`)
      const cols = 4
      const cell = (W - M * 2 - (cols - 1) * 4) / cols
      for (let i = 0; i < collection.length; i++) {
        if (i % cols === 0) ensure(cell + 8)
        const d = collection[i]
        const x = M + (i % cols) * (cell + 4)
        const img = d.thumbnail ? await asJpeg(d.thumbnail, 600) : null
        if (img) doc.addImage(img.data, 'JPEG', x, y, cell, cell)
        doc.setFontSize(8)
        doc.setTextColor(...INK)
        doc.text((doc.splitTextToSize(d.title, cell) as string[])[0], x, y + cell + 4)
        if (i % cols === cols - 1 || i === collection.length - 1) y += cell + 9
      }
    }

    /* ---------------- product pages ---------------- */
    for (const d of collection) {
      newPage()
      const def = PRODUCT_MAP[d.productId]
      const n = portfolio.products[d.id]
      doc.setFillColor(...NAVY)
      doc.rect(0, 0, W, 26, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text(d.title, M, 13)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(200, 210, 225)
      doc.text(def?.name ?? '', M, 20)
      y = 34
      const img = d.thumbnail ? await asJpeg(d.thumbnail, 1000) : null
      const size = 78
      if (img) doc.addImage(img.data, 'JPEG', M, y, size, size)
      // colours beside the image
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...NAVY)
      doc.text('Colours', M + size + 8, y + 4)
      let cy = y + 9
      for (const slot of def?.colorSlots ?? []) {
        const c = d.colors[slot.id]
        if (!c) continue
        doc.setFillColor(...rgb(c))
        doc.setDrawColor(200, 205, 212)
        doc.roundedRect(M + size + 8, cy, 6, 6, 1, 1, 'FD')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(...INK)
        doc.text(`${slot.label} – ${c.toUpperCase()}`, M + size + 17, cy + 4.5)
        cy += 9
      }
      y += size + 10
      heading('Why I chose this product', 11)
      para(n?.why ?? '')
      heading('How it represents the brand', 11)
      para(n?.represents ?? '')
      heading('Why it would appeal to the audience', 11)
      para(n?.appeal ?? '')
      heading('What I would improve', 11)
      para(n?.improve ?? '')
      if (n?.versions.length) {
        ensure(70)
        heading('Design development', 11)
        const vs = n.versions
        const cell = Math.min(60, (W - M * 2 - (vs.length - 1) * 5) / vs.length)
        ensure(cell + 10)
        for (let i = 0; i < vs.length; i++) {
          const vi = await asJpeg(vs[i].image, 700)
          const x = M + i * (cell + 5)
          if (vi) doc.addImage(vi.data, 'JPEG', x, y, cell, cell)
          doc.setFontSize(8.5)
          doc.setTextColor(...INK)
          doc.text(vs[i].label, x, y + cell + 4.5)
        }
        y += cell + 10
        if (vs.length > 1) {
          heading('What changed', 10.5)
          para(n.changes)
          heading('Why I made the changes', 10.5)
          para(n.reasons)
        }
      }
    }

    /* ---------------- evaluation ---------------- */
    newPage()
    heading('Evaluation', 16)
    y += 2
    heading('Improvements to the whole range', 11)
    para(portfolio.improvements)
    footer()

    const name = `${safeName(kit.orgName || 'MyTeam', 'MyTeam')}_Portfolio.pdf`
    downloadBlob(doc.output('blob'), name)
    useStudio.getState().toast(`Downloaded ${name}`, 'success')
  } finally {
    useStudio.getState().setBusy(null)
  }
}
