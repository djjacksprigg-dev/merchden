/**
 * Surface decal system.
 *
 * A logo layer is resolved to a point on the real product surface by ray-casting
 * against the target geometry. The logo is then projected with three.js'
 * DecalGeometry, which cuts out the triangles under the logo and gives them new
 * UVs – so the logo genuinely wraps over folds, curves and seams and stays
 * attached to the product whatever the camera does.
 */
import {
  BufferGeometry,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
} from 'three'
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js'
import type { LogoLayer } from '../../lib/types'
import type { PlanarZone, WrapZone, Zone } from './types'
import { clamp } from './geometry'
import { transferAO } from './ao'

export interface Placement {
  position: Vector3
  normal: Vector3
  orientation: Euler
  size: Vector3
}

const meshCache = new WeakMap<BufferGeometry, Mesh>()
const sharedMat = new MeshBasicMaterial({ side: DoubleSide })
function probeMesh(g: BufferGeometry) {
  let m = meshCache.get(g)
  if (!m) {
    if (!g.boundingSphere) g.computeBoundingSphere()
    m = new Mesh(g, sharedMat)
    m.updateMatrixWorld(true)
    meshCache.set(g, m)
  }
  return m
}

const raycaster = new Raycaster()

function cast(mesh: Mesh, origin: Vector3, dir: Vector3) {
  raycaster.set(origin, dir)
  raycaster.near = 0
  raycaster.far = 100
  ;(raycaster as unknown as { firstHitOnly: boolean }).firstHitOnly = true
  const hits = raycaster.intersectObject(mesh, false)
  return hits.length ? hits[0] : null
}

interface Frame {
  center: Vector3
  dir: Vector3 // ray direction (into the surface)
  right: Vector3
  up: Vector3
}

function zoneFrame(zone: PlanarZone | WrapZone, ox: number, oy: number): Frame {
  if (zone.kind === 'planar') {
    const n = new Vector3(...zone.normal).normalize()
    const up = new Vector3(...zone.up).normalize()
    const right = new Vector3().crossVectors(up, n).normalize()
    const trueUp = new Vector3().crossVectors(n, right).normalize()
    const center = new Vector3(...zone.origin)
      .addScaledVector(right, ox * zone.rangeX)
      .addScaledVector(trueUp, oy * zone.rangeY)
    return { center, dir: n.clone().negate(), right, up: trueUp }
  }
  const a = zone.angle + ox * zone.arc
  const d = new Vector3(Math.sin(a), 0, Math.cos(a))
  const center = new Vector3(zone.center[0], zone.y + oy * zone.rangeY, zone.center[1])
  const up = new Vector3(0, 1, 0)
  const right = new Vector3().crossVectors(up, d).normalize()
  return { center, dir: d.clone().negate(), right, up }
}

const FAR = 6

/** Resolves a logo layer to a concrete placement on the product surface. */
export function resolvePlacement(
  zone: Zone,
  geometry: BufferGeometry,
  layer: Pick<LogoLayer, 'offsetX' | 'offsetY' | 'scale' | 'rotation'>,
  aspect: number,
): Placement | null {
  if (zone.kind !== 'planar' && zone.kind !== 'wrap') return null
  const mesh = probeMesh(geometry)
  const f = zoneFrame(zone, clamp(layer.offsetX, -1, 1), clamp(layer.offsetY, -1, 1))

  const shoot = (dx: number, dy: number) => {
    const o = f.center
      .clone()
      .addScaledVector(f.right, dx)
      .addScaledVector(f.up, dy)
      .addScaledVector(f.dir, -FAR)
    return cast(mesh, o, f.dir)
  }
  // For wrap zones the ray starts from the axis outward-facing side
  const hit = shoot(0, 0)
  if (!hit) return null

  const width = clamp(zone.size * layer.scale, 0.02, zone.maxSize)
  const height = width / Math.max(0.05, aspect)

  // Smoothed normal from neighbouring hits – ignores small fabric folds so the
  // logo does not wobble while being dragged.
  const h = Math.max(0.015, Math.min(width, height) * 0.3)
  const l = shoot(-h, 0)
  const r = shoot(h, 0)
  const d = shoot(0, -h)
  const u = shoot(0, h)
  let normal: Vector3
  if (l && r && d && u) {
    normal = new Vector3()
      .subVectors(r.point, l.point)
      .cross(new Vector3().subVectors(u.point, d.point))
      .normalize()
  } else {
    normal = f.dir.clone().negate()
  }
  if (normal.dot(f.dir) > 0) normal.negate()
  // keep the logo facing roughly the zone direction
  normal.lerp(f.dir.clone().negate(), 0.25).normalize()

  const z = normal
  const up = f.up.clone().addScaledVector(z, -f.up.dot(z)).normalize()
  const x = new Vector3().crossVectors(up, z).normalize()
  const y = new Vector3().crossVectors(z, x).normalize()
  const rot = (layer.rotation * Math.PI) / 180
  const xr = x.clone().multiplyScalar(Math.cos(rot)).addScaledVector(y, Math.sin(rot))
  const yr = new Vector3().crossVectors(z, xr).normalize()
  const m = new Matrix4().makeBasis(xr, yr, z)
  const orientation = new Euler().setFromRotationMatrix(m)

  return {
    position: hit.point.clone(),
    normal: z.clone(),
    orientation,
    size: new Vector3(width, height, zone.depth),
  }
}

/** Projects the decal and strips triangles that face away from the logo. */
export function buildDecalGeometry(geometry: BufferGeometry, p: Placement, lift = 0.0015): BufferGeometry {
  const mesh = probeMesh(geometry)
  const raw = new DecalGeometry(mesh, p.position, p.orientation, p.size)
  const pos = raw.getAttribute('position')
  const nrm = raw.getAttribute('normal')
  const uv = raw.getAttribute('uv')
  const outP: number[] = []
  const outN: number[] = []
  const outU: number[] = []
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const fn = new Vector3()
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i)
    b.fromBufferAttribute(pos, i + 1)
    c.fromBufferAttribute(pos, i + 2)
    fn.subVectors(b, a).cross(new Vector3().subVectors(c, a))
    const len = fn.length()
    if (len < 1e-12) continue
    fn.divideScalar(len)
    // keep triangles facing the projector (either winding)
    if (Math.abs(fn.dot(p.normal)) < 0.08) continue
    // reject triangles on the far side of the product
    const avgN = new Vector3()
      .fromBufferAttribute(nrm, i)
      .add(new Vector3().fromBufferAttribute(nrm, i + 1))
      .add(new Vector3().fromBufferAttribute(nrm, i + 2))
      .normalize()
    if (avgN.dot(p.normal) < -0.2) continue
    for (let k = 0; k < 3; k++) {
      const vn = new Vector3().fromBufferAttribute(nrm, i + k)
      const vp = new Vector3().fromBufferAttribute(pos, i + k).addScaledVector(vn.dot(p.normal) >= 0 ? vn : vn.clone().negate(), lift)
      outP.push(vp.x, vp.y, vp.z)
      outN.push(vn.x, vn.y, vn.z)
      outU.push(uv.getX(i + k), uv.getY(i + k))
    }
  }
  raw.dispose()
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(outP, 3))
  g.setAttribute('normal', new Float32BufferAttribute(outN, 3))
  g.setAttribute('uv', new Float32BufferAttribute(outU, 2))
  transferAO(geometry, g)
  return g
}

/** Converts a surface point (e.g. from a double-click) into layer offsets. */
export function pointToOffsets(zone: Zone, point: Vector3): { offsetX: number; offsetY: number } | null {
  if (zone.kind === 'planar') {
    const f = zoneFrame(zone, 0, 0)
    const rel = point.clone().sub(f.center)
    return {
      offsetX: clamp(rel.dot(f.right) / Math.max(1e-4, zone.rangeX), -1, 1),
      offsetY: clamp(rel.dot(f.up) / Math.max(1e-4, zone.rangeY), -1, 1),
    }
  }
  if (zone.kind === 'wrap') {
    const a = Math.atan2(point.x - zone.center[0], point.z - zone.center[1])
    let da = a - zone.angle
    while (da > Math.PI) da -= Math.PI * 2
    while (da < -Math.PI) da += Math.PI * 2
    return {
      offsetX: clamp(zone.arc > 0 ? da / zone.arc : 0, -1, 1),
      offsetY: clamp(zone.rangeY > 0 ? (point.y - zone.y) / zone.rangeY : 0, -1, 1),
    }
  }
  return null
}
