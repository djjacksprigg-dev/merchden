import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Box3, CanvasTexture, Group, Mesh, MeshStandardMaterial, Raycaster, SRGBColorSpace, Sphere, type BufferGeometry, type Texture } from 'three'
import type { Design, LogoLayer } from '../../lib/types'
import { useStudio } from '../../state/studio'
import { loadBuilder, patternColorsOf, PRODUCT_MAP } from '../../three/catalogue'
import type { Part, ProductDef, ProductModel, Zone } from '../../three/engine/types'
import { buildDecalGeometry, pointToOffsets, resolvePlacement } from '../../three/engine/decals'
import { createPartMaterial, createPrintMaterial } from '../../three/engine/materials'
import { createRepeatTexture, createStickerTexture, getLogoTexture } from '../../three/engine/textures'
import { createPatternTexture } from '../../three/engine/patterns'
import { markStageReady, stageKey } from '../../three/renderService'
import { useLogoImage, useTextCanvas } from './useLogoImage'
import { getTextCanvas } from '../../three/engine/text'
import { getCachedImage } from '../../three/engine/textures'
import { bakeAmbientOcclusion } from '../../three/engine/ao'

interface Loaded {
  id: string
  model: ProductModel
  radius: number
  floorY: number
  center: [number, number, number]
}

/** Part meshes of the product on screen, so logos can be dragged across them. */
const partMeshes = new Map<string, Mesh>()
const dragRay = new Raycaster()

/**
 * Lets students grab a logo or text on the 3D product and drag it.
 * The pointer is ray-cast against the garment surface and converted to the
 * placement area's offsets, so the print stays inside the real print area.
 */
function useDecalDrag(layer: LogoLayer, zone: Zone, part: Part) {
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null
  const dragging = useRef(false)
  const grab = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const locked = !!layer.locked
  const surfaceOffsets = (e: ThreeEvent<PointerEvent>) => {
    const mesh = partMeshes.get(part.key)
    if (!mesh) return null
    dragRay.set(e.ray.origin, e.ray.direction)
    const hit = dragRay.intersectObject(mesh, false)[0]
    return hit ? pointToOffsets(zone, mesh.worldToLocal(hit.point.clone())) : null
  }
  const end = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return
    dragging.current = false
    grab.current = null
    ;(e.target as unknown as Element).releasePointerCapture?.(e.pointerId)
    if (controls) controls.enabled = true
    document.body.style.cursor = ''
  }
  return {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      const st = useStudio.getState()
      if (st.renderOverride || e.button !== 0) return
      e.stopPropagation()
      st.selectLayer(layer.id)
      if (layer.text) st.setRightTab('text')
      else if (st.rightTab !== 'logo') st.setRightTab('logo')
      if (locked) return
      const start = surfaceOffsets(e)
      // keep the point you grabbed under the pointer (no jump)
      grab.current = start ? { x: start.offsetX, y: start.offsetY, ox: layer.offsetX, oy: layer.offsetY } : null
      dragging.current = true
      ;(e.target as unknown as Element).setPointerCapture?.(e.pointerId)
      if (controls) controls.enabled = false
      document.body.style.cursor = 'grabbing'
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      if (!dragging.current) return
      e.stopPropagation()
      const off = surfaceOffsets(e)
      if (!off) return
      const g = grab.current
      const c = (v: number) => Math.max(-1, Math.min(1, v))
      useStudio.getState().updateLayer(layer.id, g ? { offsetX: c(g.ox + off.offsetX - g.x), offsetY: c(g.oy + off.offsetY - g.y) } : off)
    },
    onPointerUp: end,
    onPointerCancel: end,
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (!dragging.current) document.body.style.cursor = locked ? 'not-allowed' : 'grab'
    },
    onPointerOut: () => {
      if (!dragging.current) document.body.style.cursor = ''
    },
  }
}

function disposeModel(m: ProductModel) {
  for (const p of m.parts) p.geometry.dispose()
}

export function ProductStage({ onFloor }: { onFloor: (y: number, radius: number) => void }) {
  const editorDesign = useStudio((s) => s.design)
  const override = useStudio((s) => s.renderOverride)
  const design = override ?? editorDesign
  const def = PRODUCT_MAP[design.productId]
  const quality = useStudio((s) => s.quality)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const loadedRef = useRef<Loaded | null>(null)
  const { invalidate } = useThree()

  // Lazy-load + build the procedural model; dispose the previous one.
  useEffect(() => {
    let cancelled = false
    const st = useStudio.getState()
    st.setModelLoading(true)
    loadBuilder(def)
      .then(
        (build) =>
          new Promise<void>((resolve) => {
            // let the loading indicator paint before the (synchronous) build
            setTimeout(() => {
              if (cancelled) return resolve()
              const model = build()
              const box = new Box3()
              for (const p of model.parts) {
                p.geometry.computeBoundingBox()
                box.union(p.geometry.boundingBox!)
              }
              const sphere = box.getBoundingSphere(new Sphere())
              try {
                bakeAmbientOcclusion(model, Math.max(0.3, sphere.radius), useStudio.getState().quality)
              } catch (e) {
                console.warn('Shading bake skipped', e)
              }
              const center = box.getCenter(sphere.center.clone())
              const next: Loaded = {
                id: def.id,
                model,
                radius: Math.max(0.3, sphere.radius),
                floorY: box.min.y - center.y,
                center: [center.x, center.y, center.z],
              }
              const prev = loadedRef.current
              loadedRef.current = next
              setLoaded(next)
              if (prev) setTimeout(() => disposeModel(prev.model), 100)
              useStudio.getState().setModelInfo(def.id, model.zones)
              useStudio.setState({ stageFit: { radius: next.radius, key: def.id } })
              resolve()
            }, 30)
          }),
      )
      .catch((e) => {
        console.error(e)
        useStudio.getState().toast(`Sorry – the ${def.name} model could not be loaded. Check your connection and try again.`, 'error')
        useStudio.getState().setModelLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [def])

  useEffect(
    () => () => {
      if (loadedRef.current) disposeModel(loadedRef.current.model)
    },
    [],
  )

  useEffect(() => {
    if (loaded) onFloor(loaded.floorY, loaded.radius)
  }, [loaded, onFloor])

  // Entrance transition
  const group = useRef<Group>(null)
  const anim = useRef(1)
  useLayoutEffect(() => {
    if (!loaded) return
    anim.current = useStudio.getState().renderOverride ? 1 : 0
    invalidate()
  }, [loaded, invalidate])
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    if (anim.current < 1) {
      anim.current = Math.min(1, anim.current + dt / 0.55)
      const e = 1 - Math.pow(1 - anim.current, 3)
      g.scale.setScalar(0.92 + 0.08 * e)
      g.rotation.y = -0.5 * (1 - e)
      invalidate()
    } else if (g.scale.x !== 1) {
      g.scale.setScalar(1)
      g.rotation.y = 0
    }
  })

  // Readiness signal for exports
  const logoIds = design.layers.map((l) => l.logoId)
  const logos = useStudio((s) => s.logos)
  const patternImgId = design.pattern === 'custom' ? design.customPatternId : null
  const allImages =
    [...logoIds, patternImgId].every((id) => !id || !logos[id] || !!getCachedImage(logos[id].dataUrl)) &&
    design.layers.every((l) => !l.text || !!getTextCanvas(l.text))
  const [imgTick, setImgTick] = useState(0)
  useEffect(() => {
    if (!loaded || loaded.id !== design.productId) return
    if (!allImages) {
      const t = setTimeout(() => setImgTick((n) => n + 1), 50)
      return () => clearTimeout(t)
    }
    const key = stageKey(design.id, design.updatedAt, design.productId)
    invalidate()
    const r = requestAnimationFrame(() => requestAnimationFrame(() => markStageReady(key)))
    return () => cancelAnimationFrame(r)
  }, [loaded, design, allImages, imgTick, invalidate])

  if (!loaded || loaded.id !== design.productId) return null
  const { model, center } = loaded

  return (
    <group ref={group}>
      <group position={[-center[0], -center[1], -center[2]]}>
        {model.parts.map((part) => (
          <PartMesh key={part.key} part={part} def={def} design={design} quality={quality} zones={model.zones} model={model} />
        ))}
        {design.layers.map((layer, order) => {
          const zone = model.zones.find((z) => z.id === layer.zoneId)
          if (layer.text) {
            if (!zone || (zone.kind !== 'planar' && zone.kind !== 'wrap')) return null
            const tpart = model.parts.find((p) => p.key === zone.target)
            return tpart ? <TextDecal key={layer.id} layer={layer} zone={zone} part={tpart} quality={quality} order={order} /> : null
          }
          if (!zone || (zone.kind !== 'planar' && zone.kind !== 'wrap')) return null
          const part = model.parts.find((p) => p.key === zone.target)
          if (!part) return null
          return <LogoDecal key={layer.id} layer={layer} zone={zone} part={part} quality={quality} order={order} />
        })}
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */

function slotColor(part: Part, design: Design, def: ProductDef) {
  if (part.slot) {
    // designs made before a garment gained separate sleeve/collar colours
    const legacy = part.slot === 'sleeve' ? design.colors.primary : part.slot === 'collar' ? design.colors.trim : undefined
    return design.colors[part.slot] ?? legacy ?? def.defaults[part.slot] ?? '#888888'
  }
  return part.color ?? '#888888'
}

function PartMesh({ part, def, design, quality, zones, model }: { part: Part; def: ProductDef; design: Design; quality: 'high' | 'low'; zones: Zone[]; model: ProductModel }) {
  const color = slotColor(part, design, def)
  const usePattern = !!(def.patterns && part.pattern && design.pattern !== 'solid')
  const pc = patternColorsOf(def, design.colors)
  const patternScale = design.patternScale ?? 1
  // the monogram pattern repeats the team's logo
  const monoLogo = useLogoImage(usePattern && design.pattern === 'logo-repeat' ? (design.layers.find((l) => l.logoId)?.logoId ?? null) : null)
  const customImg = useLogoImage(usePattern && design.pattern === 'custom' ? (design.customPatternId ?? null) : null)
  const customMode = design.customPatternMode ?? 'tile'
  const patternTex = useMemo(
    () =>
      usePattern
        ? createPatternTexture(
            design.pattern,
            { base: color, a: pc.a, b: pc.b, logo: design.pattern === 'custom' ? customImg : monoLogo, fill: customMode === 'fill' },
            part.pattern!,
            part.geometry,
            part.patternFront ?? (part.pattern === 'body' ? 0.5 : 0),
            patternScale,
            quality,
          )
        : null,
    [usePattern, design.pattern, color, pc.a, pc.b, part, patternScale, quality, monoLogo, customImg, customMode],
  )

  // special maps
  const repeatLayer = part.special === 'logo-repeat' ? design.layers.find((l) => zones.find((z) => z.id === l.zoneId)?.kind === 'repeat') : undefined
  const stickerLayer = part.special === 'sticker-front' || part.special === 'sticker-back' ? design.layers.find((l) => l.zoneId === 'sticker') : undefined
  const repeatImg = useLogoImage(repeatLayer?.logoId ?? null)
  const stickerImg = useLogoImage(stickerLayer?.logoId ?? null)

  const repeatTex = useMemo(() => {
    if (part.special !== 'logo-repeat') return null
    const t = createRepeatTexture(repeatImg, color, repeatLayer?.scale ?? 1, repeatLayer?.rotation ?? 0)
    t.repeat.set(1, part.repeat ?? 2.8)
    return t
  }, [part, repeatImg, color, repeatLayer?.scale, repeatLayer?.rotation])

  const sticker = useMemo(() => {
    if (part.special !== 'sticker-front' && part.special !== 'sticker-back') return null
    return createStickerTexture(stickerImg, design.stickerShape, design.colors.primary ?? '#ffffff', stickerLayer?.scale ?? 1, stickerLayer?.rotation ?? 0)
  }, [part.special, stickerImg, design.stickerShape, design.colors.primary, stickerLayer?.scale, stickerLayer?.rotation])

  const material = useMemo(() => {
    let map: Texture | null = patternTex ?? repeatTex
    if (part.special === 'sticker-front' && sticker) map = sticker.texture
    const m = createPartMaterial(part, map ? '#ffffff' : color, map, quality, { ao: !!part.geometry.getAttribute('color') && part.special !== 'sticker-front' })
    if (part.special === 'sticker-front' && sticker) {
      m.alphaTest = 0.5
    }
    if (part.special === 'sticker-back' && sticker) {
      ;(m as MeshStandardMaterial).alphaMap = sticker.alpha
      m.alphaTest = 0.5
    }
    return m
  }, [part, color, patternTex, repeatTex, sticker, quality])

  // open garments: render the inside separately, in shadow
  const interior = useMemo(
    () => (part.doubleSide && !part.special ? createPartMaterial(part, patternTex || repeatTex ? '#ffffff' : color, patternTex ?? repeatTex, quality, { interior: true }) : null),
    [part, color, patternTex, repeatTex, quality],
  )
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => () => interior?.dispose(), [interior])
  useEffect(() => () => patternTex?.dispose(), [patternTex])
  useEffect(() => () => repeatTex?.dispose(), [repeatTex])
  useEffect(
    () => () => {
      sticker?.texture.dispose()
      sticker?.alpha.dispose()
    },
    [sticker],
  )

  const onDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    const st = useStudio.getState()
    if (st.renderOverride) return
    e.stopPropagation()
    const local = e.object.worldToLocal(e.point.clone())
    const candidates = zones.filter((z) => z.target === part.key && (z.kind === 'planar' || z.kind === 'wrap'))
    if (!candidates.length) return
    const sel = st.design.layers.find((l) => l.id === st.selectedLayerId)
    // prefer the selected layer's zone, else the zone whose centre is nearest
    let zone = sel ? candidates.find((z) => z.id === sel.zoneId) : undefined
    if (!zone) {
      let best = Infinity
      for (const z of candidates) {
        const p = resolvePlacement(z, part.geometry, { offsetX: 0, offsetY: 0, scale: 1, rotation: 0 }, 1)
        const d = p ? p.position.distanceTo(local) : Infinity
        if (d < best) {
          best = d
          zone = z
        }
      }
    }
    if (!zone) return
    const off = pointToOffsets(zone, local)
    if (!off) return
    if (sel) st.updateLayer(sel.id, { zoneId: zone.id, ...off })
    else st.addLayer(zone.id)
    const after = useStudio.getState()
    const target = after.design.layers.find((l) => l.id === after.selectedLayerId)
    if (target && !sel) after.updateLayer(target.id, off)
    void model
  }

  if (interior) material.side = 0 /* FrontSide */
  return (
    <>
    {interior && <mesh geometry={part.geometry} material={interior} receiveShadow={quality === 'high'} />}
    <mesh
      ref={(m: Mesh | null) => {
        if (m) partMeshes.set(part.key, m)
        else if (partMeshes.get(part.key)?.geometry === part.geometry) partMeshes.delete(part.key)
      }}
      geometry={part.geometry}
      material={material}
      castShadow={quality === 'high' && part.special !== 'transparent' && part.finish !== 'glass'}
      receiveShadow={quality === 'high' && part.finish !== 'glass'}
      renderOrder={part.finish === 'glass' ? 3 : 0}
      onDoubleClick={onDoubleClick}
    />
    </>
  )
}

/* ------------------------------------------------------------------ */

function LogoDecal({ layer, zone, part, quality, order }: { layer: LogoLayer; zone: Zone; part: Part; quality: 'high' | 'low'; order: number }) {
  const img = useLogoImage(layer.logoId)
  const aspect = img ? img.naturalWidth / img.naturalHeight : 1
  const geometry = useMemo<BufferGeometry | null>(() => {
    if (!img) return null
    const p = resolvePlacement(zone, part.geometry, layer, aspect)
    if (!p) return null
    return buildDecalGeometry(part.geometry, p)
  }, [img, zone, part.geometry, layer.offsetX, layer.offsetY, layer.scale, layer.rotation, aspect])
  const material = useMemo(() => {
    if (!img || !layer.logoId) return null
    return createPrintMaterial(part, getLogoTexture(layer.logoId, img), quality, !!part.geometry.getAttribute('color'))
  }, [img, layer.logoId, part, quality])
  useEffect(() => () => geometry?.dispose(), [geometry])
  useEffect(() => () => material?.dispose(), [material])
  const opacity = layer.opacity ?? 1
  useEffect(() => {
    if (!material) return
    material.opacity = opacity
    // later layers sit on top of earlier ones in the same area
    material.polygonOffsetFactor = -4 - order
    material.polygonOffsetUnits = -4 - order
  }, [material, opacity, order])
  const drag = useDecalDrag(layer, zone, part)
  if (!geometry || !material) return null
  return <mesh geometry={geometry} material={material} renderOrder={2 + order * 0.01} receiveShadow={quality === 'high'} {...drag} />
}

/* ------------------------------------------------------------------ */

function TextDecal({ layer, zone, part, quality, order }: { layer: LogoLayer; zone: Zone; part: Part; quality: 'high' | 'low'; order: number }) {
  const canvas = useTextCanvas(layer.text)
  const aspect = canvas ? canvas.width / canvas.height : 1
  const geometry = useMemo<BufferGeometry | null>(() => {
    if (!canvas) return null
    const p = resolvePlacement(zone, part.geometry, layer, aspect)
    return p ? buildDecalGeometry(part.geometry, p) : null
  }, [canvas, zone, part.geometry, layer.offsetX, layer.offsetY, layer.scale, layer.rotation, aspect])
  const material = useMemo(() => {
    if (!canvas) return null
    const t = new CanvasTexture(canvas)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
    return createPrintMaterial(part, t, quality, !!part.geometry.getAttribute('color'))
  }, [canvas, part, quality])
  useEffect(() => () => geometry?.dispose(), [geometry])
  useEffect(
    () => () => {
      material?.map?.dispose()
      material?.dispose()
    },
    [material],
  )
  const opacity = layer.opacity ?? 1
  useEffect(() => {
    if (!material) return
    material.opacity = opacity
    // later layers sit on top of earlier ones in the same area
    material.polygonOffsetFactor = -4 - order
    material.polygonOffsetUnits = -4 - order
  }, [material, opacity, order])
  const drag = useDecalDrag(layer, zone, part)
  if (!geometry || !material) return null
  return <mesh geometry={geometry} material={material} renderOrder={2 + order * 0.01} receiveShadow={quality === 'high'} {...drag} />
}
