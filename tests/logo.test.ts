// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { detectKind, LogoError, sanitizeSvg, sniff, validateFile } from '../src/lib/logo'
import { exportFilename, normaliseHex, safeName } from '../src/lib/utils'

describe('logo validation', () => {
  it('accepts supported formats and rejects others', () => {
    expect(detectKind('a.PNG', '')).toBe('png')
    expect(detectKind('a.jpeg', '')).toBe('jpeg')
    expect(detectKind('a.webp', 'image/webp')).toBe('webp')
    expect(detectKind('a.svg', '')).toBe('svg')
    expect(detectKind('a.gif', 'image/gif')).toBeNull()
    expect(() => validateFile({ name: 'a.gif', type: 'image/gif', size: 10 })).toThrow(LogoError)
    expect(() => validateFile({ name: 'a.png', type: 'image/png', size: 11 * 1024 * 1024 })).toThrow(/limit/)
    expect(() => validateFile({ name: 'a.svg', type: 'image/svg+xml', size: 3 * 1024 * 1024 })).toThrow(/limit/)
    expect(() => validateFile({ name: 'a.png', type: 'image/png', size: 0 })).toThrow(/empty/)
  })
  it('sniffs real file signatures', () => {
    expect(sniff(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('png')
    expect(sniff(new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('jpeg')
    expect(sniff(new TextEncoder().encode('<?xml version="1.0"?><svg></svg>'))).toBe('svg')
    expect(sniff(new TextEncoder().encode('hello world, not an image'))).toBeNull()
  })
})

describe('SVG sanitising', () => {
  it('removes scripts, handlers and external references', () => {
    const { svg } = sanitizeSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 50" onload="alert(1)">
        <script>alert(2)</script>
        <foreignObject><div>x</div></foreignObject>
        <style>@import url(http://evil.test/a.css); .a{fill:url(http://evil.test/x)}</style>
        <a href="javascript:alert(3)"><rect width="10" height="10" onclick="alert(4)"/></a>
        <use xlink:href="http://evil.test/s.svg#a"/>
        <use href="#local"/>
        <image href="https://evil.test/x.png"/>
        <circle id="local" cx="5" cy="5" r="4" fill="red"/>
      </svg>`,
    )
    expect(svg).not.toMatch(/script|onload|onclick|foreignObject|evil\.test|javascript:|@import/i)
    expect(svg).toContain('href="#local"')
    expect(svg).toContain('<circle')
  })
  it('rejects entities and broken markup', () => {
    expect(() => sanitizeSvg('<!DOCTYPE svg [<!ENTITY x "y">]><svg>&x;</svg>')).toThrow(LogoError)
    expect(() => sanitizeSvg('<svg><g></svg>')).toThrow(LogoError)
    expect(() => sanitizeSvg('<html></html>')).toThrow(LogoError)
  })
  it('keeps proportions from the viewBox', () => {
    const r = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect width="200" height="100"/></svg>')
    expect(r.width / r.height).toBeCloseTo(2, 2)
  })
})

describe('utils', () => {
  it('normalises hex colours', () => {
    expect(normaliseHex('#ABC')).toBe('#aabbcc')
    expect(normaliseHex('2f8cff')).toBe('#2f8cff')
    expect(normaliseHex('#12345')).toBeNull()
    expect(normaliseHex('red')).toBeNull()
  })
  it('builds clear export filenames', () => {
    expect(exportFilename('Red Rift Esports', 'Hoodie', 'Front')).toBe('Red-Rift-Esports_Hoodie_Front.png')
    expect(exportFilename('', '', '')).toBe('MyTeam_Product_View.png')
    expect(safeName('Équipe/../ Ünïcode!!')).toBe('Equipe-Unicode')
  })
})
