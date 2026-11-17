/**
 * Procedural models added in Merch Forge 2.0 (original work, no external assets):
 * controller skin, laptop sleeve, headset stand, travel mug, sports bottle,
 * tumbler, keyring, notebook and poster.
 */
import { Path, Shape, TorusGeometry, Vector2 } from 'three'
import { createTube, extrude, gridGeometry, lathe, merge, orientedCylinder, pillow, planarUV, roundedBox, roundedRectShape, smooth, transform, V } from '../engine/geometry'
import type { Part, PlanarZone, ProductModel, Zone } from '../engine/types'

const planar = (id: string, label: string, target: string, origin: [number, number, number], o: Partial<PlanarZone> & { size: number; maxSize: number; rangeX: number; rangeY: number; depth: number }): PlanarZone => ({
  id,
  label,
  kind: 'planar',
  target,
  origin,
  normal: [0, 0, 1],
  up: [0, 1, 0],
  ...o,
})
const flip = (z: PlanarZone, id: string, label: string): PlanarZone => ({ ...z, id, label, origin: [-z.origin[0], z.origin[1], -z.origin[2]], normal: [-z.normal[0], z.normal[1], -z.normal[2]] })
const wrap = (id: string, label: string, target: string, y: number, angle: number, arc: number, rangeY: number, size: number, maxSize: number, depth: number): Zone => ({
  id,
  label,
  kind: 'wrap',
  target,
  center: [0, 0],
  y,
  angle,
  arc,
  rangeY,
  size,
  maxSize,
  depth,
})

/* ------------------------------------------------------------------ */
/* Controller skin                                                     */
/* ------------------------------------------------------------------ */

/**
 * Generic gamepad outlines. Layouts follow the common families students know
 * (offset sticks, symmetric sticks, handheld with detachable sides) but no
 * manufacturer's exact shape, logo, name or button symbols are reproduced.
 */
function padShape(half: [number, number][]): Shape {
  const pts = [...half, ...half.slice().reverse().map(([x, y]) => [-x, y] as [number, number])].map(([x, y]) => new Vector2(x, y))
  const s = new Shape()
  s.moveTo(pts[0].x, pts[0].y)
  s.splineThru([...pts.slice(1), pts[0]])
  return s
}

const OFFSET_OUTLINE: [number, number][] = [
  [0, 0.235], [0.2, 0.245], [0.36, 0.225], [0.47, 0.15], [0.53, 0.0], [0.565, -0.2], [0.555, -0.36], [0.5, -0.46],
  [0.41, -0.48], [0.34, -0.42], [0.27, -0.29], [0.17, -0.17], [0.06, -0.15],
]
// longer, slimmer grips that sweep further down and out
const SYMMETRIC_OUTLINE: [number, number][] = [
  [0, 0.25], [0.22, 0.255], [0.39, 0.235], [0.5, 0.16], [0.56, 0.02], [0.6, -0.2], [0.62, -0.42], [0.58, -0.56],
  [0.49, -0.6], [0.41, -0.53], [0.33, -0.36], [0.24, -0.25], [0.1, -0.22],
]

type Btn = [number, number, number] // x, y, radius of the skin cut-out

interface PadLayout {
  outline: [number, number][]
  sticks: [number, number][]
  dpad: [number, number]
  face: [number, number]
  small: [number, number][]
  home: [number, number]
  touchpad?: { x: number; y: number; w: number; h: number }
  grips: [number, number]
}

const PADS: Record<'offset' | 'symmetric', PadLayout> = {
  offset: {
    outline: OFFSET_OUTLINE,
    sticks: [[-0.27, 0.07], [0.14, -0.1]],
    dpad: [-0.15, -0.1],
    face: [0.29, 0.07],
    small: [[-0.06, 0.08], [0.06, 0.08]],
    home: [0, 0.16],
    grips: [0.42, -0.3],
  },
  symmetric: {
    outline: SYMMETRIC_OUTLINE,
    sticks: [[-0.17, -0.13], [0.17, -0.13]],
    dpad: [-0.36, 0.06],
    face: [0.36, 0.06],
    small: [[-0.25, 0.17], [0.25, 0.17]],
    home: [0, -0.045],
    touchpad: { x: 0, y: 0.105, w: 0.34, h: 0.2 },
    grips: [0.5, -0.4],
  },
}

function stickGeo(x: number, y: number, top: number) {
  return merge([
    transform(lathe([[0, 0], [0.06, 0], [0.062, 0.01], [0.04, 0.03], [0.036, 0.06], [0.0, 0.06]], 32), { rotation: [Math.PI / 2, 0, 0], position: [x, y, top] }),
    transform(lathe([[0, 0], [0.058, 0], [0.062, 0.012], [0.058, 0.02], [0.03, 0.026], [0, 0.024]], 40), { rotation: [Math.PI / 2, 0, 0], position: [x, y, top + 0.058] }),
  ])
}
function dpadGeo(x: number, y: number, top: number) {
  return merge([
    transform(roundedBox(0.12, 0.04, 0.03, 0.008, 2), { position: [x, y, top + 0.012] }),
    transform(roundedBox(0.04, 0.12, 0.03, 0.008, 2), { position: [x, y, top + 0.012] }),
  ])
}
function faceGeo(x: number, y: number, top: number, spread = 0.06, r = 0.026) {
  return merge(
    [
      [x, y + spread],
      [x, y - spread],
      [x - spread, y],
      [x + spread, y],
    ].map(([px, py]) => orientedCylinder(V(px, py, top + 0.012), V(0, 0, 1), r, 0.026, 28)),
  )
}
function cutOut(shape: Shape, holes: Btn[]) {
  for (const [x, y, r] of holes) {
    const h = new Path()
    h.absarc(x, y, r, 0, Math.PI * 2, true)
    shape.holes.push(h)
  }
}

function buildPad(kind: 'offset' | 'symmetric'): ProductModel {
  const L = PADS[kind]
  const depth = 0.12
  const bevel = 0.045
  const top = depth / 2 + bevel
  const shell = extrude(padShape(L.outline), depth, bevel, 64)

  // the vinyl skin: same outline, cut out around sticks, buttons and touchpad
  const skinShape = padShape(L.outline)
  cutOut(skinShape, [
    ...L.sticks.map(([x, y]) => [x, y, 0.085] as Btn),
    [L.dpad[0], L.dpad[1], 0.075],
    [L.face[0], L.face[1], 0.105],
    ...L.small.map(([x, y]) => [x, y, 0.026] as Btn),
    [L.home[0], L.home[1], 0.042],
  ])
  if (L.touchpad) {
    const t = L.touchpad
    const h = new Path()
    h.moveTo(t.x - t.w / 2 - 0.01, t.y - t.h / 2 - 0.01)
    h.lineTo(t.x - t.w / 2 - 0.01, t.y + t.h / 2 + 0.01)
    h.lineTo(t.x + t.w / 2 + 0.01, t.y + t.h / 2 + 0.01)
    h.lineTo(t.x + t.w / 2 + 0.01, t.y - t.h / 2 - 0.01)
    h.closePath()
    skinShape.holes.push(h)
  }
  const skin = planarUV(extrude(skinShape, 0.003, 0, 64), 'z')
  skin.translate(0, 0, top + 0.002)

  const buttons = merge([dpadGeo(L.dpad[0], L.dpad[1], top), faceGeo(L.face[0], L.face[1], top), ...L.small.map(([x, y]) => orientedCylinder(V(x, y, top + 0.006), V(0, 0, 1), 0.017, 0.012, 20))])
  const home = orientedCylinder(V(L.home[0], L.home[1], top + 0.008), V(0, 0, 1), 0.032, 0.014, 32)
  const shoulder = (sx: number) =>
    createTube([V(sx * 0.18, 0.25, 0.0), V(sx * 0.34, 0.24, 0.0), V(sx * 0.46, 0.18, 0.0)], () => [0.03, 0.05], { up: V(0, 0, 1), radial: 16, segments: 24, capStart: true, capEnd: true }).geometry
  const parts: Part[] = [
    { key: 'shell', geometry: shell, finish: 'plastic', slot: 'secondary' },
    { key: 'skin', geometry: skin, finish: 'paper', slot: 'primary', pattern: 'flat' },
    { key: 'sticks', geometry: merge(L.sticks.map(([x, y]) => stickGeo(x, y, top))), finish: 'rubber', color: '#1a1c21' },
    { key: 'buttons', geometry: buttons, finish: 'gloss', slot: 'accent' },
    { key: 'home', geometry: home, finish: 'gloss', color: '#e9ebef' },
    { key: 'bumpers', geometry: merge([shoulder(1), shoulder(-1)]), finish: 'plastic', slot: 'secondary', shade: 0.85 },
  ]
  if (L.touchpad) {
    const t = L.touchpad
    const pad = extrude(roundedRectShape(t.w, t.h, 0.025), 0.01, 0.003, 12)
    pad.translate(t.x, t.y, top + 0.004)
    parts.push({ key: 'touchpad', geometry: pad, finish: 'plastic', slot: 'secondary', shade: 0.92 })
  }
  const z = top + 0.004
  const [gx, gy] = L.grips
  const centreY = kind === 'symmetric' ? -0.165 : -0.06
  const zones: Zone[] = [
    planar('centre', kind === 'symmetric' ? 'Between the sticks' : 'Centre', 'skin', [0, centreY, z], kind === 'symmetric' ? { size: 0.08, maxSize: 0.1, rangeX: 0.01, rangeY: 0.01, depth: 0.03 } : { size: 0.12, maxSize: 0.18, rangeX: 0.02, rangeY: 0.03, depth: 0.03 }),
    planar('left-grip', 'Left grip', 'skin', [-gx, gy, z], { size: 0.13, maxSize: 0.18, rangeX: 0.04, rangeY: 0.06, depth: 0.03 }),
    planar('right-grip', 'Right grip', 'skin', [gx, gy, z], { size: 0.13, maxSize: 0.18, rangeX: 0.04, rangeY: 0.06, depth: 0.03 }),
  ]
  return { parts, zones }
}

/** Offset-stick layout (the style used by many PC / Xbox-type pads). */
export const buildControllerSkin = () => buildPad('offset')
/** Symmetric-stick layout with a touchpad (PlayStation-type layout). */
export const buildControllerSkinSymmetric = () => buildPad('symmetric')

/** Handheld console with detachable side controllers (Switch-type layout). */
export function buildHandheldSkin(): ProductModel {
  const H = 0.62
  const CW = 0.98 // console body
  const RW = 0.27 // each side controller
  const T = 0.1
  const top = T / 2 + 0.012
  const railShape = (side: -1 | 1) => {
    const s = new Shape()
    const x0 = side < 0 ? -CW / 2 - RW : CW / 2
    const x1 = x0 + RW
    const r = 0.17
    if (side < 0) {
      s.moveTo(x1, -H / 2)
      s.lineTo(x1, H / 2)
      s.lineTo(x0 + r, H / 2)
      s.quadraticCurveTo(x0, H / 2, x0, H / 2 - r)
      s.lineTo(x0, -H / 2 + r)
      s.quadraticCurveTo(x0, -H / 2, x0 + r, -H / 2)
    } else {
      s.moveTo(x0, -H / 2)
      s.lineTo(x1 - r, -H / 2)
      s.quadraticCurveTo(x1, -H / 2, x1, -H / 2 + r)
      s.lineTo(x1, H / 2 - r)
      s.quadraticCurveTo(x1, H / 2, x1 - r, H / 2)
      s.lineTo(x0, H / 2)
    }
    s.closePath()
    return s
  }
  const lx = -CW / 2 - RW / 2
  const rx = CW / 2 + RW / 2
  const holesL: Btn[] = [[lx, 0.12, 0.075], [lx, -0.09, 0.09], [lx + 0.07, 0.25, 0.02]]
  const holesR: Btn[] = [[rx, 0.12, 0.09], [rx, -0.09, 0.075], [rx - 0.07, 0.25, 0.02]]
  const rails = merge([extrude(railShape(-1), T, 0.012, 24), extrude(railShape(1), T, 0.012, 24)])
  const skinL = railShape(-1)
  cutOut(skinL, holesL)
  const skinR = railShape(1)
  cutOut(skinR, holesR)
  const skinFront = planarUV(merge([extrude(skinL, 0.003, 0, 24), extrude(skinR, 0.003, 0, 24)]), 'z')
  skinFront.translate(0, 0, top + 0.001)

  const body = roundedBox(CW, H, T * 0.92, 0.015, 3)
  const bezel = extrude(roundedRectShape(CW - 0.04, H - 0.04, 0.03), 0.004, 0, 12)
  bezel.translate(0, 0, T * 0.46)
  const screen = extrude(roundedRectShape(CW - 0.16, H - 0.12, 0.01), 0.004, 0, 8)
  screen.translate(0, 0, T * 0.46 + 0.003)
  // back skin covers the console body and both controllers
  const backShape = new Shape()
  backShape.moveTo(-CW / 2 + 0.02, -H / 2 + 0.03)
  backShape.lineTo(CW / 2 - 0.02, -H / 2 + 0.03)
  backShape.lineTo(CW / 2 - 0.02, H / 2 - 0.03)
  backShape.lineTo(-CW / 2 + 0.02, H / 2 - 0.03)
  backShape.closePath()
  const skinBack = planarUV(extrude(backShape, 0.003, 0, 4), 'z')
  skinBack.rotateY(Math.PI)
  skinBack.translate(0, 0, -T * 0.46 - 0.004)

  const buttons = merge([
    dpadLike(lx, -0.09, top),
    faceGeo(rx, 0.12, top, 0.055, 0.022),
    orientedCylinder(V(lx + 0.07, 0.25, top + 0.004), V(0, 0, 1), 0.012, 0.01, 16),
    orientedCylinder(V(rx - 0.07, 0.25, top + 0.004), V(0, 0, 1), 0.012, 0.01, 16),
  ])
  const parts: Part[] = [
    { key: 'rails', geometry: rails, finish: 'plastic', slot: 'secondary' },
    { key: 'skin', geometry: skinFront, finish: 'paper', slot: 'primary', pattern: 'flat' },
    { key: 'console', geometry: body, finish: 'plastic', color: '#26282e' },
    { key: 'skin-back', geometry: skinBack, finish: 'paper', slot: 'primary', pattern: 'flat' },
    { key: 'bezel', geometry: bezel, finish: 'gloss', color: '#0d0e11' },
    { key: 'screen', geometry: screen, finish: 'glass', color: '#121620' },
    { key: 'sticks', geometry: merge([stickGeo(lx, 0.12, top - 0.01), stickGeo(rx, -0.09, top - 0.01)]), finish: 'rubber', color: '#1a1c21' },
    { key: 'buttons', geometry: buttons, finish: 'gloss', slot: 'accent' },
  ]
  const z = top + 0.003
  const zones: Zone[] = [
    planar('left-controller', 'Left controller', 'skin', [lx, -0.22, z], { size: 0.1, maxSize: 0.14, rangeX: 0.02, rangeY: 0.03, depth: 0.03 }),
    planar('right-controller', 'Right controller', 'skin', [rx, -0.22, z], { size: 0.1, maxSize: 0.14, rangeX: 0.02, rangeY: 0.02, depth: 0.03 }),
    { ...planar('back', 'Back of console', 'skin-back', [0, 0, -T * 0.46 - 0.02], { size: 0.4, maxSize: 0.6, rangeX: 0.25, rangeY: 0.12, depth: 0.04 }), normal: [0, 0, -1] },
  ]
  return { parts, zones }
}

/** Four separate direction buttons, as on detachable handheld controllers. */
function dpadLike(x: number, y: number, top: number) {
  return faceGeo(x, y, top, 0.055, 0.022)
}

/* ------------------------------------------------------------------ */
/* Laptop sleeve                                                       */
/* ------------------------------------------------------------------ */

export function buildLaptopSleeve(): ProductModel {
  const W = 1.28
  const H = 0.9
  const body = pillow(W, H, 0.07, { radius: 0.034, bulge: 0.55 })
  // zip runs along the top and down both sides on the seam line
  const r = 0.03
  const zipPts = [V(-W / 2 + 0.004, -H / 2 + 0.12, 0), V(-W / 2 + 0.004, H / 2 - r, 0), V(-W / 2 + r, H / 2 - 0.004, 0), V(W / 2 - r, H / 2 - 0.004, 0), V(W / 2 - 0.004, H / 2 - r, 0), V(W / 2 - 0.004, -H / 2 + 0.12, 0)]
  const zip = createTube(zipPts, () => [0.012, 0.03], { up: V(0, 0, 1), radial: 8, segments: 220 }).geometry
  const pull = merge([
    transform(roundedBox(0.03, 0.022, 0.03, 0.006, 2), { position: [W / 2 - 0.02, H / 2 - 0.004, 0] }),
    transform(roundedBox(0.075, 0.03, 0.01, 0.006, 2), { position: [W / 2 + 0.03, H / 2 - 0.02, 0.012], rotation: [0, 0, -0.5] }),
  ])
  const parts: Part[] = [
    { key: 'body', geometry: body, finish: 'nylon', slot: 'primary', pattern: 'flat', repeat: 1.4 },
    { key: 'zip', geometry: zip, finish: 'plastic', slot: 'secondary' },
    { key: 'pull', geometry: pull, finish: 'metal', color: '#b4b9c1' },
  ]
  const front = planar('front', 'Front centre', 'body', [0, 0, 0.1], { size: 0.42, maxSize: 0.8, rangeX: 0.3, rangeY: 0.2, depth: 0.08 })
  const zones: Zone[] = [
    front,
    planar('front-corner', 'Front lower corner', 'body', [0.42, -0.28, 0.1], { size: 0.2, maxSize: 0.3, rangeX: 0.1, rangeY: 0.08, depth: 0.08 }),
    flip(front, 'back', 'Back'),
  ]
  return { parts, zones }
}

/* ------------------------------------------------------------------ */
/* Headset stand                                                       */
/* ------------------------------------------------------------------ */

export function buildHeadsetStand(): ProductModel {
  const base = extrude(roundedRectShape(0.62, 0.42, 0.08), 0.045, 0.01, 24)
  base.rotateX(-Math.PI / 2)
  base.translate(0, 0.0325, 0)
  const pad = extrude(roundedRectShape(0.6, 0.4, 0.075), 0.006, 0, 24)
  pad.rotateX(-Math.PI / 2)
  pad.translate(0, 0.003, 0)
  // flat upright panel – the printable face
  const panel = planarUV(extrude(roundedRectShape(0.3, 1.02, 0.05), 0.04, 0.008, 16), 'z')
  panel.translate(0, 0.56, -0.06)
  // curved cradle the headband rests on
  const cradleSolid = createTube(
    Array.from({ length: 21 }, (_, i) => {
      const ang = (i / 20 - 0.5) * 2.2
      return V(Math.sin(ang) * 0.2, 1.06 + Math.cos(ang) * 0.06 - 0.06, -0.06)
    }),
    () => [0.08, 0.018],
    { up: V(0, 1, 0), radial: 16, segments: 60, capStart: true, capEnd: true },
  ).geometry
  const parts: Part[] = [
    { key: 'base', geometry: base, finish: 'metal', slot: 'secondary' },
    { key: 'pad', geometry: pad, finish: 'rubber', color: '#141519' },
    { key: 'panel', geometry: panel, finish: 'gloss', slot: 'primary', pattern: 'flat' },
    { key: 'cradle', geometry: cradleSolid, finish: 'rubber', slot: 'accent' },
  ]
  const zones: Zone[] = [
    planar('upright', 'Upright panel', 'panel', [0, 0.6, -0.02], { size: 0.2, maxSize: 0.26, rangeX: 0.03, rangeY: 0.3, depth: 0.05 }),
    { ...planar('base', 'Base (top)', 'base', [0, 0.06, 0.12], { size: 0.22, maxSize: 0.34, rangeX: 0.1, rangeY: 0.03, depth: 0.04 }), normal: [0, 1, 0], up: [0, 0, -1] },
  ]
  return { parts, zones }
}

/* ------------------------------------------------------------------ */
/* Travel mug                                                          */
/* ------------------------------------------------------------------ */

export function buildTravelMug(): ProductModel {
  const body = lathe(
    [
      [0, 0],
      [0.19, 0],
      [0.205, 0.012],
      [0.21, 0.05],
      [0.235, 0.6],
      [0.252, 0.86],
      [0.254, 0.9],
      [0.25, 0.905],
    ],
    96,
  )
  const grip = lathe(
    [
      [0.2105, 0.06],
      [0.217, 0.064],
      [0.222, 0.2],
      [0.216, 0.205],
    ],
    96,
  )
  const lid = lathe(
    [
      [0.25, 0.9],
      [0.262, 0.905],
      [0.264, 0.96],
      [0.25, 0.985],
      [0.2, 1.0],
      [0.19, 1.04],
      [0.17, 1.06],
      [0, 1.062],
    ],
    96,
  )
  const slider = transform(roundedBox(0.12, 0.02, 0.05, 0.01, 2), { position: [0, 1.065, 0.08] })
  const parts: Part[] = [
    { key: 'body', geometry: body, finish: 'powder', slot: 'primary', pattern: 'wrap', patternFront: 0 },
    { key: 'grip', geometry: grip, finish: 'rubber', slot: 'secondary' },
    { key: 'lid', geometry: merge([lid, slider]), finish: 'plastic', slot: 'secondary' },
  ]
  const zones: Zone[] = [wrap('front', 'Front', 'body', 0.52, 0, 1.0, 0.18, 0.28, 0.4, 0.2), wrap('back', 'Reverse side', 'body', 0.52, Math.PI, 1.0, 0.18, 0.28, 0.4, 0.2)]
  return { parts, zones }
}

/* ------------------------------------------------------------------ */
/* Sports bottle                                                       */
/* ------------------------------------------------------------------ */

export function buildSportsBottle(): ProductModel {
  const body = lathe(
    [
      [0, 0],
      [0.2, 0],
      [0.215, 0.015],
      [0.22, 0.06],
      [0.218, 0.32],
      [0.2, 0.42],
      [0.19, 0.48],
      [0.2, 0.55],
      [0.218, 0.64],
      [0.22, 0.92],
      [0.205, 1.0],
      [0.15, 1.06],
      [0.13, 1.08],
      [0.0, 1.08],
    ],
    96,
    90,
  )
  const cap = lathe(
    [
      [0, 1.07],
      [0.15, 1.07],
      [0.158, 1.08],
      [0.158, 1.17],
      [0.12, 1.19],
      [0.06, 1.2],
      [0.055, 1.27],
      [0.045, 1.29],
      [0.0, 1.292],
    ],
    64,
  )
  const ribs = lathe(
    Array.from({ length: 24 }, (_, i) => [0.159 + (i % 2) * 0.004, 1.085 + i * 0.0035] as [number, number]),
    64,
  )
  const parts: Part[] = [
    { key: 'body', geometry: body, finish: 'gloss', slot: 'primary', pattern: 'wrap', patternFront: 0 },
    { key: 'cap', geometry: merge([cap, ribs]), finish: 'plastic', slot: 'secondary' },
  ]
  const zones: Zone[] = [wrap('front', 'Front', 'body', 0.77, 0, 1.0, 0.1, 0.26, 0.34, 0.2), wrap('back', 'Reverse side', 'body', 0.77, Math.PI, 1.0, 0.1, 0.26, 0.34, 0.2), wrap('lower', 'Lower front', 'body', 0.2, 0, 1.0, 0.08, 0.22, 0.3, 0.2)]
  return { parts, zones }
}

/* ------------------------------------------------------------------ */
/* Tumbler                                                             */
/* ------------------------------------------------------------------ */

export function buildTumbler(): ProductModel {
  const body = lathe(
    [
      [0, 0],
      [0.15, 0],
      [0.162, 0.01],
      [0.166, 0.04],
      [0.168, 0.12],
      [0.2, 0.2],
      [0.205, 0.24],
      [0.23, 1.1],
      [0.232, 1.13],
    ],
    96,
  )
  const lid = lathe(
    [
      [0.226, 1.12],
      [0.24, 1.125],
      [0.242, 1.17],
      [0.232, 1.19],
      [0.0, 1.195],
    ],
    96,
  )
  const straw = createTube([V(0.06, 1.0, 0), V(0.06, 1.3, 0), V(0.052, 1.42, 0)], 0.016, { radial: 16, segments: 20, capEnd: true }).geometry
  const parts: Part[] = [
    { key: 'body', geometry: body, finish: 'powder', slot: 'primary', pattern: 'wrap', patternFront: 0 },
    { key: 'lid', geometry: lid, finish: 'plastic', slot: 'secondary' },
    { key: 'straw', geometry: straw, finish: 'gloss', slot: 'accent' },
  ]
  const zones: Zone[] = [wrap('front', 'Front', 'body', 0.68, 0, 1.0, 0.25, 0.26, 0.38, 0.2), wrap('back', 'Reverse side', 'body', 0.68, Math.PI, 1.0, 0.25, 0.26, 0.38, 0.2)]
  return { parts, zones }
}

/* ------------------------------------------------------------------ */
/* Keyring                                                             */
/* ------------------------------------------------------------------ */

export function buildKeyring(): ProductModel {
  const shape = roundedRectShape(0.62, 0.62, 0.14)
  const hole = new Path()
  hole.absarc(0, 0.24, 0.035, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  const tag = planarUV(extrude(shape, 0.05, 0.012, 32), 'z')
  const ring = new TorusGeometry(0.11, 0.012, 12, 48)
  ring.rotateY(Math.PI / 2)
  ring.translate(0, 0.36, 0)
  const link = new TorusGeometry(0.035, 0.008, 8, 24)
  link.translate(0, 0.27, 0)
  const parts: Part[] = [
    { key: 'tag', geometry: tag, finish: 'gloss', slot: 'primary', pattern: 'flat' },
    { key: 'hardware', geometry: merge([ring, link]), finish: 'chrome', color: '#cfd2d8' },
  ]
  const f = planar('front', 'Front', 'tag', [0, -0.04, 0.06], { size: 0.4, maxSize: 0.52, rangeX: 0.05, rangeY: 0.06, depth: 0.04 })
  return { parts, zones: [f, flip(f, 'back', 'Back')] }
}

/* ------------------------------------------------------------------ */
/* Notebook                                                            */
/* ------------------------------------------------------------------ */

export function buildNotebook(): ProductModel {
  const W = 0.74
  const H = 1.05
  const T = 0.11
  const coverT = 0.016
  const front = planarUV(roundedBox(W, H, coverT, 0.012, 3), 'z')
  front.translate(0, 0, T / 2 - coverT / 2)
  const backC = roundedBox(W, H, coverT, 0.012, 3)
  backC.translate(0, 0, -T / 2 + coverT / 2)
  const spine = transform(roundedBox(0.03, H, T, 0.012, 3), { position: [-W / 2 + 0.008, 0, 0] })
  const pages = transform(roundedBox(W - 0.03, H - 0.03, T - coverT * 2 + 0.002, 0.004, 2), { position: [0.008, 0, 0] })
  // elastic closure band and ribbon bookmark
  const band = createTube([V(W / 2 - 0.08, H / 2 + 0.004, T / 2 + 0.004), V(W / 2 - 0.08, -H / 2 - 0.004, T / 2 + 0.004)], () => [0.004, 0.014], { up: V(0, 0, 1), radial: 8, segments: 20 }).geometry
  const bandBack = createTube([V(W / 2 - 0.08, H / 2 + 0.004, -T / 2 - 0.004), V(W / 2 - 0.08, -H / 2 - 0.004, -T / 2 - 0.004)], () => [0.004, 0.014], { up: V(0, 0, 1), radial: 8, segments: 20 }).geometry
  const ribbon = createTube([V(0.1, -H / 2 + 0.01, 0), V(0.11, -H / 2 - 0.08, 0.01), V(0.13, -H / 2 - 0.16, 0.03)], () => [0.002, 0.012], { up: V(0, 0, 1), radial: 6, segments: 16 }).geometry
  const parts: Part[] = [
    { key: 'cover', geometry: front, finish: 'leather', slot: 'primary', pattern: 'flat' },
    { key: 'back-cover', geometry: merge([backC, spine]), finish: 'leather', slot: 'primary' },
    { key: 'pages', geometry: pages, finish: 'paper', color: '#f3efe6' },
    { key: 'band', geometry: merge([band, bandBack]), finish: 'cloth', slot: 'accent' },
    { key: 'ribbon', geometry: ribbon, finish: 'cloth', slot: 'accent' },
  ]
  const zones: Zone[] = [
    planar('cover', 'Front cover', 'cover', [-0.03, 0.08, T / 2 + 0.02], { size: 0.38, maxSize: 0.56, rangeX: 0.1, rangeY: 0.3, depth: 0.03 }),
    planar('cover-corner', 'Cover corner', 'cover', [0.18, -0.38, T / 2 + 0.02], { size: 0.14, maxSize: 0.2, rangeX: 0.08, rangeY: 0.06, depth: 0.03 }),
    { ...planar('back-cover', 'Back cover', 'back-cover', [0.03, -0.3, -T / 2 - 0.02], { size: 0.2, maxSize: 0.4, rangeX: 0.1, rangeY: 0.15, depth: 0.03 }), normal: [0, 0, -1] },
  ]
  return { parts, zones }
}

/* ------------------------------------------------------------------ */
/* Poster                                                              */
/* ------------------------------------------------------------------ */

export function buildPoster(): ProductModel {
  // A2 portrait (1 : 1.414) with a slight paper wave
  const W = 1.0
  const H = 1.414
  const sheet = gridGeometry(
    (u, v) => V((u - 0.5) * W, (v - 0.5) * H, 0.012 * Math.sin(u * Math.PI * 1.3 + 0.4) * smooth(0, 0.4, v) + 0.02 * smooth(0.85, 1, v) * smooth(0.15, 0, u)),
    48,
    64,
  )
  const back = sheet.clone()
  const clips = merge(
    [-0.42, 0.42].map((x) => transform(roundedBox(0.06, 0.05, 0.02, 0.008, 2), { position: [x, H / 2 - 0.02, 0.018] })),
  )
  const parts: Part[] = [
    { key: 'poster', geometry: sheet, finish: 'paper', slot: 'primary', pattern: 'flat', doubleSide: false },
    { key: 'poster-back', geometry: back, finish: 'paper', color: '#ecebe7', backSide: true },
    { key: 'clips', geometry: clips, finish: 'metal', color: '#9ea4ad' },
  ]
  const zones: Zone[] = [
    planar('centre', 'Main artwork', 'poster', [0, 0.06, 0.05], { size: 0.62, maxSize: 0.96, rangeX: 0.2, rangeY: 0.4, depth: 0.08 }),
    planar('header', 'Header', 'poster', [0, 0.54, 0.05], { size: 0.5, maxSize: 0.9, rangeX: 0.2, rangeY: 0.08, depth: 0.08 }),
    planar('footer', 'Footer', 'poster', [0, -0.56, 0.05], { size: 0.5, maxSize: 0.9, rangeX: 0.2, rangeY: 0.08, depth: 0.08 }),
  ]
  return { parts, zones }
}
