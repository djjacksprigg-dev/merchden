export function uid(prefix = 'id'): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c && typeof c.randomUUID === 'function') return `${prefix}_${c.randomUUID().slice(0, 13)}`
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

export function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v))
}

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

export function normaliseHex(input: string): string | null {
  const s = input.trim()
  const m = HEX.exec(s)
  if (!m) return null
  let h = m[1].toLowerCase()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return `#${h}`
}

/** Makes a safe filename part: letters, numbers, dashes. */
export function safeName(s: string, fallback = 'Design'): string {
  const cleaned = s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return cleaned || fallback
}

/** e.g. TeamName_Hoodie_Front.png */
export function exportFilename(team: string, product: string, view: string, ext = 'png') {
  return `${safeName(team, 'MyTeam')}_${safeName(product, 'Product')}_${safeName(view, 'View')}.${ext}`
}

/* When the studio is embedded as a hosted preview, file saves go through the
   host's downloads capability (the frame itself may not download). */
type HostDownloads = { save: (r: { filename: string; data: Blob }) => Promise<unknown> }
let hostDownloads: HostDownloads | null = null
export const isFramed = (() => {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
})()
export const hostDownloadsReady: Promise<boolean> = (async () => {
  if (!isFramed) return false
  type Host = { claude?: { use?: (n: string) => Promise<unknown> } }
  // the host may attach window.claude shortly after the page starts
  let c = (window as unknown as Host).claude
  for (let i = 0; i < 20 && !c?.use; i++) {
    await new Promise((r) => setTimeout(r, 150))
    c = (window as unknown as Host).claude
  }
  if (!c?.use) return false
  try {
    hostDownloads = (await c.use('downloads')) as HostDownloads | null
  } catch {
    hostDownloads = null
  }
  return !!hostDownloads
})()

export function downloadBlob(blob: Blob, filename: string) {
  if (hostDownloads) {
    hostDownloads.save({ filename, data: blob }).catch((e: { code?: string }) => {
      if (e?.code !== 'declined') console.warn('Save was not completed', e)
    })
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), type, quality)
  })
}

export function relativeLuminance(hex: string) {
  const n = normaliseHex(hex) ?? '#000000'
  const v = [1, 3, 5].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
}

export const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export const VIEW_LABELS = {
  front: 'Front',
  back: 'Back',
  side: 'Side',
  'three-quarter': 'Three-quarter',
} as const
