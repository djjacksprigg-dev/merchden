/**
 * Procedural geometry toolkit used by every product model.
 *
 * All builders return BufferGeometry with position / normal / uv attributes and
 * outward-facing, counter-clockwise winding. Geometry is baked in product space
 * (no per-mesh transforms) so logo decals can be projected directly onto it.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Matrix4,
  Shape,
  SplineCurve,
  Vector2,
  Vector3,
  type Curve,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const TAU = Math.PI * 2

/* ------------------------------------------------------------------ */
/* Small maths helpers                                                 */
/* ------------------------------------------------------------------ */

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
/** Gaussian-ish bump centred on c with width w */
export const bump = (x: number, c: number, w: number) => Math.exp(-((x - c) * (x - c)) / (2 * w * w))

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}

/** Deterministic smooth pseudo-noise built from layered sines (cheap, seamless in u). */
export function foldNoise(u: number, v: number, seed = 1) {
  let n = 0
  n += Math.sin(u * TAU * 3 + v * 7.1 + seed * 1.7) * 0.5
  n += Math.sin(u * TAU * 5 - v * 11.3 + seed * 3.1) * 0.3
  n += Math.sin(u * TAU * 9 + v * 17.9 + seed * 5.3) * 0.15
  n += Math.sin(u * TAU * 2 - v * 3.7 + seed * 0.9) * 0.4
  return n / 1.35
}

/* ------------------------------------------------------------------ */
/* Parametric grid builder                                             */
/* ------------------------------------------------------------------ */

type PointFn = (u: number, v: number) => Vector3

/**
 * Builds an indexed grid from a parametric function. Normals are outward when
 * ∂p/∂u × ∂p/∂v points outward. If wrapU is true, normals along the u seam are
 * averaged so the seam is invisible.
 */
export function gridGeometry(fn: PointFn, segU: number, segV: number, wrapU = false): BufferGeometry {
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let j = 0; j <= segV; j++) {
    const v = j / segV
    for (let i = 0; i <= segU; i++) {
      const u = i / segU
      const p = fn(u, v)
      pos.push(p.x, p.y, p.z)
      uv.push(u, v)
    }
  }
  const row = segU + 1
  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < segU; i++) {
      const a = j * row + i
      const b = a + 1
      const c = a + row
      const d = c + 1
      idx.push(a, b, c, b, d, c)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  if (wrapU) {
    const n = g.getAttribute('normal')
    const t = new Vector3()
    for (let j = 0; j <= segV; j++) {
      const a = j * row
      const b = a + segU
      t.set(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize()
      n.setXYZ(a, t.x, t.y, t.z)
      n.setXYZ(b, t.x, t.y, t.z)
    }
    n.needsUpdate = true
  }
  return g
}

/* ------------------------------------------------------------------ */
/* Garment bodies – stacked super-elliptical rings                      */
/* ------------------------------------------------------------------ */

export interface Ring {
  y: number
  /** half width (x) */
  w: number
  /** half depth (z) */
  d: number
  /** z offset of the ring centre */
  cz?: number
  /** super-ellipse exponent: 2 = ellipse, higher = boxier */
  n?: number
}

export interface Surface {
  geometry: BufferGeometry
  /** Point on the surface at (u around, v up), pushed `off` along the normal */
  point: (u: number, v: number, off?: number) => Vector3
  normal: (u: number, v: number) => Vector3
}

export function ringAt(rings: Ring[], v: number): Required<Ring> {
  const f = clamp(v, 0, 1) * (rings.length - 1)
  const i = Math.min(Math.floor(f), rings.length - 2)
  const t = f - i
  const r = (k: number) => rings[clamp(k, 0, rings.length - 1)]
  const get = (key: keyof Ring, def: number) =>
    catmull(r(i - 1)[key] ?? def, r(i)[key] ?? def, r(i + 1)[key] ?? def, r(i + 2)[key] ?? def, t)
  return { y: get('y', 0), w: get('w', 0), d: get('d', 0), cz: get('cz', 0), n: get('n', 2) }
}

const spow = (x: number, p: number) => Math.sign(x) * Math.pow(Math.abs(x), p)

export interface BodyOptions {
  segU?: number
  segV?: number
  /** Fold displacement along the normal at (u, v) in model units */
  folds?: (u: number, v: number) => number
  /** Shape tweak applied to the smooth base surface (e.g. lowering a neckline) */
  deform?: (p: Vector3, u: number, v: number) => void
}

/**
 * u = 0 is the centre back, u = 0.5 the centre front; v = 0 bottom, v = 1 top.
 */
export function createBody(rings: Ring[], opts: BodyOptions = {}): Surface {
  const segU = opts.segU ?? 112
  const segV = opts.segV ?? 72
  const folds = opts.folds

  const base = (u: number, v: number) => {
    const r = ringAt(rings, v)
    const th = TAU * u + Math.PI
    const e = 2 / r.n
    const p = new Vector3(r.w * spow(Math.sin(th), e), r.y, r.d * spow(Math.cos(th), e) + r.cz)
    if (opts.deform) opts.deform(p, ((u % 1) + 1) % 1, v)
    return p
  }
  const baseNormal = (u: number, v: number) => {
    const e = 1e-3
    const du = base(u + e, v).sub(base(u - e, v))
    const v0 = clamp(v - e, 0, 1)
    const v1 = clamp(v + e, 0, 1)
    const dv = base(u, v1).sub(base(u, v0))
    return du.cross(dv).normalize()
  }
  const point = (u: number, v: number, off = 0) => {
    const p = base(u, v)
    const disp = (folds ? folds(((u % 1) + 1) % 1, v) : 0) + off
    if (disp !== 0) p.addScaledVector(baseNormal(u, v), disp)
    return p
  }
  const geometry = gridGeometry((u, v) => point(u, v), segU, segV, true)
  return { geometry, point, normal: baseNormal }
}

/** Builds a patch (pocket, panel, band, zip) lying on a surface. */
export function surfacePatch(
  s: Pick<Surface, 'point'>,
  o: {
    u0: number | ((v: number) => number)
    u1: number | ((v: number) => number)
    v0: number
    v1: number
    off: number
    segU?: number
    segV?: number
  },
): BufferGeometry {
  const fu0 = typeof o.u0 === 'number' ? () => o.u0 as number : o.u0
  const fu1 = typeof o.u1 === 'number' ? () => o.u1 as number : o.u1
  return gridGeometry(
    (a, b) => {
      const v = lerp(o.v0, o.v1, b)
      const u = lerp(fu0(v), fu1(v), a)
      return s.point(u, v, o.off)
    },
    o.segU ?? 24,
    o.segV ?? 12,
  )
}

/* ------------------------------------------------------------------ */
/* Tubes – sleeves, legs, straps, handles, cords                        */
/* ------------------------------------------------------------------ */

export interface TubeOptions {
  radial?: number
  segments?: number
  /** Fixed up vector for the cross-section frame (flat ribbons) */
  up?: Vector3
  capStart?: boolean
  capEnd?: boolean
  closed?: boolean
  folds?: (a: number, t: number) => number
}

export interface TubeSurface extends Surface {
  curve: Curve<Vector3>
}

/**
 * Sweeps an (elliptical) cross-section along a curve.
 * radius(t) returns either a radius or [rx, rz] where rx lies along the frame
 * normal and rz along the binormal.
 */
export function createTube(
  points: Vector3[] | Curve<Vector3>,
  radius: number | ((t: number) => number | [number, number]),
  opts: TubeOptions = {},
): TubeSurface {
  const radial = opts.radial ?? 32
  const segments = opts.segments ?? 48
  const curve = Array.isArray(points) ? new CatmullRomCurve3(points, !!opts.closed, 'centripetal') : points
  const rf = typeof radius === 'number' ? () => radius : radius

  // Frames sampled densely, then interpolated
  const samples = Math.max(segments * 2, 64)
  const frames = curve.computeFrenetFrames(samples, !!opts.closed)
  const frameAt = (t: number) => {
    const T = curve.getTangentAt(clamp(t, 0, 1)).normalize()
    let N: Vector3
    if (opts.up) {
      N = opts.up.clone().addScaledVector(T, -opts.up.dot(T)).normalize()
    } else {
      const k = Math.round(clamp(t, 0, 1) * samples)
      N = frames.normals[k].clone()
      N.addScaledVector(T, -N.dot(T)).normalize()
    }
    const B = new Vector3().crossVectors(T, N).normalize()
    return { T, N, B }
  }
  const radii = (t: number): [number, number] => {
    const r = rf(clamp(t, 0, 1))
    return typeof r === 'number' ? [r, r] : r
  }
  const point = (a: number, t: number, off = 0) => {
    const c = curve.getPointAt(clamp(t, 0, 1))
    const { N, B } = frameAt(t)
    const [rx, rz] = radii(t)
    const th = a * TAU
    const fold = opts.folds ? opts.folds(((a % 1) + 1) % 1, t) : 0
    const k = 1 + (fold + off) / Math.max(1e-4, (rx + rz) / 2)
    return c
      .clone()
      .addScaledVector(N, Math.cos(th) * rx * k)
      .addScaledVector(B, Math.sin(th) * rz * k)
  }
  const normal = (a: number, t: number) => {
    const e = 1e-3
    const du = point(a + e, t).sub(point(a - e, t))
    const dv = point(a, clamp(t + e, 0, 1)).sub(point(a, clamp(t - e, 0, 1)))
    return du.cross(dv).normalize()
  }
  let geometry = gridGeometry((a, t) => point(a, t), radial, segments, true)
  const caps: BufferGeometry[] = []
  if (opts.capStart) caps.push(capDisk(curve, 0, radii(0), frameAt(0), radial, true))
  if (opts.capEnd) caps.push(capDisk(curve, 1, radii(1), frameAt(1), radial, false))
  if (caps.length) geometry = merge([geometry, ...caps])
  return { geometry, point, normal, curve }
}

function capDisk(
  curve: Curve<Vector3>,
  t: number,
  [rx, rz]: [number, number],
  f: { T: Vector3; N: Vector3; B: Vector3 },
  radial: number,
  flip: boolean,
) {
  const c = curve.getPointAt(t)
  const pos: number[] = [c.x, c.y, c.z]
  const nrm: number[] = []
  const uv: number[] = [0.5, 0.5]
  const n = flip ? f.T.clone().negate() : f.T
  nrm.push(n.x, n.y, n.z)
  for (let i = 0; i <= radial; i++) {
    const th = (i / radial) * TAU
    const p = c.clone().addScaledVector(f.N, Math.cos(th) * rx).addScaledVector(f.B, Math.sin(th) * rz)
    pos.push(p.x, p.y, p.z)
    nrm.push(n.x, n.y, n.z)
    uv.push(0.5 + Math.cos(th) * 0.5, 0.5 + Math.sin(th) * 0.5)
  }
  const idx: number[] = []
  for (let i = 1; i <= radial; i++) {
    if (flip) idx.push(0, i + 1, i)
    else idx.push(0, i, i + 1)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new Float32BufferAttribute(nrm, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

/* ------------------------------------------------------------------ */
/* Lathes, rounded boxes, pillows, extrusions                           */
/* ------------------------------------------------------------------ */

/** Smooths a [radius, y] profile with a spline and spins it around Y. */
export function lathe(profile: [number, number][], segments = 96, samples = 0): BufferGeometry {
  let pts = profile.map(([r, y]) => new Vector2(Math.max(0, r), y))
  if (samples > 0) pts = new SplineCurve(pts).getSpacedPoints(samples)
  const g = new LatheGeometry(pts, segments)
  // v by real distance along the profile (three.js spaces it per point), so
  // printed patterns keep their proportions on mugs, bottles and hats
  const cum = [0]
  for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + pts[j].distanceTo(pts[j - 1]))
  const total = cum[cum.length - 1] || 1
  const uv = g.getAttribute('uv')
  const n = pts.length
  for (let k = 0; k < uv.count; k++) uv.setY(k, cum[k % n] / total)
  uv.needsUpdate = true
  return g
}

export function roundedBox(w: number, h: number, d: number, radius: number, segments = 4): BufferGeometry {
  const g = new RoundedBoxGeometry(w, h, d, segments, Math.min(radius, Math.min(w, h, d) / 2 - 1e-4))
  return g
}

/**
 * Soft cushion / bag shape. Starts from a rounded box and inflates the large
 * faces (z) towards the middle.
 */
export function pillow(
  w: number,
  h: number,
  d: number,
  o: { radius?: number; bulge?: number; segments?: number; sag?: number } = {},
): BufferGeometry {
  // Subdivided box rounded by projecting onto an inner box + radius, so every
  // face has interior vertices that can be inflated and shaped.
  const r = Math.min(o.radius ?? d * 0.45, Math.min(w, h, d) / 2 - 1e-4)
  const density = 26
  const sx = Math.max(6, Math.round((w / Math.max(w, h)) * density))
  const sy = Math.max(6, Math.round((h / Math.max(w, h)) * density))
  const sz = Math.max(4, Math.round((d / Math.max(w, h)) * density) + 2)
  const g = new BoxGeometry(w, h, d, sx, sy, sz)
  const p = g.getAttribute('position')
  const ix = w / 2 - r
  const iy = h / 2 - r
  const iz = d / 2 - r
  const v = new Vector3()
  const inner = new Vector3()
  const bulge = o.bulge ?? 0.5
  const sag = o.sag ?? 0
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    inner.set(clamp(v.x, -ix, ix), clamp(v.y, -iy, iy), clamp(v.z, -iz, iz))
    const dir = v.clone().sub(inner)
    if (dir.lengthSq() > 1e-12) v.copy(inner).addScaledVector(dir.normalize(), r)
    const nx = v.x / (w / 2)
    const ny = v.y / (h / 2)
    const f = Math.max(0, 1 - nx * nx) * Math.max(0, 1 - ny * ny)
    v.z *= 1 + bulge * f
    if (sag) v.x *= 1 - sag * (1 - ny) * 0.5 * Math.max(0, 1 - nx * nx)
    p.setXYZ(i, v.x, v.y, v.z)
  }
  void o.segments
  const out = mergeVertices(g.deleteAttribute('normal').deleteAttribute('uv'), 1e-5)
  g.dispose()
  out.computeVertexNormals()
  // planar UVs (front projection) for micro-texture tiling
  const q = out.getAttribute('position')
  const uv = new Float32Array(q.count * 2)
  for (let i = 0; i < q.count; i++) {
    uv[i * 2] = q.getX(i) / Math.max(w, h) + 0.5
    uv[i * 2 + 1] = q.getY(i) / Math.max(w, h) + 0.5
  }
  out.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  return out
}

/** Extrudes a 2D outline (XY) by depth along +Z with bevel. */
export function extrude(shape: Shape, depth: number, bevel = 0.004, curveSegments = 48): BufferGeometry {
  const g = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments,
    steps: 1,
  })
  g.translate(0, 0, -depth / 2)
  return g
}

export function roundedRectShape(w: number, h: number, r: number): Shape {
  const s = new Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/** Closed rounded-rectangle path (for stitched edges on mats). */
export function roundedRectPath(w: number, h: number, r: number, y: number, n = 24): Vector3[] {
  const pts: Vector3[] = []
  const corners: [number, number, number][] = [
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, Math.PI / 2],
    [-w / 2 + r, -h / 2 + r, Math.PI],
    [w / 2 - r, -h / 2 + r, (3 * Math.PI) / 2],
  ]
  for (const [cx, cz, a0] of corners) {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2)
      pts.push(new Vector3(cx + Math.cos(a) * r, y, -(cz + Math.sin(a) * r)))
    }
  }
  return pts
}

/* ------------------------------------------------------------------ */
/* Transform / merge                                                   */
/* ------------------------------------------------------------------ */

export function transform(
  g: BufferGeometry,
  o: { position?: [number, number, number]; rotation?: [number, number, number]; scale?: [number, number, number] | number },
): BufferGeometry {
  const m = new Matrix4()
  if (o.scale !== undefined) {
    const s = typeof o.scale === 'number' ? [o.scale, o.scale, o.scale] : o.scale
    g.applyMatrix4(m.makeScale(s[0], s[1], s[2]))
  }
  if (o.rotation) {
    g.rotateX(o.rotation[0])
    g.rotateY(o.rotation[1])
    g.rotateZ(o.rotation[2])
  }
  if (o.position) g.translate(o.position[0], o.position[1], o.position[2])
  return g
}

/** Merges geometries, normalising attributes so mixed sources can be combined. */
export function merge(geos: BufferGeometry[]): BufferGeometry {
  const anyNonIndexed = geos.some((g) => !g.index)
  const prepared = geos.map((g) => {
    let x = anyNonIndexed && g.index ? g.toNonIndexed() : g
    if (x === g) x = g.clone()
    for (const name of Object.keys(x.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') x.deleteAttribute(name)
    }
    if (!x.getAttribute('normal')) x.computeVertexNormals()
    if (!x.getAttribute('uv')) {
      x.setAttribute('uv', new Float32BufferAttribute(new Float32Array(x.getAttribute('position').count * 2), 2))
    }
    x.clearGroups()
    return x
  })
  const out = mergeGeometries(prepared, false)
  prepared.forEach((g) => g.dispose())
  geos.forEach((g) => g.dispose())
  if (!out) throw new Error('Geometry merge failed')
  return out
}

/** Mirrors a geometry across the YZ plane (x → -x) keeping outward winding. */
export function mirrorX(g: BufferGeometry): BufferGeometry {
  const c = g.clone()
  c.scale(-1, 1, 1)
  // flip winding
  if (c.index) {
    const a = c.index.array as Uint16Array | Uint32Array
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i + 1]
      a[i + 1] = a[i + 2]
      a[i + 2] = t
    }
    c.index.needsUpdate = true
  } else {
    const p = c.getAttribute('position')
    const n = c.getAttribute('normal')
    const u = c.getAttribute('uv')
    for (let i = 0; i < p.count; i += 3) {
      for (const attr of [p, n, u]) {
        if (!attr) continue
        for (let k = 0; k < attr.itemSize; k++) {
          const t = attr.getComponent(i + 1, k)
          attr.setComponent(i + 1, k, attr.getComponent(i + 2, k))
          attr.setComponent(i + 2, k, t)
        }
      }
    }
  }
  c.computeVertexNormals()
  return c
}

export const V = (x: number, y: number, z: number) => new Vector3(x, y, z)

/**
 * Replaces UVs with a planar projection normalised to the part's bounds, so a
 * printed pattern covers flat products (mats, phone backs, plates) evenly.
 * axis = the direction the printed face looks along.
 */
export function planarUV(g: BufferGeometry, axis: 'x' | 'y' | 'z'): BufferGeometry {
  g.computeBoundingBox()
  const b = g.boundingBox!
  const p = g.getAttribute('position')
  const uv = new Float32Array(p.count * 2)
  const sx = b.max.x - b.min.x || 1
  const sy = b.max.y - b.min.y || 1
  const sz = b.max.z - b.min.z || 1
  for (let i = 0; i < p.count; i++) {
    const x = (p.getX(i) - b.min.x) / sx
    const y = (p.getY(i) - b.min.y) / sy
    const z = (p.getZ(i) - b.min.z) / sz
    const [u, v] = axis === 'y' ? [x, 1 - z] : axis === 'z' ? [x, y] : [1 - z, y]
    uv[i * 2] = u
    uv[i * 2 + 1] = v
  }
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  return g
}

/**
 * Flat double-sided ribbon along a curve. u runs across the width (0…1),
 * v along the length (0…1) – ideal for repeated strap prints.
 */
export function createRibbon(curve: Curve<Vector3>, width: number, up: Vector3, segments = 200): BufferGeometry {
  return gridGeometry(
    (a, t) => {
      const c = curve.getPointAt(t)
      const T = curve.getTangentAt(t)
      const side = new Vector3().crossVectors(T, up).normalize()
      return c.addScaledVector(side, (a - 0.5) * width)
    },
    2,
    segments,
  )
}

/** Small disc/cylinder oriented along a normal (buttons, rivets, lenses). */
export function orientedCylinder(pos: Vector3, normal: Vector3, r: number, h: number, seg = 24): BufferGeometry {
  const g = lathe(
    [
      [0, -h / 2],
      [r, -h / 2],
      [r, h * 0.3],
      [r * 0.85, h / 2],
      [0, h / 2],
    ],
    seg,
  )
  const q = new Matrix4().lookAt(normal.clone().normalize(), new Vector3(), Math.abs(normal.y) > 0.95 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0))
  g.rotateX(Math.PI / 2)
  g.applyMatrix4(q)
  g.translate(pos.x, pos.y, pos.z)
  return g
}
