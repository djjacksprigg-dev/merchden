import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { NeutralToneMapping, PCFSoftShadowMap, SRGBColorSpace } from 'three'
import { Box, LoaderCircle, MousePointer2, Orbit, Palette, Pause, Play, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { SCENES, SCENE_MAP } from '../../three/scenes'
import { useThree } from '@react-three/fiber'
import { useStudio } from '../../state/studio'
import { PRODUCT_MAP } from '../../three/catalogue'
import { ProductStage } from './ProductStage'
import { CameraRig } from './CameraRig'
import { StudioLights } from './StudioLights'
import { ExportBridge } from './ExportBridge'
import type { ViewName } from '../../lib/types'

export function webglSupport(): 'webgl2' | 'webgl' | null {
  try {
    const c = document.createElement('canvas')
    if (c.getContext('webgl2')) return 'webgl2'
    if (c.getContext('webgl') || c.getContext('experimental-webgl')) return 'webgl'
  } catch {
    /* ignore */
  }
  return null
}

export function Viewer() {
  const quality = useStudio((s) => s.quality)
  const loading = useStudio((s) => s.modelLoading)
  const productId = useStudio((s) => s.design.productId)
  const def = PRODUCT_MAP[productId]
  const sceneId = useStudio((s) => s.scene)
  const scene = SCENE_MAP[sceneId] ?? SCENES[0]
  const [support] = useState(webglSupport)
  const [lost, setLost] = useState(false)
  const [floor, setFloor] = useState({ y: -1, r: 1 })
  const onFloor = useCallback((y: number, r: number) => setFloor({ y, r }), [])

  if (!support) return <NoWebGL />
  if (lost) return <ContextLost />

  return (
    <div className="relative h-full w-full overflow-hidden transition-[background] duration-500" style={{ background: scene.css }} aria-label={`3D preview of the ${def.name}`}>
      {/* scene decoration sits behind the 3D canvas */}
      {scene.overlay && <div className="pointer-events-none absolute inset-0" style={{ background: scene.overlay }} aria-hidden />}
      <Canvas
        frameloop="demand"
        shadows={quality === 'high'}
        dpr={quality === 'high' ? [1, 2] : [1, 1]}
        camera={{ fov: 30, near: 0.05, far: 100, position: [2.5, 1.2, 4] }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
          // Khronos PBR Neutral: accurate product colours, like a calibrated photo
          gl.toneMapping = NeutralToneMapping
          gl.toneMappingExposure = 1.0
          gl.shadowMap.type = PCFSoftShadowMap
          gl.outputColorSpace = SRGBColorSpace
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            setLost(true)
          })
        }}
        style={{
          touchAction: 'none',
          filter: scene.glow ? `drop-shadow(0 0 14px ${scene.glow[0]}aa) drop-shadow(0 0 26px ${scene.glow[1]}77)` : undefined,
        }}
      >
        <Suspense fallback={null}>
          <StudioLights quality={quality} floorY={floor.y} radius={floor.r} shadows={productId !== 'sticker'} scene={scene} />
          <Exposure value={scene.lights.exposure} />
          <ProductStage onFloor={onFloor} />
          <CameraRig />
          <ExportBridge />
        </Suspense>
      </Canvas>

      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" role="status" aria-live="polite">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-navy-900/80 px-4 py-2 text-sm text-slate-200 backdrop-blur">
            <LoaderCircle className="h-4 w-4 animate-spin text-accent" aria-hidden />
            Loading {def.name.toLowerCase()}…
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute left-4 top-4 hidden sm:block">
        <p className={`text-[11px] font-medium uppercase tracking-[0.18em] ${scene.lightText ? 'text-slate-500' : 'text-slate-300'}`}>{categoryName(def.category)}</p>
        <h1 className={`text-lg font-semibold ${scene.lightText ? 'text-slate-900' : 'text-white'}`}>{def.name}</h1>
      </div>

      <ViewControls />
      <Hint />
    </div>
  )
}

function categoryName(c: string) {
  return { clothing: 'Clothing', headwear: 'Headwear', gaming: 'Gaming accessories', everyday: 'Everyday merchandise' }[c] ?? ''
}

function ViewControls() {
  const requestView = useStudio((s) => s.requestView)
  const autoRotate = useStudio((s) => s.autoRotate)
  const setAutoRotate = useStudio((s) => s.setAutoRotate)
  const sceneId = useStudio((s) => s.scene)
  const setScene = useStudio((s) => s.setScene)
  const [open, setOpen] = useState(false)
  const def = useStudio((s) => PRODUCT_MAP[s.design.productId])
  const views: { id: ViewName; label: string }[] = useMemo(
    () => [
      { id: 'front', label: 'Front' },
      { id: 'back', label: 'Back' },
      { id: 'side', label: def.sideLabel ?? 'Left' },
      ...(def.sideLabel ? [] : [{ id: 'right' as ViewName, label: 'Right' }]),
      { id: 'three-quarter', label: '¾' },
    ],
    [def],
  )
  return (
    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-white/10 bg-navy-900/85 p-1 shadow-lg backdrop-blur" role="toolbar" aria-label="Camera views">
      {views.map((v) => (
        <button key={v.id} type="button" className="view-btn" onClick={() => requestView(v.id)} aria-label={`${v.id === 'three-quarter' ? 'Three-quarter' : v.id === 'side' && !def.sideLabel ? 'Left side' : v.id === 'right' ? 'Right side' : v.label} view`}>
          {v.label}
        </button>
      ))}
      <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
      <button type="button" className="view-btn" onClick={() => window.dispatchEvent(new CustomEvent('mf-zoom', { detail: 0.82 }))} aria-label="Zoom in" title="Zoom in">
        <ZoomIn className="h-4 w-4" aria-hidden />
      </button>
      <button type="button" className="view-btn" onClick={() => window.dispatchEvent(new CustomEvent('mf-zoom', { detail: 1.22 }))} aria-label="Zoom out" title="Zoom out">
        <ZoomOut className="h-4 w-4" aria-hidden />
      </button>
      <button type="button" className="view-btn" onClick={() => requestView('reset')} aria-label="Reset camera" title="Reset camera">
        <RotateCcw className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        className={`view-btn ${autoRotate ? 'text-accent' : ''}`}
        onClick={() => setAutoRotate(!autoRotate)}
        aria-pressed={autoRotate}
        aria-label={autoRotate ? 'Stop turntable rotation' : 'Start turntable rotation'}
        title="Turntable"
      >
        {autoRotate ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
      </button>
      <div className="relative">
        <button type="button" className="view-btn gap-1.5" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Scene style" title="Scene style">
          <Palette className="h-4 w-4" aria-hidden />
          <span className="hidden text-xs sm:inline">{SCENE_MAP[sceneId]?.label}</span>
        </button>
        {open && (
          <div className="animate-in absolute bottom-12 right-0 w-56 rounded-xl border border-white/10 bg-navy-900 p-2 shadow-2xl" role="radiogroup" aria-label="Scene style">
            <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Scene style</p>
            <div className="grid grid-cols-2 gap-1.5">
              {SCENES.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  role="radio"
                  aria-checked={sceneId === sc.id}
                  onClick={() => {
                    setScene(sc.id)
                    setOpen(false)
                  }}
                  className={`flex items-center gap-2 rounded-lg border p-1.5 text-left text-xs font-medium text-slate-200 focus-visible:outline-2 focus-visible:outline-accent ${
                    sceneId === sc.id ? 'border-accent bg-accent-soft' : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <span className="h-6 w-6 shrink-0 rounded-md border border-white/20" style={{ background: sc.swatch }} aria-hidden />
                  {sc.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Hint() {
  const [show, setShow] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 9000)
    return () => clearTimeout(t)
  }, [])
  if (!show) return null
  return (
    <div className="pointer-events-none absolute right-4 top-4 hidden max-w-[16rem] rounded-lg border border-white/10 bg-navy-900/80 px-3 py-2 text-xs text-slate-300 backdrop-blur md:block">
      <p className="flex items-center gap-2">
        <Orbit className="h-3.5 w-3.5 text-accent" aria-hidden /> Drag to rotate · scroll or pinch to zoom
      </p>
      <p className="mt-1 flex items-center gap-2">
        <MousePointer2 className="h-3.5 w-3.5 text-accent" aria-hidden /> Double-click the product to move the selected logo there
      </p>
    </div>
  )
}

function NoWebGL() {
  return (
    <div className="flex h-full items-center justify-center p-8 studio-backdrop">
      <div className="max-w-md rounded-xl border border-white/10 bg-navy-900 p-6 text-center">
        <Box className="mx-auto mb-3 h-8 w-8 text-accent" aria-hidden />
        <h2 className="text-lg font-semibold text-white">3D graphics are not available</h2>
        <p className="mt-2 text-sm text-slate-300">
          This browser or computer has WebGL switched off, so the 3D preview cannot start. Try an up-to-date Chrome, Edge, Firefox or Safari, check that hardware acceleration is turned on in
          the browser settings, or ask IT whether WebGL is blocked on this machine.
        </p>
      </div>
    </div>
  )
}

function ContextLost() {
  return (
    <div className="flex h-full items-center justify-center p-8 studio-backdrop">
      <div className="max-w-md rounded-xl border border-white/10 bg-navy-900 p-6 text-center">
        <h2 className="text-lg font-semibold text-white">The 3D view stopped</h2>
        <p className="mt-2 text-sm text-slate-300">The graphics card ran out of memory or was reset. Your design is saved – reload to carry on. Turning on Performance mode can help on older computers.</p>
        <button
          type="button"
          className="btn-primary mt-4"
          onClick={() => {
            useStudio.getState().setQuality('low')
            setTimeout(() => window.location.reload(), 600)
          }}
        >
          Reload in performance mode
        </button>
      </div>
    </div>
  )
}

/** Applies the scene's exposure to the renderer. */
function Exposure({ value }: { value: number }) {
  const { gl, invalidate } = useThree()
  useEffect(() => {
    gl.toneMappingExposure = value
    invalidate()
  }, [gl, value, invalidate])
  return null
}
