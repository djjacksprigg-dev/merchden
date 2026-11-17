import type { BufferGeometry } from 'three'
import type { ViewName } from '../../lib/types'

/** Surface finish – decides roughness, metalness and the procedural micro-texture. */
export type Finish =
  | 'knit' // jersey / t-shirt fabric
  | 'cotton' // heavier cotton
  | 'fleece' // hoodies, sweatshirts
  | 'rib' // cuffs, waistbands, beanies
  | 'pique' // polo shirts
  | 'tricot' // tracksuit
  | 'twill' // caps, bucket hats
  | 'canvas' // tote / bags
  | 'nylon' // backpacks
  | 'cloth' // mouse mat surface
  | 'rubber' // mouse mat base
  | 'leather' // PU leather (gaming chair)
  | 'plastic' // matte plastic
  | 'gloss' // glossy plastic
  | 'ceramic' // mugs
  | 'powder' // powder-coated steel bottle
  | 'metal' // brushed metal
  | 'chrome'
  | 'paper' // sticker vinyl / paper
  | 'glass'

export type Vec3 = [number, number, number]

export interface Part {
  key: string
  geometry: BufferGeometry
  finish: Finish
  /** Colour slot id from the product definition */
  slot?: string
  /** Fixed colour (hex) when the part is not customisable */
  color?: string
  /** This part is printed with the chosen pattern, laid out by this mode */
  pattern?: 'body' | 'sleeve' | 'wrap' | 'flat'
  /** u coordinate (0–1) that faces the front of the product, for 'wrap' parts */
  patternFront?: number
  /** Render both sides (open garments, hood linings) */
  doubleSide?: boolean
  /** Render only the back faces (inner linings) */
  backSide?: boolean
  /** Texture repeat multiplier for the micro-texture */
  repeat?: number
  /** Optional slight darkening for seams */
  shade?: number
  castShadow?: boolean
  /** Special behaviours */
  special?: 'logo-repeat' | 'sticker-front' | 'sticker-back' | 'transparent'
}

interface ZoneBase {
  id: string
  label: string
  /** Part key the logo is projected onto */
  target: string
  /** Default logo width in model units */
  size: number
  /** Maximum logo width in model units */
  maxSize: number
  /** Projection depth – keep below the local thickness of the product */
  depth: number
  /** Vertical travel (model units) for offsetY = ±1 */
  rangeY: number
}

/** Projected from a direction onto (roughly) flat or gently curved surfaces. */
export interface PlanarZone extends ZoneBase {
  kind: 'planar'
  origin: Vec3
  /** Outward direction the logo faces */
  normal: Vec3
  /** Which way is "up" for the logo */
  up: Vec3
  /** Horizontal travel (model units) for offsetX = ±1 */
  rangeX: number
}

/** Wraps around a vertical axis (mugs, bottles, hats). offsetX rotates around the axis. */
export interface WrapZone extends ZoneBase {
  kind: 'wrap'
  /** Axis centre on the XZ plane */
  center: [number, number]
  y: number
  /** Angle of the zone centre in radians, 0 = facing +Z (front), +π/2 = facing +X */
  angle: number
  /** Angular travel (radians) for offsetX = ±1 */
  arc: number
}

/** Logo repeated along a strap (lanyard). */
export interface RepeatZone extends ZoneBase {
  kind: 'repeat'
}

/** The sticker product: the logo *is* the product. */
export interface StickerZone extends ZoneBase {
  kind: 'sticker'
}

export type Zone = PlanarZone | WrapZone | RepeatZone | StickerZone

export interface ProductModel {
  parts: Part[]
  zones: Zone[]
}

export interface ViewAngle {
  /** Azimuth in radians, 0 = looking at the front (+Z) */
  azimuth: number
  /** Polar angle in radians from straight above */
  polar: number
}

export interface ColorSlot {
  id: string
  label: string
}

export type CategoryId = 'clothing' | 'headwear' | 'gaming' | 'everyday'

export interface ProductDef {
  id: string
  name: string
  shortName: string
  category: CategoryId
  description: string
  colorSlots: ColorSlot[]
  defaults: Record<string, string>
  /** Supports pattern options */
  patterns?: boolean
  /** Which colour slots the pattern uses; defaults to dedicated 'pattern' / 'pattern2' colours */
  patternColors?: { a: string; b: string }
  defaultZone: string
  /** Extra placement areas that get the logo automatically */
  extraDefaultZones?: string[]
  /** Lazily loads and builds the procedural model */
  load: () => Promise<() => ProductModel>
  /** Optional per-product camera view overrides */
  views?: Partial<Record<ViewName, ViewAngle>>
  minPolar?: number
  maxPolar?: number
  /** How the side view is labelled in the UI */
  sideLabel?: string
}
