/**
 * Baked ambient occlusion.
 *
 * Every vertex fires a fan of rays over its hemisphere against the whole
 * product (accelerated with a BVH). Folds, seams, the inside of collars, the
 * gap under a sleeve and the base of a bottle cap get the soft contact
 * shadowing a real photo has – which is the main thing that separates a product
 * render from a "game asset" look. The result is stored as vertex colours, so it
 * costs nothing at runtime and is included in every export.
 */
import { BufferGeometry, Float32BufferAttribute, Mesh, Ray, Triangle, Vector3 } from 'three'
import { acceleratedRaycast, computeBoundsTree, MeshBVH } from 'three-mesh-bvh'
import type { Part, ProductModel } from './types'
import { merge } from './geometry'

// Fast ray casts for decal placement and double-click picking too.
;(BufferGeometry.prototype as unknown as { computeBoundsTree: typeof computeBoundsTree }).computeBoundsTree = computeBoundsTree
Mesh.prototype.raycast = acceleratedRaycast

function hemisphere(n: number): Vector3[] {
  // cosine-weighted Fibonacci spiral on +Z
  const out: Vector3[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const r = Math.sqrt((i + 0.5) / n)
    const th = i * golden
    const x = r * Math.cos(th)
    const y = r * Math.sin(th)
    out.push(new Vector3(x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))))
  }
  return out
}

const occluding = (p: Part) => p.finish !== 'glass' && p.special !== 'transparent' && p.special !== 'sticker-back'

export function bakeAmbientOcclusion(model: ProductModel, radius: number, quality: 'high' | 'low') {
  const occluders = model.parts.filter(occluding).map((p) => p.geometry.index ? p.geometry.toNonIndexed() : p.geometry.clone())
  if (!occluders.length) return
  const scene = merge(occluders)
  const bvh = new MeshBVH(scene)
  const dirs = hemisphere(quality === 'high' ? 24 : 10)
  const far = radius * 0.32
  const ray = new Ray()
  const n = new Vector3()
  const t1 = new Vector3()
  const t2 = new Vector3()
  const d = new Vector3()
  const o = new Vector3()

  for (const part of model.parts) {
    const g = part.geometry
    if (part.special === 'sticker-front' || part.special === 'sticker-back' || part.finish === 'glass') continue
    const pos = g.getAttribute('position')
    const nor = g.getAttribute('normal')
    if (!nor) continue
    const col = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      n.fromBufferAttribute(nor, i).normalize()
      o.fromBufferAttribute(pos, i).addScaledVector(n, radius * 0.004)
      // tangent basis
      t1.set(Math.abs(n.x) > 0.9 ? 0 : 1, Math.abs(n.x) > 0.9 ? 1 : 0, 0).cross(n).normalize()
      t2.crossVectors(n, t1)
      let occ = 0
      for (const h of dirs) {
        d.set(0, 0, 0).addScaledVector(t1, h.x).addScaledVector(t2, h.y).addScaledVector(n, h.z)
        ray.set(o, d)
        const hit = bvh.raycastFirst(ray, 2 /* DoubleSide */)
        if (hit && hit.distance < far) occ += 1 - Math.pow(hit.distance / far, 0.75)
      }
      const a = Math.max(0.22, 1 - (occ / dirs.length) * 1.35)
      const v = Math.pow(a, 1.15)
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v
    }
    g.setAttribute('color', new Float32BufferAttribute(col, 3))
    ;(g as unknown as { computeBoundsTree: () => void }).computeBoundsTree()
  }
  scene.dispose()
}

/** Copies baked occlusion from the source surface onto a decal so prints sit *in* the shading. */
export function transferAO(source: BufferGeometry, decal: BufferGeometry) {
  const col = source.getAttribute('color')
  const bvh = (source as unknown as { boundsTree?: MeshBVH }).boundsTree
  if (!col || !bvh) return
  const pos = decal.getAttribute('position')
  const out = new Float32Array(pos.count * 3)
  const p = new Vector3()
  const tri = new Triangle()
  const bary = new Vector3()
  const idx = source.index
  const sp = source.getAttribute('position')
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    const hit = bvh.closestPointToPoint(p)
    let v = 1
    if (hit) {
      const f = hit.faceIndex
      const ia = idx ? idx.getX(f * 3) : f * 3
      const ib = idx ? idx.getX(f * 3 + 1) : f * 3 + 1
      const ic = idx ? idx.getX(f * 3 + 2) : f * 3 + 2
      tri.set(a.fromBufferAttribute(sp, ia), b.fromBufferAttribute(sp, ib), c.fromBufferAttribute(sp, ic))
      tri.getBarycoord(hit.point, bary)
      v = col.getX(ia) * bary.x + col.getX(ib) * bary.y + col.getX(ic) * bary.z
    }
    out[i * 3] = out[i * 3 + 1] = out[i * 3 + 2] = v
  }
  decal.setAttribute('color', new Float32BufferAttribute(out, 3))
}
