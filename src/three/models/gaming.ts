/** Procedural gaming accessories: mouse mats, gaming chair, headset (original work). */
import { CylinderGeometry, SphereGeometry, TorusGeometry, Vector3 } from 'three'
import {
  bump,
  planarUV,
  createTube,
  extrude,
  lathe,
  merge,
  mirrorX,
  pillow,
  roundedBox,
  roundedRectPath,
  roundedRectShape,
  smooth,
  transform,
  V,
} from '../engine/geometry'
import type { Part, PlanarZone, ProductModel, Zone } from '../engine/types'

/* ------------------------------------------------------------------ */
/* Mouse mats                                                          */
/* ------------------------------------------------------------------ */

function mat(w: number, d: number, extended: boolean): ProductModel {
  const r = extended ? 0.05 : 0.045
  const top = extrude(roundedRectShape(w, d, r), 0.008, 0.002, 12)
  top.rotateX(-Math.PI / 2)
  top.translate(0, 0.019, 0)
  const base = extrude(roundedRectShape(w, d, r), 0.016, 0.003, 12)
  base.rotateX(-Math.PI / 2)
  base.translate(0, 0.008, 0)
  const stitch = createTube(roundedRectPath(w - 0.004, d - 0.004, r, 0.016, 10), () => [0.011, 0.009], {
    closed: true,
    radial: 10,
    segments: 320,
  }).geometry
  const parts: Part[] = [
    { key: 'surface', geometry: planarUV(top, 'y'), finish: 'cloth', slot: 'primary', repeat: 1.2, pattern: 'flat' },
    { key: 'base', geometry: base, finish: 'rubber', color: '#15171c' },
    { key: 'edge', geometry: stitch, finish: 'nylon', slot: 'trim', repeat: 2 },
  ]
  const zone = (id: string, label: string, x: number, size: number, rangeX: number, rangeY: number, maxSize: number): PlanarZone => ({
    id,
    label,
    kind: 'planar',
    target: 'surface',
    origin: [x, 0.03, 0],
    normal: [0, 1, 0],
    up: [0, 0, -1],
    rangeX,
    rangeY,
    size,
    maxSize,
    depth: 0.04,
  })
  const zones: Zone[] = extended
    ? [
        zone('centre', 'Centre', 0, 0.55, 0.75, 0.22, 1.9),
        zone('left', 'Left side', -0.62, 0.42, 0.3, 0.22, 0.8),
        zone('right', 'Right side', 0.62, 0.42, 0.3, 0.22, 0.8),
      ]
    : [zone('centre', 'Centre', 0, 0.5, 0.25, 0.22, 0.95), zone('corner', 'Bottom-right corner', 0.34, 0.2, 0.12, 0.1, 0.3)]
  if (!extended) {
    // corner zone sits lower-right
    ;(zones[1] as PlanarZone).origin = [0.34, 0.03, 0.27]
  }
  return { parts, zones }
}

export const buildExtendedMat = () => mat(2.25, 1.0, true)
export const buildMouseMat = () => mat(1.2, 1.0, false)

/* ------------------------------------------------------------------ */
/* Gaming chair                                                        */
/* ------------------------------------------------------------------ */

function shapeBackrest(w: number, h: number, d: number) {
  const g = pillow(w, h, d, { radius: 0.08, bulge: 0.25, segments: 10 })
  const p = g.getAttribute('position')
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const nx = Math.abs(x) / (w / 2)
    const ny = y / (h / 2)
    // racing-seat side wings and a narrower lumbar waist
    const wing = smooth(0.55, 1, nx) * (0.12 + 0.05 * bump(ny, -0.2, 0.4))
    p.setZ(i, p.getZ(i) + wing)
    const waist = 1 - 0.1 * bump(ny, -0.25, 0.3) - 0.22 * smooth(0.55, 1, ny)
    p.setX(i, x * waist)
  }
  g.computeVertexNormals()
  return g
}

export function buildGamingChair(): ProductModel {
  const tilt = -0.14
  const backPos: [number, number, number] = [0, 1.48, -0.38]
  const placeBack = (g: ReturnType<typeof pillow>) => {
    g.rotateX(tilt)
    g.translate(...backPos)
    return g
  }
  const back = placeBack(shapeBackrest(0.92, 1.3, 0.2))
  const backInsert = placeBack(transform(pillow(0.44, 0.96, 0.08, { radius: 0.035, bulge: 0.5, segments: 8 }), { position: [0, -0.06, 0.12] }))
  const headrest = placeBack(transform(pillow(0.38, 0.17, 0.1, { radius: 0.045, bulge: 0.6, segments: 8 }), { position: [0, 0.47, 0.17] }))
  const lumbar = placeBack(transform(pillow(0.4, 0.17, 0.11, { radius: 0.05, bulge: 0.6, segments: 8 }), { position: [0, -0.37, 0.18] }))

  const seat = pillow(0.88, 0.15, 0.86, { radius: 0.06, bulge: 0.1, segments: 8 })
  const sp = seat.getAttribute('position')
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i)
    const nx = Math.abs(x) / 0.44
    sp.setY(i, sp.getY(i) + 0.08 * smooth(0.6, 1, nx) * (sp.getY(i) > 0 ? 1 : 0.4))
  }
  seat.computeVertexNormals()
  seat.translate(0, 0.86, 0.02)
  const seatInsert = pillow(0.44, 0.78, 0.05, { radius: 0.022, bulge: 0.5, segments: 8 })
  seatInsert.rotateX(-Math.PI / 2)
  seatInsert.translate(0, 0.945, 0.04)

  // armrests
  const armPost = roundedBox(0.06, 0.3, 0.08, 0.02, 3)
  armPost.translate(0.5, 1.02, -0.02)
  const armPad = roundedBox(0.11, 0.05, 0.34, 0.022, 3)
  armPad.translate(0.5, 1.19, 0.0)
  const armBracket = roundedBox(0.05, 0.05, 0.3, 0.015, 2)
  armBracket.translate(0.47, 0.86, -0.05)
  const arms = merge([armPost, armPad.clone(), armBracket, mirrorX(armPost), mirrorX(armPad), mirrorX(armBracket)])

  // gas lift & mechanism
  const lift = new CylinderGeometry(0.035, 0.035, 0.42, 24)
  lift.translate(0, 0.56, 0)
  const shroud = lathe(
    [
      [0, 0.14],
      [0.075, 0.14],
      [0.06, 0.18],
      [0.05, 0.42],
      [0.0, 0.42],
    ],
    32,
  )
  const mech = roundedBox(0.38, 0.06, 0.34, 0.02, 2)
  mech.translate(0, 0.77, 0.02)

  // five-star base with casters
  const spokes = []
  const casters = []
  const hub = new CylinderGeometry(0.09, 0.11, 0.1, 32)
  hub.translate(0, 0.14, 0)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 10
    const spoke = roundedBox(0.075, 0.055, 0.52, 0.02, 2)
    const sp2 = spoke.getAttribute('position')
    for (let k = 0; k < sp2.count; k++) {
      const zz = sp2.getZ(k)
      const t = (zz + 0.26) / 0.52
      sp2.setY(k, sp2.getY(k) * (1 - 0.35 * t) - 0.045 * t)
      sp2.setX(k, sp2.getX(k) * (1 - 0.3 * t))
    }
    spoke.computeVertexNormals()
    spoke.translate(0, 0.14, 0.3)
    spoke.rotateY(a)
    spokes.push(spoke)
    const c = new Vector3(Math.sin(a) * 0.55, 0.045, Math.cos(a) * 0.55)
    const wheel = new CylinderGeometry(0.04, 0.04, 0.045, 20)
    wheel.rotateZ(Math.PI / 2)
    wheel.rotateY(a)
    wheel.translate(c.x, c.y, c.z)
    const fork = roundedBox(0.05, 0.05, 0.05, 0.015, 2)
    fork.translate(c.x, 0.085, c.z)
    casters.push(wheel, fork)
  }

  const parts: Part[] = [
    { key: 'back', geometry: back, finish: 'leather', slot: 'secondary' },
    { key: 'back-insert', geometry: backInsert, finish: 'leather', slot: 'primary', pattern: 'flat' },
    { key: 'headrest', geometry: headrest, finish: 'fleece', slot: 'accent' },
    { key: 'lumbar', geometry: lumbar, finish: 'fleece', slot: 'accent' },
    { key: 'seat', geometry: seat, finish: 'leather', slot: 'secondary' },
    { key: 'seat-insert', geometry: seatInsert, finish: 'leather', slot: 'primary', pattern: 'flat' },
    { key: 'arms', geometry: arms, finish: 'plastic', color: '#1b1d22' },
    { key: 'mechanism', geometry: merge([mech, shroud]), finish: 'plastic', color: '#1b1d22' },
    { key: 'lift', geometry: lift, finish: 'chrome', color: '#c9ccd2' },
    { key: 'base', geometry: merge([hub, ...spokes]), finish: 'gloss', color: '#202227' },
    { key: 'casters', geometry: merge(casters), finish: 'plastic', color: '#101114' },
  ]
  const n: [number, number, number] = [0, Math.sin(-tilt), Math.cos(tilt)]
  const zones: Zone[] = [
    {
      id: 'backrest',
      label: 'Backrest',
      kind: 'planar',
      target: 'back-insert',
      origin: [0, 1.52, -0.2],
      normal: n,
      up: [0, Math.cos(tilt), -Math.sin(-tilt)],
      rangeX: 0.06,
      rangeY: 0.25,
      size: 0.32,
      maxSize: 0.42,
      depth: 0.08,
    },
    {
      id: 'headrest',
      label: 'Headrest cushion',
      kind: 'planar',
      target: 'headrest',
      origin: [0, 1.96, -0.1],
      normal: n,
      up: [0, Math.cos(tilt), -Math.sin(-tilt)],
      rangeX: 0.06,
      rangeY: 0.01,
      size: 0.22,
      maxSize: 0.32,
      depth: 0.08,
    },
    {
      id: 'rear',
      label: 'Rear of backrest',
      kind: 'planar',
      target: 'back',
      origin: [0, 1.6, -0.6],
      normal: [0, -Math.sin(-tilt), -Math.cos(tilt)],
      up: [0, Math.cos(tilt), -Math.sin(-tilt)],
      rangeX: 0.1,
      rangeY: 0.3,
      size: 0.45,
      maxSize: 0.62,
      depth: 0.12,
    },
  ]
  return { parts, zones }
}

/* ------------------------------------------------------------------ */
/* Headset (customisable ear-cup plates)                               */
/* ------------------------------------------------------------------ */

export function buildHeadset(): ProductModel {
  const R = 0.46
  const cy = 0.12
  const arc = (r: number, a0: number, a1: number, n = 40) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const a = a0 + ((a1 - a0) * i) / n
      return V(Math.cos(a) * r, cy + Math.sin(a) * r, 0)
    })
  const band = createTube(arc(R, 0.42, Math.PI - 0.42), () => [0.055, 0.016], { up: V(0, 0, 1), radial: 24, segments: 80, capStart: true, capEnd: true }).geometry
  const cushion = createTube(arc(R - 0.035, 0.75, Math.PI - 0.75), () => [0.045, 0.02], { up: V(0, 0, 1), radial: 24, segments: 60, capStart: true, capEnd: true }).geometry

  // yokes (left side, mirrored)
  const yoke = createTube([V(0.415, 0.33, 0), V(0.47, 0.18, 0), V(0.47, 0.02, 0)], 0.016, { radial: 12, segments: 24, capStart: true, capEnd: true }).geometry
  const fork = new TorusGeometry(0.175, 0.012, 10, 48, Math.PI)
  fork.rotateY(Math.PI / 2)
  fork.translate(0.47, -0.17, 0)
  // ear cup shell, axis along +X
  const shell = lathe(
    [
      [0.0, -0.06],
      [0.16, -0.06],
      [0.18, -0.04],
      [0.185, 0.0],
      [0.175, 0.04],
      [0.15, 0.055],
      [0.0, 0.058],
    ],
    64,
    24,
  )
  shell.rotateZ(-Math.PI / 2)
  shell.translate(0.48, -0.17, 0)
  const plate = lathe(
    [
      [0, -0.006],
      [0.14, -0.006],
      [0.145, 0.0],
      [0.14, 0.008],
      [0.0, 0.009],
    ],
    64,
  )
  plate.rotateZ(-Math.PI / 2)
  plate.translate(0.538, -0.17, 0)
  const pad = new TorusGeometry(0.135, 0.045, 20, 64)
  pad.rotateY(Math.PI / 2)
  pad.scale(0.7, 1, 1)
  pad.translate(0.41, -0.17, 0)
  const padFace = new CylinderGeometry(0.1, 0.1, 0.01, 48)
  padFace.rotateZ(Math.PI / 2)
  padFace.translate(0.395, -0.17, 0)

  // microphone boom on the left
  const mic = createTube([V(0.5, -0.24, 0.12), V(0.46, -0.32, 0.3), V(0.3, -0.36, 0.42), V(0.16, -0.35, 0.46)], 0.011, {
    radial: 10,
    segments: 40,
    capEnd: true,
  }).geometry
  const micTip = new SphereGeometry(0.03, 20, 14)
  micTip.scale(1.4, 1, 1)
  micTip.translate(0.15, -0.35, 0.465)

  const parts: Part[] = [
    { key: 'band', geometry: band, finish: 'plastic', slot: 'secondary' },
    { key: 'band-cushion', geometry: cushion, finish: 'leather', slot: 'accent' },
    { key: 'yokes', geometry: merge([yoke.clone(), mirrorX(yoke), fork.clone(), mirrorX(fork)]), finish: 'metal', color: '#9ea3ab' },
    { key: 'shells', geometry: merge([shell.clone(), mirrorX(shell)]), finish: 'plastic', slot: 'secondary' },
    { key: 'plates', geometry: planarUV(merge([plate.clone(), mirrorX(plate)]), 'x'), finish: 'gloss', slot: 'primary', pattern: 'flat' },
    { key: 'pads', geometry: merge([pad.clone(), mirrorX(pad), padFace.clone(), mirrorX(padFace)]), finish: 'leather', slot: 'accent' },
    { key: 'mic', geometry: merge([mic, micTip]), finish: 'plastic', color: '#17191d' },
  ]
  const plateZone = (side: 'left' | 'right'): PlanarZone => {
    const s = side === 'left' ? 1 : -1
    return {
      id: `${side}-plate`,
      label: side === 'left' ? 'Left ear-cup plate' : 'Right ear-cup plate',
      kind: 'planar',
      target: 'plates',
      origin: [s * 0.55, -0.17, 0],
      normal: [s, 0, 0],
      up: [0, 1, 0],
      rangeX: 0.03,
      rangeY: 0.03,
      size: 0.2,
      maxSize: 0.27,
      depth: 0.04,
    }
  }
  return { parts, zones: [plateZone('left'), plateZone('right')] }
}
