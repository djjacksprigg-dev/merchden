import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { PRODUCTS, CATEGORIES } from '../src/three/catalogue'
import { buildDecalGeometry, pointToOffsets, resolvePlacement } from '../src/three/engine/decals'

const REQUIRED = [
  'jersey', 'tshirt', 'hoodie', 'zip-hoodie', 'sweatshirt', 'polo', 'tracksuit-jacket', 'joggers',
  'cap', 'beanie', 'bucket-hat',
  'extended-mousemat', 'mousemat', 'gaming-chair', 'headset',
  'water-bottle', 'mug', 'backpack', 'drawstring-bag', 'tote-bag', 'phone-case', 'lanyard', 'sticker',
]

describe('catalogue', () => {
  it('contains all 23 required products in valid categories', () => {
    expect(PRODUCTS.map((p) => p.id).sort()).toEqual([...REQUIRED].sort())
    const cats = new Set(CATEGORIES.map((c) => c.id))
    for (const p of PRODUCTS) expect(cats.has(p.category)).toBe(true)
  })
})

describe.each(PRODUCTS.map((p) => [p.id, p] as const))('%s model', (_id, def) => {
  it('builds valid geometry, colour slots and placement zones', async () => {
    const build = await def.load()
    const model = build()
    expect(model.parts.length).toBeGreaterThan(0)
    const keys = new Set(model.parts.map((p) => p.key))
    expect(keys.size).toBe(model.parts.length)
    const slots = new Set(def.colorSlots.map((s) => s.id))
    for (const s of slots) expect(def.defaults[s]).toMatch(/^#[0-9a-f]{6}$/i)
    for (const part of model.parts) {
      const pos = part.geometry.getAttribute('position')
      expect(pos.count, part.key).toBeGreaterThan(2)
      expect(part.geometry.getAttribute('normal'), part.key).toBeTruthy()
      for (let i = 0; i < pos.array.length; i++) expect(Number.isFinite(pos.array[i]), `${part.key} NaN`).toBe(true)
      if (part.slot) expect(slots.has(part.slot), `${part.key} slot ${part.slot}`).toBe(true)
      else expect(part.color, `${part.key} needs a colour`).toBeTruthy()
    }
    expect(model.zones.length).toBeGreaterThan(0)
    expect(model.zones.some((z) => z.id === def.defaultZone)).toBe(true)

    for (const zone of model.zones) {
      const target = model.parts.find((p) => p.key === zone.target)
      expect(target, `zone ${zone.id} target`).toBeTruthy()
      if (zone.kind !== 'planar' && zone.kind !== 'wrap') continue
      const offsets: [number, number][] = [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]
      for (const [ox, oy] of offsets) {
        const placement = resolvePlacement(zone, target!.geometry, { offsetX: ox, offsetY: oy, scale: 1, rotation: 25 }, 1.3)
        expect(placement, `${zone.id} @ ${ox},${oy} should hit surface`).not.toBeNull()
        const decal = buildDecalGeometry(target!.geometry, placement!)
        const tris = decal.getAttribute('position').count / 3
        expect(tris, `${zone.id} @ ${ox},${oy} decal triangles`).toBeGreaterThan(4)
        // decal must stay on the visible side: all vertices near the hit point
        const p = decal.getAttribute('position')
        const v = new Vector3()
        let maxD = 0
        for (let i = 0; i < p.count; i++) maxD = Math.max(maxD, v.fromBufferAttribute(p, i).distanceTo(placement!.position))
        expect(maxD, `${zone.id} decal spread`).toBeLessThan(Math.hypot(placement!.size.x, placement!.size.y) * 0.75 + zone.depth)
      }
      // round-trip: centre hit maps back to ~0 offsets
      const c = resolvePlacement(zone, target!.geometry, { offsetX: 0.4, offsetY: -0.3, scale: 1, rotation: 0 }, 1)!
      const back = pointToOffsets(zone, c.position)!
      expect(Math.abs(back.offsetX - 0.4)).toBeLessThan(0.2)
      expect(Math.abs(back.offsetY + 0.3)).toBeLessThan(0.35)
    }
  })
})
