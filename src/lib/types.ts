// Shared data types for designs, logos and project information.

export type PatternId =
  | 'solid'
  | 'two-tone'
  | 'color-block'
  | 'gradient'
  | 'diagonal'
  | 'pinstripe'
  | 'hoops'
  | 'geometric'
  | 'hex'
  | 'halftone'
  | 'camo'
  | 'carbon'
  | 'logo-repeat'
  | 'crosshair'
  | 'controller'
  | 'arcade'
  | 'wasd'
  | 'circuit'
  | 'lightning'
  | 'pixel'
  | 'glitch'
  | 'binary'
  | 'esports-camo'
  | 'abstract'
  | 'minimal'
  | 'split'
  | 'racing'
  | 'custom'

export type ViewName = 'front' | 'back' | 'side' | 'right' | 'three-quarter'

export type StickerShape = 'die-cut' | 'circle' | 'rounded-square'

export interface TextStyle {
  content: string
  font: string
  color: string
  outlineColor: string
  /** Outline thickness as a fraction of the letter height, 0 – 0.2 */
  outline: number
  /** Extra space between letters as a fraction of the letter height */
  spacing: number
  /** Arc in degrees: positive curves up (like a college crest), negative down */
  arc: number
  /** Second line, smaller (e.g. a role or player number under a gamer tag) */
  subline?: string
  bold?: boolean
  italic?: boolean
  /** Alignment of the two lines relative to each other */
  align?: 'left' | 'center' | 'right'
}

/** What a layer is for – lets the jersey designer find and update its own layers */
export type LayerRole = 'team-logo' | 'sponsor' | 'player-name' | 'player-number' | 'front-number' | 'sleeve-left' | 'sleeve-right' | 'slogan'

export interface LogoLayer {
  id: string
  logoId: string | null
  zoneId: string
  /** Horizontal offset inside the placement area, -1 … 1 */
  offsetX: number
  /** Vertical offset inside the placement area, -1 … 1 */
  offsetY: number
  /** Size multiplier relative to the placement area's default size */
  scale: number
  /** Rotation in degrees, -180 … 180 */
  rotation: number
  /** Present on text layers (then logoId is null) */
  text?: TextStyle
  /** 0.1 – 1 */
  opacity?: number
  /** Locked layers cannot be moved or edited */
  locked?: boolean
  role?: LayerRole
}

export interface Design {
  id: string
  productId: string
  /** Student's own name for this item, e.g. "2027 Home Jersey" */
  title: string
  description: string
  colors: Record<string, string>
  pattern: PatternId
  /** Pattern size multiplier (1 = default) */
  patternScale?: number
  /** Student-uploaded pattern image (stored in the image library) */
  customPatternId?: string | null
  /** Repeat the uploaded image as a tile, or stretch one image over the whole print area */
  customPatternMode?: 'tile' | 'fill'
  stickerShape: StickerShape
  layers: LogoLayer[]
  createdAt: number
  updatedAt: number
}

export interface SavedDesign extends Design {
  /** Small PNG data URL used in the gallery */
  thumbnail: string
}

export interface LogoAsset {
  id: string
  name: string
  /** Rasterised PNG data URL (SVGs are sanitised and rasterised on upload) */
  dataUrl: string
  width: number
  height: number
  createdAt: number
  /** Removed from the library but still used by saved designs */
  hidden?: boolean
  /** 'pattern' images are kept out of the logo/graphics library */
  purpose?: 'logo' | 'pattern'
}

export interface ProjectInfo {
  orgName: string
  projectName: string
  rationale: string
}

export interface BrandKit {
  orgName: string
  primaryLogoId: string | null
  secondaryLogoId: string | null
  primary: string
  secondary: string
  accent: string
  font: string
  slogan: string
}

export interface PortfolioVersion {
  id: string
  label: string
  /** JPEG data URL captured when the version was recorded */
  image: string
  design: Design
  createdAt: number
}

export interface PortfolioProductNotes {
  why: string
  represents: string
  appeal: string
  improve: string
  changes: string
  reasons: string
  versions: PortfolioVersion[]
}

export interface Portfolio {
  studentProject: string
  audience: string
  /** keyed by collection design id */
  products: Record<string, PortfolioProductNotes>
  improvements: string
}

export interface ProjectFileV2 {
  format: 'merchforge'
  version: 2
  savedAt: string
  projectName: string
  brandKit: BrandKit
  /** all images used by the project (logos, sponsor logos, pattern images) */
  images: LogoAsset[]
  current: Design
  drafts: Design[]
  collection: SavedDesign[]
  portfolio: Portfolio
  settings: { scene: string; exportBackground: string; recentColors: string[] }
}

export interface ProjectFile {
  format: 'merch-forge-project'
  version: 1
  exportedAt: string
  project: ProjectInfo
  logos: LogoAsset[]
  designs: SavedDesign[]
}
