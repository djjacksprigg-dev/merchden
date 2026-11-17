/**
 * Portable project files (.merchforge).
 *
 * Privacy: projects live only in this browser tab's memory. Nothing is stored
 * in localStorage, IndexedDB or cookies, and nothing is sent anywhere. Students
 * keep their work by downloading a .merchforge file and importing it next lesson.
 *
 * Security: imported files are parsed as JSON only (never executed) and every
 * field is rebuilt from scratch against strict allow-lists. Images must be
 * genuine PNG / JPEG / WebP data URLs that decode as images.
 */
import type {
  BrandKit,
  Design,
  LayerRole,
  LogoAsset,
  LogoLayer,
  PatternId,
  Portfolio,
  PortfolioProductNotes,
  PortfolioVersion,
  ProjectFileV2,
  SavedDesign,
  TextStyle,
} from '../lib/types'
import { DEFAULT_BRAND_KIT, EMPTY_NOTES, EMPTY_PORTFOLIO, useStudio, type ExportBackground } from '../state/studio'
import { PRODUCT_MAP } from '../three/catalogue'
import { PATTERNS } from '../three/engine/patterns'
import { FONT_MAP } from '../three/engine/text'
import { SCENE_MAP, type SceneId } from '../three/scenes'
import { resetHistory } from '../state/history'
import { downloadBlob, safeName, uid } from '../lib/utils'
import { createDesign } from '../state/studio'

export const PROJECT_EXT = '.merchforge'
const MAX_FILE_BYTES = 120 * 1024 * 1024

/* ------------------------------------------------------------------ */
/* Building                                                            */
/* ------------------------------------------------------------------ */

export function buildProjectFile(): ProjectFileV2 {
  const s = useStudio.getState()
  const used = new Set<string>()
  const addDesign = (d: Design) => {
    for (const l of d.layers) if (l.logoId) used.add(l.logoId)
    if (d.customPatternId) used.add(d.customPatternId)
  }
  addDesign(s.design)
  Object.values(s.drafts).forEach(addDesign)
  s.collection.forEach(addDesign)
  for (const n of Object.values(s.portfolio.products)) n.versions.forEach((v) => addDesign(v.design))
  if (s.brandKit.primaryLogoId) used.add(s.brandKit.primaryLogoId)
  if (s.brandKit.secondaryLogoId) used.add(s.brandKit.secondaryLogoId)
  const images = Object.values(s.logos).filter((l) => !l.hidden || used.has(l.id))
  return {
    format: 'merchforge',
    version: 2,
    savedAt: new Date().toISOString(),
    projectName: s.projectName,
    brandKit: s.brandKit,
    images,
    current: s.design,
    drafts: Object.values(s.drafts),
    collection: s.collection,
    portfolio: s.portfolio,
    settings: { scene: s.scene, exportBackground: s.exportBackground, recentColors: s.recentColors },
  }
}

export function downloadProject() {
  const s = useStudio.getState()
  const file = buildProjectFile()
  const blob = new Blob([JSON.stringify(file)], { type: 'application/octet-stream' })
  const name = `${safeName(s.projectName || s.brandKit.orgName || 'MerchProject', 'MerchProject')}${PROJECT_EXT}`
  downloadBlob(blob, name)
  s.markSaved()
  s.toast(`Project downloaded as ${name}. Keep this file – import it next lesson to carry on.`, 'success')
}

/* ------------------------------------------------------------------ */
/* Validation helpers                                                  */
/* ------------------------------------------------------------------ */

const own = (o: object, k: unknown): k is string => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k)
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown, max: number, fallback = '') => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, max) : fallback)
const num = (v: unknown, min: number, max: number, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback)
const bool = (v: unknown) => v === true
const HEX = /^#[0-9a-f]{6}$/i
const hex = (v: unknown, fallback: string) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback)
const ID = /^[A-Za-z0-9_-]{1,64}$/
const id = (v: unknown) => (typeof v === 'string' && ID.test(v) ? v : null)
const IMAGE_URI = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/
const PATTERN_IDS = new Set<string>([...PATTERNS.map((p) => p.id), 'custom'])
const ROLES = new Set<LayerRole>(['team-logo', 'sponsor', 'player-name', 'player-number', 'front-number', 'sleeve-left', 'sleeve-right', 'slogan'])

function cleanImage(v: unknown): LogoAsset | null {
  if (!isObj(v)) return null
  const iid = id(v.id)
  const dataUrl = typeof v.dataUrl === 'string' && v.dataUrl.length < 25_000_000 && IMAGE_URI.test(v.dataUrl) ? v.dataUrl : null
  if (!iid || !dataUrl) return null
  return {
    id: iid,
    name: str(v.name, 80, 'Image'),
    dataUrl,
    width: num(v.width, 1, 20000, 512),
    height: num(v.height, 1, 20000, 512),
    createdAt: num(v.createdAt, 0, 1e15, Date.now()),
    hidden: bool(v.hidden) || undefined,
    purpose: v.purpose === 'pattern' ? 'pattern' : 'logo',
  }
}

function cleanText(v: unknown): TextStyle | undefined {
  if (!isObj(v)) return undefined
  return {
    content: str(v.content, 32),
    subline: str(v.subline, 32) || undefined,
    font: own(FONT_MAP, v.font) ? v.font : 'orbitron',
    color: hex(v.color, '#ffffff'),
    outlineColor: hex(v.outlineColor, '#0b0f17'),
    outline: num(v.outline, 0, 0.2, 0),
    spacing: num(v.spacing, -0.1, 0.6, 0.04),
    arc: num(v.arc, -180, 180, 0),
    bold: bool(v.bold) || undefined,
    italic: bool(v.italic) || undefined,
    align: v.align === 'left' || v.align === 'right' ? v.align : 'center',
  }
}

function cleanLayer(v: unknown, images: Set<string>): LogoLayer | null {
  if (!isObj(v)) return null
  const zoneId = typeof v.zoneId === 'string' && /^[a-z0-9-]{1,40}$/.test(v.zoneId) ? v.zoneId : null
  if (!zoneId) return null
  const logoId = id(v.logoId)
  const text = cleanText(v.text)
  return {
    id: id(v.id) ?? uid('layer'),
    logoId: logoId && images.has(logoId) ? logoId : null,
    zoneId,
    offsetX: num(v.offsetX, -1, 1, 0),
    offsetY: num(v.offsetY, -1, 1, 0),
    scale: num(v.scale, 0.1, 6, 1),
    rotation: num(v.rotation, -180, 180, 0),
    opacity: num(v.opacity, 0.1, 1, 1),
    locked: bool(v.locked) || undefined,
    role: typeof v.role === 'string' && ROLES.has(v.role as LayerRole) ? (v.role as LayerRole) : undefined,
    ...(text ? { text, logoId: null } : {}),
  }
}

function cleanDesign(v: unknown, images: Set<string>): Design | null {
  if (!isObj(v) || !own(PRODUCT_MAP, v.productId)) return null
  const def = PRODUCT_MAP[v.productId]
  const colors: Record<string, string> = { ...def.defaults }
  if (isObj(v.colors)) for (const [k, c] of Object.entries(v.colors)) if (/^[a-z0-9-]{1,20}$/.test(k) && typeof c === 'string' && HEX.test(c)) colors[k] = c.toLowerCase()
  const layers = Array.isArray(v.layers) ? (v.layers.slice(0, 40).map((l) => cleanLayer(l, images)).filter(Boolean) as LogoLayer[]) : []
  const customPatternId = id(v.customPatternId)
  return {
    id: id(v.id) ?? uid('design'),
    productId: def.id,
    title: str(v.title, 60, def.shortName) || def.shortName,
    description: str(v.description, 600),
    colors,
    pattern: typeof v.pattern === 'string' && PATTERN_IDS.has(v.pattern) ? (v.pattern as PatternId) : 'solid',
    patternScale: num(v.patternScale, 0.2, 4, 1),
    customPatternId: customPatternId && images.has(customPatternId) ? customPatternId : null,
    customPatternMode: v.customPatternMode === 'fill' ? 'fill' : 'tile',
    stickerShape: v.stickerShape === 'circle' || v.stickerShape === 'rounded-square' ? v.stickerShape : 'die-cut',
    layers,
    createdAt: num(v.createdAt, 0, 1e15, Date.now()),
    updatedAt: num(v.updatedAt, 0, 1e15, Date.now()),
  }
}

const THUMB_URI = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/

function cleanSaved(v: unknown, images: Set<string>): SavedDesign | null {
  const d = cleanDesign(v, images)
  if (!d || !isObj(v)) return null
  const thumb = typeof v.thumbnail === 'string' && v.thumbnail.length < 4_000_000 && THUMB_URI.test(v.thumbnail) ? v.thumbnail : ''
  return { ...d, thumbnail: thumb }
}

function cleanBrandKit(v: unknown, images: Set<string>): BrandKit {
  if (!isObj(v)) return { ...DEFAULT_BRAND_KIT }
  const pl = id(v.primaryLogoId)
  const sl = id(v.secondaryLogoId)
  return {
    orgName: str(v.orgName, 80),
    primaryLogoId: pl && images.has(pl) ? pl : null,
    secondaryLogoId: sl && images.has(sl) ? sl : null,
    primary: hex(v.primary, DEFAULT_BRAND_KIT.primary),
    secondary: hex(v.secondary, DEFAULT_BRAND_KIT.secondary),
    accent: hex(v.accent, DEFAULT_BRAND_KIT.accent),
    font: own(FONT_MAP, v.font) ? v.font : DEFAULT_BRAND_KIT.font,
    slogan: str(v.slogan, 80),
  }
}

function cleanPortfolio(v: unknown, images: Set<string>, designIds: Set<string>): Portfolio {
  if (!isObj(v)) return { ...EMPTY_PORTFOLIO, products: {} }
  const products: Record<string, PortfolioProductNotes> = {}
  if (isObj(v.products)) {
    for (const [k, n] of Object.entries(v.products)) {
      if (!ID.test(k) || !designIds.has(k) || !isObj(n)) continue
      const versions: PortfolioVersion[] = Array.isArray(n.versions)
        ? (n.versions
            .slice(0, 4)
            .map((x) => {
              if (!isObj(x)) return null
              const design = cleanDesign(x.design, images)
              const image = typeof x.image === 'string' && x.image.length < 4_000_000 && THUMB_URI.test(x.image) ? x.image : ''
              return design && image ? { id: id(x.id) ?? uid('ver'), label: str(x.label, 40, 'Version'), image, design, createdAt: num(x.createdAt, 0, 1e15, Date.now()) } : null
            })
            .filter(Boolean) as PortfolioVersion[])
        : []
      products[k] = {
        ...EMPTY_NOTES,
        why: str(n.why, 3000),
        represents: str(n.represents, 3000),
        appeal: str(n.appeal, 3000),
        improve: str(n.improve, 3000),
        changes: str(n.changes, 3000),
        reasons: str(n.reasons, 3000),
        versions,
      }
    }
  }
  return { studentProject: str(v.studentProject, 120), audience: str(v.audience, 3000), improvements: str(v.improvements, 3000), products }
}

/* ------------------------------------------------------------------ */
/* Parsing + importing                                                 */
/* ------------------------------------------------------------------ */

export interface ParsedProject {
  projectName: string
  brandKit: BrandKit
  images: LogoAsset[]
  current: Design | null
  drafts: Design[]
  collection: SavedDesign[]
  portfolio: Portfolio
  settings: { scene: SceneId | null; exportBackground: ExportBackground | null; recentColors: string[] }
  rejected: number
}

export function parseProjectText(text: string): ParsedProject {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('This is not a Merch Forge project file (it could not be read).')
  }
  if (!isObj(data)) throw new Error('This is not a Merch Forge project file.')
  // v1 (older "export project" files) are converted
  const v1 = data.format === 'merch-forge-project'
  if (!v1 && data.format !== 'merchforge') throw new Error('This is not a Merch Forge project file.')
  if (!v1 && data.version !== 2) throw new Error('This project file was made by a newer version of Merch Forge.')

  const rawImages = Array.isArray(v1 ? data.logos : data.images) ? ((v1 ? data.logos : data.images) as unknown[]) : []
  let rejected = 0
  const images: LogoAsset[] = []
  for (const r of rawImages.slice(0, 200)) {
    const img = cleanImage(r)
    if (img) images.push(img)
    else rejected++
  }
  const ids = new Set(images.map((i) => i.id))
  const collection = (Array.isArray(v1 ? data.designs : data.collection) ? ((v1 ? data.designs : data.collection) as unknown[]) : [])
    .slice(0, 100)
    .map((d) => cleanSaved(d, ids))
    .filter(Boolean) as SavedDesign[]
  const drafts = (Array.isArray(data.drafts) ? data.drafts : []).slice(0, 60).map((d) => cleanDesign(d, ids)).filter(Boolean) as Design[]
  const current = cleanDesign(data.current, ids)
  const proj = isObj(data.project) ? data.project : {}
  const brandKit = v1 ? { ...DEFAULT_BRAND_KIT, orgName: str(proj.orgName, 80) } : cleanBrandKit(data.brandKit, ids)
  const portfolio = v1 ? { ...EMPTY_PORTFOLIO, products: {} } : cleanPortfolio(data.portfolio, ids, new Set(collection.map((c) => c.id)))
  const settings = isObj(data.settings) ? data.settings : {}
  return {
    projectName: str(v1 ? proj.projectName : data.projectName, 80) || 'Imported project',
    brandKit,
    images,
    current,
    drafts,
    collection,
    portfolio,
    settings: {
      scene: own(SCENE_MAP, settings.scene) ? (settings.scene as SceneId) : null,
      exportBackground: ['scene', 'black', 'white', 'brand', 'transparent'].includes(settings.exportBackground as string) ? (settings.exportBackground as ExportBackground) : null,
      recentColors: Array.isArray(settings.recentColors) ? settings.recentColors.filter((c): c is string => typeof c === 'string' && HEX.test(c)).slice(0, 12) : [],
    },
    rejected,
  }
}

/** Decodes every image; anything that is not a real image is dropped. */
async function verifyImages(images: LogoAsset[]): Promise<LogoAsset[]> {
  const ok = await Promise.all(
    images.map(
      (img) =>
        new Promise<boolean>((resolve) => {
          const el = new Image()
          el.onload = () => resolve(el.naturalWidth > 0 && el.naturalHeight > 0)
          el.onerror = () => resolve(false)
          el.src = img.dataUrl
        }),
    ),
  )
  return images.filter((_, i) => ok[i])
}

export async function importProjectFile(file: File): Promise<{ products: number; images: number }> {
  if (file.size > MAX_FILE_BYTES) throw new Error('That file is too large to be a Merch Forge project.')
  const p = parseProjectText(await file.text())
  const images = await verifyImages(p.images)
  const logos: Record<string, LogoAsset> = Object.fromEntries(images.map((i) => [i.id, i]))
  const drafts: Record<string, Design> = {}
  for (const d of p.drafts) drafts[d.productId] = d
  const current = p.current ?? p.collection[0] ?? createDesign('hoodie', null, {})
  const { thumbnail: _t, ...currentDesign } = current as SavedDesign
  void _t
  drafts[currentDesign.productId] = currentDesign
  const activeLogo = p.brandKit.primaryLogoId ?? images.find((i) => i.purpose !== 'pattern' && !i.hidden)?.id ?? null
  resetHistory(() =>
    useStudio.setState({
      projectName: p.projectName,
      brandKit: p.brandKit,
      project: { orgName: p.brandKit.orgName, projectName: p.portfolio.studentProject, rationale: '' },
      logos,
      activeLogoId: activeLogo,
      design: currentDesign,
      drafts,
      collection: p.collection,
      portfolio: p.portfolio,
      recentColors: p.settings.recentColors,
      ...(p.settings.scene ? { scene: p.settings.scene } : {}),
      ...(p.settings.exportBackground ? { exportBackground: p.settings.exportBackground } : {}),
      selectedLayerId: currentDesign.layers[0]?.id ?? null,
      brandColors: { primary: p.brandKit.primary, secondary: p.brandKit.secondary },
      dirty: false,
      savedAt: Date.now(),
      viewRequest: { view: 'reset', nonce: useStudio.getState().viewRequest.nonce + 1 },
    }),
  )
  if (p.rejected || images.length < p.images.length) {
    useStudio.getState().toast(`${p.rejected + p.images.length - images.length} image(s) in the file were not valid and were skipped.`, 'info')
  }
  return { products: p.collection.length, images: images.length }
}

/** Starts a fresh, empty project. */
export function newProject() {
  resetHistory(() =>
    useStudio.setState({
      projectName: 'Untitled project',
      brandKit: { ...DEFAULT_BRAND_KIT },
      project: { orgName: '', projectName: '', rationale: '' },
      logos: {},
      activeLogoId: null,
      design: createDesign('hoodie', null, {}),
      drafts: {},
      collection: [],
      portfolio: { ...EMPTY_PORTFOLIO, products: {} },
      recentColors: [],
      brandColors: {},
      selectedLayerId: null,
      dirty: false,
      savedAt: null,
      viewRequest: { view: 'reset', nonce: useStudio.getState().viewRequest.nonce + 1 },
    }),
  )
}
