/** Procedural headwear: baseball cap, beanie, bucket hat (original work). */
import { IcosahedronGeometry, Shape, SphereGeometry, TorusGeometry, Vector3 } from 'three'
import { createTube, extrude, lathe, merge, smooth, transform, V } from '../engine/geometry'
import type { Part, ProductModel, Zone } from '../engine/types'

const TAU = Math.PI * 2

/* ------------------------------------------------------------------ */
/* Baseball cap                                                        */
/* ------------------------------------------------------------------ */

export function buildCap(): ProductModel {
  const RX = 0.36
  const RY = 0.3
  const RZ = 0.38
  // Structured six-panel crown: a scaled half-sphere with a flatter, taller front
  const crown = new SphereGeometry(1, 96, 48, 0, TAU, 0, Math.PI / 2)
  const p = crown.getAttribute('position')
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i)
    let y = p.getY(i)
    let zz = p.getZ(i)
    const front = Math.max(0, zz)
    // structured front panels sit more upright
    zz = zz * (1 + 0.06 * front) - 0.02 * y * front
    y = y * (1 + 0.05 * front)
    // panel seams pinch slightly (6 panels)
    const a = Math.atan2(x, zz)
    const seam = Math.pow(Math.abs(Math.cos(a * 3)), 40) * Math.sin(Math.acos(Math.min(1, Math.max(-1, p.getY(i)))))
    const k = 1 - 0.012 * seam
    x *= RX * k
    y *= RY * k
    zz *= RZ * k
    p.setXYZ(i, x, y, zz)
  }
  crown.computeVertexNormals()

  // Panel seam stitching: thin meridian tubes
  const seams = []
  for (let s = 0; s < 6; s++) {
    const a = (s / 6) * TAU + Math.PI / 6
    const pts: Vector3[] = []
    for (let i = 0; i <= 20; i++) {
      const t = (i / 20) * (Math.PI / 2 - 0.02)
      const sx = Math.sin(a) * Math.cos(t)
      const sz = Math.cos(a) * Math.cos(t)
      const sy = Math.sin(t)
      const front = Math.max(0, sz)
      pts.push(V(sx * RX * 1.004, sy * RY * (1 + 0.05 * front) * 1.004, (sz * (1 + 0.06 * front) - 0.02 * sy * front) * RZ * 1.004))
    }
    seams.push(createTube(pts, 0.0035, { radial: 6, segments: 30 }).geometry)
  }

  // Curved brim
  const shape = new Shape()
  const N = 40
  const a0 = -1.2
  const a1 = 1.2
  for (let i = 0; i <= N; i++) {
    const a = a0 + ((a1 - a0) * i) / N
    const x = (RX + 0.01) * 1.02 * Math.sin(a)
    const y = RZ * 0.98 * Math.cos(a) + 0.27 * Math.pow(Math.cos(a * 1.05), 1.4)
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  for (let i = N; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / N
    shape.lineTo(RX * 0.985 * Math.sin(a), RZ * 0.955 * Math.cos(a))
  }
  const brim = extrude(shape, 0.012, 0.004, 4)
  brim.rotateX(Math.PI / 2)
  const bp = brim.getAttribute('position')
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i)
    const zz = bp.getZ(i)
    const out = Math.max(0, zz - RZ * 0.8)
    bp.setY(i, bp.getY(i) + 0.012 - 0.55 * x * x * smooth(0.1, 0.5, zz) - 0.12 * out)
  }
  brim.computeVertexNormals()

  const button = lathe(
    [
      [0, 0],
      [0.03, 0],
      [0.03, 0.006],
      [0.02, 0.018],
      [0, 0.022],
    ],
    32,
  )
  button.translate(0, RY * 0.995, 0)

  // eyelets
  const eyelets = []
  for (let s = 0; s < 6; s++) {
    const a = (s / 6) * TAU
    const t = 1.05
    const n = V(Math.sin(a) * Math.cos(t), Math.sin(t), Math.cos(a) * Math.cos(t))
    const pos = V(n.x * RX, n.y * RY, n.z * RZ)
    const g = new TorusGeometry(0.009, 0.0035, 6, 16)
    g.lookAt(n)
    g.translate(pos.x, pos.y, pos.z)
    eyelets.push(g)
  }

  // back strap
  const strap = createTube(
    Array.from({ length: 13 }, (_, i) => {
      const a = Math.PI - 0.55 + (i / 12) * 1.1
      return V(Math.sin(a) * RX * 1.01, 0.025, Math.cos(a) * RZ * 1.01)
    }),
    () => [0.004, 0.022],
    { radial: 8, segments: 24, up: V(0, 1, 0) },
  ).geometry

  const parts: Part[] = [
    { key: 'crown', geometry: crown, finish: 'twill', slot: 'primary', doubleSide: true, pattern: 'wrap', patternFront: 0.25 },
    { key: 'seams', geometry: merge(seams), finish: 'twill', slot: 'primary', shade: 0.8 },
    { key: 'brim', geometry: brim, finish: 'twill', slot: 'secondary' },
    { key: 'button', geometry: button, finish: 'twill', slot: 'accent' },
    { key: 'eyelets', geometry: merge(eyelets), finish: 'twill', slot: 'accent', shade: 0.9 },
    { key: 'strap', geometry: strap, finish: 'nylon', slot: 'secondary' },
  ]
  const zones: Zone[] = [
    {
      id: 'front-panel',
      label: 'Front panel',
      kind: 'planar',
      target: 'crown',
      origin: [0, 0.14, 0.38],
      normal: [0, 0.32, 1],
      up: [0, 1, 0],
      rangeX: 0.08,
      rangeY: 0.05,
      size: 0.3,
      maxSize: 0.42,
      depth: 0.24,
    },
    {
      id: 'left-side',
      label: 'Left side panel',
      kind: 'planar',
      target: 'crown',
      origin: [0.33, 0.1, -0.02],
      normal: [1, 0.25, 0],
      up: [0, 1, 0],
      rangeX: 0.08,
      rangeY: 0.04,
      size: 0.15,
      maxSize: 0.22,
      depth: 0.14,
    },
    {
      id: 'right-side',
      label: 'Right side panel',
      kind: 'planar',
      target: 'crown',
      origin: [-0.33, 0.1, -0.02],
      normal: [-1, 0.25, 0],
      up: [0, 1, 0],
      rangeX: 0.08,
      rangeY: 0.04,
      size: 0.15,
      maxSize: 0.22,
      depth: 0.14,
    },
    {
      id: 'back',
      label: 'Back (above strap)',
      kind: 'planar',
      target: 'crown',
      origin: [0, 0.13, -0.36],
      normal: [0, 0.3, -1],
      up: [0, 1, 0],
      rangeX: 0.06,
      rangeY: 0.03,
      size: 0.14,
      maxSize: 0.2,
      depth: 0.14,
    },
  ]
  return { parts, zones }
}

/* ------------------------------------------------------------------ */
/* Beanie                                                              */
/* ------------------------------------------------------------------ */

export function buildBeanie(): ProductModel {
  const body = lathe(
    [
      [0.285, 0.02],
      [0.29, 0.18],
      [0.288, 0.32],
      [0.27, 0.42],
      [0.22, 0.5],
      [0.14, 0.555],
      [0.05, 0.575],
      [0.0, 0.578],
    ],
    96,
    60,
  )
  // knitted gathering at the crown
  const bp = body.getAttribute('position')
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i)
    const y = bp.getY(i)
    const zz = bp.getZ(i)
    const a = Math.atan2(x, zz)
    const k = 1 + 0.012 * Math.sin(a * 8) * smooth(0.42, 0.56, y)
    bp.setX(i, x * k)
    bp.setZ(i, zz * k)
  }
  body.computeVertexNormals()
  const cuff = lathe(
    [
      [0.3, -0.005],
      [0.312, 0.0],
      [0.318, 0.02],
      [0.318, 0.15],
      [0.31, 0.172],
      [0.296, 0.176],
    ],
    96,
    24,
  )
  const pom = new IcosahedronGeometry(0.1, 5)
  const pp = pom.getAttribute('position')
  for (let i = 0; i < pp.count; i++) {
    const v = new Vector3().fromBufferAttribute(pp, i)
    const n = 1 + 0.08 * Math.sin(v.x * 90) * Math.sin(v.y * 87) * Math.sin(v.z * 93) + 0.05 * Math.sin(v.x * 40 + v.y * 30)
    v.multiplyScalar(n)
    pp.setXYZ(i, v.x, v.y, v.z)
  }
  pom.computeVertexNormals()
  pom.translate(0, 0.66, 0)
  const parts: Part[] = [
    { key: 'body', geometry: body, finish: 'rib', slot: 'primary', repeat: 3, doubleSide: true, pattern: 'wrap', patternFront: 0 },
    { key: 'cuff', geometry: cuff, finish: 'rib', slot: 'secondary', repeat: 3, doubleSide: true },
    { key: 'pom', geometry: pom, finish: 'fleece', slot: 'accent', repeat: 3 },
  ]
  const zones: Zone[] = [
    { id: 'cuff-front', label: 'Cuff front', kind: 'wrap', target: 'cuff', center: [0, 0], y: 0.088, angle: 0, arc: 0.9, rangeY: 0.025, size: 0.2, maxSize: 0.3, depth: 0.16 },
    { id: 'cuff-side', label: 'Cuff side', kind: 'wrap', target: 'cuff', center: [0, 0], y: 0.088, angle: Math.PI / 2, arc: 0.6, rangeY: 0.025, size: 0.14, maxSize: 0.22, depth: 0.14 },
    { id: 'crown-front', label: 'Crown front', kind: 'wrap', target: 'body', center: [0, 0], y: 0.3, angle: 0, arc: 0.6, rangeY: 0.05, size: 0.18, maxSize: 0.26, depth: 0.16 },
  ]
  return { parts, zones }
}

/* ------------------------------------------------------------------ */
/* Bucket hat                                                          */
/* ------------------------------------------------------------------ */

export function buildBucketHat(): ProductModel {
  const crown = lathe(
    [
      [0.305, 0.0],
      [0.3, 0.12],
      [0.285, 0.26],
      [0.27, 0.315],
      [0.24, 0.335],
      [0.12, 0.345],
      [0.0, 0.347],
    ],
    96,
    48,
  )
  transform(crown, { scale: [1, 1, 1.08] })
  const brim = lathe(
    [
      [0.298, -0.01],
      [0.355, -0.032],
      [0.455, -0.088],
      [0.5, -0.112],
      [0.51, -0.108],
      [0.505, -0.1],
      [0.46, -0.075],
      [0.36, -0.02],
      [0.3, 0.004],
    ],
    96,
    0,
  )
  transform(brim, { scale: [1, 1, 1.08] })
  const stitches = [0.37, 0.42, 0.47].map((r) => {
    const y = -0.02 - (r - 0.36) * 0.55 + 0.003
    const t = new TorusGeometry(r, 0.0025, 4, 120)
    t.rotateX(Math.PI / 2)
    t.translate(0, y, 0)
    transform(t, { scale: [1, 1, 1.08] })
    return t
  })
  const band = lathe(
    [
      [0.304, 0.015],
      [0.308, 0.02],
      [0.308, 0.075],
      [0.304, 0.08],
    ],
    96,
  )
  transform(band, { scale: [1, 1, 1.08] })
  const parts: Part[] = [
    { key: 'crown', geometry: crown, finish: 'twill', slot: 'primary', doubleSide: true, pattern: 'wrap', patternFront: 0 },
    { key: 'band', geometry: band, finish: 'twill', slot: 'secondary' },
    { key: 'brim', geometry: brim, finish: 'twill', slot: 'primary', doubleSide: true, pattern: 'wrap', patternFront: 0 },
    { key: 'stitches', geometry: merge(stitches), finish: 'twill', slot: 'primary', shade: 0.75 },
  ]
  const zones: Zone[] = [
    { id: 'front', label: 'Front', kind: 'wrap', target: 'crown', center: [0, 0], y: 0.17, angle: 0, arc: 0.6, rangeY: 0.05, size: 0.24, maxSize: 0.32, depth: 0.16 },
    { id: 'side', label: 'Side', kind: 'wrap', target: 'crown', center: [0, 0], y: 0.17, angle: Math.PI / 2, arc: 0.6, rangeY: 0.05, size: 0.18, maxSize: 0.26, depth: 0.14 },
    { id: 'back', label: 'Back', kind: 'wrap', target: 'crown', center: [0, 0], y: 0.17, angle: Math.PI, arc: 0.6, rangeY: 0.05, size: 0.2, maxSize: 0.3, depth: 0.16 },
  ]
  return { parts, zones }
}
