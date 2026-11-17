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
import { buildContactSheet, buildPresentationSheet, type SheetItem } from './sheets'

export const ALL_VIEWS: ViewName[] = ['front', 'back', 'side', 'three-quarter']

function team() {
  return useStudio.getState().project.orgName || 'MyTeam'
}

function productLabel(d: Design) {
  return d.title?.trim() || PRODUCT_MAP[d.productId]?.shortName || 'Product'
}

function viewLabel(d: Design, v: ViewName | null) {
  if (!v) return 'Custom'
  if (v === 'side') return PRODUCT_MAP[d.productId]?.sideLabel ?? 'Side'
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

export function downloadCurrent(opts: { transparent: boolean; view: ViewName | null; size: number }) {
  return run(opts.transparent ? 'Rendering transparent PNG…' : 'Rendering PNG…', async () => {
    await ensureEditorReady()
    const d = useStudio.getState().design
    const canvas = captureScene({ size: clampSize(opts.size), transparent: opts.transparent, view: opts.view })
    const blob = await canvasToBlob(canvas)
    const name = exportFilename(team(), productLabel(d), viewLabel(d, opts.view) + (opts.transparent ? '-Transparent' : ''))
    downloadBlob(blob, name)
    useStudio.getState().toast(`Downloaded ${name} (${canvas.width} × ${canvas.height})`, 'success')
  })
}

export function downloadAllViews(opts: { transparent: boolean; size: number }) {
  return run('Rendering product views…', async (progress) => {
    await ensureEditorReady()
    const d = useStudio.getState().design
    const files: Record<string, Uint8Array> = {}
    for (let i = 0; i < ALL_VIEWS.length; i++) {
      const v = ALL_VIEWS[i]
      progress(i / ALL_VIEWS.length, `Rendering ${VIEW_LABELS[v].toLowerCase()} view…`)
      await nextFrame()
      const c = captureScene({ size: clampSize(opts.size), transparent: opts.transparent, view: v })
      files[exportFilename(team(), productLabel(d), viewLabel(d, v) + (opts.transparent ? '-Transparent' : ''))] = new Uint8Array(await (await canvasToBlob(c)).arrayBuffer())
    }
    const zip = zipSync(files, { level: 0 })
    const name = `${safeName(team(), 'MyTeam')}_${safeName(productLabel(d))}_Views.zip`
    downloadBlob(new Blob([zip], { type: 'application/zip' }), name)
    useStudio.getState().toast(`Downloaded ${name} with ${ALL_VIEWS.length} views`, 'success')
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
