/**
 * Local project storage (IndexedDB via idb-keyval).
 * Everything stays on this device – nothing is uploaded anywhere.
 */
import { createStore, get, set } from 'idb-keyval'
import type { Design, LogoAsset, ProjectFile, ProjectInfo, SavedDesign } from '../lib/types'
import { useStudio, type ExportBackground } from '../state/studio'
import type { SceneId } from '../three/scenes'
import { PRODUCT_MAP } from '../three/catalogue'

let store: ReturnType<typeof createStore> | null = null
function db() {
  if (!store) store = createStore('merch-forge-studio', 'kv')
  return store
}

interface Session {
  version: 1
  design: Design
  drafts: Record<string, Design>
  activeLogoId: string | null
  brandColors: { primary?: string; secondary?: string }
  project: ProjectInfo
  quality: 'high' | 'low'
  scene?: string
  exportBackground?: string
}

const isDesign = (d: unknown): d is Design =>
  !!d && typeof d === 'object' && typeof (d as Design).productId === 'string' && !!PRODUCT_MAP[(d as Design).productId] && Array.isArray((d as Design).layers)

export async function hydrate() {
  const st = useStudio.getState()
  try {
    const [session, logos, collection] = await Promise.all([
      get<Session>('session', db()),
      get<LogoAsset[]>('logos', db()),
      get<SavedDesign[]>('collection', db()),
    ])
    const logoMap: Record<string, LogoAsset> = {}
    for (const l of logos ?? []) if (l && typeof l.dataUrl === 'string' && l.dataUrl.startsWith('data:image/')) logoMap[l.id] = l
    const patch: Partial<ReturnType<typeof useStudio.getState>> = {
      logos: logoMap,
      collection: (collection ?? []).filter(isDesign),
      hydrated: true,
    }
    if (session && isDesign(session.design)) {
      const drafts: Record<string, Design> = {}
      for (const [k, d] of Object.entries(session.drafts ?? {})) if (isDesign(d)) drafts[k] = d
      Object.assign(patch, {
        design: session.design,
        drafts,
        selectedLayerId: session.design.layers[0]?.id ?? null,
        activeLogoId: session.activeLogoId && logoMap[session.activeLogoId] ? session.activeLogoId : null,
        brandColors: session.brandColors ?? {},
        project: Object.assign({ orgName: '', projectName: '', rationale: '' }, session.project),
        quality: session.quality === 'low' ? 'low' : 'high',
        ...(session.scene && ['studio-light', 'studio-dark', 'neon', 'retro', 'arena', 'pop'].includes(session.scene) ? { scene: session.scene as SceneId } : {}),
        ...(session.exportBackground && ['scene', 'black', 'white', 'brand', 'transparent'].includes(session.exportBackground)
          ? { exportBackground: session.exportBackground as ExportBackground }
          : {}),
      })
    }
    useStudio.setState(patch)
  } catch (e) {
    console.warn('Local storage unavailable', e)
    useStudio.setState({ hydrated: true, storageAvailable: false })
    st.toast('Browser storage is unavailable here, so designs will not be kept after you close the page. Use “Export project” to keep a copy.', 'error')
  }
}

let timer: ReturnType<typeof setTimeout> | null = null
let lastLogos: unknown = null
let lastCollection: unknown = null

/** Debounced autosave of the session, logo library and collection. */
export function startAutosave() {
  useStudio.subscribe((s) => {
    if (!s.hydrated || !s.storageAvailable) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const session: Session = {
        version: 1,
        design: s.design,
        drafts: s.drafts,
        activeLogoId: s.activeLogoId,
        brandColors: s.brandColors,
        project: s.project,
        quality: s.quality,
        scene: s.scene,
        exportBackground: s.exportBackground,
      }
      const jobs: Promise<unknown>[] = [set('session', session, db())]
      if (s.logos !== lastLogos) {
        lastLogos = s.logos
        jobs.push(set('logos', Object.values(s.logos), db()))
      }
      if (s.collection !== lastCollection) {
        lastCollection = s.collection
        jobs.push(set('collection', s.collection, db()))
      }
      Promise.all(jobs).catch((e) => {
        console.warn('Autosave failed', e)
        useStudio.getState().toast('Could not save to browser storage (it may be full). Export your project to keep a copy.', 'error')
      })
    }, 500)
  })
}

/* ------------------------------------------------------------------ */
/* Project files – move work between college computers                  */
/* ------------------------------------------------------------------ */

export function buildProjectFile(): ProjectFile {
  const s = useStudio.getState()
  const used = new Set<string>()
  for (const d of s.collection) for (const l of d.layers) if (l.logoId) used.add(l.logoId)
  for (const l of s.design.layers) if (l.logoId) used.add(l.logoId)
  for (const d of [...s.collection, s.design]) if (d.customPatternId) used.add(d.customPatternId)
  const logos = Object.values(s.logos).filter((l) => !l.hidden || used.has(l.id))
  return {
    format: 'merch-forge-project',
    version: 1,
    exportedAt: new Date().toISOString(),
    project: s.project,
    logos,
    designs: s.collection,
  }
}

export function parseProjectFile(text: string): ProjectFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('This file is not a valid project file (it could not be read as JSON).')
  }
  const f = data as ProjectFile
  if (!f || f.format !== 'merch-forge-project' || !Array.isArray(f.designs) || !Array.isArray(f.logos)) {
    throw new Error('This file is not a Merch Forge project export.')
  }
  const logos = f.logos.filter(
    (l) => l && typeof l.id === 'string' && typeof l.dataUrl === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(l.dataUrl),
  )
  const designs = f.designs.filter(isDesign).map((d) => ({
    ...d,
    thumbnail: typeof d.thumbnail === 'string' && d.thumbnail.startsWith('data:image/') ? d.thumbnail : '',
  }))
  return { ...f, logos, designs }
}

/** Merges an imported project into the current one (no data is overwritten). */
export function importProject(f: ProjectFile) {
  const s = useStudio.getState()
  const logos = { ...s.logos }
  for (const l of f.logos) logos[l.id] = { ...l, hidden: false }
  const byId = new Map(s.collection.map((d) => [d.id, d]))
  for (const d of f.designs) byId.set(d.id, d)
  const project = { ...s.project }
  if (!project.orgName && f.project?.orgName) project.orgName = String(f.project.orgName).slice(0, 80)
  if (!project.projectName && f.project?.projectName) project.projectName = String(f.project.projectName).slice(0, 80)
  if (!project.rationale && f.project?.rationale) project.rationale = String(f.project.rationale).slice(0, 2000)
  useStudio.setState({
    logos,
    collection: [...byId.values()].sort((a, b) => a.createdAt - b.createdAt),
    project,
    activeLogoId: s.activeLogoId ?? f.logos[0]?.id ?? null,
  })
  return { designs: f.designs.length, logos: f.logos.length }
}
