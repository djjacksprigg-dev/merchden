/**
 * 2D preview for computers where WebGL (3D graphics) is switched off.
 *
 * This is NOT a fake 3D view: it draws the same procedural product models with
 * a small software renderer on a normal 2D canvas (flat-shaded triangles, sorted
 * back to front) and prints logos and text using the same decal placement as the
 * 3D studio. It shows fixed views (front, back, sides, three-quarter) and powers
 * image exports, so students can still design and download their work.
 * Printed patterns are only shown in the full 3D studio.
 */
import { useEffect, useRef, useState } from 'react'
import { Box3, Sphere, Vector3, type BufferGeometry } from 'three'
import { Info, LoaderCircle } from 'lucide-react'
import { useStudio } from '../../state/studio'
import { loadBuilder, PRODUCT_MAP, viewFor } from '../../three/catalogue'
import type { Design, ViewName } from '../../lib/types'
import type { Part, ProductDef, ProductModel } from '../../three/engine/types'
import { buildDecalGeometry, resolvePlacement } from '../../three/engine/decals'
import { getCachedImage } from '../../three/engine/textures'
import { getTextCanvas } from '../../three/engine/text'
import { bakeAmbientOcclusion } from '../../three/engine/ao'
import { markStageReady, registerRenderer, stageKey, type CaptureOptions } from '../../three/renderService'
import { preloadLogos, preloadText } from './useLogoImage'
import { composeExport } from './ExportBridge'
import { SCENES, SCENE_MAP, sceneCss } from '../../three/scenes'

interface Loaded {
  id: string
  model: ProductModel
  center: Vector3
  radius: number
}

type Img = HTMLImageElement | HTMLCanvasElement

interface Tri {
  z: number
  p: number[] // x0,y0,x1,y1,x2,y2
  fill?: string
  img?: Img
  uv?: number[]
  alpha: number
}

const FOV = 30

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt((hex || '#888888').replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function partColor(part: Part, design: Design, def: ProductDef) {
  if (part.slot) {
    const legacy = part.slot === 'sleeve' ? design.colors.primary : part.slot === 'collar' ? design.colors.trim : undefined
    return design.colors[part.slot] ?? legacy ?? def.defaults[part.slot] ?? '#888888'
  }
  return part.color ?? '#888888'
}

/** Software-renders the product (transparent background) at w × h. */
export function renderProduct2D(loaded: Loaded, design: Design, view: { azimuth: number; polar: number }, w: number, h: number, zoom = 1): HTMLCanvasElement {
  const def = PRODUCT_MAP[design.productId]
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const ctx = out.getContext('2d')!
  const { center, radius, model } = loaded

  const vfov = (FOV * Math.PI) / 180
  const dist = ((radius * 1.1) / Math.sin(vfov / 2)) / zoom
  const sp = Math.sin(view.polar)
  const cam = new Vector3(Math.sin(view.azimuth) * sp, Math.cos(view.polar), Math.cos(view.azimuth) * sp).multiplyScalar(dist).add(center)
  const f = center.clone().sub(cam).normalize()
  const r = new Vector3().crossVectors(f, new Vector3(0, 1, 0))
  if (r.lengthSq() < 1e-6) r.set(1, 0, 0)
  r.normalize()
  const u = new Vector3().crossVectors(r, f).normalize()
  const F = Math.min(w, h) / 2 / Math.tan(vfov / 2)
  const light = r.clone().multiplyScalar(-0.35).addScaledVector(u, 0.6).addScaledVector(f, -0.72).normalize()

  const tris: Tri[] = []
  const tmp = new Vector3()
  const project = (x: number, y: number, z: number, o: number[], i: number) => {
    tmp.set(x - cam.x, y - cam.y, z - cam.z)
    const zc = tmp.dot(f)
    o[i] = w / 2 + (tmp.dot(r) / zc) * F
    o[i + 1] = h / 2 - (tmp.dot(u) / zc) * F
    return zc
  }

  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const n = new Vector3()

  const addGeometry = (g: BufferGeometry, opts: { rgb?: [number, number, number]; img?: Img; alpha: number; cull: 'front' | 'back' | 'none'; bias: number; shadeBack: number }) => {
    const pos = g.getAttribute('position')
    const col = g.getAttribute('color')
    const uv = g.getAttribute('uv')
    const index = g.index
    const count = index ? index.count : pos.count
    for (let t = 0; t + 2 < count; t += 3) {
      const i0 = index ? index.getX(t) : t
      const i1 = index ? index.getX(t + 1) : t + 1
      const i2 = index ? index.getX(t + 2) : t + 2
      a.fromBufferAttribute(pos, i0)
      b.fromBufferAttribute(pos, i1)
      c.fromBufferAttribute(pos, i2)
      n.subVectors(c, b).cross(tmp.subVectors(a, b)).normalize()
      // facing: normal against the view ray
      const toCam = cam.clone().sub(a)
      const facing = n.dot(toCam) > 0
      if (opts.cull === 'back' && !facing) continue
      if (opts.cull === 'front' && facing) continue
      const p = new Array<number>(6)
      const z0 = project(a.x, a.y, a.z, p, 0)
      const z1 = project(b.x, b.y, b.z, p, 2)
      const z2 = project(c.x, c.y, c.z, p, 4)
      if (z0 <= 0.01 || z1 <= 0.01 || z2 <= 0.01) continue
      const z = (z0 + z1 + z2) / 3 - opts.bias
      if (opts.img && uv) {
        tris.push({ z, p, img: opts.img, uv: [uv.getX(i0), uv.getY(i0), uv.getX(i1), uv.getY(i1), uv.getX(i2), uv.getY(i2)], alpha: opts.alpha })
        continue
      }
      const nn = facing ? n : n.clone().negate()
      let shade = 0.42 + 0.58 * Math.max(0, nn.dot(light))
      if (!facing) shade *= opts.shadeBack
      if (col) shade *= (col.getX(i0) + col.getX(i1) + col.getX(i2)) / 3
      const rgb = opts.rgb ?? [136, 136, 136]
      tris.push({ z, p, fill: `rgb(${Math.round(rgb[0] * shade)},${Math.round(rgb[1] * shade)},${Math.round(rgb[2] * shade)})`, alpha: opts.alpha })
    }
  }

  for (const part of model.parts) {
    if (part.special === 'sticker-back') continue
    const rgb = hexRgb(partColor(part, design, def))
    const alpha = part.finish === 'glass' ? 0.28 : 1
    addGeometry(part.geometry, {
      rgb,
      alpha,
      cull: part.backSide ? 'front' : part.doubleSide || part.special === 'sticker-front' ? 'none' : 'back',
      bias: 0,
      shadeBack: 0.55,
    })
  }

  // logos and text, placed exactly like the 3D studio
  const logos = useStudio.getState().logos
  for (const layer of design.layers) {
    const zone = model.zones.find((zz) => zz.id === layer.zoneId)
    if (!zone || (zone.kind !== 'planar' && zone.kind !== 'wrap')) continue
    const part = model.parts.find((pp) => pp.key === zone.target)
    if (!part) continue
    const img: Img | null = layer.text ? getTextCanvas(layer.text) : layer.logoId && logos[layer.logoId] ? getCachedImage(logos[layer.logoId].dataUrl) : null
    if (!img) continue
    const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width
    const ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height
    const pl = resolvePlacement(zone, part.geometry, layer, iw / ih)
    if (!pl) continue
    const dg = buildDecalGeometry(part.geometry, pl)
    addGeometry(dg, { img, alpha: layer.opacity ?? 1, cull: 'back', bias: radius * 0.012, shadeBack: 1 })
    dg.dispose()
  }

  tris.sort((p, q) => q.z - p.z)
  ctx.lineJoin = 'round'
  for (const t of tris) {
    const p = t.p
    ctx.globalAlpha = t.alpha
    if (t.fill) {
      ctx.beginPath()
      ctx.moveTo(p[0], p[1])
      ctx.lineTo(p[2], p[3])
      ctx.lineTo(p[4], p[5])
      ctx.closePath()
      ctx.fillStyle = t.fill
      ctx.strokeStyle = t.fill
      ctx.lineWidth = 0.7
      ctx.fill()
      if (t.alpha === 1) ctx.stroke()
    } else if (t.img && t.uv) {
      drawTexturedTri(ctx, t.img, p, t.uv)
    }
  }
  ctx.globalAlpha = 1
  return out
}

/** Affine-maps one image triangle onto one screen triangle. */
function drawTexturedTri(ctx: CanvasRenderingContext2D, img: Img, p: number[], uv: number[]) {
  const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width
  const ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height
  const u0 = uv[0] * iw
  const v0 = (1 - uv[1]) * ih
  const u1 = uv[2] * iw
  const v1 = (1 - uv[3]) * ih
  const u2 = uv[4] * iw
  const v2 = (1 - uv[5]) * ih
  const det = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0)
  if (Math.abs(det) < 1e-6) return
  const [x0, y0, x1, y1, x2, y2] = p
  const A = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / det
  const B = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / det
  const C = ((x2 - x0) * (u1 - u0) - (x1 - x0) * (u2 - u0)) / det
  const D = ((y2 - y0) * (u1 - u0) - (y1 - y0) * (u2 - u0)) / det
  const E = x0 - A * u0 - C * v0
  const Fv = y0 - B * u0 - D * v0
  // grow the clip slightly so neighbouring triangles meet without hairline gaps
  const cx = (x0 + x1 + x2) / 3
  const cy = (y0 + y1 + y2) / 3
  const g = (x: number, y: number) => {
    const dx = x - cx
    const dy = y - cy
    const l = Math.hypot(dx, dy) || 1
    return [x + (dx / l) * 0.6, y + (dy / l) * 0.6]
  }
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(...(g(x0, y0) as [number, number]))
  ctx.lineTo(...(g(x1, y1) as [number, number]))
  ctx.lineTo(...(g(x2, y2) as [number, number]))
  ctx.closePath()
  ctx.clip()
  ctx.setTransform(A, B, C, D, E, Fv)
  ctx.drawImage(img, 0, 0)
  ctx.restore()
}

export function Fallback2D() {
  const editorDesign = useStudio((s) => s.design)
  const override = useStudio((s) => s.renderOverride)
  const design = override ?? editorDesign
  const def = PRODUCT_MAP[design.productId]
  const viewReq = useStudio((s) => s.viewRequest)
  const logos = useStudio((s) => s.logos)
  const sceneId = useStudio((s) => s.scene)
  const scene = SCENE_MAP[sceneId] ?? SCENES[0]
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const loadedRef = useRef<Loaded | null>(null)
  const [view, setView] = useState<ViewName>('three-quarter')
  const [zoom, setZoom] = useState(1)
  const [tick, setTick] = useState(0)
  const [rendering, setRendering] = useState(false)
  const host = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // load + build the model (same builders as the 3D studio)
  useEffect(() => {
    let cancelled = false
    useStudio.getState().setModelLoading(true)
    loadBuilder(def)
      .then((build) => {
        if (cancelled) return
        const model = build()
        const box = new Box3()
        for (const p of model.parts) {
          p.geometry.computeBoundingBox()
          box.union(p.geometry.boundingBox!)
        }
        const sphere = box.getBoundingSphere(new Sphere())
        try {
          bakeAmbientOcclusion(model, Math.max(0.3, sphere.radius), 'low')
        } catch {
          /* shading is optional */
        }
        const next = { id: def.id, model, center: box.getCenter(new Vector3()), radius: Math.max(0.3, sphere.radius) }
        loadedRef.current = next
        setLoaded(next)
        useStudio.getState().setModelInfo(def.id, model.zones)
        useStudio.getState().setModelLoading(false)
      })
      .catch(() => {
        useStudio.getState().setModelLoading(false)
        useStudio.getState().toast(`Sorry – the ${def.name} model could not be loaded.`, 'error')
      })
    return () => {
      cancelled = true
    }
  }, [def])

  // camera buttons
  useEffect(() => {
    setView(viewReq.view === 'reset' ? 'three-quarter' : viewReq.view)
    if (viewReq.view === 'reset') setZoom(1)
  }, [viewReq.nonce, viewReq.view])
  useEffect(() => {
    const onZoom = (e: Event) => setZoom((z) => Math.min(2.4, Math.max(0.6, z / (e as CustomEvent<number>).detail)))
    window.addEventListener('mf-zoom', onZoom)
    return () => window.removeEventListener('mf-zoom', onZoom)
  }, [])
  useEffect(() => {
    const ro = new ResizeObserver(() => setTick((t) => t + 1))
    if (host.current) ro.observe(host.current)
    return () => ro.disconnect()
  }, [])

  // images and text must be ready before drawing
  useEffect(() => {
    let alive = true
    Promise.all([preloadLogos(design.layers.map((l) => l.logoId)), preloadText(design.layers)]).then(() => alive && setTick((t) => t + 1))
    return () => {
      alive = false
    }
  }, [design.layers, logos])

  // draw
  useEffect(() => {
    if (!loaded || loaded.id !== design.productId || !host.current || !canvasRef.current) return
    setRendering(true)
    const t = setTimeout(() => {
      const el = host.current!
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = Math.max(200, Math.round(el.clientWidth * dpr))
      const h = Math.max(200, Math.round(el.clientHeight * dpr))
      const img = renderProduct2D(loaded, design, viewFor(def, view), w, h, zoom)
      const cv = canvasRef.current!
      cv.width = w
      cv.height = h
      cv.getContext('2d')!.drawImage(img, 0, 0)
      setRendering(false)
      markStageReady(stageKey(design.id, design.updatedAt, design.productId))
    }, 20)
    return () => clearTimeout(t)
  }, [loaded, design, view, zoom, tick, def])

  // exports use the same renderer
  useEffect(() => {
    const capture = ({ size, width, height, transparent, view: v }: CaptureOptions) => {
      const l = loadedRef.current
      const st = useStudio.getState()
      const d = st.renderOverride ?? st.design
      if (!l || l.id !== d.productId) throw new Error('The preview is still loading – try again in a moment.')
      const W = Math.round(width ?? size)
      const H = Math.round(height ?? size)
      const m = Math.min(W, H)
      const product = renderProduct2D(l, d, viewFor(PRODUCT_MAP[d.productId], v ?? 'three-quarter'), m, m)
      return composeExport(product, W, H, transparent ? 'transparent' : st.exportBackground)
    }
    registerRenderer({ capture, maxSize: () => 4096 })
    return () => registerRenderer(null)
  }, [])

  return (
    <div ref={host} className="relative h-full w-full overflow-hidden" style={{ background: sceneCss(scene) }} aria-label={`2D preview of the ${def.name}`}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label={`${def.name}, ${view.replace('-', ' ')} view`} />
      <div className="absolute left-1/2 top-3 flex max-w-[90%] -translate-x-1/2 items-start gap-2 rounded-lg border border-amber-400/30 bg-navy-900/90 px-3 py-2 text-xs text-amber-100 shadow-lg" role="note">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
        <span>
          <strong>2D preview mode.</strong> 3D graphics (WebGL) are switched off on this computer, so the product is drawn in 2D with fixed views. Logos, text, colours and exports still work;
          printed patterns and free rotation need the 3D studio.
        </span>
      </div>
      {rendering && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-navy-900/80 px-3 py-1.5 text-xs text-slate-200" role="status">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin text-accent" aria-hidden /> Drawing preview…
        </div>
      )}
    </div>
  )
}
