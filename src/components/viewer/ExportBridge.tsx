import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { PerspectiveCamera, Spherical, Vector2 } from 'three'
import { registerRenderer, type CaptureOptions } from '../../three/renderService'
import { useStudio, type ExportBackground } from '../../state/studio'
import { glowLayer, SCENE_MAP, SCENES } from '../../three/scenes'
import { getCachedImage } from '../../three/engine/textures'
import { PRODUCT_MAP, viewFor } from '../../three/catalogue'
import { fitDistance } from './CameraRig'

/** Registers a capture function that renders the live scene at export resolution. */
export function ExportBridge() {
  const { gl, scene, camera, invalidate, controls } = useThree()

  useEffect(() => {
    const ctx = gl.getContext()
    const maxRb = ctx.getParameter(ctx.MAX_RENDERBUFFER_SIZE) as number
    const maxVp = ctx.getParameter(ctx.MAX_VIEWPORT_DIMS) as Int32Array
    const maxSize = () => Math.max(512, Math.min(4096, maxRb || 4096, maxVp?.[0] || 4096, maxVp?.[1] || 4096))

    const capture = ({ size, transparent, view }: CaptureOptions) => {
      const cam = camera as PerspectiveCamera
      const s = useStudio.getState()
      const fit = s.stageFit
      const def = PRODUCT_MAP[(s.renderOverride ?? s.design).productId]
      const px = Math.min(size, maxSize())

      const prevPos = cam.position.clone()
      const prevQuat = cam.quaternion.clone()
      const prevAspect = cam.aspect
      const prevSize = gl.getSize(new Vector2())
      const prevDpr = gl.getPixelRatio()
      const shadow = scene.getObjectByName('contact-shadows')
      const prevShadowVisible = shadow?.visible
      const prevBg = scene.background

      const radius = fit?.radius ?? 1
      const exportFit = fitDistance(radius, cam.fov, 1, 1.08)
      if (view) {
        const v = viewFor(def, view)
        cam.position.setFromSpherical(new Spherical(exportFit, v.polar, v.azimuth))
      } else {
        // keep the student's angle and relative zoom
        const viewerFit = fitDistance(radius, cam.fov, prevAspect)
        const sp = new Spherical().setFromVector3(prevPos)
        sp.radius = exportFit * (sp.radius / viewerFit)
        cam.position.setFromSpherical(sp)
      }
      cam.lookAt(0, 0, 0)
      cam.aspect = 1
      cam.updateProjectionMatrix()
      const bgChoice = transparent ? 'transparent' : s.exportBackground
      const clear = bgChoice === 'transparent'
      if (shadow) shadow.visible = !clear
      scene.background = null

      gl.setPixelRatio(1)
      gl.setSize(px, px, false)
      gl.setClearColor(0x000000, 0)
      gl.clear()
      gl.render(scene, cam)

      const product = document.createElement('canvas')
      product.width = px
      product.height = px
      product.getContext('2d')!.drawImage(gl.domElement, 0, 0, px, px)
      const out = composeExport(product, px, bgChoice)

      // restore
      cam.position.copy(prevPos)
      cam.quaternion.copy(prevQuat)
      cam.aspect = prevAspect
      cam.updateProjectionMatrix()
      if (shadow) shadow.visible = prevShadowVisible ?? true
      scene.background = prevBg
      gl.setPixelRatio(prevDpr)
      gl.setSize(prevSize.x, prevSize.y, false)
      ;(controls as unknown as { update?: () => void } | null)?.update?.()
      gl.render(scene, cam)
      invalidate()
      return out
    }
    registerRenderer({ capture, maxSize })
    return () => registerRenderer(null)
  }, [gl, scene, camera, invalidate, controls])

  return null
}

/**
 * Builds the final image: background (scene / black / white / team brand / none),
 * neon glow, the rendered product, team branding and the scene's finishing pass.
 */
export function composeExport(product: HTMLCanvasElement, px: number, bg: ExportBackground): HTMLCanvasElement {
  const st = useStudio.getState()
  const scene = SCENE_MAP[st.scene] ?? SCENES[0]
  const out = document.createElement('canvas')
  out.width = px
  out.height = px
  const c = out.getContext('2d')!
  if (bg === 'scene') scene.paint(c, px)
  else if (bg === 'black') {
    c.fillStyle = '#000000'
    c.fillRect(0, 0, px, px)
  } else if (bg === 'white') {
    c.fillStyle = '#ffffff'
    c.fillRect(0, 0, px, px)
  } else if (bg === 'brand') paintBrand(c, px, 'back')
  if (scene.glow && bg !== 'white') c.drawImage(glowLayer(product, scene.glow, px), 0, 0)
  c.drawImage(product, 0, 0)
  if (bg === 'brand') paintBrand(c, px, 'front')
  if (bg === 'scene' && scene.post) scene.post(c, px)
  return out
}

function brandAssets() {
  const st = useStudio.getState()
  const d = st.renderOverride ?? st.design
  const logoId = d.layers.find((l) => l.logoId)?.logoId ?? st.activeLogoId
  const logo = logoId && st.logos[logoId] ? getCachedImage(st.logos[logoId].dataUrl) : null
  const primary = st.brandColors.primary ?? d.colors.primary ?? '#1d3b8f'
  const secondary = st.brandColors.secondary ?? d.colors.secondary ?? '#0b1630'
  return { logo, primary, secondary, name: st.project.orgName.trim() }
}

/** Team-branded background: team colours, a large faded logo, and the logo + name in the corner. */
function paintBrand(c: CanvasRenderingContext2D, s: number, layer: 'back' | 'front') {
  const { logo, primary, secondary, name } = brandAssets()
  if (layer === 'back') {
    const g = c.createLinearGradient(0, 0, s, s)
    g.addColorStop(0, primary)
    g.addColorStop(1, secondary === primary ? '#05070d' : secondary)
    c.fillStyle = g
    c.fillRect(0, 0, s, s)
    const v = c.createRadialGradient(s / 2, s * 0.45, s * 0.1, s / 2, s / 2, s * 0.8)
    v.addColorStop(0, 'rgba(255,255,255,0.12)')
    v.addColorStop(1, 'rgba(0,0,0,0.45)')
    c.fillStyle = v
    c.fillRect(0, 0, s, s)
    if (logo) {
      const k = (s * 0.95) / Math.max(logo.naturalWidth, logo.naturalHeight)
      c.globalAlpha = 0.09
      c.drawImage(logo, s / 2 - (logo.naturalWidth * k) / 2, s / 2 - (logo.naturalHeight * k) / 2, logo.naturalWidth * k, logo.naturalHeight * k)
      c.globalAlpha = 1
    }
    return
  }
  // corner badge
  const pad = s * 0.045
  let x = pad
  if (logo) {
    const h = s * 0.085
    const w = (logo.naturalWidth / logo.naturalHeight) * h
    c.drawImage(logo, pad, s - pad - h, w, h)
    x = pad + w + s * 0.018
  }
  if (name) {
    c.fillStyle = '#ffffff'
    c.font = `800 ${Math.round(s * 0.032)}px "Inter Variable", Inter, Arial, sans-serif`
    c.textBaseline = 'middle'
    c.shadowColor = 'rgba(0,0,0,0.4)'
    c.shadowBlur = s * 0.006
    c.fillText(name.toUpperCase(), x, s - pad - s * 0.0425)
    c.shadowBlur = 0
  }
}

/** Legacy helper: paints a plain studio background. */
export function paintBackground(ctx: CanvasRenderingContext2D, size: number, bg: 'studio-dark' | 'studio-light' | 'white') {
  if (bg === 'white') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
    return
  }
  SCENE_MAP[bg].paint(ctx, size)
}
