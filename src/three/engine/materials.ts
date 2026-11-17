import { Color, DoubleSide, BackSide, FrontSide, MeshPhysicalMaterial, MeshStandardMaterial, Vector2, type Texture } from 'three'
import type { Finish, Part } from './types'
import { getNormalMap } from './textures'

interface FinishSpec {
  roughness: number
  metalness: number
  normalScale: number
  repeat: number
  clearcoat?: number
  clearcoatRoughness?: number
  sheen?: number
  transmission?: number
  opacity?: number
}

// Fabric micro-texture is kept very fine and subtle – at product-photo distance
// real knit is felt through sheen and softness, not visible stripes.
export const FINISHES: Record<Finish, FinishSpec> = {
  knit: { roughness: 0.78, metalness: 0, normalScale: 0.12, repeat: 70, sheen: 0.55 },
  cotton: { roughness: 0.93, metalness: 0, normalScale: 0.1, repeat: 60, sheen: 0.45 },
  fleece: { roughness: 0.97, metalness: 0, normalScale: 0.12, repeat: 40, sheen: 0.7 },
  rib: { roughness: 0.92, metalness: 0, normalScale: 0.45, repeat: 6, sheen: 0.5 },
  pique: { roughness: 0.9, metalness: 0, normalScale: 0.18, repeat: 70, sheen: 0.4 },
  tricot: { roughness: 0.5, metalness: 0, normalScale: 0.08, repeat: 60, sheen: 0.6, clearcoat: 0.08, clearcoatRoughness: 0.5 },
  twill: { roughness: 0.88, metalness: 0, normalScale: 0.2, repeat: 30, sheen: 0.35 },
  canvas: { roughness: 0.94, metalness: 0, normalScale: 0.3, repeat: 14, sheen: 0.25 },
  nylon: { roughness: 0.6, metalness: 0, normalScale: 0.12, repeat: 40, sheen: 0.2 },
  cloth: { roughness: 0.95, metalness: 0, normalScale: 0.08, repeat: 60, sheen: 0.2 },
  rubber: { roughness: 0.95, metalness: 0, normalScale: 0.3, repeat: 10 },
  leather: { roughness: 0.55, metalness: 0, normalScale: 0.25, repeat: 6, clearcoat: 0.15, clearcoatRoughness: 0.6 },
  plastic: { roughness: 0.6, metalness: 0, normalScale: 0, repeat: 1 },
  gloss: { roughness: 0.25, metalness: 0, normalScale: 0, repeat: 1, clearcoat: 0.6, clearcoatRoughness: 0.1 },
  ceramic: { roughness: 0.18, metalness: 0, normalScale: 0, repeat: 1, clearcoat: 1, clearcoatRoughness: 0.05 },
  powder: { roughness: 0.6, metalness: 0.1, normalScale: 0.15, repeat: 6 },
  metal: { roughness: 0.35, metalness: 1, normalScale: 0.1, repeat: 2 },
  chrome: { roughness: 0.12, metalness: 1, normalScale: 0, repeat: 1 },
  paper: { roughness: 0.4, metalness: 0, normalScale: 0, repeat: 1, clearcoat: 0.4, clearcoatRoughness: 0.2 },
  glass: { roughness: 0.05, metalness: 0, normalScale: 0, repeat: 1, opacity: 0.25 },
}

export type StudioMaterial = MeshStandardMaterial | MeshPhysicalMaterial

/** Creates a material for a part. `quality` = 'low' skips the physical extras. */
export function createPartMaterial(part: Part, color: string, map: Texture | null, quality: 'high' | 'low', opts: { ao?: boolean; interior?: boolean } = {}): StudioMaterial {
  const spec = FINISHES[part.finish]
  const physical = quality === 'high' && (spec.clearcoat || spec.sheen || part.finish === 'glass')
  const mat: StudioMaterial = physical ? new MeshPhysicalMaterial() : new MeshStandardMaterial()
  const c = new Color(color)
  if (part.shade) c.multiplyScalar(part.shade)
  mat.color = map ? new Color('#ffffff') : c
  if (map) mat.map = map
  mat.roughness = spec.roughness
  mat.metalness = spec.metalness
  const nm = spec.normalScale > 0 ? getNormalMap(part.finish) : null
  if (nm) {
    const t = nm.clone()
    t.needsUpdate = true
    const r = spec.repeat * (part.repeat ?? 1)
    t.repeat.set(r, r)
    mat.normalMap = t
    mat.normalScale = new Vector2(spec.normalScale, spec.normalScale)
  }
  if (mat instanceof MeshPhysicalMaterial) {
    if (spec.clearcoat) {
      mat.clearcoat = spec.clearcoat
      mat.clearcoatRoughness = spec.clearcoatRoughness ?? 0.2
    }
    if (spec.sheen) {
      mat.sheen = spec.sheen
      mat.sheenRoughness = 0.8
      mat.sheenColor = new Color(color).lerp(new Color('#ffffff'), 0.4)
    }
  }
  if (part.finish === 'glass') {
    mat.transparent = true
    mat.opacity = spec.opacity ?? 0.3
    mat.depthWrite = false
  }
  mat.side = part.backSide ? BackSide : part.doubleSide ? DoubleSide : FrontSide
  if (opts.ao) mat.vertexColors = true
  if (opts.interior) {
    // inside of a garment: in shadow, slightly darker and flatter
    mat.side = BackSide
    mat.vertexColors = false
    mat.color.multiplyScalar(0.42)
    if (mat instanceof MeshPhysicalMaterial) mat.sheen = 0
  }
  return mat
}

/** Print material for logos – inherits the fabric micro-texture so the print sits *in* the material. */
export function createPrintMaterial(part: Part, map: Texture, quality: 'high' | 'low', ao = false): StudioMaterial {
  const spec = FINISHES[part.finish]
  const fabric = ['knit', 'cotton', 'fleece', 'pique', 'tricot', 'twill', 'canvas', 'rib'].includes(part.finish)
  const mat = new MeshStandardMaterial({
    map,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    roughness: Math.min(0.95, spec.roughness + (spec.metalness > 0.5 ? 0.2 : 0)),
    metalness: spec.metalness > 0.5 ? 0.2 : 0,
    alphaTest: 0.01,
    vertexColors: ao,
  })
  // screen/heat-transfer prints have a faint plastisol sheen on fabric
  if (fabric) mat.roughness = 0.72
  const nm = quality === 'high' && spec.normalScale > 0 ? getNormalMap(part.finish) : null
  if (nm) {
    const t = nm.clone()
    t.needsUpdate = true
    // decal UVs span only the logo, so scale the weave down to match the fabric
    const r = Math.max(1, spec.repeat * (part.repeat ?? 1) * 0.12)
    t.repeat.set(r, r)
    mat.normalMap = t
    mat.normalScale = new Vector2(spec.normalScale * 0.7, spec.normalScale * 0.7)
  }
  return mat
}
