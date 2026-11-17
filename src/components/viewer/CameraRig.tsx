import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { PerspectiveCamera, Spherical, Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useStudio } from '../../state/studio'
import { PRODUCT_MAP, viewFor } from '../../three/catalogue'

/** Distance at which a sphere of `radius` fills the frame for the given camera. */
export function fitDistance(radius: number, fovDeg: number, aspect: number, margin = 1.12) {
  const vfov = (fovDeg * Math.PI) / 180
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect)
  const fov = Math.min(vfov, hfov)
  return (radius * margin) / Math.sin(fov / 2)
}

export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null)
  const { camera, invalidate, size } = useThree()
  const fit = useStudio((s) => s.stageFit)
  const req = useStudio((s) => s.viewRequest)
  const productId = useStudio((s) => (s.renderOverride ?? s.design).productId)
  const autoRotate = useStudio((s) => s.autoRotate)
  const def = PRODUCT_MAP[productId]
  const anim = useRef<{ from: Spherical; to: Spherical; t: number } | null>(null)

  const cam = camera as PerspectiveCamera
  const dist = fit ? fitDistance(fit.radius, cam.fov, size.width / Math.max(1, size.height)) : 5

  useEffect(() => {
    if (!fit) return
    if (useStudio.getState().renderOverride) return
    const view = req.view === 'reset' ? 'three-quarter' : req.view
    const v = viewFor(PRODUCT_MAP[fit.key] ?? def, view)
    const from = new Spherical().setFromVector3(camera.position.clone())
    const to = new Spherical(dist, v.polar, v.azimuth)
    // shortest way round
    let d = to.theta - from.theta
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    to.theta = from.theta + d
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !Number.isFinite(from.radius) || from.radius < 0.01) {
      camera.position.setFromSpherical(to)
      anim.current = null
    } else {
      anim.current = { from, to, t: 0 }
    }
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req.nonce, fit?.key, fit?.radius])

  useFrame((_, dt) => {
    const c = controls.current
    if (anim.current) {
      const a = anim.current
      a.t = Math.min(1, a.t + dt / 0.7)
      const e = a.t < 0.5 ? 4 * a.t * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 3) / 2
      const s = new Spherical(
        a.from.radius + (a.to.radius - a.from.radius) * e,
        a.from.phi + (a.to.phi - a.from.phi) * e,
        a.from.theta + (a.to.theta - a.from.theta) * e,
      )
      camera.position.setFromSpherical(s)
      camera.lookAt(0, 0, 0)
      if (c) {
        c.target.set(0, 0, 0)
        c.update()
      }
      if (a.t >= 1) anim.current = null
      invalidate()
    }
    if (autoRotate && c && !anim.current) {
      c.autoRotate = true
      c.autoRotateSpeed = 1.6
      c.update()
      invalidate()
    } else if (c && c.autoRotate) {
      c.autoRotate = false
    }
  })

  // zoom buttons in the toolbar
  useEffect(() => {
    const onZoom = (e: Event) => {
      const f = (e as CustomEvent<number>).detail
      const c = controls.current
      if (!c || !f) return
      anim.current = null
      const s = new Spherical().setFromVector3(camera.position.clone().sub(c.target))
      s.radius = Math.min(c.maxDistance, Math.max(c.minDistance, s.radius * f))
      camera.position.setFromSpherical(s).add(c.target)
      c.update()
      invalidate()
    }
    window.addEventListener('mf-zoom', onZoom)
    return () => window.removeEventListener('mf-zoom', onZoom)
  }, [camera, invalidate])

  // stop a running animation when the student grabs the model
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const stop = () => (anim.current = null)
    c.addEventListener('start', stop)
    return () => c.removeEventListener('start', stop)
  }, [])

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={new Vector3(0, 0, 0)}
      enablePan={false}
      enableDamping
      dampingFactor={0.09}
      rotateSpeed={0.8}
      zoomSpeed={0.9}
      minDistance={dist * 0.4}
      maxDistance={dist * 2.4}
      minPolarAngle={def.minPolar ?? 0.18}
      maxPolarAngle={def.maxPolar ?? 1.8}
    />
  )
}
