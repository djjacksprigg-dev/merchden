/**
 * 3D set dressing for mockup environments: the product stands on a real desk,
 * display table or plinth, and garments hang on a hanger from a rail. Everything
 * is simple procedural geometry; it is hidden for product-only (transparent) exports.
 */
import { useMemo } from 'react'
import { BoxGeometry, CatmullRomCurve3, CylinderGeometry, DoubleSide, TorusGeometry, TubeGeometry, Vector3 } from 'three'
import type { SceneId } from '../../three/scenes'

/** Tops and jackets that would be shown on a hanger. */
export const HUNG_GARMENTS = new Set(['jersey', 'tee', 'oversized-tee', 'hoodie', 'zip-hoodie', 'sweatshirt', 'polo', 'tracksuit-jacket', 'varsity-jacket', 'windbreaker'])

const PROP_SCENES: SceneId[] = ['desk', 'display', 'exhibition']
export const hasProps = (scene: SceneId) => PROP_SCENES.includes(scene)

interface Box {
  min: [number, number, number]
  max: [number, number, number]
}

function Hanger({ box, wood }: { box: Box; wood: boolean }) {
  const { min, max } = box
  const halfW = (max[0] - min[0]) / 2
  // garments are modelled with the neck opening near the top of the body
  const neckY = max[1] - (max[1] - min[1]) * 0.03
  const shoulder = halfW * 0.38
  const railY = max[1] + (max[1] - min[1]) * 0.16
  const z = (min[2] + max[2]) / 2 + (max[2] - min[2]) * 0.06
  const geo = useMemo(() => {
    const bar = new TubeGeometry(
      new CatmullRomCurve3([new Vector3(-shoulder, neckY - 0.11, z), new Vector3(-shoulder * 0.5, neckY - 0.05, z), new Vector3(0, neckY - 0.02, z), new Vector3(shoulder * 0.5, neckY - 0.05, z), new Vector3(shoulder, neckY - 0.11, z)]),
      48,
      wood ? 0.018 : 0.008,
      12,
      false,
    )
    const stemTop = railY - 0.01
    const stem = new CylinderGeometry(0.005, 0.005, stemTop - (neckY - 0.02), 10)
    stem.translate(0, (stemTop + neckY - 0.02) / 2, z)
    const hook = new TorusGeometry(0.035, 0.005, 8, 24, Math.PI * 1.25)
    hook.rotateY(Math.PI / 2)
    hook.rotateX(-Math.PI * 0.12)
    hook.translate(0, railY + 0.004, z + 0.035)
    return { bar, stem, hook }
  }, [shoulder, neckY, railY, z, wood])
  return (
    <group>
      <mesh geometry={geo.bar} castShadow>
        <meshStandardMaterial color={wood ? '#a87b4f' : '#c7cbd2'} roughness={wood ? 0.6 : 0.25} metalness={wood ? 0 : 0.9} />
      </mesh>
      <mesh geometry={geo.stem} castShadow>
        <meshStandardMaterial color="#c7cbd2" roughness={0.25} metalness={0.9} />
      </mesh>
      <mesh geometry={geo.hook}>
        <meshStandardMaterial color="#c7cbd2" roughness={0.25} metalness={0.9} />
      </mesh>
    </group>
  )
}

function Rail({ box, freestanding }: { box: Box; freestanding: boolean }) {
  const { min, max } = box
  const w = (max[0] - min[0]) * 2.4
  const railY = max[1] + (max[1] - min[1]) * 0.16
  const z = (min[2] + max[2]) / 2 + (max[2] - min[2]) * 0.06 + 0.035
  const floorY = min[1] - (max[1] - min[1]) * 0.35
  return (
    <group>
      <mesh position={[0, railY + 0.04, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, w, 16]} />
        <meshStandardMaterial color="#b9bec6" roughness={0.2} metalness={0.95} />
      </mesh>
      {freestanding
        ? [-1, 1].map((s) => (
            <group key={s}>
              <mesh position={[(s * w) / 2, (railY + 0.04 + floorY) / 2, z]}>
                <cylinderGeometry args={[0.014, 0.014, railY + 0.04 - floorY, 12]} />
                <meshStandardMaterial color="#b9bec6" roughness={0.2} metalness={0.95} />
              </mesh>
              <mesh position={[(s * w) / 2, floorY + 0.01, z]}>
                <boxGeometry args={[0.05, 0.02, 0.5]} />
                <meshStandardMaterial color="#9aa0a8" roughness={0.3} metalness={0.9} />
              </mesh>
            </group>
          ))
        : [-1, 1].map((s) => (
            // wall brackets
            <mesh key={s} position={[(s * w) / 2.2, railY + 0.04, z - 0.15]}>
              <boxGeometry args={[0.02, 0.02, 0.3]} />
              <meshStandardMaterial color="#9aa0a8" roughness={0.3} metalness={0.9} />
            </mesh>
          ))}
    </group>
  )
}

/** Gaming desk top with an RGB strip, keyboard and mouse. */
function Desk({ box, radius }: { box: Box; radius: number }) {
  const { min, max } = box
  const cx = (min[0] + max[0]) / 2
  const cz = (min[2] + max[2]) / 2
  const r = Math.max(0.5, radius)
  const W = r * 7
  const D = r * 3
  const T = r * 0.07
  const top = min[1] - 0.004
  const kb = useMemo(() => {
    const g = new BoxGeometry(r * 1.05, r * 0.035, r * 0.34)
    return g
  }, [r])
  return (
    <group>
      <mesh position={[cx, top - T / 2, cz - D * 0.12]} receiveShadow>
        <boxGeometry args={[W, T, D]} />
        <meshStandardMaterial color="#1c1f26" roughness={0.55} metalness={0.15} />
      </mesh>
      {/* RGB light strip along the back edge */}
      <mesh position={[cx, top + 0.004, cz - D * 0.62 + 0.02]}>
        <boxGeometry args={[W, 0.008, 0.02]} />
        <meshBasicMaterial color="#ff7a1a" toneMapped={false} />
      </mesh>
      <mesh position={[cx, top - T - 0.004, cz - D * 0.12]}>
        <boxGeometry args={[W * 0.98, 0.006, D * 0.9]} />
        <meshBasicMaterial color="#8c5cff" toneMapped={false} transparent opacity={0.5} />
      </mesh>
      {/* keyboard and mouse to the front-left / right of the product */}
      <mesh geometry={kb} position={[cx - r * 1.55, top + r * 0.0175, cz + r * 0.55]} rotation={[0, 0.12, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#121418" roughness={0.6} />
      </mesh>
      <mesh position={[cx - r * 1.55, top + r * 0.036, cz + r * 0.55]} rotation={[0, 0.12, 0]}>
        <boxGeometry args={[r * 0.98, 0.003, r * 0.28]} />
        <meshBasicMaterial color="#ff7a1a" toneMapped={false} transparent opacity={0.35} />
      </mesh>
      <mesh position={[cx + r * 1.5, top + r * 0.03, cz + r * 0.5]} scale={[r * 0.06, r * 0.03, r * 0.1]} castShadow>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color="#121418" roughness={0.45} />
      </mesh>
    </group>
  )
}

/** Light oak display table (clothing display) or white plinth (exhibition). */
function Stand({ box, radius, kind }: { box: Box; radius: number; kind: 'table' | 'plinth' }) {
  const { min, max } = box
  const cx = (min[0] + max[0]) / 2
  const cz = (min[2] + max[2]) / 2
  const r = Math.max(0.5, radius)
  const top = min[1] - 0.004
  if (kind === 'plinth') {
    const w = Math.max(max[0] - min[0], max[2] - min[2]) * 1.35 + 0.1
    const h = r * 2.2
    return (
      <mesh position={[cx, top - h / 2, cz]} receiveShadow castShadow>
        <boxGeometry args={[w, h, w]} />
        <meshStandardMaterial color="#f2f3f5" roughness={0.7} />
      </mesh>
    )
  }
  const W = r * 4.5
  const D = r * 1.9
  const T = r * 0.09
  return (
    <group>
      <mesh position={[cx, top - T / 2, cz]} receiveShadow castShadow>
        <boxGeometry args={[W, T, D]} />
        <meshStandardMaterial color="#c9a57a" roughness={0.65} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[cx + (s * W) / 2.4, top - T - r * 0.9, cz]}>
          <boxGeometry args={[r * 0.08, r * 1.8, D * 0.8]} />
          <meshStandardMaterial color="#b88f62" roughness={0.65} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

export function SceneProps({ scene, productId, box, radius }: { scene: SceneId; productId: string; box: Box; radius: number }) {
  if (!hasProps(scene)) return null
  const hung = HUNG_GARMENTS.has(productId)
  return (
    <group name="scene-props">
      {hung ? (
        <>
          <Hanger box={box} wood={scene !== 'desk'} />
          <Rail box={box} freestanding={scene === 'exhibition'} />
        </>
      ) : scene === 'desk' ? (
        <Desk box={box} radius={radius} />
      ) : (
        <Stand box={box} radius={radius} kind={scene === 'display' ? 'table' : 'plinth'} />
      )}
    </group>
  )
}
