/**
 * Logo upload pipeline: validation → (SVG sanitising) → rasterising to PNG.
 * Logos never leave the device.
 */
import type { LogoAsset } from './types'
import { uid } from './utils'

export const MAX_RASTER_BYTES = 10 * 1024 * 1024
export const MAX_SVG_BYTES = 2 * 1024 * 1024
export const MAX_LOGO_EDGE = 1400
export const ACCEPT = '.png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml'

export type LogoKind = 'png' | 'jpeg' | 'webp' | 'svg'

export class LogoError extends Error {}

export function detectKind(name: string, type: string): LogoKind | null {
  const ext = name.toLowerCase().split('.').pop() ?? ''
  if (type === 'image/png' || ext === 'png') return 'png'
  if (type === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg') return 'jpeg'
  if (type === 'image/webp' || ext === 'webp') return 'webp'
  if (type === 'image/svg+xml' || ext === 'svg') return 'svg'
  return null
}

/** Checks the first bytes so a renamed file cannot pretend to be an image. */
export function sniff(bytes: Uint8Array): LogoKind | null {
  const b = bytes
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp'
  const head = new TextDecoder().decode(b.slice(0, 1024)).replace(/^﻿/, '').trimStart().toLowerCase()
  if (head.startsWith('<?xml') || head.startsWith('<svg') || head.startsWith('<!--') || head.startsWith('<!doctype svg')) {
    if (head.includes('<svg')) return 'svg'
  }
  return null
}

export function validateFile(file: { name: string; type: string; size: number }): LogoKind {
  const kind = detectKind(file.name, file.type)
  if (!kind) throw new LogoError(`“${file.name}” is not a supported format. Please upload a PNG, JPG, WEBP or SVG file.`)
  if (file.size === 0) throw new LogoError('That file is empty.')
  const limit = kind === 'svg' ? MAX_SVG_BYTES : MAX_RASTER_BYTES
  if (file.size > limit) {
    throw new LogoError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${limit / 1024 / 1024} MB for ${kind.toUpperCase()} files – try exporting a smaller version.`)
  }
  return kind
}

/* ------------------------------------------------------------------ */
/* SVG sanitising                                                      */
/* ------------------------------------------------------------------ */

const BLOCKED_TAGS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'audio',
  'video',
  'canvas',
  'animate',
  'animatemotion',
  'animatetransform',
  'set',
  'handler',
  'listener',
  'image', // external raster images could load remote content; embedded logos rarely need them
])
const SAFE_DATA_URI = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i

/**
 * Returns a cleaned SVG string with scripts, event handlers, external
 * references and remote CSS removed. Throws if the markup is not valid SVG.
 */
export function sanitizeSvg(text: string): { svg: string; width: number; height: number } {
  if (/<!ENTITY/i.test(text)) throw new LogoError('This SVG uses XML entities, which are not allowed for safety reasons. Please re-export it from your design software.')
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  if (doc.getElementsByTagName('parsererror').length) throw new LogoError('This SVG file could not be read. It may be damaged – try re-exporting it.')
  const root = doc.documentElement
  if (!root || root.nodeName.toLowerCase() !== 'svg') throw new LogoError('This file does not contain an SVG image.')

  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      const tag = child.nodeName.toLowerCase().replace(/^.*:/, '')
      if (BLOCKED_TAGS.has(tag)) {
        // allow embedded raster images only when they are safe data URIs
        if (tag === 'image') {
          const href = child.getAttribute('href') ?? child.getAttribute('xlink:href') ?? ''
          if (SAFE_DATA_URI.test(href.trim())) {
            cleanAttributes(child)
            continue
          }
        }
        child.remove()
        continue
      }
      if (tag === 'style') {
        const css = child.textContent ?? ''
        child.textContent = cleanCss(css)
      }
      cleanAttributes(child)
      walk(child)
    }
  }
  cleanAttributes(root)
  walk(root)

  // size from width/height or viewBox
  const vb = (root.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number)
  let w = parseFloat(root.getAttribute('width') ?? '')
  let h = parseFloat(root.getAttribute('height') ?? '')
  const hasPctW = /%/.test(root.getAttribute('width') ?? '')
  const hasPctH = /%/.test(root.getAttribute('height') ?? '')
  if ((!w || hasPctW || !h || hasPctH) && vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
    w = vb[2]
    h = vb[3]
  }
  if (!w || !h || !Number.isFinite(w) || !Number.isFinite(h)) {
    w = 512
    h = 512
  }
  if (!root.getAttribute('viewBox')) root.setAttribute('viewBox', `0 0 ${w} ${h}`)
  // render vector artwork at full studio resolution
  const s = MAX_LOGO_EDGE / Math.max(w, h)
  w = Math.round(w * s)
  h = Math.round(h * s)
  root.setAttribute('width', String(w))
  root.setAttribute('height', String(h))
  root.removeAttribute('preserveAspectRatio')
  if (!root.getAttribute('xmlns')) root.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  return { svg: new XMLSerializer().serializeToString(root), width: w, height: h }
}

function cleanCss(css: string) {
  return css
    .replace(/@import[^;]*;?/gi, '')
    .replace(/url\(\s*(['"]?)(?!#|data:image\/(png|jpeg|gif|webp))[^)]*\)/gi, 'none')
    .replace(/expression\s*\(/gi, '')
}

function cleanAttributes(el: Element) {
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase()
    const value = attr.value.trim()
    if (name.startsWith('on')) {
      el.removeAttribute(attr.name)
      continue
    }
    if (name === 'href' || name === 'xlink:href' || name === 'src') {
      if (!(value.startsWith('#') || SAFE_DATA_URI.test(value))) el.removeAttribute(attr.name)
      continue
    }
    if (/javascript:|vbscript:/i.test(value)) {
      el.removeAttribute(attr.name)
      continue
    }
    if (name === 'style') el.setAttribute('style', cleanCss(value))
    else if (/url\(/i.test(value) && !/url\(\s*['"]?#/i.test(value)) el.removeAttribute(attr.name)
  }
}

/* ------------------------------------------------------------------ */
/* Rasterising                                                         */
/* ------------------------------------------------------------------ */

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new LogoError('The image could not be decoded. It may be damaged or in an unusual format.'))
    img.src = src
  })
}

async function rasterise(src: string, w: number, h: number): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImg(src)
  const iw = w || img.naturalWidth
  const ih = h || img.naturalHeight
  if (!iw || !ih) throw new LogoError('The image has no size.')
  if (iw < 16 || ih < 16) throw new LogoError('That image is very small (under 16 px). Please use a larger version of your logo.')
  const scale = Math.min(1, MAX_LOGO_EDGE / Math.max(iw, ih))
  const cw = Math.max(1, Math.round(iw * scale))
  const ch = Math.max(1, Math.round(ih * scale))
  const c = document.createElement('canvas')
  c.width = cw
  c.height = ch
  const ctx = c.getContext('2d')
  if (!ctx) throw new LogoError('Your browser could not process the image.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, cw, ch)
  // trim fully transparent borders so placement sizes feel right
  const trimmed = trimTransparent(c)
  return { dataUrl: trimmed.toDataURL('image/png'), width: trimmed.width, height: trimmed.height }
}

function trimTransparent(c: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = c.getContext('2d')!
  const { width, height } = c
  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(0, 0, width, height).data
  } catch {
    return c
  }
  let x0 = width
  let y0 = height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) throw new LogoError('That image appears to be completely transparent.')
  const pad = 2
  x0 = Math.max(0, x0 - pad)
  y0 = Math.max(0, y0 - pad)
  x1 = Math.min(width - 1, x1 + pad)
  y1 = Math.min(height - 1, y1 + pad)
  if (x0 === 0 && y0 === 0 && x1 === width - 1 && y1 === height - 1) return c
  const out = document.createElement('canvas')
  out.width = x1 - x0 + 1
  out.height = y1 - y0 + 1
  out.getContext('2d')!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
  return out
}

export async function processLogoFile(file: File): Promise<LogoAsset> {
  const kind = validateFile(file)
  const bytes = new Uint8Array(await file.arrayBuffer())
  const real = sniff(bytes)
  if (!real) throw new LogoError(`“${file.name}” does not look like a real ${kind.toUpperCase()} image. It may be damaged or renamed.`)
  const name = file.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Logo'
  if (real === 'svg') {
    const text = new TextDecoder().decode(bytes)
    return svgToLogo(text, name)
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: `image/${real}` }))
  try {
    const r = await rasterise(url, 0, 0)
    return { id: uid('logo'), name, ...r, createdAt: Date.now() }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function svgToLogo(text: string, name: string): Promise<LogoAsset> {
  const { svg, width, height } = sanitizeSvg(text)
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const r = await rasterise(url, width, height)
    return { id: uid('logo'), name, ...r, createdAt: Date.now() }
  } finally {
    URL.revokeObjectURL(url)
  }
}
