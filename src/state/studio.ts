import { create } from 'zustand'
import type { Design, LogoAsset, LogoLayer, PatternId, ProjectInfo, SavedDesign, StickerShape, TextStyle, ViewName } from '../lib/types'
import { DEFAULT_TEXT } from '../three/engine/text'
import type { SceneId } from '../three/scenes'
import type { Zone } from '../three/engine/types'
import { defaultPatternColors, PRODUCT_MAP, PRODUCTS } from '../three/catalogue'
import { uid } from '../lib/utils'

export type ExportBackground = 'scene' | 'black' | 'white' | 'brand' | 'transparent'

export type RightTab = 'logo' | 'text' | 'colour' | 'info' | 'export'

export interface Toast {
  id: string
  kind: 'info' | 'success' | 'error'
  text: string
}

export interface StudioState {
  hydrated: boolean
  design: Design
  drafts: Record<string, Design>
  selectedLayerId: string | null
  logos: Record<string, LogoAsset>
  activeLogoId: string | null
  brandColors: { primary?: string; secondary?: string }
  project: ProjectInfo
  collection: SavedDesign[]
  quality: 'high' | 'low'
  autoRotate: boolean
  storageAvailable: boolean

  /** Zones of the currently displayed model (published by the viewer) */
  modelZones: Zone[]
  modelProductId: string | null
  modelLoading: boolean
  /** Design being rendered for a batch export instead of the editor design */
  renderOverride: Design | null
  /** Bounding radius of the displayed model, used for camera framing */
  stageFit: { radius: number; key: string } | null
  exportBackground: ExportBackground
  /** Scene style: the look of the viewer and exports */
  scene: SceneId

  viewRequest: { view: ViewName | 'reset'; nonce: number }
  rightTab: RightTab
  mobilePanel: 'catalogue' | 'design' | null
  collectionOpen: boolean
  helpOpen: boolean
  busy: { label: string; progress?: number } | null
  toasts: Toast[]

  // actions
  selectProduct: (id: string) => void
  resetDesign: () => void
  setColor: (slot: string, hex: string) => void
  resetColors: () => void
  setPattern: (p: PatternId) => void
  setPatternScale: (s: number) => void
  setStickerShape: (s: StickerShape) => void
  setDesignText: (patch: Partial<Pick<Design, 'title' | 'description'>>) => void
  addLayer: (zoneId: string, logoId?: string | null) => void
  addTextLayer: (zoneId: string, text?: Partial<TextStyle>, place?: Partial<LogoLayer>) => string
  updateText: (id: string, patch: Partial<TextStyle>) => void
  addPatternImage: (img: LogoAsset) => void
  useCustomPattern: (id: string) => void
  setCustomPatternMode: (m: 'tile' | 'fill') => void
  removeLayer: (id: string) => void
  updateLayer: (id: string, patch: Partial<LogoLayer>) => void
  resetLayerPosition: (id: string) => void
  selectLayer: (id: string | null) => void
  addLogo: (logo: LogoAsset, mode?: 'add' | 'replace') => void
  useLogo: (id: string) => void
  removeLogo: (id: string) => void
  setProject: (patch: Partial<ProjectInfo>) => void
  setCollection: (c: SavedDesign[]) => void
  editSaved: (id: string) => void
  setModelInfo: (productId: string, zones: Zone[]) => void
  setModelLoading: (v: boolean) => void
  setRenderOverride: (d: Design | null) => void
  requestView: (v: ViewName | 'reset') => void
  setRightTab: (t: RightTab) => void
  setMobilePanel: (p: StudioState['mobilePanel']) => void
  setCollectionOpen: (v: boolean) => void
  setHelpOpen: (v: boolean) => void
  setQuality: (q: 'high' | 'low') => void
  setAutoRotate: (v: boolean) => void
  setBusy: (b: StudioState['busy']) => void
  setExportBackground: (b: ExportBackground) => void
  setScene: (s: SceneId) => void
  toast: (text: string, kind?: Toast['kind']) => void
  dismissToast: (id: string) => void
}

export function newLayer(zoneId: string, logoId: string | null): LogoLayer {
  return { id: uid('layer'), logoId, zoneId, offsetX: 0, offsetY: 0, scale: 1, rotation: 0 }
}

export function createDesign(productId: string, logoId: string | null, brand: StudioState['brandColors']): Design {
  const def = PRODUCT_MAP[productId] ?? PRODUCTS[0]
  const colors = { ...def.defaults }
  if (brand.primary && 'primary' in colors) {
    // trims designed to match the body follow the team colour too
    for (const k of Object.keys(colors)) if (k !== 'primary' && colors[k].toLowerCase() === def.defaults.primary.toLowerCase()) colors[k] = brand.primary
    colors.primary = brand.primary
  }
  if (def.patterns && !def.patternColors) {
    const pc = defaultPatternColors(colors.primary, brand.secondary)
    colors.pattern = pc.pattern
    colors.pattern2 = pc.pattern2
  }
  if (brand.secondary && 'secondary' in colors && def.id !== 'mug') colors.secondary = brand.secondary
  const now = Date.now()
  return {
    id: uid('design'),
    productId: def.id,
    title: def.shortName,
    description: '',
    colors,
    pattern: 'solid',
    stickerShape: 'die-cut',
    layers: logoId ? [def.defaultZone, ...(def.extraDefaultZones ?? [])].map((z) => newLayer(z, logoId)) : [],
    createdAt: now,
    updatedAt: now,
  }
}

const INITIAL_PRODUCT = 'hoodie'

export const useStudio = create<StudioState>()((set, get) => {
  /** Applies a change to the current design and keeps the draft map in sync */
  const patchDesign = (fn: (d: Design) => Design) =>
    set((s) => {
      const design = { ...fn(s.design), updatedAt: Date.now() }
      return { design, drafts: { ...s.drafts, [design.productId]: design } }
    })

  return {
    hydrated: false,
    design: createDesign(INITIAL_PRODUCT, null, {}),
    drafts: {},
    selectedLayerId: null,
    logos: {},
    activeLogoId: null,
    brandColors: {},
    project: { orgName: '', projectName: '', rationale: '' },
    collection: [],
    quality: 'high',
    autoRotate: false,
    storageAvailable: true,
    modelZones: [],
    modelProductId: null,
    modelLoading: true,
    renderOverride: null,
    stageFit: null,
    exportBackground: 'scene',
    scene: 'studio-light',
    viewRequest: { view: 'reset', nonce: 0 },
    rightTab: 'logo',
    mobilePanel: null,
    collectionOpen: false,
    helpOpen: false,
    busy: null,
    toasts: [],

    selectProduct: (id) => {
      const s = get()
      if (!PRODUCT_MAP[id]) return
      if (id === s.design.productId) {
        set({ mobilePanel: null })
        return
      }
      const drafts = { ...s.drafts, [s.design.productId]: s.design }
      const activeLogo = s.activeLogoId && s.logos[s.activeLogoId] && !s.logos[s.activeLogoId].hidden ? s.activeLogoId : null
      const design = drafts[id] ?? createDesign(id, activeLogo, s.brandColors)
      drafts[id] = design
      set({
        design,
        drafts,
        selectedLayerId: design.layers[0]?.id ?? null,
        mobilePanel: null,
        viewRequest: { view: 'reset', nonce: s.viewRequest.nonce + 1 },
      })
    },

    resetDesign: () => {
      const s = get()
      const activeLogo = s.activeLogoId && s.logos[s.activeLogoId] && !s.logos[s.activeLogoId].hidden ? s.activeLogoId : null
      const design = createDesign(s.design.productId, activeLogo, {})
      set({
        design,
        drafts: { ...s.drafts, [design.productId]: design },
        selectedLayerId: design.layers[0]?.id ?? null,
        viewRequest: { view: 'reset', nonce: s.viewRequest.nonce + 1 },
      })
    },

    setColor: (slot, hex) => {
      patchDesign((d) => {
        const colors = { ...d.colors, [slot]: hex }
        // parts currently matching the main colour (cuffs, linings, collars) follow it
        if (slot === 'primary') {
          const old = (d.colors.primary ?? '').toLowerCase()
          for (const k of Object.keys(colors)) if (k !== 'primary' && k !== 'pattern' && k !== 'pattern2' && (d.colors[k] ?? '').toLowerCase() === old) colors[k] = hex
        }
        return { ...d, colors }
      })
      if (slot === 'primary' || slot === 'secondary') set((s) => ({ brandColors: { ...s.brandColors, [slot]: hex } }))
    },
    resetColors: () => {
      const def = PRODUCT_MAP[get().design.productId]
      const colors: Record<string, string> = { ...def.defaults }
      if (def.patterns && !def.patternColors) Object.assign(colors, (({ pattern, pattern2 }) => ({ pattern, pattern2 }))(defaultPatternColors(colors.primary)))
      patchDesign((d) => ({ ...d, colors, pattern: 'solid', patternScale: 1 }))
    },
    setPatternScale: (patternScale) => patchDesign((d) => ({ ...d, patternScale })),
    setPattern: (pattern) => patchDesign((d) => ({ ...d, pattern })),
    setStickerShape: (stickerShape) => patchDesign((d) => ({ ...d, stickerShape })),
    setDesignText: (patch) => patchDesign((d) => ({ ...d, ...patch })),

    addLayer: (zoneId, logoId) => {
      const s = get()
      const id = logoId !== undefined ? logoId : s.activeLogoId
      const layer = newLayer(zoneId, id && s.logos[id] ? id : null)
      patchDesign((d) => ({ ...d, layers: [...d.layers, layer] }))
      set({ selectedLayerId: layer.id })
    },
    addTextLayer: (zoneId, text, place) => {
      // readable by default: white on dark products, near-black on light ones
      const prim = get().design.colors.primary ?? '#000000'
      const n = parseInt(prim.replace('#', ''), 16)
      const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
      const auto = lum > 0.6 ? { color: '#0b0f17', outlineColor: '#ffffff' } : { color: '#ffffff', outlineColor: '#0b0f17' }
      const layer: LogoLayer = { ...newLayer(zoneId, null), ...place, text: { ...DEFAULT_TEXT, ...auto, ...text } }
      patchDesign((d) => ({ ...d, layers: [...d.layers, layer] }))
      set({ selectedLayerId: layer.id })
      return layer.id
    },
    updateText: (id, patch) =>
      patchDesign((d) => ({ ...d, layers: d.layers.map((l) => (l.id === id && l.text ? { ...l, text: { ...l.text, ...patch } } : l)) })),
    addPatternImage: (img) => {
      set((s) => ({ logos: { ...s.logos, [img.id]: { ...img, purpose: 'pattern' } } }))
      patchDesign((d) => ({ ...d, pattern: 'custom', customPatternId: img.id, customPatternMode: d.customPatternMode ?? 'tile' }))
    },
    useCustomPattern: (id) => patchDesign((d) => ({ ...d, pattern: 'custom', customPatternId: id })),
    setCustomPatternMode: (customPatternMode) => patchDesign((d) => ({ ...d, customPatternMode })),
    removeLayer: (id) => {
      patchDesign((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== id) }))
      const rest = get().design.layers
      set({ selectedLayerId: rest[rest.length - 1]?.id ?? null })
    },
    updateLayer: (id, patch) => patchDesign((d) => ({ ...d, layers: d.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
    resetLayerPosition: (id) => get().updateLayer(id, { offsetX: 0, offsetY: 0, scale: 1, rotation: 0 }),
    selectLayer: (id) => set({ selectedLayerId: id }),

    addLogo: (logo, mode = 'add') => {
      const s = get()
      const oldId = s.activeLogoId
      set({ logos: { ...s.logos, [logo.id]: logo }, activeLogoId: logo.id })
      const d = get().design
      if (mode === 'replace' && oldId) {
        patchDesign((x) => ({ ...x, layers: x.layers.map((l) => (l.logoId === oldId ? { ...l, logoId: logo.id } : l)) }))
        return
      }
      const sel = d.layers.find((l) => l.id === get().selectedLayerId && !l.text)
      if (sel) {
        get().updateLayer(sel.id, { logoId: logo.id })
      } else if (!d.layers.some((l) => !l.text)) {
        const def = PRODUCT_MAP[d.productId]
        for (const z of [def.defaultZone, ...(def.extraDefaultZones ?? [])]) get().addLayer(z, logo.id)
      } else {
        // apply to every empty layer
        patchDesign((x) => ({ ...x, layers: x.layers.map((l) => (l.logoId || l.text ? l : { ...l, logoId: logo.id })) }))
      }
    },
    useLogo: (id) => {
      const s = get()
      if (!s.logos[id]) return
      set({ activeLogoId: id })
      const sel = s.design.layers.find((l) => l.id === s.selectedLayerId && !l.text)
      if (sel) s.updateLayer(sel.id, { logoId: id })
      else if (!s.design.layers.some((l) => !l.text)) s.addLayer(PRODUCT_MAP[s.design.productId].defaultZone, id)
    },
    removeLogo: (id) => {
      const s = get()
      const usedInCollection = s.collection.some((d) => d.layers.some((l) => l.logoId === id))
      const logos = { ...s.logos }
      if (usedInCollection) logos[id] = { ...logos[id], hidden: true }
      else delete logos[id]
      const visible = Object.values(logos).filter((l) => !l.hidden)
      set({ logos, activeLogoId: s.activeLogoId === id ? (visible[visible.length - 1]?.id ?? null) : s.activeLogoId })
      patchDesign((d) => ({ ...d, layers: d.layers.map((l) => (l.logoId === id ? { ...l, logoId: null } : l)) }))
      // clear from other drafts too
      set((st) => {
        const drafts: Record<string, Design> = {}
        for (const [k, d] of Object.entries(st.drafts)) drafts[k] = { ...d, layers: d.layers.map((l) => (l.logoId === id ? { ...l, logoId: null } : l)) }
        return { drafts }
      })
      if (usedInCollection) get().toast('Logo removed from your library. Saved designs that use it keep their copy.', 'info')
    },

    setProject: (patch) => set((s) => ({ project: { ...s.project, ...patch } })),
    setCollection: (collection) => set({ collection }),
    editSaved: (id) => {
      const s = get()
      const saved = s.collection.find((d) => d.id === id)
      if (!saved) return
      const { thumbnail: _t, ...design } = saved
      void _t
      const drafts = { ...s.drafts, [s.design.productId]: s.design, [design.productId]: design }
      set({
        design,
        drafts,
        selectedLayerId: design.layers[0]?.id ?? null,
        collectionOpen: false,
        viewRequest: { view: 'reset', nonce: s.viewRequest.nonce + 1 },
      })
    },

    setModelInfo: (productId, zones) => set({ modelProductId: productId, modelZones: zones, modelLoading: false }),
    setModelLoading: (v) => set({ modelLoading: v }),
    setRenderOverride: (renderOverride) => set({ renderOverride }),
    requestView: (view) => set((s) => ({ viewRequest: { view, nonce: s.viewRequest.nonce + 1 } })),
    setRightTab: (rightTab) => set({ rightTab }),
    setMobilePanel: (mobilePanel) => set({ mobilePanel }),
    setCollectionOpen: (collectionOpen) => set({ collectionOpen }),
    setHelpOpen: (helpOpen) => set({ helpOpen }),
    setQuality: (quality) => set({ quality }),
    setAutoRotate: (autoRotate) => set({ autoRotate }),
    setBusy: (busy) => set({ busy }),
    setExportBackground: (exportBackground) => set({ exportBackground }),
    setScene: (scene) => set({ scene }),
    toast: (text, kind = 'info') => {
      const t = { id: uid('t'), text, kind }
      set((s) => ({ toasts: [...s.toasts.slice(-3), t] }))
      setTimeout(() => get().dismissToast(t.id), kind === 'error' ? 7000 : 4200)
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  }
})

export const selectDef = (s: StudioState) => PRODUCT_MAP[s.design.productId]

// Exposed for automated browser tests (read-only use).
if (typeof window !== 'undefined') (window as unknown as { __studio?: typeof useStudio }).__studio = useStudio
