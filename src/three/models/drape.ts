/** Garment drape set-ups for the cloth simulation (build time only). */
import type { BufferGeometry } from 'three'
import { Cloth, capsuleChain, insideForm, torsoForm, weaveGrid, type GridSpec } from '../engine/cloth'
import { ringAt, smooth } from '../engine/geometry'
import { SIM_RES, simBody, sleeveSpec, sleeveTube, torsoRings, vAtY, type TopKind } from './garments'

const isLoose = (k: TopKind) => k === 'hoodie' || k === 'zip-hoodie' || k === 'sweatshirt' || k === 'jacket'

function positionsOf(g: BufferGeometry) {
  return Float32Array.from(g.getAttribute('position').array as ArrayLike<number>)
}

export interface DrapeResult {
  body: Float32Array
  sleeve: Float32Array
}

/** Runs the drape for one garment (build time). */
export function simulateTop(kind: TopKind, log: (s: string) => void = () => {}): DrapeResult {
  const loose = isLoose(kind)
  const long = loose
  const rings = torsoRings(loose)
  const vy = (y: number) => vAtY(rings, y)
  const body = simBody(kind)
  const sleeve = sleeveTube(long, loose, true)
  const bodyGrid: GridSpec = { segU: SIM_RES.bodyU, segV: SIM_RES.bodyV, wrapU: true, positions: positionsOf(body.geometry) }
  const sleeveGrid: GridSpec = {
    segU: SIM_RES.sleeveA,
    segV: long ? SIM_RES.sleeveLong : SIM_RES.sleeveShort,
    wrapU: true,
    positions: positionsOf(sleeve.geometry),
  }
  const cloth = new Cloth((bodyGrid.segU + 1) * (bodyGrid.segV + 1) + (sleeveGrid.segU + 1) * (sleeveGrid.segV + 1))
  const B = cloth.addGrid(bodyGrid)
  const S = cloth.addGrid(sleeveGrid)

  // ---- body: extra length (drape), rib waistband gathers fabric on loose tops
  const hemV = vy(-0.7)
  weaveGrid(cloth, B, bodyGrid, {
    scaleU: (v) => (loose ? 1 - 0.15 * smooth(hemV + 0.03, hemV - 0.01, v) : 1),
    scaleV: (v) => (loose ? 1.0 + 0.035 * smooth(0.35, hemV, v) : 1.012),
    bend: loose ? 0.12 : 0.18,
  })
  // ---- sleeve: longer than the arm (stacking), gathered into the cuff
  weaveGrid(cloth, S, sleeveGrid, {
    scaleU: (t) => (long ? 1 - 0.2 * smooth(0.9, 1, t) : 1),
    scaleV: (t) => (long ? 1.05 + 0.09 * smooth(0.6, 0.95, t) : 1.015),
    bend: 0.15,
  })
  cloth.finalize()

  // pins: neckline rows on the body; sleeve roots hidden inside the body; cuff ring
  for (let j = 0; j <= bodyGrid.segV; j++) {
    if (j / bodyGrid.segV < 0.955) continue
    for (let i = 0; i < bodyGrid.segU; i++) cloth.pin(B(i, j))
  }
  const tIn = long ? 0.06 : 0.09 // root rings hidden inside the body are pinned
  for (let j = 0; j <= sleeveGrid.segV; j++) {
    const t = j / sleeveGrid.segV
    if (t <= tIn) for (let i = 0; i < sleeveGrid.segU; i++) cloth.pin(S(i, j))
  }
  if (long) {
    // last row sits inside the rib cuff: pin it, pulled in to the cuff size
    const j = sleeveGrid.segV
    const c = sleeve.curve.getPointAt(1)
    for (let i = 0; i < sleeveGrid.segU; i++) {
      const p = S(i, j)
      for (let k = 0; k < 3; k++) cloth.pos[p * 3 + k] = cloth.prev[p * 3 + k] = c.getComponent(k) + (cloth.pos[p * 3 + k] - c.getComponent(k)) * 0.86
      cloth.pin(p)
    }
  }

  // ---- ghost mannequin: torso + arm forms
  const table = []
  for (let k = 0; k <= 300; k++) {
    const r = ringAt(rings, k / 300)
    const chest = smooth(-0.6, 0.2, r.y)
    const fw = loose ? 0.8 + 0.12 * chest : 0.9 + 0.07 * chest
    const fd = loose ? 0.78 + 0.12 * chest : 0.88 + 0.07 * chest
    table.push({ y: r.y, w: r.w * fw, d: r.d * fd, cz: r.cz, n: r.n })
  }
  table.sort((a, b) => a.y - b.y)
  const torso = torsoForm(table, 0.003)
  const [b0, b1] = cloth.range(0)
  const [s0, s1] = cloth.range(1)
  // arm form starts where the sleeve leaves the body
  let tArm = 0.12
  for (let k = 0; k <= 100; k++) {
    const t = k / 100
    const p = sleeve.curve.getPointAt(t)
    const r = ringAt(rings, vy(p.y))
    if (Math.abs(p.x) > r.w * 0.98) {
      tArm = t
      break
    }
  }
  // the part of the sleeve inside the garment is kept tucked inside the shoulder
  const cols = sleeveGrid.segU
  // only the short stretch between the pinned root and the arm form is tucked
  const jTuck = Math.floor(Math.min(tArm * 0.6, (long ? 0.12 : 0.18)) * sleeveGrid.segV)
  const garmentForm = []
  for (let k = 0; k <= 300; k++) {
    const r = ringAt(rings, k / 300)
    garmentForm.push({ y: r.y, w: r.w, d: r.d, cz: r.cz, n: r.n })
  }
  garmentForm.sort((a, b) => a.y - b.y)
  // tuck the pinned root rings inside the shoulder before the drape starts
  {
    const tuck = insideForm(garmentForm, 0.985)
    const o = new Float32Array(3)
    for (let p = s0; p < s0 + (jTuck + 1) * cols; p++) {
      if (tuck(cloth.pos[p * 3], cloth.pos[p * 3 + 1], cloth.pos[p * 3 + 2], o)) {
        for (let k = 0; k < 3; k++) cloth.pos[p * 3 + k] = cloth.prev[p * 3 + k] = o[k]
      }
    }
    cloth.finalizeRest()
  }
  cloth.colliders.push(
    { fn: torso, from: b0, to: b1 },
    { fn: insideForm(garmentForm, 0.985), from: s0, to: s0 + (jTuck + 1) * cols },
    { fn: torso, from: s0 + (jTuck + 1) * cols, to: s1 },
  )
  const spec = sleeveSpec(long, loose)
  const armPts: [number, number, number][] = []
  for (let k = 0; k <= 24; k++) {
    const t = tArm + (1 - tArm) * (k / 24)
    const p = sleeve.curve.getPointAt(t)
    armPts.push([p.x, p.y, p.z])
  }
  const armR = (tt: number) => {
    const t = tArm + (1 - tArm) * tt
    const r = spec.radius(t)
    return ((r[0] + r[1]) / 2) * (long ? 0.8 : 0.9)
  }
  cloth.colliders.push({ fn: capsuleChain(armPts, armR, 0.003), from: s0, to: s1 })

  const steps = 520
  const t0 = Date.now()
  // fleece/tricot is heavier and less stretchy: more solver iterations, gentler gravity
  cloth.gravity = loose ? -12 : -18
  const iters = loose ? 20 : 10
  for (let s = 0; s < steps; s++) {
    cloth.step(1 / 220, iters)
    if (s % 130 === 0) log(`  ${kind}: step ${s}/${steps}`)
  }
  log(`  ${kind}: done in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  return { body: cloth.read(0), sleeve: cloth.read(1) }
}

