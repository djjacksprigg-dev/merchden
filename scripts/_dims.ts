import { PRODUCTS } from '../src/three/catalogue'
import { Box3, Vector3 } from 'three'
for (const d of PRODUCTS) {
  const b = await d.load(); const m = b(); const box = new Box3()
  for (const p of m.parts) { p.geometry.computeBoundingBox(); box.union(p.geometry.boundingBox!) }
  const s = box.getSize(new Vector3())
  console.log(d.id.padEnd(26), s.toArray().map(v=>v.toFixed(2)).join(' '), 'miny', box.min.y.toFixed(2))
}
