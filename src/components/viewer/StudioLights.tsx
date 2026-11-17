import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import type { SceneDef } from '../../three/scenes'

/**
 * Lighting built from procedural softboxes (no HDR files). The scene style sets
 * the colours: white product-photography light, neon rims, retro sunset, arena spots…
 */
export function StudioLights({ quality, floorY, radius, shadows, scene }: { quality: 'high' | 'low'; floorY: number; radius: number; shadows: boolean; scene: SceneDef }) {
  const r = Math.max(0.5, radius)
  const L = scene.lights
  return (
    <>
      <Environment key={scene.id} resolution={quality === 'high' ? 512 : 128} frames={1}>
        <color attach="background" args={[L.env]} />
        <Lightformer form="rect" intensity={L.top} position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer form="rect" color={L.key[0]} intensity={L.key[1]} position={[-4.5, 2.5, 4]} rotation-y={-Math.PI / 4} scale={[4, 5, 1]} />
        <Lightformer form="rect" color={L.fill[0]} intensity={L.fill[1]} position={[4.5, 1.5, 4]} rotation-y={Math.PI / 4} scale={[4, 4, 1]} />
        <Lightformer form="rect" color={L.rimL[0]} intensity={L.rimL[1]} position={[-5, 2, -3]} rotation-y={Math.PI * 0.65} scale={[1, 7, 1]} />
        <Lightformer form="rect" color={L.rimR[0]} intensity={L.rimR[1]} position={[5, 2, -3]} rotation-y={-Math.PI * 0.65} scale={[1, 7, 1]} />
        <Lightformer form="rect" intensity={L.floor} position={[0, -5, 0]} rotation-x={-Math.PI / 2} scale={[12, 12, 1]} />
      </Environment>
      <hemisphereLight args={[L.hemiSky, L.hemiGround, L.hemi]} />
      <directionalLight
        position={[-2.6 * r, 5 * r, 3.6 * r]}
        color={L.dir[0]}
        intensity={L.dir[1]}
        castShadow={quality === 'high'}
        shadow-mapSize={[2048, 2048]}
        shadow-radius={6}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
        shadow-camera-left={-r * 1.3}
        shadow-camera-right={r * 1.3}
        shadow-camera-top={r * 1.3}
        shadow-camera-bottom={-r * 1.3}
        shadow-camera-near={0.1}
        shadow-camera-far={r * 20}
      />
      {/* coloured rim lights so neon / retro / arena scenes light the product itself */}
      <directionalLight position={[-4 * r, 1.5 * r, -3 * r]} color={L.rimL[0]} intensity={L.rimL[1] * 0.35} />
      <directionalLight position={[4 * r, 1.5 * r, -3 * r]} color={L.rimR[0]} intensity={L.rimR[1] * 0.35} />
      {shadows && (
        <group name="contact-shadows">
          <ContactShadows position={[0, floorY - 0.002, 0]} opacity={L.shadow} scale={r * 3.4} blur={3.2} far={r * 1.4} resolution={quality === 'high' ? 512 : 256} color="#1b1d22" />
          <ContactShadows position={[0, floorY - 0.001, 0]} opacity={L.shadow * 1.1} scale={r * 3.4} blur={0.9} far={r * 0.12} resolution={quality === 'high' ? 1024 : 256} color="#101114" />
        </group>
      )}
    </>
  )
}
