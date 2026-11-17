/**
 * Image export: renders the real 3D scene (with the student's logo and colours)
 * to PNG, ZIP collections, contact sheets and presentation sheets.
 * No watermarks, no limits.
 */
import { strToU8, zipSync } from 'fflate'
import type { Design, SavedDesign, ViewName } from './types'
import { useStudio } from '../state/studio'
import { PRODUCT_MAP } from '../three/catalogue'
import { captureScene, maxExportSize, rendererAvailable, stageKey, waitForStage } from '../three/renderService'
import { preloadLogos, preloadText } from '../components/viewer/useLogoImage'
import { canvasToBlob, downloadBlob, exportFilename, nextFrame, safeName, VIEW_LABELS } from './utils'
import { buildBoard, buildContactSheet, buildPresentationSheet, BOARD_FORMATS, type BoardOptions, type SheetItem } from './sheets'
import { composeExport } from '../components/viewer/ExportBridge'
import { SCENE_MAP } from '../three/scenes'

export type ExportFormat = 'png' | 'jpg'
export interface ExportSpec {
  /** output width × height in pixels */
  w: number
  h: number
  format: ExportFormat
}
export const EXPORT_SIZES: { id: string; label: string; w: number; h: number }[] = [
  { id: 'hd', label: '1920 × 1080 (HD)', w: 1920, h: 1080 },
  { id: 'qhd', label: '2560 × 1440 (QHD)', w: 2560, h: 1440 },
  { id: '4k', label: '3840 × 2160 (4K)', w: 3840, h: 2160 },
  { id: 'sq2048', label: '2048 × 2048 (square)', w: 2048, h: 2048 },
]

/** Encodes a canvas as PNG or JPG. JPG has no transparency, so it gets a white backing. */
export async function encode(canvas: HTMLCanvasElement, format: ExportFormat): Promise<Blob> {
  if (format === 'png') return canvasToBlob(canvas)
  const c = document.createElement('canvas')
  c.width = canvas.width
  c.height = canvas.height
  const x = c.getContext('2d')!
  x.fillStyle = '#ffffff'
  x.fillRect(0, 0, c.width, c.height)
  x.drawImage(canvas, 0, 0)
  return canvasToBlob(c, 'image/jpeg', 0.92)
}

/** Views a product genuinely has (products with one distinctive side show it once). */
export function viewsFor(productId: string): ViewName[] {
  const def = PRODUCT_MAP[productId]
  return def?.sideLabel ? ['front', 'back', 'side', 'three-quarter'] : ['front', 'back', 'side', 'right', 'three-quarter']
}

export const ALL_VIEWS: ViewName[] = ['front', 'back', 'side', 'three-quarter']

function team() {
  return useStudio.getState().project.orgName || 'MyTeam'
}

function productLabel(d: Design) {
  return d.title?.trim() || PRODUCT_MAP[d.productId]?.shortName || 'Product'
}

function viewLabel(d: Design, v: ViewName | null) {
  if (!v) return 'Custom'
  const def = PRODUCT_MAP[d.productId]
  if (v === 'side') return (def?.sideLabel ?? def?.sideLabels?.[0] ?? 'Left').replace(/\s+/g, '')
  if (v === 'right') return (def?.sideLabels?.[1] ?? 'Right').replace(/\s+/g, '')
  return VIEW_LABELS[v].replace(/\s+/g, '')
}

export function clampSize(size: number) {
  return Math.min(size, maxExportSize())
}

/** Wrap a long-running export with the busy overlay and friendly errors. */
async function run<T>(label: string, fn: (progress: (p: number, l?: string) => void) => Promise<T>): Promise<T | undefined> {
  const st = useStudio.getState()
  if (!rendererAvailable()) {
    st.toast('The 3D viewer is still starting – try again in a moment.', 'error')
    return undefined
  }
  st.setBusy({ label, progress: 0 })
  try {
    return await fn((p, l) => useStudio.getState().setBusy({ label: l ?? label, progress: p }))
  } catch (e) {
    console.error(e)
    useStudio.getState().toast(e instanceof Error ? e.message : 'Export failed.', 'error')
    return undefined
  } finally {
    useStudio.getState().setBusy(null)
  }
}

async function ensureEditorReady() {
  const d = useStudio.getState().design
  await preloadLogos([...d.layers.map((l) => l.logoId), d.customPatternId ?? null])
  await preloadText(d.layers)
  await waitForStage(stageKey(d.id, d.updatedAt, d.productId))
}

/* ------------------------------------------------------------------ */
/* Current design                                                      */
/* ------------------------------------------------------------------ */

function fitSpec(spec: ExportSpec) {
  // keep within what this graphics card can render (the shorter side is the product render)
  const max = maxExportSize()
  const k = Math.min(1, max / Math.min(spec.w, spec.h), 8192 / Math.max(spec.w, spec.h))
  return { width: Math.round(spec.w * k), height: Math.round(spec.h * k) }
}

export function downloadCurrent(opts: { transparent: boolean; view: ViewName | null; size?: number; spec?: ExportSpec }) {
  const spec: ExportSpec = opts.spec ?? { w: opts.size ?? 2048, h: opts.size ?? 2048, format: 'png' }
  const transparent = opts.transparent && spec.format === 'png'
  return run(transparent ? 'Rendering transparent PNG…' : `Rendering ${spec.format.toUpperCase()}…`, async () => {
    await ensureEditorReady()
    const d = useStudio.getState().design
    const canvas = captureScene({ size: Math.min(spec.w, spec.h), ...fitSpec(spec), transparent, view: opts.view })
    const blob = await encode(canvas, spec.format)
    const name = exportFilename(team(), productLabel(d), viewLabel(d, opts.view) + (transparent ? '-Transparent' : ''), spec.format)
    downloadBlob(blob, name)
    useStudio.getState().toast(`Downloaded ${name} (${canvas.width} × ${canvas.height})`, 'success')
  })
}

export function downloadAllViews(opts: { transparent: boolean; size?: number; spec?: ExportSpec }) {
  const spec: ExportSpec = opts.spec ?? { w: opts.size ?? 2048, h: opts.size ?? 2048, format: 'png' }
  const transparent = opts.transparent && spec.format === 'png'
  return run('Rendering product views…', async (progress) => {
    await ensureEditorReady()
    const d = useStudio.getState().design
    const views = viewsFor(d.productId)
    const files: Record<string, Uint8Array> = {}
    for (let i = 0; i < views.length; i++) {
      const v = views[i]
      progress(i / views.length, `Rendering ${viewLabel(d, v).toLowerCase()} view…`)
      await nextFrame()
      const c = captureScene({ size: Math.min(spec.w, spec.h), ...fitSpec(spec), transparent, view: v })
      files[exportFilename(team(), productLabel(d), viewLabel(d, v) + (transparent ? '-Transparent' : ''), spec.format)] = new Uint8Array(await (await encode(c, spec.format)).arrayBuffer())
    }
    const zip = zipSync(files, { level: 0 })
    const name = `${safeName(team(), 'MyTeam')}_${safeName(productLabel(d))}_Views.zip`
    downloadBlob(new Blob([zip], { type: 'application/zip' }), name)
    useStudio.getState().toast(`Downloaded ${name} with ${views.length} views`, 'success')
  })
}

/** Front and back side by side on one image (great for jerseys and kit reveals). */
export function frontBackCanvas(spec: ExportSpec, transparent: boolean, label = true): HTMLCanvasElement {
  const { width: W, height: H } = fitSpec(spec)
  const st = useStudio.getState()
  const m = Math.round(Math.min(H * 0.86, W * 0.48))
  const front = captureScene({ size: m, transparent: true, view: 'front' })
  const back = captureScene({ size: m, transparent: true, view: 'back' })
  const blank = document.createElement('canvas')
  blank.width = blank.height = Math.min(W, H)
  const out = composeExport(blank, W, H, transparent ? 'transparent' : st.exportBackground)
  const x = out.getContext('2d')!
  const top = (H - m) / 2 - H * 0.02
  x.drawImage(front, W / 2 - m - W * 0.005, top, m, m)
  x.drawImage(back, W / 2 + W * 0.005, top, m, m)
  if (label) {
    const light = !transparent && (st.exportBackground === 'white' || (st.exportBackground === 'scene' && !!SCENE_MAP[st.scene]?.lightText))
    x.fillStyle = light ? 'rgba(15,20,30,0.7)' : 'rgba(255,255,255,0.8)'
    x.font = `700 ${Math.round(H * 0.024)}px "Inter Variable", Inter, Arial, sans-serif`
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.fillText('FRONT', W / 2 - m / 2 - W * 0.005, top + m + H * 0.035)
    x.fillText('BACK', W / 2 + m / 2 + W * 0.005, top + m + H * 0.035)
  }
  return out
}

export function downloadFrontBack(opts: { transparent: boolean; spec: ExportSpec }) {
  const transparent = opts.transparent && opts.spec.format === 'png'
  return run('Rendering front and back…', async () => {
    await ensureEditorReady()
    const d = useStudio.getState().design
    const canvas = frontBackCanvas(opts.spec, transparent)
    const name = exportFilename(team(), productLabel(d), 'FrontBack' + (transparent ? '-Transparent' : ''), opts.spec.format)
    downloadBlob(await encode(canvas, opts.spec.format), name)
    useStudio.getState().toast(`Downloaded ${name} (${canvas.width} × ${canvas.height})`, 'success')
  })
}

/* ------------------------------------------------------------------ */
/* Rendering other designs (collection)                                */
/* ------------------------------------------------------------------ */

async function renderDesign(d: Design, views: ViewName[], size: number, transparent: boolean): Promise<Record<string, HTMLCanvasElement>> {
  const st = useStudio.getState()
  await preloadLogos([...d.layers.map((l) => l.logoId), d.customPatternId ?? null])
  await preloadText(d.layers)
  st.setRenderOverride(d)
  await waitForStage(stageKey(d.id, d.updatedAt, d.productId))
  await nextFrame()
  const out: Record<string, HTMLCanvasElement> = {}
  for (const v of views) out[v] = captureScene({ size, transparent, view: v })
  return out
}

async function restoreEditor() {
  useStudio.getState().setRenderOverride(null)
  try {
    await ensureEditorReady()
  } catch {
    /* viewer will catch up */
  }
}

/** Saves the current design (with a rendered thumbnail) into the collection. */
export function saveToCollection(asNew = false) {
  return run('Saving to your collection…', async () => {
    await ensureEditorReady()
    const st = useStudio.getState()
    let design = st.design
    if (asNew) {
      design = { ...design, id: `design_${Date.now().toString(36)}`, createdAt: Date.now(), updatedAt: Date.now() }
      useStudio.setState({ design, drafts: { ...st.drafts, [design.productId]: design } })
      await ensureEditorReady()
    }
    const thumbCanvas = captureScene({ size: 480, transparent: false, view: 'three-quarter' })
    const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.86)
    const saved: SavedDesign = { ...design, thumbnail }
    const exists = st.collection.some((c) => c.id === design.id)
    const collection = exists ? st.collection.map((c) => (c.id === design.id ? saved : c)) : [...st.collection, saved]
    useStudio.getState().setCollection(collection)
    useStudio.getState().toast(exists ? `Updated “${productLabel(design)}” in My designs` : `Saved “${productLabel(design)}” to My designs`, 'success')
  })
}

export function downloadSaved(d: SavedDesign, opts: { size: number; transparent: boolean }) {
  return run(`Rendering ${productLabel(d)}…`, async (progress) => {
    const files: Record<string, Uint8Array> = {}
    try {
      const canvases = await renderDesign(d, ALL_VIEWS, clampSize(opts.size), opts.transparent)
      for (const [i, v] of ALL_VIEWS.entries()) {
        progress(i / ALL_VIEWS.length)
        files[exportFilename(team(), productLabel(d), viewLabel(d, v) + (opts.transparent ? '-Transparent' : ''))] = new Uint8Array(await (await canvasToBlob(canvases[v])).arrayBuffer())
      }
    } finally {
      await restoreEditor()
    }
    const name = `${safeName(team(), 'MyTeam')}_${safeName(productLabel(d))}_Views.zip`
    downloadBlob(new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' }), name)
    useStudio.getState().toast(`Downloaded ${name}`, 'success')
  })
}

export interface CollectionZipOptions {
  size: number
  views: ViewName[]
  transparent: boolean
  includeSheets: boolean
}

export function downloadCollectionZip(opts: CollectionZipOptions) {
  return run('Rendering your collection…', async (progress) => {
    const st = useStudio.getState()
    const designs = st.collection
    if (!designs.length) throw new Error('Your collection is empty – save some designs first.')
    const files: Record<string, Uint8Array> = {}
    const sheetItems: SheetItem[] = []
    const used = new Map<string, number>()
    try {
      for (let i = 0; i < designs.length; i++) {
        const d = designs[i]
        progress(i / (designs.length + 1), `Rendering ${productLabel(d)} (${i + 1} of ${designs.length})…`)
        const views = Array.from(new Set([...opts.views, ...(opts.includeSheets ? (['three-quarter'] as ViewName[]) : [])]))
        const canvases = await renderDesign(d, views, clampSize(opts.size), opts.transparent)
        const base = productLabel(d)
        const n = (used.get(base) ?? 0) + 1
        used.set(base, n)
        const label = n > 1 ? `${base}-${n}` : base
        for (const v of opts.views) {
          files[`${safeName(team(), 'MyTeam')}_Collection/${exportFilename(team(), label, viewLabel(d, v) + (opts.transparent ? '-Transparent' : ''))}`] = new Uint8Array(
            await (await canvasToBlob(canvases[v])).arrayBuffer(),
          )
        }
        if (opts.includeSheets) {
          // sheets always use an opaque render
          const sheetCanvas = opts.transparent ? (await renderDesign(d, ['three-quarter'], 1024, false))['three-quarter'] : canvases['three-quarter']
          sheetItems.push({ design: d, image: sheetCanvas })
        }
      }
    } finally {
      await restoreEditor()
    }
    if (opts.includeSheets) {
      progress(designs.length / (designs.length + 1), 'Building contact and presentation sheets…')
      const project = useStudio.getState().project
      const contact = await buildContactSheet(sheetItems, project)
      const pres = await buildPresentationSheet(sheetItems, project)
      files[`${safeName(team(), 'MyTeam')}_Collection/${safeName(team(), 'MyTeam')}_ContactSheet.png`] = new Uint8Array(await (await canvasToBlob(contact)).arrayBuffer())
      files[`${safeName(team(), 'MyTeam')}_Collection/${safeName(team(), 'MyTeam')}_PresentationSheet.png`] = new Uint8Array(await (await canvasToBlob(pres)).arrayBuffer())
    }
    files[`${safeName(team(), 'MyTeam')}_Collection/README.txt`] = strToU8(
      `${team()} – merchandise collection\nExported ${new Date().toLocaleString()} from Merch Forge Studio.\n${designs.length} product(s). Images are free to use in your coursework.\n`,
    )
    const name = `${safeName(team(), 'MyTeam')}_Merch_Collection.zip`
    downloadBlob(new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' }), name)
    useStudio.getState().toast(`Downloaded ${name}`, 'success')
  })
}

export function downloadPresentationSheet(kind: 'presentation' | 'contact') {
  return run(kind === 'presentation' ? 'Building presentation sheet…' : 'Building contact sheet…', async (progress) => {
    const designs = useStudio.getState().collection
    if (!designs.length) throw new Error('Your collection is empty – save some designs first.')
    const items: SheetItem[] = []
    try {
      for (let i = 0; i < designs.length; i++) {
        progress(i / designs.length, `Rendering ${productLabel(designs[i])} (${i + 1} of ${designs.length})…`)
        const c = await renderDesign(designs[i], ['three-quarter'], 1024, false)
        items.push({ design: designs[i], image: c['three-quarter'] })
      }
    } finally {
      await restoreEditor()
    }
    const project = useStudio.getState().project
    const canvas = kind === 'presentation' ? await buildPresentationSheet(items, project) : await buildContactSheet(items, project)
    const name = `${safeName(team(), 'MyTeam')}_${kind === 'presentation' ? 'PresentationSheet' : 'ContactSheet'}.png`
    downloadBlob(await canvasToBlob(canvas), name)
    useStudio.getState().toast(`Downloaded ${name}`, 'success')
  })
}

/** Collection board (16:9 or A3 landscape) as a high-resolution PNG. Returns a small preview. */
export async function downloadBoard(opts: { format: (typeof BOARD_FORMATS)[number]['id']; theme: BoardOptions['theme']; title: string; showNotes: boolean }) {
  const fmt = BOARD_FORMATS.find((f) => f.id === opts.format) ?? BOARD_FORMATS[0]
  return run('Building your collection board…', async (progress) => {
    const designs = useStudio.getState().collection
    if (!designs.length) throw new Error('Your collection is empty – add some products first.')
    const items: SheetItem[] = []
    const px = clampSize(fmt.id === 'a3' ? 1536 : 1280)
    try {
      for (let i = 0; i < designs.length; i++) {
        progress(i / designs.length, `Rendering ${productLabel(designs[i])} (${i + 1} of ${designs.length})…`)
        const c = await renderDesign(designs[i], ['three-quarter'], px, true)
        items.push({ design: designs[i], image: c['three-quarter'] })
      }
    } finally {
      await restoreEditor()
    }
    const canvas = await buildBoard(items, useStudio.getState().project, { width: fmt.width, height: fmt.height, theme: opts.theme, title: opts.title, showNotes: opts.showNotes })
    const name = `${safeName(team(), 'MyTeam')}_CollectionBoard_${fmt.id === 'a3' ? 'A3' : '16x9'}.png`
    downloadBlob(await canvasToBlob(canvas), name)
    useStudio.getState().toast(`Downloaded ${name} (${canvas.width} × ${canvas.height})`, 'success')
    const prev = document.createElement('canvas')
    prev.width = 960
    prev.height = Math.round((960 * canvas.height) / canvas.width)
    prev.getContext('2d')!.drawImage(canvas, 0, 0, prev.width, prev.height)
    return prev.toDataURL('image/jpeg', 0.85)
  })
}

/** A JPEG snapshot of the current design (used for portfolio versions). */
export async function snapshotCurrent(size = 720): Promise<string | undefined> {
  return run('Capturing this version…', async () => {
    await ensureEditorReady()
    const c = captureScene({ size: clampSize(size), transparent: false, view: 'three-quarter' })
    return c.toDataURL('image/jpeg', 0.85)
  })
}
