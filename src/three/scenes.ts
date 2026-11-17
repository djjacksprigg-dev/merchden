/**
 * Scene styles – the "feel" of the presentation: lighting colours, viewer
 * backdrop and the matching painted background + finishing effects used in
 * exported images. Everything is procedural (no image files).
 */

export type SceneId = 'studio-light' | 'studio-dark' | 'desk' | 'arena' | 'display' | 'exhibition' | 'minimal' | 'neon' | 'retro' | 'pop'

import { useStudio } from '../state/studio'

/** Brand colours for environments that show the team's colours (read at paint time). */
function brand() {
  const k = useStudio.getState().brandKit
  return { primary: k.primary, secondary: k.secondary, accent: k.accent }
}

export interface SceneLights {
  env: string
  top: number
  key: [string, number]
  fill: [string, number]
  rimL: [string, number]
  rimR: [string, number]
  floor: number
  hemiSky: string
  hemiGround: string
  hemi: number
  dir: [string, number]
  shadow: number
  exposure: number
}

export interface SceneDef {
  id: SceneId
  label: string
  /** CSS background for the viewer */
  css: string
  /** Optional CSS overlay (vignette, grain, scanlines) */
  overlay?: string
  /** Neon-style glow colours around the product */
  glow?: [string, string]
  /** Viewer overlay text is dark on light scenes */
  lightText: boolean
  lights: SceneLights
  /** paint the export background */
  paint: (ctx: CanvasRenderingContext2D, size: number) => void
  /** finishing pass over the whole export (grain, scanlines…) */
  post?: (ctx: CanvasRenderingContext2D, size: number) => void
  swatch: string
}

function radial(ctx: CanvasRenderingContext2D, s: number, stops: [number, string][], cy = 0.42) {
  const g = ctx.createRadialGradient(s / 2, s * cy, s * 0.04, s / 2, s * 0.5, s * 0.78)
  for (const [o, c] of stops) g.addColorStop(o, c)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
}

function rand(seed: number) {
  let v = seed >>> 0
  return () => {
    v = (v * 1664525 + 1013904223) >>> 0
    return v / 4294967296
  }
}

function grain(ctx: CanvasRenderingContext2D, s: number, amount: number) {
  const img = ctx.getImageData(0, 0, s, s)
  const r = rand(7)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * amount
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
}

function grainRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, amount: number) {
  if (w <= 0 || h <= 0) return
  const img = ctx.getImageData(x, y, w, h)
  const r = rand(3)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * amount
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n
  }
  ctx.putImageData(img, x, y)
}

function vignette(ctx: CanvasRenderingContext2D, s: number, strength: number) {
  const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.35, s / 2, s / 2, s * 0.75)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${strength})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
}

function scanlines(ctx: CanvasRenderingContext2D, s: number, alpha: number) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`
  const step = Math.max(3, Math.round(s / 360))
  for (let y = 0; y < s; y += step) ctx.fillRect(0, y, s, Math.max(1, step / 3))
}

export const SCENES: SceneDef[] = [
  {
    id: 'studio-light',
    label: 'White studio',
    swatch: 'linear-gradient(135deg,#ffffff,#dfe1e5)',
    css: 'radial-gradient(ellipse 75% 65% at 50% 42%, #ffffff 0%, #f1f2f4 45%, #dfe1e5 100%)',
    lightText: true,
    lights: {
      env: '#c9ccd1',
      top: 2.2,
      key: ['#ffffff', 2.6],
      fill: ['#ffffff', 1.1],
      rimL: ['#ffffff', 1.4],
      rimR: ['#ffffff', 1.4],
      floor: 0.9,
      hemiSky: '#ffffff',
      hemiGround: '#d9dadc',
      hemi: 0.35,
      dir: ['#ffffff', 1.15],
      shadow: 0.38,
      exposure: 1,
    },
    paint: (c, s) =>
      radial(c, s, [
        [0, '#ffffff'],
        [0.45, '#f1f2f4'],
        [1, '#dfe1e5'],
      ]),
  },
  {
    id: 'studio-dark',
    label: 'Dark studio',
    swatch: 'linear-gradient(135deg,#273246,#090d14)',
    css: 'radial-gradient(ellipse 70% 60% at 50% 40%, #273246 0%, #141b28 55%, #090d14 100%)',
    lightText: false,
    lights: {
      env: '#2a2f38',
      top: 2.2,
      key: ['#ffffff', 2.6],
      fill: ['#ffffff', 1.1],
      rimL: ['#cfe1ff', 1.6],
      rimR: ['#cfe1ff', 1.6],
      floor: 0.4,
      hemiSky: '#ffffff',
      hemiGround: '#30343c',
      hemi: 0.35,
      dir: ['#ffffff', 1.15],
      shadow: 0.55,
      exposure: 1,
    },
    paint: (c, s) =>
      radial(c, s, [
        [0, '#273246'],
        [0.55, '#141b28'],
        [1, '#090d14'],
      ]),
  },
  {
    id: 'desk',
    label: 'Gaming desk',
    swatch: 'linear-gradient(180deg,#151a26 0 58%,#ff7a1a 58% 60%,#22262f 60%)',
    css: 'linear-gradient(180deg, #121722 0%, #0c1018 58%, rgba(255,122,26,0.55) 59.5%, #1d212a 61%, #121419 100%)',
    overlay: 'radial-gradient(ellipse 60% 25% at 50% 60%, rgba(140,80,255,0.25), transparent 70%)',
    lightText: false,
    lights: {
      env: '#1a1d26',
      top: 1.8,
      key: ['#fff1e6', 2.2],
      fill: ['#c9b8ff', 0.9],
      rimL: ['#ff7a1a', 2.6],
      rimR: ['#8c5cff', 2.6],
      floor: 0.5,
      hemiSky: '#e8e2ff',
      hemiGround: '#1d212a',
      hemi: 0.3,
      dir: ['#ffffff', 1.1],
      shadow: 0.6,
      exposure: 1,
    },
    paint: (c, s) => {
      const wall = c.createLinearGradient(0, 0, 0, s * 0.6)
      wall.addColorStop(0, '#151a26')
      wall.addColorStop(1, '#0b0f17')
      c.fillStyle = wall
      c.fillRect(0, 0, s, s * 0.6)
      // acoustic panels on the wall
      c.fillStyle = 'rgba(255,255,255,0.035)'
      for (let i = 0; i < 6; i++) {
        const x = s * (0.06 + (i % 3) * 0.32)
        const y = s * (0.06 + Math.floor(i / 3) * 0.24)
        c.fillRect(x, y, s * 0.24, s * 0.2)
      }
      // LED bokeh on the wall
      const r = rand(11)
      for (let i = 0; i < 40; i++) {
        c.fillStyle = r() > 0.5 ? `rgba(255,122,26,${0.05 + r() * 0.1})` : `rgba(140,92,255,${0.05 + r() * 0.1})`
        c.beginPath()
        c.arc(r() * s, s * r() * 0.5, s * (0.006 + r() * 0.02), 0, Math.PI * 2)
        c.fill()
      }
      // desk surface with an RGB light strip along the back edge
      const desk = c.createLinearGradient(0, s * 0.6, 0, s)
      desk.addColorStop(0, '#262a33')
      desk.addColorStop(1, '#101216')
      c.fillStyle = desk
      c.fillRect(0, s * 0.6, s, s * 0.4)
      const strip = c.createLinearGradient(0, 0, s, 0)
      strip.addColorStop(0, '#8c5cff')
      strip.addColorStop(0.5, '#ff7a1a')
      strip.addColorStop(1, '#8c5cff')
      c.fillStyle = strip
      c.fillRect(0, s * 0.596, s, s * 0.008)
      const spill = c.createLinearGradient(0, s * 0.6, 0, s * 0.75)
      spill.addColorStop(0, 'rgba(255,122,26,0.22)')
      spill.addColorStop(1, 'rgba(255,122,26,0)')
      c.fillStyle = spill
      c.fillRect(0, s * 0.6, s, s * 0.15)
      // keyboard and mouse silhouettes on the desk
      c.fillStyle = 'rgba(0,0,0,0.45)'
      c.fillRect(s * 0.05, s * 0.86, s * 0.26, s * 0.06)
      c.beginPath()
      c.ellipse(s * 0.86, s * 0.89, s * 0.025, s * 0.035, 0, 0, Math.PI * 2)
      c.fill()
    },
    post: (c, s) => vignette(c, s, 0.35),
  },
  {
    id: 'neon',
    label: 'Neon',
    swatch: 'linear-gradient(135deg,#ff2bd6,#18e0ff)',
    css: 'radial-gradient(ellipse 60% 50% at 50% 45%, #2a0d3d 0%, #12061f 55%, #05020a 100%)',
    overlay:
      'linear-gradient(to top, rgba(255,43,214,0.18), transparent 35%), repeating-linear-gradient(90deg, rgba(24,224,255,0.07) 0 1px, transparent 1px 48px)',
    glow: ['#ff2bd6', '#18e0ff'],
    lightText: false,
    lights: {
      env: '#0b0414',
      top: 0.6,
      key: ['#ffd6f6', 1.4],
      fill: ['#b9f6ff', 0.6],
      rimL: ['#ff2bd6', 5],
      rimR: ['#18e0ff', 5],
      floor: 0.6,
      hemiSky: '#6b2a8f',
      hemiGround: '#0a0a24',
      hemi: 0.45,
      dir: ['#ffe9fb', 0.7],
      shadow: 0.6,
      exposure: 1.05,
    },
    paint: (c, s) => {
      radial(c, s, [
        [0, '#2a0d3d'],
        [0.55, '#12061f'],
        [1, '#05020a'],
      ], 0.45)
      // neon floor grid
      c.save()
      c.strokeStyle = 'rgba(24,224,255,0.35)'
      c.lineWidth = Math.max(1, s / 900)
      const horizon = s * 0.72
      for (let i = -12; i <= 12; i++) {
        c.beginPath()
        c.moveTo(s / 2 + i * s * 0.02, horizon)
        c.lineTo(s / 2 + i * s * 0.16, s)
        c.stroke()
      }
      for (let k = 0; k < 10; k++) {
        const y = horizon + (s - horizon) * Math.pow(k / 10, 1.8)
        c.globalAlpha = 0.2 + 0.5 * (k / 10)
        c.beginPath()
        c.moveTo(0, y)
        c.lineTo(s, y)
        c.stroke()
      }
      c.restore()
      const g = c.createLinearGradient(0, s, 0, s * 0.6)
      g.addColorStop(0, 'rgba(255,43,214,0.25)')
      g.addColorStop(1, 'rgba(255,43,214,0)')
      c.fillStyle = g
      c.fillRect(0, 0, s, s)
    },
    post: (c, s) => vignette(c, s, 0.45),
  },
  {
    id: 'retro',
    label: 'Retro',
    swatch: 'linear-gradient(180deg,#2b1055,#ff6b6b,#ffd23f)',
    css: 'linear-gradient(180deg, #1a0b3a 0%, #4b1d6e 38%, #c2416b 60%, #ff8a3d 72%, #2a0f44 72.2%, #160826 100%)',
    overlay:
      'radial-gradient(circle at 50% 66%, rgba(255,210,63,0.55) 0 9%, transparent 9.2%), repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 2px, transparent 2px 4px)',
    lightText: false,
    lights: {
      env: '#3a1650',
      top: 1.2,
      key: ['#ffd9b0', 2.4],
      fill: ['#ff9bd2', 1],
      rimL: ['#ff6b3d', 2.6],
      rimR: ['#8a5cff', 2.6],
      floor: 0.5,
      hemiSky: '#ffb38a',
      hemiGround: '#2a0f44',
      hemi: 0.4,
      dir: ['#ffe2c4', 1.1],
      shadow: 0.5,
      exposure: 1,
    },
    paint: (c, s) => {
      const sky = c.createLinearGradient(0, 0, 0, s * 0.72)
      sky.addColorStop(0, '#1a0b3a')
      sky.addColorStop(0.5, '#4b1d6e')
      sky.addColorStop(0.82, '#c2416b')
      sky.addColorStop(1, '#ff8a3d')
      c.fillStyle = sky
      c.fillRect(0, 0, s, s * 0.72)
      // striped retro sun
      const cx = s / 2
      const cy = s * 0.66
      const r = s * 0.22
      c.save()
      c.beginPath()
      c.arc(cx, cy, r, 0, Math.PI * 2)
      c.clip()
      const sun = c.createLinearGradient(0, cy - r, 0, cy + r)
      sun.addColorStop(0, '#ffe066')
      sun.addColorStop(1, '#ff4f8b')
      c.fillStyle = sun
      c.fillRect(cx - r, cy - r, r * 2, r * 2)
      c.fillStyle = '#4b1d6e'
      for (let k = 0; k < 7; k++) {
        const y = cy - r * 0.1 + k * r * 0.17
        c.fillRect(cx - r, y, r * 2, r * 0.02 + k * r * 0.012)
      }
      c.restore()
      // ground + perspective grid
      const ground = c.createLinearGradient(0, s * 0.72, 0, s)
      ground.addColorStop(0, '#2a0f44')
      ground.addColorStop(1, '#0e0518')
      c.fillStyle = ground
      c.fillRect(0, s * 0.72, s, s * 0.28)
      c.strokeStyle = 'rgba(255,79,216,0.7)'
      c.lineWidth = Math.max(1, s / 700)
      for (let i = -14; i <= 14; i++) {
        c.beginPath()
        c.moveTo(cx + i * s * 0.015, s * 0.72)
        c.lineTo(cx + i * s * 0.14, s)
        c.stroke()
      }
      for (let k = 1; k < 9; k++) {
        const y = s * 0.72 + s * 0.28 * Math.pow(k / 9, 1.9)
        c.beginPath()
        c.moveTo(0, y)
        c.lineTo(s, y)
        c.stroke()
      }
    },
    post: (c, s) => {
      scanlines(c, s, 0.08)
      grain(c, s, 18)
      vignette(c, s, 0.35)
    },
  },
  {
    id: 'arena',
    label: 'Esports stage',
    swatch: 'radial-gradient(circle at 50% 20%,#4d7cff,#05070d)',
    css: 'radial-gradient(ellipse 35% 70% at 50% 0%, rgba(120,160,255,0.45) 0%, transparent 70%), radial-gradient(ellipse 80% 40% at 50% 92%, #1b2a55 0%, transparent 70%), #04060c',
    overlay: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)',
    lightText: false,
    lights: {
      env: '#05070d',
      top: 3.2,
      key: ['#dbe6ff', 1.6],
      fill: ['#9bb6ff', 0.5],
      rimL: ['#2f6bff', 4],
      rimR: ['#2f6bff', 4],
      floor: 0.2,
      hemiSky: '#9fb8ff',
      hemiGround: '#05070d',
      hemi: 0.25,
      dir: ['#ffffff', 1.5],
      shadow: 0.7,
      exposure: 1.05,
    },
    paint: (c, s) => {
      c.fillStyle = '#04060c'
      c.fillRect(0, 0, s, s)
      // spotlight cone from above
      const cone = c.createRadialGradient(s / 2, 0, s * 0.02, s / 2, 0, s * 0.95)
      cone.addColorStop(0, 'rgba(150,185,255,0.55)')
      cone.addColorStop(0.5, 'rgba(70,110,230,0.18)')
      cone.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = cone
      c.beginPath()
      c.moveTo(s * 0.42, 0)
      c.lineTo(s * 0.58, 0)
      c.lineTo(s * 0.85, s)
      c.lineTo(s * 0.15, s)
      c.closePath()
      c.fill()
      // glowing stage floor
      const floor = c.createRadialGradient(s / 2, s * 0.9, s * 0.02, s / 2, s * 0.9, s * 0.45)
      floor.addColorStop(0, 'rgba(60,110,255,0.55)')
      floor.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = floor
      c.fillRect(0, s * 0.6, s, s * 0.4)
      // crowd bokeh
      const r = rand(42)
      for (let i = 0; i < 90; i++) {
        c.fillStyle = `rgba(${120 + r() * 100},${150 + r() * 80},255,${0.05 + r() * 0.12})`
        c.beginPath()
        c.arc(r() * s, s * (0.05 + r() * 0.5), s * (0.004 + r() * 0.014), 0, Math.PI * 2)
        c.fill()
      }
    },
    post: (c, s) => vignette(c, s, 0.6),
  },
  {
    id: 'display',
    label: 'Clothing display',
    swatch: 'linear-gradient(180deg,#e9e3d9 0 72%,#c9a77c 72%)',
    css: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.035) 0 2px, transparent 2px 46px), linear-gradient(180deg, #f1ece4 0%, #e5ded2 74%, #cfae86 74.5%, #b8936a 100%)',
    lightText: true,
    lights: {
      env: '#c9ccd1',
      top: 2.2,
      key: ['#ffffff', 2.6],
      fill: ['#ffffff', 1.1],
      rimL: ['#ffffff', 1.4],
      rimR: ['#ffffff', 1.4],
      floor: 0.9,
      hemiSky: '#ffffff',
      hemiGround: '#d9dadc',
      hemi: 0.35,
      dir: ['#ffffff', 1.15],
      shadow: 0.38,
      exposure: 1,
    },
    paint: (c, s) => {
      const wall = c.createLinearGradient(0, 0, 0, s * 0.74)
      wall.addColorStop(0, '#f3eee6')
      wall.addColorStop(1, '#e2dacd')
      c.fillStyle = wall
      c.fillRect(0, 0, s, s * 0.74)
      // slatted wall panel
      c.fillStyle = 'rgba(0,0,0,0.04)'
      for (let x = 0; x < s; x += s / 36) c.fillRect(x, 0, Math.max(1, s / 600), s * 0.74)
      // display rail with hangers at the top
      c.fillStyle = '#9a9ea6'
      c.fillRect(s * 0.08, s * 0.08, s * 0.84, s * 0.008)
      c.strokeStyle = 'rgba(80,80,90,0.5)'
      c.lineWidth = s * 0.003
      for (let i = 0; i < 9; i++) {
        const x = s * (0.12 + i * 0.095)
        c.beginPath()
        c.moveTo(x, s * 0.088)
        c.lineTo(x - s * 0.025, s * 0.12)
        c.lineTo(x + s * 0.025, s * 0.12)
        c.closePath()
        c.stroke()
      }
      // spotlight pool
      const g = c.createRadialGradient(s / 2, s * 0.35, s * 0.05, s / 2, s * 0.4, s * 0.55)
      g.addColorStop(0, 'rgba(255,250,240,0.6)')
      g.addColorStop(1, 'rgba(255,250,240,0)')
      c.fillStyle = g
      c.fillRect(0, 0, s, s * 0.74)
      // light oak floor
      const floor = c.createLinearGradient(0, s * 0.74, 0, s)
      floor.addColorStop(0, '#d2b48e')
      floor.addColorStop(1, '#b38d63')
      c.fillStyle = floor
      c.fillRect(0, s * 0.74, s, s * 0.26)
      c.fillStyle = 'rgba(0,0,0,0.05)'
      for (let x = 0; x < s; x += s / 9) c.fillRect(x, s * 0.74, Math.max(1, s / 500), s * 0.26)
    },
    post: (c, s) => vignette(c, s, 0.12),
  },
  {
    id: 'exhibition',
    label: 'Merch exhibition',
    swatch: 'linear-gradient(135deg,#1d2b4f 0 50%,#ff7a1a 50%)',
    css: 'linear-gradient(180deg, #2a2f3a 0 6%, transparent 6%), linear-gradient(115deg, #1d2b4f 0 55%, #ff7a1a 55% 61%, #1d2b4f 61%), #1d2b4f',
    overlay: 'linear-gradient(180deg, transparent 76%, rgba(40,44,52,0.85) 76%), radial-gradient(ellipse 50% 40% at 50% 45%, rgba(255,255,255,0.18), transparent 70%)',
    lightText: false,
    lights: {
      env: '#2a2f38',
      top: 2.4,
      key: ['#ffffff', 2.6],
      fill: ['#ffffff', 1.1],
      rimL: ['#ffffff', 1.6],
      rimR: ['#ffffff', 1.6],
      floor: 0.5,
      hemiSky: '#ffffff',
      hemiGround: '#30343c',
      hemi: 0.35,
      dir: ['#ffffff', 1.2],
      shadow: 0.5,
      exposure: 1,
    },
    paint: (c, s) => {
      const b = brand()
      c.fillStyle = b.primary
      c.fillRect(0, 0, s, s)
      // diagonal brand-colour stripes on the booth backdrop
      c.save()
      c.fillStyle = b.secondary
      c.beginPath()
      c.moveTo(s * 0.62, 0)
      c.lineTo(s * 0.7, 0)
      c.lineTo(s * 0.45, s * 0.76)
      c.lineTo(s * 0.37, s * 0.76)
      c.closePath()
      c.fill()
      c.globalAlpha = 0.5
      c.fillStyle = b.accent
      c.beginPath()
      c.moveTo(s * 0.73, 0)
      c.lineTo(s * 0.75, 0)
      c.lineTo(s * 0.5, s * 0.76)
      c.lineTo(s * 0.48, s * 0.76)
      c.closePath()
      c.fill()
      c.restore()
      // soft light on the backdrop
      const g = c.createRadialGradient(s / 2, s * 0.42, s * 0.05, s / 2, s * 0.45, s * 0.6)
      g.addColorStop(0, 'rgba(255,255,255,0.22)')
      g.addColorStop(1, 'rgba(0,0,0,0.25)')
      c.fillStyle = g
      c.fillRect(0, 0, s, s * 0.76)
      // lighting truss
      c.fillStyle = '#3a3f4a'
      c.fillRect(0, 0, s, s * 0.05)
      c.strokeStyle = '#555b68'
      c.lineWidth = s * 0.003
      for (let x = 0; x < s; x += s * 0.04) {
        c.beginPath()
        c.moveTo(x, 0)
        c.lineTo(x + s * 0.02, s * 0.05)
        c.lineTo(x + s * 0.04, 0)
        c.stroke()
      }
      // carpet floor
      const floor = c.createLinearGradient(0, s * 0.76, 0, s)
      floor.addColorStop(0, '#3b3f48')
      floor.addColorStop(1, '#23262c')
      c.fillStyle = floor
      c.fillRect(0, s * 0.76, s, s * 0.24)
      grainRect(c, 0, Math.round(s * 0.76), s, Math.round(s * 0.24), 10)
    },
    post: (c, s) => vignette(c, s, 0.3),
  },
  {
    id: 'minimal',
    label: 'Minimalist',
    swatch: 'radial-gradient(circle at 50% 45%,#e8dfd3 35%,#f6f3ee 36%)',
    css: 'radial-gradient(circle at 50% 44%, #ebe3d8 0 28%, transparent 28.3%), linear-gradient(180deg, #f6f3ee 0 80%, #ece7df 80%)',
    lightText: true,
    lights: {
      env: '#c9ccd1',
      top: 2.2,
      key: ['#ffffff', 2.6],
      fill: ['#ffffff', 1.1],
      rimL: ['#ffffff', 1.4],
      rimR: ['#ffffff', 1.4],
      floor: 0.9,
      hemiSky: '#ffffff',
      hemiGround: '#d9dadc',
      hemi: 0.35,
      dir: ['#ffffff', 1.15],
      shadow: 0.38,
      exposure: 1,
    },
    paint: (c, s) => {
      c.fillStyle = '#f6f3ee'
      c.fillRect(0, 0, s, s)
      c.fillStyle = '#ebe3d8'
      c.beginPath()
      c.arc(s / 2, s * 0.44, s * 0.3, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = '#ece7df'
      c.fillRect(0, s * 0.8, s, s * 0.2)
    },
  },
  {
    id: 'pop',
    label: 'Pop art',
    swatch: 'radial-gradient(circle,#ffe14d 30%,#ff3d7f 31%)',
    css: 'radial-gradient(circle, rgba(255,61,127,0.35) 18%, transparent 19%) 0 0 / 22px 22px, radial-gradient(ellipse at center, #ffe96b 0%, #ffd23f 60%, #ffb81f 100%)',
    lightText: true,
    lights: {
      env: '#f3d27a',
      top: 2.4,
      key: ['#ffffff', 2.8],
      fill: ['#fff3c4', 1.4],
      rimL: ['#ffffff', 1.6],
      rimR: ['#ff7fb0', 1.4],
      floor: 1,
      hemiSky: '#ffffff',
      hemiGround: '#e9b84a',
      hemi: 0.45,
      dir: ['#ffffff', 1.2],
      shadow: 0.45,
      exposure: 1.02,
    },
    paint: (c, s) => {
      radial(c, s, [
        [0, '#ffe96b'],
        [0.6, '#ffd23f'],
        [1, '#ffb81f'],
      ], 0.5)
      // comic burst rays
      c.save()
      c.translate(s / 2, s * 0.48)
      c.fillStyle = 'rgba(255,255,255,0.28)'
      for (let i = 0; i < 18; i++) {
        c.rotate((Math.PI * 2) / 18)
        c.beginPath()
        c.moveTo(0, 0)
        c.lineTo(-s * 0.06, -s)
        c.lineTo(s * 0.06, -s)
        c.closePath()
        c.fill()
      }
      c.restore()
      // halftone dots
      c.fillStyle = 'rgba(255,61,127,0.4)'
      const step = s / 60
      for (let y = 0; y < s; y += step)
        for (let x = (Math.round(y / step) % 2) * (step / 2); x < s; x += step) {
          const d = Math.hypot(x - s / 2, y - s * 0.48) / (s * 0.7)
          const r = step * 0.42 * Math.min(1, Math.max(0, d - 0.25) * 1.6)
          if (r < 0.5) continue
          c.beginPath()
          c.arc(x, y, r, 0, Math.PI * 2)
          c.fill()
        }
    },
  },
]

const ORDER: SceneId[] = ['studio-light', 'studio-dark', 'desk', 'arena', 'display', 'exhibition', 'minimal', 'neon', 'retro', 'pop']
SCENES.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id))

export const SCENE_MAP: Record<SceneId, SceneDef> = Object.fromEntries(SCENES.map((s) => [s.id, s])) as Record<SceneId, SceneDef>

/** Adds a neon glow around the product (drawn from the product's own alpha). */
export function glowLayer(product: HTMLCanvasElement, colors: [string, string], size: number): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = out.height = size
  const ctx = out.getContext('2d')!
  const tint = (col: string) => {
    const t = document.createElement('canvas')
    t.width = t.height = size
    const x = t.getContext('2d')!
    x.drawImage(product, 0, 0, size, size)
    x.globalCompositeOperation = 'source-in'
    x.fillStyle = col
    x.fillRect(0, 0, size, size)
    return t
  }
  const a = tint(colors[0])
  const b = tint(colors[1])
  ctx.filter = `blur(${Math.round(size / 45)}px)`
  ctx.globalAlpha = 0.9
  ctx.drawImage(a, -size * 0.012, 0)
  ctx.drawImage(b, size * 0.012, 0)
  ctx.filter = `blur(${Math.round(size / 110)}px)`
  ctx.globalAlpha = 0.8
  ctx.drawImage(a, -size * 0.004, 0)
  ctx.drawImage(b, size * 0.004, 0)
  return out
}

/** Viewer background for a scene (the exhibition booth uses the team's Brand Kit colours). */
export function sceneCss(scene: SceneDef): string {
  if (scene.id !== 'exhibition') return scene.css
  const b = brand()
  return `linear-gradient(180deg, #3a3f4a 0 5%, transparent 5%), linear-gradient(115deg, ${b.primary} 0 55%, ${b.secondary} 55% 61%, ${b.primary} 61%), ${b.primary}`
}
