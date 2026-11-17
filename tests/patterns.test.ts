import { describe, expect, it } from 'vitest'
import { PRODUCTS } from '../src/three/catalogue'
import { PATTERNS, uvSpan } from '../src/three/engine/patterns'

describe('patterns', () => {
  it('offers solid plus 22 printed patterns (11 classic, 11 esports)', () => {
    expect(PATTERNS[0].id).toBe('solid')
    expect(PATTERNS.length).toBe(23)
    expect(new Set(PATTERNS.map((p) => p.id)).size).toBe(23)
    expect(PATTERNS.filter((p) => p.group === 'esports').length).toBe(11)
  })
  it.each(PRODUCTS.filter((p) => p.patterns).map((p) => [p.id, p] as const))('%s has printable main-colour parts with measurable surfaces', async (_id, def) => {
    const model = (await def.load())()
    const printable = model.parts.filter((p) => p.pattern)
    expect(printable.length).toBeGreaterThan(0)
    for (const part of printable) {
      expect(part.slot).toBe('primary')
      expect(part.geometry.getAttribute('uv')).toBeTruthy()
      const s = uvSpan(part.geometry)
      expect(s.u).toBeGreaterThan(0.01)
      expect(s.v).toBeGreaterThan(0.01)
      expect(s.u).toBeLessThan(20)
      expect(s.v).toBeLessThan(20)
    }
  })
  it('lanyard and sticker are excluded (logo-led products)', () => {
    expect(PRODUCTS.find((p) => p.id === 'lanyard')!.patterns).toBeFalsy()
    expect(PRODUCTS.find((p) => p.id === 'sticker')!.patterns).toBeFalsy()
  })
})
