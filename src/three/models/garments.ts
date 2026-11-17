/**
 * Procedural clothing models (original work, no external assets).
 * Bodies are super-elliptical ring lofts with fabric folds; sleeves and legs are
 * swept tubes; pockets, collars, zips and trims are patches that lie exactly on
 * the garment surface. Shown ghost-mannequin style, like product photography.
 */
import { SphereGeometry, Vector3 } from 'three'
import {
  bump,
  clamp,
  createBody,
  createTube,
  foldNoise,
  gridGeometry,
  lerp,
  merge,
  mirrorX,
  orientedCylinder,
  smooth,
  surfacePatch,
  transform,
  V,
  type Ring,
  type Surface,
  type TubeSurface,
} from '../engine/geometry'
import type { Finish, Part, PlanarZone, ProductModel, Zone } from '../engine/types'
import { decodeOffsets, drapedSurface } from '../engine/drapeData'
import { BAKED } from './baked'

const TAU = Math.PI * 2

/** Piecewise smooth interpolation of [t, ...values] stops */
function stops(list: [number, number, number][]) {
  return (t: number): [number, number] => {
    if (t <= list[0][0]) return [list[0][1], list[0][2]]
    for (let i = 0; i < list.length - 1; i++) {
      const a = list[i]
      const b = list[i + 1]
      if (t <= b[0]) {
        const k = smooth(a[0], b[0], t)
        return [lerp(a[1], b[1], k), lerp(a[2], b[2], k)]
      }
    }
    const l = list[list.length - 1]
    return [l[1], l[2]]
  }
}

export type TopKind = 'jersey' | 'tee' | 'hoodie' | 'zip-hoodie' | 'sweatshirt' | 'polo' | 'jacket'

export function torsoRings(loose: boolean): Ring[] {
  const W = loose ? 0.5 : 0.46
  const D = loose ? 0.28 : 0.255
  return [
    { y: -0.78, w: W * (loose ? 0.93 : 1.0), d: D * (loose ? 0.9 : 0.98), n: 2.6 },
    { y: -0.68, w: W * (loose ? 0.985 : 1.0), d: D * 0.99, n: 2.6 },
    { y: -0.3, w: W * 0.985, d: D, n: 2.8 },
    { y: 0.1, w: W, d: D * 1.02, n: 2.8 },
    { y: 0.36, w: W * 1.01, d: D * 0.97, n: 2.7 },
    { y: 0.48, w: W * 0.98, d: D * 0.86, n: 2.8 },
    { y: 0.54, w: W * 0.86, d: D * 0.72, n: 2.6 },
    { y: 0.585, w: W * 0.6, d: D * 0.6, n: 2.3 },
    { y: 0.615, w: 0.205, d: 0.145, n: 2.1 },
    { y: 0.633, w: 0.165, d: 0.125, n: 2 },
  ]
}

/** Surface v parameter for a model-space height (rings are spaced unevenly). */
export function vAtY(rings: Ring[], y: number) {
  for (let i = 0; i < rings.length - 1; i++) {
    if (y <= rings[i + 1].y) return (i + clamp((y - rings[i].y) / (rings[i + 1].y - rings[i].y), 0, 1)) / (rings.length - 1)
  }
  return 1
}

function neckDeform(kind: TopKind) {
  return (p: Vector3, u: number, v: number) => {
    const front = Math.max(0, Math.cos(TAU * (u - 0.5)))
    if (kind === 'jersey') {
      const vshape = Math.max(0, 1 - Math.abs(u - 0.5) / 0.1)
      p.y -= 0.15 * smooth(0.55, 1, v) * Math.pow(vshape, 1.4)
      p.y -= 0.03 * smooth(0.8, 1, v) * front * front
    } else if (kind === 'jacket') {
      // no dip – stand collar
    } else {
      const dip = kind === 'polo' ? 0.035 : kind === 'hoodie' || kind === 'zip-hoodie' ? 0.05 : 0.065
      p.y -= dip * smooth(0.78, 1, v) * front * front
    }
  }
}

/** Fabric crease profile: soft ridges with sharp valleys, like real cloth. */
const crease = (x: number) => Math.pow(Math.abs(Math.sin(x)), 0.55) - 0.62

function bodyFolds(loose: boolean) {
  return (u: number, v: number) => {
    // large, gentle undulation of the panels
    let f = 0.0035 * foldNoise(u, v * 1.6, 3)
    // drape folds falling from under the arms on both sides, front and back
    for (const c of [0.2, 0.3, 0.7, 0.8]) {
      const w = bump(u, c, 0.035)
      f += 0.007 * w * crease((u - c) * 90 + v * 6) * smooth(0.65, 0.15, v)
    }
    // shallow diagonal tension folds from the shoulders
    f += 0.003 * crease(u * 40 + v * 18) * bump(v, 0.68, 0.06)
    if (loose) {
      // fabric blousing over the ribbed waistband
      f += 0.012 * bump(v, 0.11, 0.035) * crease(u * Math.PI * 2 * 7 + Math.sin(u * 40) * 0.6)
      f += 0.006 * bump(v, 0.18, 0.05) * crease(u * Math.PI * 2 * 5 + 1.7)
    } else {
      f += 0.004 * bump(v, 0.06, 0.05) * crease(u * Math.PI * 2 * 9)
    }
    return f
  }
}

/** Sleeve centre-line and radius profile (shared with the cloth simulation's arm forms). */
export function sleeveSpec(long: boolean, loose: boolean) {
  const s = loose ? 1.06 : 1
  if (!long) {
    return {
      points: [V(0.26, 0.44, 0), V(0.42 * s, 0.43, 0), V(0.54 * s, 0.32, 0.005), V(0.65 * s, 0.19, 0.012)],
      radius: stops([
        [0, 0.15 * s, 0.2 * s],
        [0.35, 0.14 * s, 0.17 * s],
        [1, 0.115 * s, 0.135 * s],
      ]),
    }
  }
  return {
    points: [V(0.26, 0.44, 0), V(0.44 * s, 0.42, 0), V(0.585 * s, 0.22, 0.02), V(0.665 * s, -0.08, 0.05), V(0.71 * s, -0.4, 0.08)],
    radius: stops([
      [0, 0.16 * s, 0.21 * s],
      [0.22, 0.15 * s, 0.17 * s],
      [0.55, 0.122 * s, 0.132 * s],
      [1, 0.088 * s, 0.094 * s],
    ]),
  }
}

export const SIM_RES = { bodyU: 144, bodyV: 100, sleeveA: 48, sleeveShort: 44, sleeveLong: 88 }

/** Base sleeve. When `forSim` the hand-made folds are replaced by a tiny symmetry-breaking ripple – the cloth sim makes the real folds. */
export function sleeveTube(long: boolean, loose: boolean, forSim = false): TubeSurface {
  const spec = sleeveSpec(long, loose)
  if (forSim) {
    return createTube(spec.points, spec.radius, {
      up: V(0, 0, 1),
      radial: SIM_RES.sleeveA,
      segments: long ? SIM_RES.sleeveLong : SIM_RES.sleeveShort,
      folds: (a, t) => 0.0015 * foldNoise(a, t * 4, 9),
    })
  }
  if (!long) {
    return createTube(spec.points, spec.radius, {
      up: V(0, 0, 1),
      radial: 56,
      segments: 48,
      folds: (a, t) => 0.0045 * crease(a * TAU * 2 + t * 7) * smooth(0.25, 0.95, t) + 0.0025 * foldNoise(a, t * 3, 9),
    })
  }
  return createTube(spec.points, spec.radius, {
    up: V(0, 0, 1),
    radial: 56,
    segments: 96,
    folds: (a, t) =>
      0.008 * crease(a * TAU * 1.5 + t * 30) * bump(t, 0.55, 0.1) + // elbow creases
      0.006 * crease(a * TAU * 1.5 - t * 34) * bump(t, 0.5, 0.08) +
      0.01 * crease(a * TAU * 2 + t * 52 + Math.sin(a * TAU) * 1.5) * smooth(0.78, 0.9, t) * (1 - smooth(0.92, 0.985, t)) + // stacking above the cuff
      0.0025 * foldNoise(a, t * 4, 5),
  })
}

/** Base torso for the cloth simulation (same shape as the app builds before draping). */
export function simBody(kind: TopKind) {
  const loose = kind === 'hoodie' || kind === 'zip-hoodie' || kind === 'sweatshirt' || kind === 'jacket'
  return createBody(torsoRings(loose), {
    deform: neckDeform(kind),
    folds: (u, v) => 0.0015 * foldNoise(u, v * 2, 3),
    segU: SIM_RES.bodyU,
    segV: SIM_RES.bodyV,
  })
}

export function cuffTube(loose: boolean) {
  const s = loose ? 1.06 : 1
  return createTube([V(0.705 * s, -0.37, 0.078), V(0.72 * s, -0.52, 0.09)], (t) => [lerp(0.095, 0.08, t) * s, lerp(0.1, 0.084, t) * s], {
    up: V(0, 0, 1),
    radial: 32,
    segments: 6,
    capEnd: false,
  })
}

function edgeTube(body: Surface, off: number, radius: number | [number, number], u0 = 0, u1 = 1, closed = true) {
  const pts: Vector3[] = []
  const n = 64
  for (let i = 0; i < (closed ? n : n + 1); i++) pts.push(body.point(lerp(u0, u1, i / n), 1, off))
  return createTube(pts, typeof radius === 'number' ? radius : () => radius, { closed, radial: 16, segments: 96, up: undefined }).geometry
}

/** Rolled/turned edge so openings have real fabric thickness instead of a paper edge. */
function rollEdge(surf: Pick<Surface, 'point'>, v: number, off: number, radius: number, segs = 96) {
  const pts: Vector3[] = []
  for (let i = 0; i < segs; i++) pts.push(surf.point(i / segs, v, off))
  return createTube(pts, radius, { closed: true, radial: 10, segments: segs * 2 }).geometry
}

/** A seam/stitch line following a curve on a surface. */
function seamLine(surf: Pick<Surface, 'point'>, path: (t: number) => [number, number], off: number, radius = 0.0016, n = 60) {
  const pts: Vector3[] = []
  for (let i = 0; i <= n; i++) {
    const [u, v] = path(i / n)
    pts.push(surf.point(u, v, off))
  }
  return createTube(pts, radius, { radial: 6, segments: n * 2 }).geometry
}

function mirrored(g: ReturnType<typeof merge>) {
  return merge([g.clone(), mirrorX(g)])
}

/* ------------------------------------------------------------------ */
/* Zones                                                               */
/* ------------------------------------------------------------------ */

const z = {
  leftChest: (y = 0.27): PlanarZone => ({
    id: 'left-chest',
    label: 'Left chest',
    kind: 'planar',
    target: 'body',
    origin: [0.2, y, 0.3],
    normal: [0, 0, 1],
    up: [0, 1, 0],
    rangeX: 0.1,
    rangeY: 0.12,
    size: 0.17,
    maxSize: 0.3,
    depth: 0.16,
  }),
  rightChest: (y = 0.27): PlanarZone => ({
    id: 'right-chest',
    label: 'Right chest',
    kind: 'planar',
    target: 'body',
    origin: [-0.2, y, 0.3],
    normal: [0, 0, 1],
    up: [0, 1, 0],
    rangeX: 0.1,
    rangeY: 0.12,
    size: 0.17,
    maxSize: 0.3,
    depth: 0.16,
  }),
  centre: (id: string, label: string, y: number, size: number, rangeY = 0.28): PlanarZone => ({
    id,
    label,
    kind: 'planar',
    target: 'body',
    origin: [0, y, 0.3],
    normal: [0, 0, 1],
    up: [0, 1, 0],
    rangeX: 0.22,
    rangeY,
    size,
    maxSize: 0.72,
    depth: 0.2,
  }),
  back: (y = 0.2): PlanarZone => ({
    id: 'back',
    label: 'Back',
    kind: 'planar',
    target: 'body',
    origin: [0, y, -0.3],
    normal: [0, 0, -1],
    up: [0, 1, 0],
    rangeX: 0.22,
    rangeY: 0.32,
    size: 0.46,
    maxSize: 0.76,
    depth: 0.2,
  }),
  sleeve: (side: 'left' | 'right', long: boolean, loose: boolean): PlanarZone => {
    const sx = side === 'left' ? 1 : -1
    const s = loose ? 1.06 : 1
    return long
      ? {
          id: `${side}-sleeve`,
          label: side === 'left' ? 'Left sleeve' : 'Right sleeve',
          kind: 'planar',
          target: 'sleeves',
          origin: [sx * 0.6 * s, 0.16, 0.03],
          normal: [sx, 0.22, 0.12],
          up: [0, 1, 0],
          rangeX: 0.04,
          rangeY: 0.18,
          size: 0.12,
          maxSize: 0.2,
          depth: 0.1,
        }
      : {
          id: `${side}-sleeve`,
          label: side === 'left' ? 'Left sleeve' : 'Right sleeve',
          kind: 'planar',
          target: 'sleeves',
          origin: [sx * 0.55 * s, 0.31, 0.01],
          normal: [sx, 0.45, 0.08],
          up: [-sx * 0.3, 1, 0],
          rangeX: 0.04,
          rangeY: 0.05,
          size: 0.12,
          maxSize: 0.19,
          depth: 0.1,
        }
  },
}

/* ------------------------------------------------------------------ */
/* Tops                                                                */
/* ------------------------------------------------------------------ */

function buildTop(kind: TopKind): ProductModel {
  const loose = kind === 'hoodie' || kind === 'zip-hoodie' || kind === 'sweatshirt' || kind === 'jacket'
  const long = loose
  const fabric: Finish =
    kind === 'jersey' ? 'knit' : kind === 'polo' ? 'pique' : kind === 'jacket' ? 'tricot' : kind === 'tee' ? 'cotton' : 'fleece'

  const rings = torsoRings(loose)
  const vy = (y: number) => vAtY(rings, y)
  // Cloth-simulated drape when baked data exists (scripts/bake-cloth.ts), else the procedural shape
  const baked = BAKED[kind]
  let body: Surface
  let sleeve: Pick<Surface, 'point' | 'geometry' | 'normal'>
  if (baked) {
    const baseBody = simBody(kind)
    const baseSleeve = sleeveTube(long, loose, true)
    const bp = decodeOffsets(baked.body, Float32Array.from(baseBody.geometry.getAttribute('position').array as ArrayLike<number>))
    const sp = decodeOffsets(baked.sleeve, Float32Array.from(baseSleeve.geometry.getAttribute('position').array as ArrayLike<number>))
    baseBody.geometry.dispose()
    baseSleeve.geometry.dispose()
    body = drapedSurface(bp, SIM_RES.bodyU, SIM_RES.bodyV, true)
    sleeve = drapedSurface(sp, SIM_RES.sleeveA, long ? SIM_RES.sleeveLong : SIM_RES.sleeveShort, true)
  } else {
    body = createBody(rings, { deform: neckDeform(kind), folds: bodyFolds(loose), segU: 168, segV: 110 })
    sleeve = sleeveTube(long, loose)
  }
  const parts: Part[] = []
  const zones: Zone[] = []
  parts.push({ key: 'body', geometry: body.geometry, finish: fabric, slot: 'primary', doubleSide: true, pattern: 'body' })
  parts.push({ key: 'sleeves', geometry: mirrored(sleeve.geometry), finish: fabric, slot: 'primary', doubleSide: true, pattern: 'sleeve' })

  // Cuffs / sleeve hems
  if (long) {
    const cuffSlot = kind === 'jacket' ? 'trim' : 'secondary'
    parts.push({ key: 'cuffs', geometry: mirrored(cuffTube(loose).geometry), finish: 'rib', slot: cuffSlot, doubleSide: true })
    parts.push({
      key: 'waistband',
      geometry: surfacePatch(body, { u0: 0, u1: 1, v0: 0, v1: vy(-0.7), off: 0.006, segU: 168, segV: 6 }),
      finish: 'rib',
      slot: cuffSlot,
      doubleSide: true,
    })
  } else {
    const hem = surfacePatch(sleeve, { u0: 0, u1: 1, v0: 0.9, v1: 1, off: 0.003, segU: 40, segV: 4 })
    parts.push({
      key: 'sleeve-hems',
      geometry: mirrored(hem),
      finish: kind === 'polo' ? 'rib' : fabric,
      slot: kind === 'jersey' ? 'trim' : 'secondary',
      doubleSide: true,
    })
  }

  // Necklines
  if (kind === 'jersey') {
    parts.push({ key: 'collar', geometry: edgeTube(body, 0.004, [0.016, 0.022]), finish: 'rib', slot: 'trim' })
    // side piping
    const piping = [0.235, 0.765].map((u) =>
      surfacePatch(body, { u0: u - 0.006, u1: u + 0.006, v0: vy(-0.77), v1: vy(0.44), off: 0.004, segU: 2, segV: 40 }),
    )
    parts.push({ key: 'piping', geometry: merge(piping), finish: 'knit', slot: 'trim' })
  } else if (kind === 'tee' || kind === 'sweatshirt') {
    parts.push({
      key: 'collar',
      geometry: merge([
        surfacePatch(body, { u0: 0, u1: 1, v0: 0.955, v1: 1, off: 0.004, segU: 112, segV: 4 }),
        edgeTube(body, 0.006, 0.018),
      ]),
      finish: 'rib',
      slot: 'secondary',
      doubleSide: true,
    })
  } else if (kind === 'polo') {
    // fold-down collar following the neckline, with points at the front
    const collar = gridGeometry(
      (a, b) => {
        const u = lerp(0.512, 1.488, a)
        const front = Math.max(0, Math.cos(TAU * (u - 0.5)))
        const depth = 0.11 + 0.1 * Math.pow(front, 6)
        const v = 1 - depth * (1 - b)
        return body.point(u, v, 0.012 + (1 - b) * 0.006)
      },
      96,
      8,
    )
    const band = edgeTube(body, 0.008, [0.012, 0.018])
    parts.push({ key: 'collar', geometry: merge([collar, band]), finish: 'rib', slot: 'secondary', doubleSide: true })
    parts.push({
      key: 'placket',
      geometry: surfacePatch(body, { u0: 0.486, u1: 0.514, v0: vy(0.43), v1: 0.985, off: 0.006, segU: 4, segV: 10 }),
      finish: 'pique',
      slot: 'primary',
      shade: 0.94,
    })
    const buttons = [vy(0.47), vy(0.52), vy(0.57)].map((v) => orientedCylinder(body.point(0.5, v, 0.011), body.normal(0.5, v), 0.011, 0.006))
    parts.push({ key: 'buttons', geometry: merge(buttons), finish: 'gloss', slot: 'accent' })
  } else if (kind === 'jacket') {
    // stand-up collar with a gap at the zip
    const collar = gridGeometry(
      (a, b) => {
        const u = lerp(0.507, 1.493, a)
        const p = body.point(u, 1, 0.004)
        const n = body.normal(u, 1)
        n.y = 0
        n.normalize()
        return p.addScaledVector(n, -0.012 * b).add(V(0, b * 0.1, 0))
      },
      96,
      6,
    )
    parts.push({ key: 'collar', geometry: collar, finish: 'rib', slot: 'trim', doubleSide: true })
  }

  // Hoods
  if (kind === 'hoodie' || kind === 'zip-hoodie') {
    const hood = new SphereGeometry(1, 56, 32, Math.PI / 2 + 0.5, TAU - 1.0, 0, Math.PI * 0.64)
    transform(hood, { scale: [0.235, 0.29, 0.27] })
    hood.rotateX(-0.42)
    hood.translate(0, 0.72, -0.1)
    // soften: let the hood drape onto the shoulders
    const p = hood.getAttribute('position')
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i)
      const zz = p.getZ(i)
      const k = smooth(0.75, 0.55, y)
      p.setX(i, p.getX(i) * (1 + 0.35 * k))
      p.setZ(i, zz - 0.04 * k)
      // add soft folds
      p.setX(i, p.getX(i) + 0.006 * Math.sin(y * 40 + zz * 20))
    }
    hood.computeVertexNormals()
    parts.push({ key: 'hood', geometry: hood, finish: 'fleece', slot: 'primary', pattern: 'wrap', patternFront: 0 })
    parts.push({ key: 'hood-lining', geometry: hood.clone(), finish: 'cotton', slot: 'accent', backSide: true })
    // drawcords
    const cords = [0.468, 0.532].map((u) => {
      const s = u < 0.5 ? -1 : 1
      return createTube(
        [body.point(u, 0.985, 0.022), body.point(u - s * 0.004, 0.86, 0.026), body.point(u - s * 0.006, 0.72, 0.03), body.point(u - s * 0.007, 0.6, 0.034)],
        0.0085,
        { radial: 10, segments: 24, capEnd: true },
      ).geometry
    })
    const aglets = [0.461, 0.539].map((u) => {
      const p0 = body.point(u, 0.6, 0.034)
      return createTube([p0.clone().add(V(0, 0.01, 0)), p0.clone().add(V(0, -0.045, 0.002))], 0.0105, { radial: 10, segments: 2, capEnd: true, capStart: true }).geometry
    })
    parts.push({ key: 'drawcords', geometry: merge(cords), finish: 'cotton', slot: 'accent' })
    parts.push({ key: 'aglets', geometry: merge(aglets), finish: 'metal', color: '#c0c4cc' })
  }

  // Pockets
  if (kind === 'hoodie') {
    const pv0 = vy(-0.69)
    const pv1 = vy(-0.2)
    const u0 = (v: number) => lerp(0.36, 0.4, clamp((v - pv0) / (pv1 - pv0), 0, 1))
    parts.push({
      key: 'pocket',
      geometry: surfacePatch(body, { u0, u1: (v) => 1 - u0(v), v0: pv0, v1: pv1, off: 0.009, segU: 40, segV: 16 }),
      finish: 'fleece',
      slot: 'primary',
      shade: 0.96,
      pattern: 'flat',
    })
    // pocket edge thickness and the slanted hand openings
    const edgePts: Vector3[] = []
    const vs = [pv0, pv1]
    for (let i = 0; i <= 20; i++) edgePts.push(body.point(lerp(u0(vs[0]), 1 - u0(vs[0]), i / 20), vs[0], 0.009))
    for (let i = 0; i <= 20; i++) edgePts.push(body.point(1 - u0(lerp(vs[0], vs[1], i / 20)), lerp(vs[0], vs[1], i / 20), 0.009))
    for (let i = 0; i <= 20; i++) edgePts.push(body.point(lerp(1 - u0(vs[1]), u0(vs[1]), i / 20), vs[1], 0.009))
    for (let i = 0; i <= 20; i++) edgePts.push(body.point(u0(lerp(vs[1], vs[0], i / 20)), lerp(vs[1], vs[0], i / 20), 0.009))
    parts.push({ key: 'pocket-edge', geometry: createTube(edgePts, 0.0042, { closed: true, radial: 8, segments: 240 }).geometry, finish: 'fleece', slot: 'primary', shade: 0.93 })
  }
  if (kind === 'zip-hoodie') {
    const zv0 = vy(-0.69)
    const zv1 = vy(-0.2)
    const pk = [
      { a: 0.35, b: 0.488 },
      { a: 0.512, b: 0.65 },
    ].map(({ a, b }) =>
      surfacePatch(body, {
        u0: (v) => (a < 0.5 ? lerp(a, a + 0.05, clamp((v - zv0) / (zv1 - zv0), 0, 1)) : a),
        u1: (v) => (a < 0.5 ? b : lerp(b, b - 0.05, clamp((v - zv0) / (zv1 - zv0), 0, 1))),
        v0: zv0,
        v1: zv1,
        off: 0.009,
        segU: 20,
        segV: 16,
      }),
    )
    parts.push({ key: 'pocket', geometry: merge(pk), finish: 'fleece', slot: 'primary', shade: 0.96, pattern: 'flat' })
  }

  // Zips
  if (kind === 'zip-hoodie' || kind === 'jacket') {
    const v1 = 1
    const zip = surfacePatch(body, { u0: 0.4978, u1: 0.5022, v0: vy(-0.7), v1, off: 0.01, segU: 2, segV: 60 })
    const parts2 = [zip]
    if (kind === 'jacket') {
      parts2.push(
        gridGeometry(
          (a, b) => {
            const p = body.point(lerp(0.4978, 0.5022, a), 1, 0.01)
            return p.add(V(0, b * 0.095, -0.004 * b))
          },
          2,
          4,
        ),
      )
    }
    parts.push({ key: 'zip', geometry: merge(parts2), finish: 'metal', color: '#4a4e55' })
    // zip tape seams either side of the coil
    const tape = [0.4955, 0.5045].map((u) => seamLine(body, (t) => [u, lerp(vy(-0.7), 0.995, t)], 0.0095, 0.0016, 80))
    parts.push({ key: 'zip-tape', geometry: merge(tape), finish: 'cotton', slot: 'primary', shade: 0.85 })
    const pullV = kind === 'jacket' ? 0.97 : 0.93
    const pull = createTube([body.point(0.5, pullV, 0.018), body.point(0.5, pullV - 0.07, 0.022)], () => [0.006, 0.014], {
      radial: 8,
      segments: 2,
      capStart: true,
      capEnd: true,
    }).geometry
    parts.push({ key: 'zip-pull', geometry: pull, finish: 'chrome', color: '#d4d7dd' })
  }

  // Tracksuit sleeve stripes
  if (kind === 'jacket') {
    const stripe = (a0: number, a1: number) => surfacePatch(sleeve, { u0: a0, u1: a1, v0: 0.12, v1: 0.98, off: 0.003, segU: 4, segV: 60 })
    const g = merge([stripe(0.715, 0.735), stripe(0.75, 0.77), stripe(0.785, 0.805)])
    parts.push({ key: 'stripes', geometry: mirrored(g), finish: 'tricot', slot: 'secondary', doubleSide: true })
  }

  // Construction: rolled hems, sleeve seams and double-needle stitching.
  // Each edge takes the colour of the panel it belongs to.
  const mainEdges: ReturnType<typeof merge>[] = []
  const trimEdges: ReturnType<typeof merge>[] = []
  const stitchOff = 0.0016
  mainEdges.push(mirrored(rollEdge(sleeve, long ? 0.075 : 0.13, 0.001, 0.0022, 48)))
  if (long) {
    trimEdges.push(rollEdge(body, vy(-0.7), 0.006, 0.0045, 140))
    trimEdges.push(rollEdge(body, 0, 0.006, 0.006, 140))
    const cuff = cuffTube(loose)
    trimEdges.push(mirrored(rollEdge(cuff, 1, 0, 0.007, 40)))
    trimEdges.push(mirrored(rollEdge(cuff, 0, 0, 0.0045, 40)))
  } else {
    mainEdges.push(rollEdge(body, 0, 0.002, 0.006, 140))
    mainEdges.push(rollEdge(body, vy(-0.755), stitchOff, 0.0012, 140))
    mainEdges.push(rollEdge(body, vy(-0.745), stitchOff, 0.0012, 140))
    trimEdges.push(mirrored(rollEdge(sleeve, 1, 0.003, 0.0055, 48)))
    trimEdges.push(mirrored(rollEdge(sleeve, 0.9, 0.004, 0.0013, 48)))
  }
  const edgeFinish: Finish = fabric === 'tricot' ? 'tricot' : 'cotton'
  parts.push({ key: 'construction', geometry: merge(mainEdges), finish: edgeFinish, slot: 'primary', shade: 0.92 })
  const trimSlot = long ? (kind === 'jacket' ? 'trim' : 'secondary') : kind === 'jersey' ? 'trim' : 'secondary'
  parts.push({ key: 'construction-trim', geometry: merge(trimEdges), finish: long ? 'rib' : edgeFinish, slot: trimSlot, shade: 0.92 })

  // Zones
  switch (kind) {
    case 'jersey':
      zones.push(
        { ...z.leftChest(0.24), id: 'front-chest', label: 'Front chest' },
        z.centre('centre-front', 'Centre front', 0.02, 0.4, 0.3),
        z.back(0.22),
        z.sleeve('left', false, false),
        z.sleeve('right', false, false),
      )
      break
    case 'tee':
      zones.push(z.centre('centre-front', 'Centre front', 0.12, 0.42), z.leftChest(), z.back(), z.sleeve('left', false, false), z.sleeve('right', false, false))
      break
    case 'polo':
      zones.push(z.leftChest(0.25), z.rightChest(0.25), z.back(0.25), z.sleeve('left', false, false), z.sleeve('right', false, false))
      break
    case 'hoodie':
      zones.push(z.leftChest(0.3), z.centre('centre-chest', 'Centre chest', 0.22, 0.36, 0.14), z.back(0.18), z.sleeve('left', true, true), z.sleeve('right', true, true))
      break
    case 'zip-hoodie':
      zones.push(z.leftChest(0.3), z.rightChest(0.3), z.back(0.18), z.sleeve('left', true, true), z.sleeve('right', true, true))
      break
    case 'sweatshirt':
      zones.push(z.centre('centre-chest', 'Centre chest', 0.15, 0.42), z.leftChest(0.3), z.back(0.18), z.sleeve('left', true, true), z.sleeve('right', true, true))
      break
    case 'jacket':
      zones.push(z.leftChest(0.3), z.rightChest(0.3), z.back(0.2), z.sleeve('left', true, true), z.sleeve('right', true, true))
      break
  }
  return { parts, zones }
}

export const buildJersey = () => buildTop('jersey')
export const buildTee = () => buildTop('tee')
export const buildHoodie = () => buildTop('hoodie')
export const buildZipHoodie = () => buildTop('zip-hoodie')
export const buildSweatshirt = () => buildTop('sweatshirt')
export const buildPolo = () => buildTop('polo')
export const buildJacket = () => buildTop('jacket')

/* ------------------------------------------------------------------ */
/* Joggers                                                             */
/* ------------------------------------------------------------------ */

export function buildJoggers(): ProductModel {
  const hips = createBody(
    [
      { y: 0.1, w: 0.28, d: 0.07, n: 2.2 },
      { y: 0.24, w: 0.37, d: 0.2, n: 2.4 },
      { y: 0.38, w: 0.365, d: 0.21, n: 2.3 },
      { y: 0.47, w: 0.352, d: 0.2, n: 2.2 },
      { y: 0.52, w: 0.35, d: 0.198, n: 2.2 },
    ],
    {
      folds: (u, v) => 0.004 * foldNoise(u, v * 2, 4) + 0.008 * bump(v, 0.82, 0.04) * Math.sin(u * TAU * 18),
      deform: (p, u, v) => {
        // slightly lower at the front of the waist
        p.y -= 0.02 * smooth(0.7, 1, v) * Math.max(0, Math.cos(TAU * (u - 0.5)))
      },
    },
  )
  const leg = createTube(
    [V(0.185, 0.46, 0), V(0.2, 0.1, 0.005), V(0.205, -0.35, 0.02), V(0.19, -0.75, 0.02), V(0.175, -1.0, 0.025)],
    stops([
      [0, 0.19, 0.205],
      [0.2, 0.195, 0.205],
      [0.55, 0.145, 0.15],
      [1, 0.085, 0.09],
    ]),
    {
      up: V(1, 0, 0),
      radial: 40,
      segments: 72,
      folds: (a, t) =>
        0.006 * Math.sin(a * TAU * 3 + t * 30) * bump(t, 0.5, 0.08) + 0.009 * Math.sin(a * TAU * 3 + t * 50) * smooth(0.82, 1, t) + 0.003 * foldNoise(a, t * 4, 2),
    },
  )
  const cuff = createTube([V(0.177, -0.98, 0.025), V(0.172, -1.09, 0.027)], () => [0.086, 0.09], { up: V(1, 0, 0), radial: 32, segments: 4 })
  const parts: Part[] = [
    { key: 'hips', geometry: hips.geometry, finish: 'fleece', slot: 'primary', doubleSide: true, pattern: 'body' },
    { key: 'legs', geometry: mirrored(leg.geometry), finish: 'fleece', slot: 'primary', doubleSide: true, pattern: 'sleeve' },
    { key: 'cuffs', geometry: mirrored(cuff.geometry), finish: 'rib', slot: 'secondary', doubleSide: true },
    {
      key: 'waistband',
      geometry: surfacePatch(hips, { u0: 0, u1: 1, v0: 0.86, v1: 1, off: 0.007, segU: 112, segV: 6 }),
      finish: 'rib',
      slot: 'secondary',
      doubleSide: true,
    },
  ]
  // side stripe down each leg
  const stripe = surfacePatch(leg, { u0: 0.485, u1: 0.515, v0: 0.02, v1: 0.97, off: 0.003, segU: 2, segV: 60 })
  parts.push({ key: 'stripes', geometry: mirrored(stripe), finish: 'fleece', slot: 'accent', doubleSide: true })
  // drawcord
  const cords = [0.485, 0.515].map((u) =>
    createTube([hips.point(u, 0.9, 0.012), hips.point(u + (u - 0.5) * 0.3, 0.7, 0.02), hips.point(u + (u - 0.5) * 0.4, 0.52, 0.024)], 0.008, {
      radial: 8,
      segments: 16,
      capEnd: true,
    }).geometry,
  )
  parts.push({ key: 'drawcords', geometry: merge(cords), finish: 'cotton', slot: 'accent' })

  const zones: Zone[] = [
    {
      id: 'left-thigh',
      label: 'Left thigh',
      kind: 'planar',
      target: 'legs',
      origin: [0.22, 0.0, 0.2],
      normal: [0.25, 0, 1],
      up: [0, 1, 0],
      rangeX: 0.05,
      rangeY: 0.2,
      size: 0.15,
      maxSize: 0.24,
      depth: 0.14,
    },
    {
      id: 'right-thigh',
      label: 'Right thigh',
      kind: 'planar',
      target: 'legs',
      origin: [-0.22, 0.0, 0.2],
      normal: [-0.25, 0, 1],
      up: [0, 1, 0],
      rangeX: 0.05,
      rangeY: 0.2,
      size: 0.15,
      maxSize: 0.24,
      depth: 0.14,
    },
    {
      id: 'left-hip',
      label: 'Left hip',
      kind: 'planar',
      target: 'hips',
      origin: [0.37, 0.3, 0],
      normal: [1, 0, 0],
      up: [0, 1, 0],
      rangeX: 0.06,
      rangeY: 0.06,
      size: 0.12,
      maxSize: 0.2,
      depth: 0.1,
    },
    {
      id: 'back-pocket',
      label: 'Back (right)',
      kind: 'planar',
      target: 'hips',
      origin: [-0.17, 0.3, -0.22],
      normal: [0, 0, -1],
      up: [0, 1, 0],
      rangeX: 0.08,
      rangeY: 0.1,
      size: 0.12,
      maxSize: 0.2,
      depth: 0.12,
    },
  ]
  return { parts, zones }
}
