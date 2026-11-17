/** Procedural everyday merchandise (original work, no external assets). */
import { CatmullRomCurve3, TorusGeometry } from 'three'
import {
  createRibbon,
  createTube,
  extrude,
  gridGeometry,
  lathe,
  merge,
  mirrorX,
  orientedCylinder,
  pillow,
  planarUV,
  roundedBox,
  roundedRectShape,
  smooth,
  transform,
  V,
} from '../engine/geometry'
import type { Part, PlanarZone, ProductModel, Zone } from '../engine/types'

const front = (target: string, origin: [number, number, number], size: number, maxSize: number, rangeX: number, rangeY: number, depth: number, id = 'front', label = 'Front'): PlanarZone => ({
  id,
  label,
  kind: 'planar',
  target,
  origin,
  normal: [0, 0, 1],
  up: [0, 1, 0],
  rangeX,
  rangeY,
  size,
  maxSize,
  depth,
})
const back = (z: PlanarZone, id = 'back', label = 'Back'): PlanarZone => ({
  ...z,
  id,
  label,
  origin: [z.origin[0], z.origin[1], -z.origin[2]],
  normal: [0, 0, -1],
})

/* ------------------------------------------------------------------ */

export function buildBottle(): ProductModel {
  const body = lathe(
    [
      [0, 0],
      [0.25, 0],
      [0.266, 0.01],
      [0.272, 0.04],
      [0.272, 0.9],
      [0.264, 0.97],
      [0.235, 1.03],
      [0.19, 1.08],
      [0.172, 1.105],
      [0.17, 1.128],
      [0.0, 1.128],
    ],
    96,
  )
  const ring = lathe(
    [
      [0.171, 1.1],
      [0.178, 1.102],
      [0.178, 1.124],
      [0.171, 1.126],
    ],
    96,
  )
  const cap = lathe(
    [
      [0, 1.126],
      [0.178, 1.126],
      [0.186, 1.14],
      [0.186, 1.27],
      [0.178, 1.3],
      [0.14, 1.312],
      [0, 1.314],
    ],
    96,
  )
  const loop = new TorusGeometry(0.07, 0.017, 14, 40, Math.PI)
  loop.translate(0, 1.3, 0)
  const parts: Part[] = [
    { key: 'body', geometry: body, finish: 'powder', slot: 'primary', pattern: 'wrap', patternFront: 0 },
    { key: 'ring', geometry: ring, finish: 'metal', color: '#b9bec6' },
    { key: 'cap', geometry: merge([cap, loop]), finish: 'plastic', slot: 'secondary' },
  ]
  const zones: Zone[] = [
    { id: 'front', label: 'Front', kind: 'wrap', target: 'body', center: [0, 0], y: 0.52, angle: 0, arc: 1.2, rangeY: 0.28, size: 0.3, maxSize: 0.42, depth: 0.24 },
    { id: 'back', label: 'Reverse side', kind: 'wrap', target: 'body', center: [0, 0], y: 0.52, angle: Math.PI, arc: 1.2, rangeY: 0.28, size: 0.3, maxSize: 0.42, depth: 0.24 },
  ]
  return { parts, zones }
}

/* ------------------------------------------------------------------ */

export function buildMug(): ProductModel {
  const outer = lathe(
    [
      [0, 0.004],
      [0.31, 0.004],
      [0.345, 0.012],
      [0.358, 0.04],
      [0.36, 0.82],
      [0.358, 0.86],
      [0.35, 0.876],
      [0.338, 0.876],
    ],
    128,
  )
  const inner = lathe(
    [
      [0.338, 0.876],
      [0.332, 0.86],
      [0.33, 0.12],
      [0.31, 0.08],
      [0.26, 0.07],
      [0.0, 0.068],
    ],
    128,
  )
  const handle = createTube(
    [V(0.345, 0.69, 0), V(0.49, 0.705, 0), V(0.585, 0.6, 0), V(0.59, 0.36, 0), V(0.5, 0.22, 0), V(0.345, 0.2, 0)],
    () => [0.042, 0.028],
    { up: V(0, 0, 1), radial: 24, segments: 64 },
  ).geometry
  const parts: Part[] = [
    { key: 'outer', geometry: outer, finish: 'ceramic', slot: 'primary', pattern: 'wrap', patternFront: 0 },
    { key: 'inner', geometry: inner, finish: 'ceramic', slot: 'secondary' },
    { key: 'handle', geometry: handle, finish: 'ceramic', slot: 'secondary' },
  ]
  const zones: Zone[] = [
    { id: 'front', label: 'Front', kind: 'wrap', target: 'outer', center: [0, 0], y: 0.44, angle: 0, arc: 0.7, rangeY: 0.16, size: 0.42, maxSize: 0.56, depth: 0.3 },
    { id: 'reverse', label: 'Reverse side', kind: 'wrap', target: 'outer', center: [0, 0], y: 0.44, angle: Math.PI, arc: 0.7, rangeY: 0.16, size: 0.42, maxSize: 0.56, depth: 0.3 },
  ]
  return { parts, zones }
}

/* ------------------------------------------------------------------ */

export function buildBackpack(): ProductModel {
  const body = pillow(0.78, 1.0, 0.34, { radius: 0.15, bulge: 0.2, segments: 10 })
  const bp = body.getAttribute('position')
  for (let i = 0; i < bp.count; i++) {
    const ny = bp.getY(i) / 0.5
    bp.setX(i, bp.getX(i) * (1 - 0.13 * smooth(0.2, 1, ny)))
    bp.setZ(i, bp.getZ(i) * (1 - 0.15 * smooth(0.5, 1, ny)))
  }
  body.computeVertexNormals()
  body.translate(0, 0.56, 0)
  const pocket = pillow(0.58, 0.44, 0.13, { radius: 0.05, bulge: 0.5, segments: 8 })
  pocket.translate(0, 0.34, 0.19)
  const base = pillow(0.8, 0.14, 0.36, { radius: 0.06, bulge: 0.1, segments: 6 })
  base.translate(0, 0.1, 0)
  const strap = createTube([V(0.11, 0.98, -0.15), V(0.19, 0.78, -0.25), V(0.23, 0.45, -0.26), V(0.27, 0.15, -0.19)], () => [0.008, 0.036], {
    up: V(0, 0, 1),
    radial: 12,
    segments: 40,
    capStart: true,
    capEnd: true,
  }).geometry
  const handle = createTube([V(-0.08, 1.02, -0.06), V(-0.05, 1.11, -0.06), V(0.05, 1.11, -0.06), V(0.08, 1.02, -0.06)], () => [0.008, 0.02], {
    up: V(0, 0, 1),
    radial: 10,
    segments: 24,
    capStart: true,
    capEnd: true,
  }).geometry
  const zip1 = createTube([V(-0.27, 0.53, 0.235), V(0, 0.565, 0.27), V(0.27, 0.53, 0.235)], 0.006, { radial: 6, segments: 30 }).geometry
  // main zip arcs over the top of the bag
  const zipPts = []
  for (let i = 0; i <= 24; i++) {
    const a = -Math.PI / 2 + (i / 24) * Math.PI
    zipPts.push(V(Math.sin(a) * 0.33, 0.62 + Math.cos(a) * 0.43, 0.12 + Math.cos(a) * 0.03))
  }
  const zip2 = createTube(zipPts, 0.006, { radial: 6, segments: 60 }).geometry
  const pull = roundedBox(0.025, 0.06, 0.012, 0.005, 2)
  const pulls = [transform(pull.clone(), { position: [0.2, 0.51, 0.26] }), transform(pull, { position: [0.3, 0.84, 0.17], rotation: [0, 0, 0.6] })]
  const parts: Part[] = [
    { key: 'body', geometry: body, finish: 'nylon', slot: 'primary', pattern: 'flat' },
    { key: 'pocket', geometry: pocket, finish: 'nylon', slot: 'secondary' },
    { key: 'base', geometry: base, finish: 'nylon', slot: 'accent' },
    { key: 'straps', geometry: merge([strap.clone(), mirrorX(strap), handle]), finish: 'nylon', slot: 'accent' },
    { key: 'zips', geometry: merge([zip1, zip2]), finish: 'plastic', color: '#14161a' },
    { key: 'pulls', geometry: merge(pulls), finish: 'metal', color: '#a7acb4' },
  ]
  const zones: Zone[] = [
    front('pocket', [0, 0.33, 0.3], 0.26, 0.4, 0.12, 0.08, 0.1, 'pocket', 'Front pocket'),
    { ...front('body', [0, 0.78, 0.25], 0.24, 0.36, 0.1, 0.06, 0.12, 'upper-front', 'Upper front'), normal: [0, 0.15, 1] },
  ]
  return { parts, zones }
}

/* ------------------------------------------------------------------ */

export function buildDrawstringBag(): ProductModel {
  const body = pillow(0.78, 0.96, 0.05, { radius: 0.02, bulge: 1.1, segments: 12 })
  const channel = createTube([V(-0.39, 0.47, 0), V(0, 0.475, 0), V(0.39, 0.47, 0)], () => [0.03, 0.022], { up: V(0, 0, 1), radial: 16, segments: 40, capStart: true, capEnd: true }).geometry
  const cord = createTube([V(-0.2, 0.485, 0.025), V(-0.36, 0.5, 0.03), V(-0.42, 0.25, 0.03), V(-0.415, -0.15, 0.025), V(-0.375, -0.45, 0.0)], 0.009, {
    radial: 8,
    segments: 60,
    capStart: true,
    capEnd: true,
  }).geometry
  const grommet = new TorusGeometry(0.018, 0.006, 8, 20)
  grommet.translate(-0.37, -0.45, 0.012)
  const parts: Part[] = [
    { key: 'body', geometry: body, finish: 'nylon', slot: 'primary', pattern: 'flat' },
    { key: 'channel', geometry: channel, finish: 'nylon', slot: 'primary', shade: 0.92 },
    { key: 'cords', geometry: merge([cord.clone(), mirrorX(cord)]), finish: 'cotton', slot: 'accent' },
    { key: 'grommets', geometry: merge([grommet.clone(), mirrorX(grommet)]), finish: 'metal', color: '#b3b8c0' },
  ]
  const f = front('body', [0, 0.02, 0.1], 0.38, 0.62, 0.15, 0.24, 0.08)
  return { parts, zones: [f, back(f)] }
}

/* ------------------------------------------------------------------ */

export function buildTote(): ProductModel {
  const body = pillow(0.84, 0.84, 0.06, { radius: 0.02, bulge: 0.8, segments: 12 })
  const handle = (z: number) =>
    createTube([V(-0.2, 0.36, z), V(-0.19, 0.62, z), V(-0.1, 0.8, z), V(0.1, 0.8, z), V(0.19, 0.62, z), V(0.2, 0.36, z)], () => [0.004, 0.022], {
      up: V(0, 0, 1),
      radial: 10,
      segments: 60,
      capStart: true,
      capEnd: true,
    }).geometry
  const hem = transform(roundedBox(0.84, 0.05, 0.07, 0.02, 2), { position: [0, 0.4, 0] })
  const parts: Part[] = [
    { key: 'body', geometry: body, finish: 'canvas', slot: 'primary', pattern: 'flat' },
    { key: 'hem', geometry: hem, finish: 'canvas', slot: 'primary', shade: 0.93 },
    { key: 'handles', geometry: merge([handle(0.034), handle(-0.034)]), finish: 'canvas', slot: 'secondary' },
  ]
  const f = front('body', [0, -0.02, 0.1], 0.42, 0.66, 0.16, 0.2, 0.08)
  return { parts, zones: [f, back(f)] }
}

/* ------------------------------------------------------------------ */

export function buildPhoneCase(): ProductModel {
  const W = 0.76
  const H = 1.56
  const shell = extrude(roundedRectShape(W, H, 0.12), 0.1, 0.025, 24)
  const bump = extrude(roundedRectShape(0.32, 0.32, 0.08), 0.02, 0.008, 16)
  bump.translate(-0.17, 0.53, 0.073)
  const lenses = [
    [-0.24, 0.6],
    [-0.1, 0.6],
    [-0.24, 0.46],
  ].map(([x, y]) => orientedCylinder(V(x, y, 0.09), V(0, 0, 1), 0.05, 0.02, 32))
  const flash = orientedCylinder(V(-0.1, 0.46, 0.085), V(0, 0, 1), 0.018, 0.01, 16)
  const screen = extrude(roundedRectShape(W - 0.06, H - 0.06, 0.1), 0.004, 0.002, 24)
  screen.translate(0, 0, -0.072)
  const buttons = [transform(roundedBox(0.03, 0.18, 0.04, 0.01, 2), { position: [W / 2 + 0.018, 0.25, 0] }), transform(roundedBox(0.03, 0.12, 0.04, 0.01, 2), { position: [-W / 2 - 0.018, 0.35, 0] })]
  const parts: Part[] = [
    { key: 'case', geometry: planarUV(merge([shell, ...buttons]), 'z'), finish: 'gloss', slot: 'primary', pattern: 'flat' },
    { key: 'camera', geometry: bump, finish: 'plastic', slot: 'secondary' },
    { key: 'lenses', geometry: merge([...lenses, flash]), finish: 'glass', color: '#0b0d12' },
    { key: 'lens-backs', geometry: merge([0, 1, 2].map((i) => orientedCylinder(V([-0.24, -0.1, -0.24][i], [0.6, 0.6, 0.46][i], 0.083), V(0, 0, 1), 0.044, 0.006, 32))), finish: 'gloss', color: '#05060a' },
    { key: 'screen', geometry: screen, finish: 'gloss', color: '#07080b' },
  ]
  const zones: Zone[] = [
    front('case', [0, -0.08, 0.1], 0.42, 0.66, 0.12, 0.42, 0.06, 'back-centre', 'Back centre'),
    front('case', [0.12, -0.5, 0.1], 0.22, 0.4, 0.1, 0.12, 0.06, 'back-lower', 'Back lower'),
  ]
  return { parts, zones }
}

/* ------------------------------------------------------------------ */

export function buildLanyard(): ProductModel {
  const curve = new CatmullRomCurve3(
    [
      V(-0.025, -0.62, 0.0),
      V(-0.12, -0.35, 0),
      V(-0.25, 0.15, 0),
      V(-0.29, 0.55, -0.02),
      V(-0.18, 0.86, -0.05),
      V(0, 0.93, -0.06),
      V(0.18, 0.86, -0.05),
      V(0.29, 0.55, -0.02),
      V(0.25, 0.15, 0),
      V(0.12, -0.35, 0),
      V(0.025, -0.62, 0),
    ],
    false,
    'centripetal',
  )
  const ribbon = createRibbon(curve, 0.075, V(0, 0, 1), 400)
  const ferrule = transform(roundedBox(0.11, 0.06, 0.03, 0.01, 2), { position: [0, -0.64, 0] })
  const ring = new TorusGeometry(0.035, 0.007, 10, 28)
  ring.translate(0, -0.705, 0)
  const hook = createTube([V(0, -0.74, 0), V(0.03, -0.77, 0), V(0.02, -0.83, 0), V(0, -0.85, 0)], 0.007, { radial: 8, segments: 16, capStart: true, capEnd: true }).geometry
  const holder = transform(roundedBox(0.6, 0.44, 0.018, 0.008, 2), { position: [0, -1.08, 0] })
  const slot = transform(roundedBox(0.1, 0.02, 0.02, 0.006, 2), { position: [0, -0.875, 0] })
  const card = transform(roundedBox(0.54, 0.38, 0.006, 0.0025, 2), { position: [0, -1.085, 0] })
  const parts: Part[] = [
    { key: 'strap', geometry: ribbon, finish: 'nylon', slot: 'primary', doubleSide: true, special: 'logo-repeat' },
    { key: 'hardware', geometry: merge([ferrule, ring, hook]), finish: 'chrome', color: '#c7cad0' },
    { key: 'holder', geometry: holder, finish: 'glass', color: '#dfe7f1', special: 'transparent' },
    { key: 'holder-slot', geometry: slot, finish: 'plastic', color: '#b6c2d0' },
    { key: 'card', geometry: card, finish: 'paper', slot: 'secondary' },
  ]
  const zones: Zone[] = [
    front('card', [0, -1.085, 0.01], 0.26, 0.48, 0.12, 0.08, 0.02, 'card', 'Badge card'),
    { id: 'strap', label: 'Strap (repeating)', kind: 'repeat', target: 'strap', size: 1, maxSize: 1.25, depth: 0, rangeY: 0 },
  ]
  return { parts, zones }
}

/* ------------------------------------------------------------------ */

export function buildSticker(): ProductModel {
  const S = 1.2
  const sheet = gridGeometry(
    (u, v) => {
      const x = (u - 0.5) * S
      const y = (v - 0.5) * S
      // gentle bend plus a lifted corner, like a sticker being peeled
      const corner = smooth(0.62, 1, u) * smooth(0.38, 0, v)
      const zz = 0.03 * Math.cos((u - 0.5) * Math.PI) + 0.16 * corner * corner
      return V(x, y, zz)
    },
    64,
    64,
  )
  const parts: Part[] = [
    { key: 'sticker', geometry: sheet, finish: 'paper', slot: 'primary', special: 'sticker-front' },
    { key: 'sticker-back', geometry: sheet.clone(), finish: 'paper', color: '#e9ebef', backSide: true, special: 'sticker-back' },
  ]
  return {
    parts,
    zones: [{ id: 'sticker', label: 'Sticker artwork', kind: 'sticker', target: 'sticker', size: 1, maxSize: 1, depth: 0, rangeY: 0 }],
  }
}
