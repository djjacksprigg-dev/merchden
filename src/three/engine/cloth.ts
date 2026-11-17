/**
 * Small position-based-dynamics cloth solver.
 *
 * Used at build time (scripts/bake-cloth.ts) to drape garments over an
 * invisible ghost mannequin: gravity, extra fabric length and gathered rib
 * hems/cuffs make the cloth buckle into real folds, the way it does in
 * fashion simulation software. The result is baked into the app, so student
 * computers never run the simulation.
 */

export interface GridSpec {
  /** number of quads around (u) and along (v); positions have (segU+1)*(segV+1) entries */
  segU: number
  segV: number
  wrapU: boolean
  positions: Float32Array // render-layout positions (with the duplicate seam column when wrapU)
}

export type Collider = (x: number, y: number, z: number, out: Float32Array) => boolean

export class Cloth {
  n = 0
  pos: Float32Array
  prev: Float32Array
  inv: Float32Array
  ci: Int32Array = new Int32Array(0)
  cj: Int32Array = new Int32Array(0)
  rest: Float32Array = new Float32Array(0)
  stiff: Float32Array = new Float32Array(0)
  /** colliders with the particle range [from, to) they act on */
  colliders: { fn: Collider; from: number; to: number }[] = []
  gravity = -18
  damping = 0.985
  private ci_: number[] = []
  private cj_: number[] = []
  private rest_: number[] = []
  private stiff_: number[] = []
  /** maps each render vertex of each registered grid to a particle index */
  maps: Int32Array[] = []
  grids: GridSpec[] = []

  constructor(capacity: number) {
    this.pos = new Float32Array(capacity * 3)
    this.prev = new Float32Array(capacity * 3)
    this.inv = new Float32Array(capacity).fill(1)
  }

  /** Adds a grid; returns an index function (i, j) -> particle index. */
  addGrid(g: GridSpec): (i: number, j: number) => number {
    const cols = g.wrapU ? g.segU : g.segU + 1
    const base = this.n
    const row = g.segU + 1
    const map = new Int32Array((g.segU + 1) * (g.segV + 1))
    for (let j = 0; j <= g.segV; j++) {
      for (let i = 0; i <= g.segU; i++) {
        const ii = g.wrapU ? i % g.segU : i
        const p = base + j * cols + ii
        map[j * row + i] = p
        if (!(g.wrapU && i === g.segU)) {
          const s = (j * row + i) * 3
          this.pos[p * 3] = this.prev[p * 3] = g.positions[s]
          this.pos[p * 3 + 1] = this.prev[p * 3 + 1] = g.positions[s + 1]
          this.pos[p * 3 + 2] = this.prev[p * 3 + 2] = g.positions[s + 2]
        }
      }
    }
    this.n = base + cols * (g.segV + 1)
    this.maps.push(map)
    this.grids.push(g)
    return (i: number, j: number) => map[Math.max(0, Math.min(g.segV, j)) * row + (g.wrapU ? ((i % g.segU) + g.segU) % g.segU : Math.max(0, Math.min(g.segU, i)))]
  }

  dist(a: number, b: number) {
    const dx = this.pos[a * 3] - this.pos[b * 3]
    const dy = this.pos[a * 3 + 1] - this.pos[b * 3 + 1]
    const dz = this.pos[a * 3 + 2] - this.pos[b * 3 + 2]
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  /** Distance constraint; rest = current distance × scale */
  link(a: number, b: number, scale: number, stiffness: number) {
    if (a === b) return
    this.ci_.push(a)
    this.cj_.push(b)
    this.rest_.push(this.dist(a, b) * scale)
    this.stiff_.push(stiffness)
  }

  finalize() {
    this.ci = Int32Array.from(this.ci_)
    this.cj = Int32Array.from(this.cj_)
    this.rest = Float32Array.from(this.rest_)
    this.stiff = Float32Array.from(this.stiff_)
  }

  /** Recomputes rest lengths of constraints between particles that were moved after linking, keeping their scale. */
  finalizeRest() {
    // rest lengths are kept: moved particles simply start under tension and relax
  }

  pin(p: number) {
    this.inv[p] = 0
  }

  step(dt: number, iterations: number) {
    const { pos, prev, inv, n } = this
    const g = this.gravity * dt * dt
    for (let p = 0; p < n; p++) {
      if (inv[p] === 0) continue
      const k = p * 3
      const vx = (pos[k] - prev[k]) * this.damping
      const vy = (pos[k + 1] - prev[k + 1]) * this.damping
      const vz = (pos[k + 2] - prev[k + 2]) * this.damping
      prev[k] = pos[k]
      prev[k + 1] = pos[k + 1]
      prev[k + 2] = pos[k + 2]
      pos[k] += vx
      pos[k + 1] += vy + g
      pos[k + 2] += vz
    }
    const { ci, cj, rest, stiff } = this
    const out = new Float32Array(3)
    for (let it = 0; it < iterations; it++) {
      for (let c = 0; c < ci.length; c++) {
        const a = ci[c]
        const b = cj[c]
        const wa = inv[a]
        const wb = inv[b]
        const w = wa + wb
        if (w === 0) continue
        const ka = a * 3
        const kb = b * 3
        const dx = pos[kb] - pos[ka]
        const dy = pos[kb + 1] - pos[ka + 1]
        const dz = pos[kb + 2] - pos[ka + 2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (d < 1e-9) continue
        const corr = (stiff[c] * (d - rest[c])) / (d * w)
        pos[ka] += dx * corr * wa
        pos[ka + 1] += dy * corr * wa
        pos[ka + 2] += dz * corr * wa
        pos[kb] -= dx * corr * wb
        pos[kb + 1] -= dy * corr * wb
        pos[kb + 2] -= dz * corr * wb
      }
      for (let p = 0; p < n; p++) {
        if (inv[p] === 0) continue
        const k = p * 3
        for (const col of this.colliders) {
          if (p < col.from || p >= col.to) continue
          if (col.fn(pos[k], pos[k + 1], pos[k + 2], out)) {
            pos[k] = out[0]
            pos[k + 1] = out[1]
            pos[k + 2] = out[2]
            // friction: cancel most tangential motion on contact
            prev[k] = prev[k] * 0.6 + pos[k] * 0.4
            prev[k + 1] = prev[k + 1] * 0.6 + pos[k + 1] * 0.4
            prev[k + 2] = prev[k + 2] * 0.6 + pos[k + 2] * 0.4
          }
        }
      }
    }
  }

  /** Range of particles belonging to grid #g */
  range(gi: number): [number, number] {
    const m = this.maps[gi]
    let lo = Infinity
    let hi = -1
    for (let i = 0; i < m.length; i++) {
      lo = Math.min(lo, m[i])
      hi = Math.max(hi, m[i])
    }
    return [lo, hi + 1]
  }

  /** Writes the simulated positions back in render layout for grid #g. */
  read(gi: number): Float32Array {
    const map = this.maps[gi]
    const out = new Float32Array(map.length * 3)
    for (let v = 0; v < map.length; v++) {
      const p = map[v]
      out[v * 3] = this.pos[p * 3]
      out[v * 3 + 1] = this.pos[p * 3 + 1]
      out[v * 3 + 2] = this.pos[p * 3 + 2]
    }
    return out
  }
}

/**
 * Standard cloth constraint set on a grid: structural, shear and bending.
 * scaleU / scaleV return per-row (v) rest-length multipliers: >1 adds excess
 * fabric (it will buckle into folds), <1 gathers it (rib hems, cuffs).
 */
export function weaveGrid(
  cloth: Cloth,
  idx: (i: number, j: number) => number,
  g: GridSpec,
  o: { scaleU: (v: number) => number; scaleV: (v: number) => number; stretch?: number; shear?: number; bend?: number },
) {
  const cols = g.wrapU ? g.segU : g.segU
  const st = o.stretch ?? 1
  const sh = o.shear ?? 0.6
  const bd = o.bend ?? 0.08
  for (let j = 0; j <= g.segV; j++) {
    const v = j / g.segV
    for (let i = 0; i < (g.wrapU ? cols : g.segU + 1); i++) {
      const p = idx(i, j)
      const hasRight = g.wrapU || i < g.segU
      if (hasRight) cloth.link(p, idx(i + 1, j), o.scaleU(v), st)
      if (j < g.segV) cloth.link(p, idx(i, j + 1), o.scaleV(v), st)
      if (hasRight && j < g.segV) {
        const s = Math.sqrt((o.scaleU(v) ** 2 + o.scaleV(v) ** 2) / 2)
        cloth.link(p, idx(i + 1, j + 1), s, sh)
        cloth.link(idx(i + 1, j), idx(i, j + 1), s, sh)
      }
      if ((g.wrapU || i < g.segU - 1) && bd > 0) cloth.link(p, idx(i + 2, j), o.scaleU(v), bd)
      if (j < g.segV - 1 && bd > 0) cloth.link(p, idx(i, j + 2), o.scaleV(v), bd)
    }
  }
}

/* ------------------------------------------------------------------ */
/* Colliders                                                           */
/* ------------------------------------------------------------------ */

/** Capsule chain (arm forms of a ghost mannequin). */
export function capsuleChain(points: [number, number, number][], radius: (t: number) => number, margin = 0.004): Collider {
  const segs = points.length - 1
  return (x, y, z, out) => {
    let best = Infinity
    let bx = 0
    let by = 0
    let bz = 0
    let bt = 0
    for (let s = 0; s < segs; s++) {
      const [ax, ay, az] = points[s]
      const [cx, cy, cz] = points[s + 1]
      const ex = cx - ax
      const ey = cy - ay
      const ez = cz - az
      const l2 = ex * ex + ey * ey + ez * ez
      let t = ((x - ax) * ex + (y - ay) * ey + (z - az) * ez) / l2
      t = Math.max(0, Math.min(1, t))
      const px = ax + ex * t
      const py = ay + ey * t
      const pz = az + ez * t
      const d2 = (x - px) ** 2 + (y - py) ** 2 + (z - pz) ** 2
      if (d2 < best) {
        best = d2
        bx = px
        by = py
        bz = pz
        bt = (s + t) / segs
      }
    }
    const r = radius(bt) + margin
    const d = Math.sqrt(best)
    if (d >= r || d < 1e-9) return false
    const k = r / d
    out[0] = bx + (x - bx) * k
    out[1] = by + (y - by) * k
    out[2] = bz + (z - bz) * k
    return true
  }
}

/** Keeps particles inside a torso form (hidden sleeve roots tuck under the shoulder). */
export function insideForm(table: { y: number; w: number; d: number; cz: number; n: number }[], k = 0.96): Collider {
  const top = table[table.length - 1]
  return (x, y, z, out) => {
    let yy = Math.min(y, top.y - 0.005)
    let lo = 0
    let hi = table.length - 1
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1
      if (table[m].y <= yy) lo = m
      else hi = m
    }
    const a = table[lo]
    const b = table[hi]
    const t = b.y === a.y ? 0 : Math.max(0, Math.min(1, (yy - a.y) / (b.y - a.y)))
    const w = (a.w + (b.w - a.w) * t) * k
    const d = (a.d + (b.d - a.d) * t) * k
    const cz = a.cz + (b.cz - a.cz) * t
    const n = a.n + (b.n - a.n) * t
    const dz = z - cz
    const f = Math.pow(Math.pow(Math.abs(x / w), n) + Math.pow(Math.abs(dz / d), n), 1 / n)
    if (f <= 1 && yy === y) return false
    const s = f > 1 ? 1 / f : 1
    out[0] = x * s
    out[1] = yy
    out[2] = cz + dz * s
    return true
  }
}

/** Torso form from a table of super-elliptical cross-sections, sorted by y. */
export function torsoForm(table: { y: number; w: number; d: number; cz: number; n: number }[], margin = 0.004): Collider {
  const y0 = table[0].y
  const y1 = table[table.length - 1].y
  return (x, y, z, out) => {
    if (y < y0 || y > y1) return false
    let lo = 0
    let hi = table.length - 1
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1
      if (table[m].y <= y) lo = m
      else hi = m
    }
    const a = table[lo]
    const b = table[hi]
    const t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y)
    const w = a.w + (b.w - a.w) * t + margin
    const d = a.d + (b.d - a.d) * t + margin
    const cz = a.cz + (b.cz - a.cz) * t
    const n = a.n + (b.n - a.n) * t
    const dz = z - cz
    const f = Math.pow(Math.pow(Math.abs(x / w), n) + Math.pow(Math.abs(dz / d), n), 1 / n)
    if (f >= 1 || f < 1e-6) return false
    out[0] = x / f
    out[1] = y
    out[2] = cz + dz / f
    return true
  }
}
