/** Baked cloth-drape data: decoding and draped surfaces (runtime side). */
import { Vector3 } from 'three'
import { unzlibSync, zlibSync } from 'fflate'
import { clamp, gridGeometry, type Surface } from './geometry'

/* ------------------------------------------------------------------ */
/* Baked data encoding: int16 offsets from the base shape, delta + zlib  */
/* ------------------------------------------------------------------ */

const Q = 1 / 20000 // quantisation step (model units)

export function encodeOffsets(sim: Float32Array, base: Float32Array): string {
  const n = sim.length
  const q = new Int16Array(n)
  const prev = [0, 0, 0]
  for (let i = 0; i < n; i++) {
    const v = Math.round((sim[i] - base[i]) / Q)
    const c = i % 3
    q[i] = clamp(v - prev[c], -32768, 32767)
    prev[c] = v
  }
  const z = zlibSync(new Uint8Array(q.buffer), { level: 9 })
  let bin = ''
  for (let i = 0; i < z.length; i++) bin += String.fromCharCode(z[i])
  return btoa(bin)
}

export function decodeOffsets(b64: string, base: Float32Array): Float32Array {
  const bin = atob(b64)
  const z = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) z[i] = bin.charCodeAt(i)
  const raw = unzlibSync(z)
  const q = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2)
  const out = new Float32Array(base.length)
  const acc = [0, 0, 0]
  for (let i = 0; i < base.length; i++) {
    const c = i % 3
    acc[c] += q[i]
    out[i] = base[i] + acc[c] * Q
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Draped surface: lets pockets, hems, zips and seams follow the cloth  */
/* ------------------------------------------------------------------ */

export function drapedSurface(positions: Float32Array, segU: number, segV: number, wrapU: boolean): Surface {
  const row = segU + 1
  const P = (i: number, j: number, out: Vector3) => {
    const k = (clamp(j, 0, segV) * row + clamp(i, 0, segU)) * 3
    return out.set(positions[k], positions[k + 1], positions[k + 2])
  }
  const geometry = gridGeometry((u, v) => P(Math.round(u * segU), Math.round(v * segV), new Vector3()), segU, segV, wrapU)
  const nrm = geometry.getAttribute('normal')
  const N = (i: number, j: number, out: Vector3) => {
    const k = clamp(j, 0, segV) * row + clamp(i, 0, segU)
    return out.set(nrm.getX(k), nrm.getY(k), nrm.getZ(k))
  }
  const sample = (u: number, v: number, f: typeof P) => {
    let uu = wrapU ? ((u % 1) + 1) % 1 : clamp(u, 0, 1)
    const vv = clamp(v, 0, 1)
    uu *= segU
    const x = vv * segV
    const i = Math.min(segU - 1, Math.floor(uu))
    const j = Math.min(segV - 1, Math.floor(x))
    const fu = uu - i
    const fv = x - j
    const a = f(i, j, new Vector3())
    const b = f(i + 1, j, new Vector3())
    const c = f(i, j + 1, new Vector3())
    const d = f(i + 1, j + 1, new Vector3())
    return a.multiplyScalar((1 - fu) * (1 - fv)).add(b.multiplyScalar(fu * (1 - fv))).add(c.multiplyScalar((1 - fu) * fv)).add(d.multiplyScalar(fu * fv))
  }
  const normal = (u: number, v: number) => sample(u, v, N).normalize()
  const point = (u: number, v: number, off = 0) => {
    const p = sample(u, v, P)
    if (off) p.addScaledVector(normal(u, v), off)
    return p
  }
  return { geometry, point, normal }
}

