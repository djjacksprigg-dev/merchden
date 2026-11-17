/**
 * 3D set dressing for mockup environments, built at real-world scale around the
 * product: a gaming desk with monitor, keyboard and mouse; an oak display table or
 * clothing rail in a boutique; a branded exhibition booth with plinth and rack.
 * Everything is procedural (canvas textures, simple geometry) – no image files.
 * It is hidden for product-only and plain-colour exports.
 */
import { useMemo } from 'react'
import { CanvasTexture, CatmullRomCurve3, RepeatWrapping, SRGBColorSpace, TorusGeometry, TubeGeometry, Vector3, type Texture } from 'three'
import type { SceneId } from '../../three/scenes'
import { useStudio } from '../../state/studio'

/** Garments shown on a hanger. */
export const HUNG_GARMENTS = new Set(['jersey', 'tshirt', 'tee', 'oversized-tee', 'hoodie', 'zip-hoodie', 'sweatshirt', 'polo', 'tracksuit-jacket', 'varsity-jacket', 'windbreaker', 'joggers', 'lanyard'])
/** Flat items modelled standing upright – shown on a small acrylic display stand. */
const UPRIGHT = new Set(['controller-skin', 'controller-skin-symmetric', 'handheld-skin', 'phone-case', 'sticker', 'notebook', 'laptop-sleeve', 'keyring', 'poster', 'drawstring-bag', 'tote-bag'])
/** Items that stand on the floor rather than a desk or table. */
const FLOOR = new Set(['gaming-chair'])

/** Approximate real size (largest dimension, metres) so props are in proportion. */
const REAL: Record<string, number> = {
  jersey: 0.75, tshirt: 0.75, polo: 0.75, 'tracksuit-jacket': 0.75, 'varsity-jacket': 0.75, 'oversized-tee': 0.78, sweatshirt: 0.72,
  hoodie: 0.82, 'zip-hoodie': 0.82, windbreaker: 0.82, joggers: 1.0, lanyard: 0.9,
  cap: 0.3, beanie: 0.24, 'bucket-hat': 0.32, 'extended-mousemat': 0.9, mousemat: 0.45, 'gaming-chair': 1.3, headset: 0.2,
  'controller-skin': 0.16, 'controller-skin-symmetric': 0.17, 'handheld-skin': 0.24, 'laptop-sleeve': 0.4, 'headset-stand': 0.27,
  'water-bottle': 0.26, mug: 0.12, backpack: 0.45, 'drawstring-bag': 0.45, 'tote-bag': 0.6, 'phone-case': 0.16, sticker: 0.08,
  'travel-mug': 0.18, 'sports-bottle': 0.25, tumbler: 0.28, keyring: 0.09, notebook: 0.21, poster: 0.6,
}

const PROP_SCENES: SceneId[] = ['desk', 'display', 'exhibition']
export const hasProps = (scene: SceneId) => PROP_SCENES.includes(scene)

interface Box {
  min: [number, number, number]
  max: [number, number, number]
}

/* ------------------------------------------------------------------ */
/* Procedural textures (made once, cached)                             */
/* ------------------------------------------------------------------ */

const texCache = new Map<string, Texture>()
function canvasTex(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, repeat: [number, number] = [1, 1], color = true) {
  const k = `${key}:${repeat.join('x')}`
  const hit = texCache.get(k)
  if (hit) return hit
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  draw(cv.getContext('2d')!, w, h)
  const t = new CanvasTexture(cv)
  if (color) t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(repeat[0], repeat[1])
  t.anisotropy = 8
  texCache.set(k, t)
  return t
}

function rnd(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Wood grain: long wavy streaks and fine pores. */
function woodTexture(key: string, base: string, dark: string, light: string) {
  return canvasTex(key, 1024, 1024, (c, w, h) => {
    const r = rnd(key.length * 977)
    c.fillStyle = base
    c.fillRect(0, 0, w, h)
    // planks
    const planks = 4
    for (let p = 0; p < planks; p++) {
      const y0 = (p * h) / planks
      c.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)'
      c.fillRect(0, y0, w, h / planks)
      for (let i = 0; i < 70; i++) {
        const y = y0 + r() * (h / planks)
        const amp = 2 + r() * 6
        const f = 0.002 + r() * 0.006
        const ph = r() * 10
        c.strokeStyle = r() > 0.55 ? dark : light
        c.globalAlpha = 0.06 + r() * 0.18
        c.lineWidth = 0.6 + r() * 2.2
        c.beginPath()
        for (let x = 0; x <= w; x += 8) {
          const yy = y + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1 + ph * 2) * amp * 0.3
          if (x === 0) c.moveTo(x, yy)
          else c.lineTo(x, yy)
        }
        c.stroke()
      }
      c.globalAlpha = 0.35
      c.fillStyle = dark
      c.fillRect(0, y0, w, 1.5)
    }
    c.globalAlpha = 1
  })
}

function deskWallTexture() {
  return canvasTex('desk-wall', 1024, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#0d1018')
    g.addColorStop(1, '#161b26')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    // hexagon acoustic panels
    const R = 46
    const hx = R * Math.sqrt(3)
    const r = rnd(7)
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 12; col++) {
        const cx = 80 + col * hx + (row % 2) * (hx / 2)
        const cy = 60 + row * R * 1.5
        if (r() < 0.45) continue
        c.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 6 + (i * Math.PI) / 3
          c.lineTo(cx + Math.cos(a) * (R - 4), cy + Math.sin(a) * (R - 4))
        }
        c.closePath()
        const shade = r()
        c.fillStyle = shade > 0.88 ? '#ff7a1a' : shade > 0.6 ? '#252a36' : '#1a1f29'
        c.globalAlpha = shade > 0.88 ? 0.3 : 1
        c.fill()
        c.globalAlpha = 1
        c.strokeStyle = 'rgba(0,0,0,0.45)'
        c.lineWidth = 3
        c.stroke()
      }
    }
  })
}

function monitorScreenTexture() {
  return canvasTex('monitor', 1024, 576, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#120d24')
    g.addColorStop(0.55, '#1a1030')
    g.addColorStop(1, '#2a1208')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    // soft glows
    for (const [x, y, rad, col] of [
      [0.75, 0.35, 0.5, 'rgba(255,122,26,0.55)'],
      [0.2, 0.7, 0.45, 'rgba(140,92,255,0.5)'],
      [0.5, 0.15, 0.3, 'rgba(80,160,255,0.25)'],
    ] as [number, number, number, string][]) {
      const rg = c.createRadialGradient(x * w, y * h, 0, x * w, y * h, rad * w)
      rg.addColorStop(0, col)
      rg.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = rg
      c.fillRect(0, 0, w, h)
    }
    // angular game-art shards
    const r = rnd(3)
    for (let i = 0; i < 14; i++) {
      c.fillStyle = r() > 0.5 ? 'rgba(255,140,60,0.18)' : 'rgba(170,120,255,0.16)'
      const x = r() * w
      const y = r() * h
      c.beginPath()
      c.moveTo(x, y)
      c.lineTo(x + 120 + r() * 200, y - 30 - r() * 60)
      c.lineTo(x + 60 + r() * 120, y + 40 + r() * 40)
      c.closePath()
      c.fill()
    }
    // UI: health bars and minimap
    c.fillStyle = 'rgba(255,255,255,0.75)'
    c.fillRect(40, h - 60, 240, 10)
    c.fillStyle = '#ff7a1a'
    c.fillRect(40, h - 60, 170, 10)
    c.strokeStyle = 'rgba(255,255,255,0.5)'
    c.lineWidth = 3
    c.strokeRect(w - 170, 30, 130, 130)
    c.fillStyle = 'rgba(255,255,255,0.08)'
    c.fillRect(w - 170, 30, 130, 130)
  })
}

function slatwallTexture() {
  return canvasTex('slatwall', 512, 512, (c, w, h) => {
    c.fillStyle = '#efe9df'
    c.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 32) {
      c.fillStyle = 'rgba(0,0,0,0.13)'
      c.fillRect(0, y, w, 6)
      c.fillStyle = 'rgba(255,255,255,0.5)'
      c.fillRect(0, y + 6, w, 2)
    }
  })
}

function boothTexture(primary: string, secondary: string, accent: string) {
  return canvasTex(`booth-${primary}-${secondary}-${accent}`, 1024, 512, (c, w, h) => {
    c.fillStyle = primary
    c.fillRect(0, 0, w, h)
    c.fillStyle = secondary
    c.beginPath()
    c.moveTo(w * 0.62, 0)
    c.lineTo(w * 0.72, 0)
    c.lineTo(w * 0.52, h)
    c.lineTo(w * 0.42, h)
    c.closePath()
    c.fill()
    c.globalAlpha = 0.6
    c.fillStyle = accent
    c.beginPath()
    c.moveTo(w * 0.75, 0)
    c.lineTo(w * 0.77, 0)
    c.lineTo(w * 0.57, h)
    c.lineTo(w * 0.55, h)
    c.closePath()
    c.fill()
    c.globalAlpha = 1
    const g = c.createRadialGradient(w / 2, h * 0.5, 0, w / 2, h * 0.5, w * 0.6)
    g.addColorStop(0, 'rgba(255,255,255,0.14)')
    g.addColorStop(1, 'rgba(0,0,0,0.3)')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
  })
}

function carpetTexture() {
  return canvasTex('carpet', 256, 256, (c, w, h) => {
    c.fillStyle = '#2b2f37'
    c.fillRect(0, 0, w, h)
    const img = c.getImageData(0, 0, w, h)
    const r = rnd(5)
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (r() - 0.5) * 26
      img.data[i] += n
      img.data[i + 1] += n
      img.data[i + 2] += n
    }
    c.putImageData(img, 0, 0)
  }, [8, 8])
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

const CHROME = { color: '#d6d9df', roughness: 0.18, metalness: 1 } as const

interface Frame {
  k: number // model units per metre
  cx: number
  cz: number
  floor: number // product base (model units)
  top: number
  back: number // product back face z
  front: number
  halfW: number
}

function Keyboard({ f, x, z, rot }: { f: Frame; x: number; z: number; rot: number }) {
  const { k } = f
  const keys = useMemo(() => {
    const out: [number, number, number][] = []
    for (let row = 0; row < 5; row++) for (let col = 0; col < 15; col++) out.push([(-7 + col) * 0.0275, 0, (-2 + row) * 0.0245])
    return out
  }, [])
  return (
    <group position={[x, f.floor, z]} rotation={[0, rot, 0]} scale={k}>
      <mesh position={[0, 0.012, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.44, 0.024, 0.14]} />
        <meshStandardMaterial color="#15171c" roughness={0.45} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.001, 0]}>
        <boxGeometry args={[0.45, 0.002, 0.15]} />
        <meshBasicMaterial color="#ff7a1a" toneMapped={false} transparent opacity={0.6} />
      </mesh>
      {keys.map(([kx, , kz], i) => (
        <mesh key={i} position={[kx, 0.029, kz]} castShadow>
          <boxGeometry args={[0.022, 0.01, 0.02]} />
          <meshStandardMaterial color={i === 22 || i === 36 || i === 37 || i === 38 ? '#ff7a1a' : '#23262d'} roughness={0.55} />
        </mesh>
      ))}
    </group>
  )
}

function Mouse({ f, x, z }: { f: Frame; x: number; z: number }) {
  return (
    <group position={[x, f.floor, z]} scale={f.k} rotation={[0, -0.2, 0]}>
      <mesh position={[0, 0.018, 0]} scale={[0.032, 0.02, 0.06]} castShadow>
        <sphereGeometry args={[1, 32, 20]} />
        <meshStandardMaterial color="#15171c" roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.034, -0.025]}>
        <boxGeometry args={[0.004, 0.006, 0.02]} />
        <meshBasicMaterial color="#ff7a1a" toneMapped={false} />
      </mesh>
    </group>
  )
}

function Monitor({ f, z }: { f: Frame; z: number }) {
  const screen = monitorScreenTexture()
  return (
    <group position={[f.cx, f.floor, z]} scale={f.k}>
      <mesh position={[0, 0.006, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.26, 0.012, 0.2]} />
        <meshStandardMaterial color="#202329" roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.17, -0.03]}>
        <boxGeometry args={[0.05, 0.32, 0.025]} />
        <meshStandardMaterial color="#202329" roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.39, 0]} castShadow>
        <boxGeometry args={[0.62, 0.37, 0.022]} />
        <meshStandardMaterial color="#0c0d10" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.395, 0.0115]}>
        <planeGeometry args={[0.6, 0.338]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
      {/* back glow on the wall */}
      <pointLight position={[0, 0.4, -0.06]} color="#8c5cff" intensity={0.6} distance={0.9} decay={2} />
    </group>
  )
}

function DeskRoom({ f, productId }: { f: Frame; productId: string }) {
  const { k } = f
  const wood = useMemo(() => {
    const t = woodTexture('walnut', '#3a281b', '#1d130c', '#5a4030').clone()
    t.repeat.set(2, 1)
    t.needsUpdate = true
    return t
  }, [])
  const wall = deskWallTexture()
  const deskW = Math.max(1.8, (f.halfW * 2) / k + 1.2) * k
  const deskD = 0.8 * k
  const deskT = 0.035 * k
  const backZ = Math.min(f.back - 0.12 * k, f.cz - 0.3 * k)
  const deskZ = backZ + deskD / 2
  const isMat = productId === 'extended-mousemat' || productId === 'mousemat'
  const tall = (f.top - f.floor) / k > 0.45
  const sideX = f.halfW + 0.12 * k
  return (
    <group>
      {/* desk top and legs */}
      <mesh position={[f.cx, f.floor - deskT / 2 - 0.002, deskZ]} receiveShadow castShadow>
        <boxGeometry args={[deskW, deskT, deskD]} />
        <meshStandardMaterial map={wood} roughness={0.5} metalness={0.05} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[f.cx + s * (deskW / 2 - 0.08 * k), f.floor - deskT - 0.37 * k, deskZ]}>
          <boxGeometry args={[0.05 * k, 0.74 * k, deskD * 0.85]} />
          <meshStandardMaterial color="#121418" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
      {/* large desk mat under the product */}
      {!isMat && (
        <group position={[f.cx, f.floor - 0.001, deskZ + 0.06 * k]}>
          <mesh receiveShadow>
            <boxGeometry args={[Math.min(deskW * 0.8, 0.9 * k + f.halfW * 2), 0.003 * k, 0.4 * k]} />
            <meshStandardMaterial color="#17191e" roughness={0.95} />
          </mesh>
          <mesh position={[0, -0.0005 * k, 0]}>
            <boxGeometry args={[Math.min(deskW * 0.8, 0.9 * k + f.halfW * 2) + 0.006 * k, 0.0028 * k, 0.406 * k]} />
            <meshBasicMaterial color="#ff7a1a" toneMapped={false} />
          </mesh>
        </group>
      )}
      {/* wall with acoustic panels and an LED strip */}
      <mesh position={[f.cx, f.floor + 0.6 * k, backZ - 0.002]} receiveShadow>
        <planeGeometry args={[4 * k, 2.6 * k]} />
        <meshStandardMaterial map={wall} roughness={0.9} />
      </mesh>
      <mesh position={[f.cx, f.floor + 0.02 * k, backZ + 0.01 * k]}>
        <boxGeometry args={[deskW, 0.006 * k, 0.006 * k]} />
        <meshBasicMaterial color="#ff8a33" toneMapped={false} />
      </mesh>
      <pointLight position={[f.cx, f.floor + 0.05 * k, backZ + 0.05 * k]} color="#ff7a1a" intensity={0.8} distance={1.2 * k} decay={2} />
      {!tall && <Monitor f={f} z={backZ + 0.13 * k} />}
      {!isMat && <Keyboard f={f} x={f.cx - sideX - 0.22 * k} z={f.cz + 0.08 * k} rot={0.18} />}
      {!isMat && <Mouse f={f} x={f.cx + sideX + 0.06 * k} z={f.cz + 0.1 * k} />}
    </group>
  )
}

function AcrylicStand({ f }: { f: Frame }) {
  const { k } = f
  const w = f.halfW * 2 * 0.7
  return (
    <group>
      <mesh position={[f.cx, f.floor + 0.004 * k, f.cz]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.008 * k, 0.06 * k]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.05} transmission={0.9} thickness={0.01 * k} transparent opacity={0.5} />
      </mesh>
      <mesh position={[f.cx, f.floor + 0.05 * k, f.back - 0.012 * k]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[w * 0.6, 0.1 * k, 0.006 * k]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.05} transmission={0.9} thickness={0.01 * k} transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

function Hanger({ f, wood }: { f: Frame; wood: boolean }) {
  const { k } = f
  const height = f.top - f.floor
  const neckY = f.top - height * 0.035
  const railY = f.top + 0.12 * k
  const z = (f.front + f.back) / 2 + (f.front - f.back) * 0.08
  const geo = useMemo(() => {
    const shoulder = f.halfW * 0.42
    const bar = new TubeGeometry(
      new CatmullRomCurve3([new Vector3(-shoulder, neckY - 0.05 * k, z), new Vector3(-shoulder * 0.45, neckY - 0.02 * k, z), new Vector3(0, neckY - 0.008 * k, z), new Vector3(shoulder * 0.45, neckY - 0.02 * k, z), new Vector3(shoulder, neckY - 0.05 * k, z)]),
      48,
      (wood ? 0.012 : 0.004) * k,
      12,
      false,
    )
    // wire stem and hook over the rail
    const rr = 0.016 * k
    const stem = new TubeGeometry(
      new CatmullRomCurve3([new Vector3(0, neckY - 0.01 * k, z), new Vector3(0, railY - 0.06 * k, z), new Vector3(0, railY - 0.02 * k, z + 0.004 * k)]),
      24,
      0.0028 * k,
      8,
      false,
    )
    const hook = new TorusGeometry(rr + 0.004 * k, 0.0028 * k, 8, 32, Math.PI * 1.3)
    hook.rotateY(Math.PI / 2)
    hook.rotateX(Math.PI * 0.6)
    hook.translate(0, railY, z - 0.001 * k)
    return { bar, stem, hook }
  }, [f.halfW, neckY, railY, z, k, wood])
  return (
    <group>
      <mesh geometry={geo.bar} castShadow>
        <meshStandardMaterial color={wood ? '#b58a5c' : '#d6d9df'} roughness={wood ? 0.55 : 0.2} metalness={wood ? 0 : 1} />
      </mesh>
      <mesh geometry={geo.stem} castShadow>
        <meshStandardMaterial {...CHROME} />
      </mesh>
      <mesh geometry={geo.hook} castShadow>
        <meshStandardMaterial {...CHROME} />
      </mesh>
    </group>
  )
}

function ClothesRail({ f, freestanding, wall }: { f: Frame; freestanding: boolean; wall: 'slat' | 'desk' | 'booth' }) {
  const { k } = f
  const railY = f.top + 0.12 * k
  const z = (f.front + f.back) / 2 + (f.front - f.back) * 0.08 - 0.001 * k
  const len = Math.max(1.2 * k, f.halfW * 2.6)
  const floorY = f.floor - 0.55 * k
  const wallZ = f.back - 0.18 * k
  const kit = useStudio((s) => s.brandKit)
  const map = wall === 'slat' ? slatwallTexture() : wall === 'desk' ? deskWallTexture() : boothTexture(kit.primary, kit.secondary, kit.accent)
  const floorTex = wall === 'slat' ? woodTexture('oak', '#c9a57a', '#9c7a52', '#dcc09a') : carpetTexture()
  return (
    <group>
      <mesh position={[f.cx, railY, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.016 * k, 0.016 * k, len, 24]} />
        <meshStandardMaterial {...CHROME} />
      </mesh>
      {freestanding
        ? [-1, 1].map((s) => (
            <group key={s} position={[f.cx + (s * len) / 2, 0, z]}>
              <mesh position={[0, (railY + floorY) / 2, 0]} castShadow>
                <cylinderGeometry args={[0.016 * k, 0.016 * k, railY - floorY, 16]} />
                <meshStandardMaterial {...CHROME} />
              </mesh>
              <mesh position={[0, railY, 0]}>
                <sphereGeometry args={[0.024 * k, 16, 12]} />
                <meshStandardMaterial {...CHROME} />
              </mesh>
              <mesh position={[0, floorY + 0.012 * k, 0]} castShadow>
                <boxGeometry args={[0.04 * k, 0.024 * k, 0.5 * k]} />
                <meshStandardMaterial color="#c3c7cd" roughness={0.25} metalness={0.95} />
              </mesh>
            </group>
          ))
        : [-1, 1].map((s) => (
            <group key={s} position={[f.cx + (s * len) / 2.15, railY, 0]}>
              <mesh position={[0, 0, (z + wallZ) / 2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.012 * k, 0.012 * k, z - wallZ, 12]} />
                <meshStandardMaterial {...CHROME} />
              </mesh>
              <mesh position={[0, 0, wallZ + 0.004 * k]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.03 * k, 0.03 * k, 0.008 * k, 24]} />
                <meshStandardMaterial {...CHROME} />
              </mesh>
            </group>
          ))}
      <mesh position={[f.cx, floorY + 1.3 * k, wallZ]} receiveShadow>
        <planeGeometry args={[5 * k, 3 * k]} />
        <meshStandardMaterial map={map} roughness={0.85} />
      </mesh>
      <mesh position={[f.cx, floorY, wallZ + 1.5 * k]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5 * k, 3 * k]} />
        <meshStandardMaterial map={floorTex} roughness={0.75} />
      </mesh>
    </group>
  )
}

/** Oak display table in a boutique, or white plinth in an exhibition booth. */
function Showroom({ f, kind }: { f: Frame; kind: 'table' | 'plinth' }) {
  const { k } = f
  const kit = useStudio((s) => s.brandKit)
  const top = f.floor - 0.002
  const backZ = Math.min(f.back - 0.35 * k, f.cz - 0.5 * k)
  const floorY = top - (kind === 'plinth' ? 0.9 : 0.75) * k
  const oak = woodTexture('oak', '#c9a57a', '#9c7a52', '#dcc09a')
  const wall = kind === 'table' ? slatwallTexture() : boothTexture(kit.primary, kit.secondary, kit.accent)
  const pw = Math.max(0.45 * k, Math.max(f.halfW * 2, (f.front - f.back)) * 1.3)
  return (
    <group>
      {kind === 'plinth' ? (
        <group>
          <mesh position={[f.cx, (top + floorY) / 2, f.cz]} receiveShadow castShadow>
            <boxGeometry args={[pw, top - floorY, pw]} />
            <meshStandardMaterial color="#f4f5f7" roughness={0.6} />
          </mesh>
          <mesh position={[f.cx, top - 0.06 * k, f.cz]}>
            <boxGeometry args={[pw + 0.004 * k, 0.03 * k, pw + 0.004 * k]} />
            <meshStandardMaterial color={kit.secondary} roughness={0.5} />
          </mesh>
        </group>
      ) : (
        <group>
          <mesh position={[f.cx, top - 0.025 * k, f.cz]} receiveShadow castShadow>
            <boxGeometry args={[Math.max(1.2 * k, f.halfW * 3), 0.05 * k, Math.max(0.6 * k, (f.front - f.back) * 2)]} />
            <meshStandardMaterial map={oak} roughness={0.55} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[f.cx + s * (Math.max(1.2 * k, f.halfW * 3) / 2 - 0.06 * k), (top - 0.05 * k + floorY) / 2, f.cz]}>
              <boxGeometry args={[0.04 * k, top - 0.05 * k - floorY, Math.max(0.6 * k, (f.front - f.back) * 2) * 0.9]} />
              <meshStandardMaterial color="#2a2c31" roughness={0.4} metalness={0.7} />
            </mesh>
          ))}
        </group>
      )}
      <mesh position={[f.cx, floorY + 1.4 * k, backZ]} receiveShadow>
        <planeGeometry args={[6 * k, 3 * k]} />
        <meshStandardMaterial map={wall} roughness={0.85} />
      </mesh>
      <mesh position={[f.cx, floorY, backZ + 1.5 * k]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6 * k, 3 * k]} />
        <meshStandardMaterial map={kind === 'table' ? oak : carpetTexture()} roughness={0.75} />
      </mesh>
    </group>
  )
}

/** Gaming chair stands on the floor of the gaming room. */
function RoomFloor({ f }: { f: Frame }) {
  const { k } = f
  const wall = deskWallTexture()
  const backZ = f.back - 0.3 * k
  return (
    <group>
      <mesh position={[f.cx, f.floor - 0.002, backZ + 1.5 * k]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5 * k, 3 * k]} />
        <meshStandardMaterial map={carpetTexture()} color="#4a4f5c" roughness={0.9} />
      </mesh>
      <mesh position={[f.cx, f.floor + 1.3 * k, backZ]} receiveShadow>
        <planeGeometry args={[5 * k, 3 * k]} />
        <meshStandardMaterial map={wall} roughness={0.9} />
      </mesh>
    </group>
  )
}

export function SceneProps({ scene, productId, box }: { scene: SceneId; productId: string; box: Box; radius: number }) {
  const frame = useMemo<Frame>(() => {
    const size = Math.max(box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2])
    const k = size / (REAL[productId] ?? 0.3)
    return {
      k,
      cx: (box.min[0] + box.max[0]) / 2,
      cz: (box.min[2] + box.max[2]) / 2,
      floor: box.min[1],
      top: box.max[1],
      back: box.min[2],
      front: box.max[2],
      halfW: (box.max[0] - box.min[0]) / 2,
    }
  }, [box, productId])
  if (!hasProps(scene)) return null
  const hung = HUNG_GARMENTS.has(productId)
  return (
    <group name="scene-props">
      {hung ? (
        <>
          <Hanger f={frame} wood={scene !== 'desk'} />
          <ClothesRail f={frame} freestanding={scene === 'exhibition'} wall={scene === 'display' ? 'slat' : scene === 'desk' ? 'desk' : 'booth'} />
        </>
      ) : FLOOR.has(productId) ? (
        <RoomFloor f={frame} />
      ) : scene === 'desk' ? (
        <>
          <DeskRoom f={frame} productId={productId} />
          {UPRIGHT.has(productId) && <AcrylicStand f={frame} />}
        </>
      ) : (
        <>
          <Showroom f={frame} kind={scene === 'display' ? 'table' : 'plinth'} />
          {UPRIGHT.has(productId) && <AcrylicStand f={frame} />}
        </>
      )}
    </group>
  )
}
