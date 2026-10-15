import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import {
  stoneGeo,
  woodGeo,
  amphoraGeo,
  liveRockGeo,
  archGeo,
  vallisGeo,
  swordGeo,
  anubiasGeo,
  mossGeo,
  leatherGeo,
  anemoneGeo,
  acroporaGeo,
  zoaGeo,
} from './geo.js'

/** Uniforms shared by every swaying plant/coral and the ground caustics. */
export const shared = { uTime: { value: 0 }, uFlow: { value: 1 }, uCaustic: { value: 0 } }

const once = (make) => {
  let v
  return () => (v ??= make())
}

function swayMaterial(key, { amp, speed = 1.2, height = 1, ...params }) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide, ...params })
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = shared.uTime
    s.uniforms.uFlow = shared.uFlow
    s.vertexShader =
      'uniform float uTime;\nuniform float uFlow;\n' +
      s.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 swW = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float swK = clamp(position.y / ${height.toFixed(3)}, 0.0, 1.5);
        swK *= swK;
        float swP = swW.x * 1.7 + swW.z * 2.3;
        transformed.x += sin(uTime * ${speed.toFixed(3)} + swP + position.y * 1.3) * ${amp.toFixed(3)} * uFlow * swK;
        transformed.z += cos(uTime * ${(speed * 0.8).toFixed(3)} + swP * 1.3 + position.y) * ${(amp * 0.6).toFixed(3)} * uFlow * swK;`,
      )
  }
  m.customProgramCacheKey = () => 'sway-' + key
  return m
}

const mats = {
  rock: once(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true })),
  wood: once(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })),
  matte: once(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, side: THREE.DoubleSide })),
  coral: once(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 })),
  gloss: once(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, side: THREE.DoubleSide })),
  moss: once(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })),
  vallis: once(() => swayMaterial('vallis', { amp: 0.32, speed: 1.1, height: 3.2, roughness: 0.6 })),
  sword: once(() => swayMaterial('sword', { amp: 0.08, speed: 1.3, height: 1.4, roughness: 0.55 })),
  anemone: once(() => swayMaterial('anemone', { amp: 0.06, speed: 2.1, height: 0.7, roughness: 0.45, side: THREE.FrontSide })),
  leather: once(() => swayMaterial('leather', { amp: 0.025, speed: 0.9, height: 0.75, roughness: 0.75 })),
}

function geoModel(build, mat, { cast = true } = {}) {
  return function Model({ seed = 1, color }) {
    const geo = useMemo(() => build(seed, color), [seed, color])
    useEffect(() => () => geo.dispose(), [geo])
    return <mesh geometry={geo} material={mats[mat]()} castShadow={cast} receiveShadow />
  }
}

/* height: how tall the model is (for fitting under the water line);
 * radius: footprint for the selection ring; scale: display size (small things read better a bit larger). */
export const MODELS = {
  stone: { C: geoModel(stoneGeo, 'rock'), height: 0.9, radius: 0.85 },
  wood: { C: geoModel(woodGeo, 'wood'), height: 1.8, radius: 1.1 },
  amphora: { C: geoModel(amphoraGeo, 'matte'), height: 0.8, radius: 0.7 },
  liverock: { C: geoModel(liveRockGeo, 'coral'), height: 1.2, radius: 0.95 },
  arch: { C: geoModel(archGeo, 'coral'), height: 1.3, radius: 1.25 },
  vallis: { C: geoModel(vallisGeo, 'vallis', { cast: false }), height: 3.4, radius: 0.4 },
  sword: { C: geoModel(swordGeo, 'sword'), height: 1.4, radius: 0.75 },
  anubias: { C: geoModel(anubiasGeo, 'gloss'), height: 0.7, radius: 0.45, scale: 1.35 },
  moss: { C: geoModel(mossGeo, 'moss'), height: 0.45, radius: 0.3, scale: 1.25 },
  leather: { C: geoModel(leatherGeo, 'leather'), height: 0.75, radius: 0.65, scale: 1.55 },
  anemone: { C: geoModel(anemoneGeo, 'anemone'), height: 0.75, radius: 0.45, scale: 1.7 },
  acropora: { C: geoModel(acroporaGeo, 'coral'), height: 1.3, radius: 0.7, scale: 1.5 },
  zoa: { C: geoModel(zoaGeo, 'coral'), height: 0.35, radius: 0.5, scale: 1.6 },
  filter: { C: Filter, height: 1, radius: 0.35 },
  heater: { C: Heater, height: 1.1, radius: 0.18 },
  air: { C: AirStone, height: 0.1, radius: 0.22 },
  pump: { C: Pump, height: 0.4, radius: 0.25 },
  light: { C: LedLight, height: 0.1, radius: 0 },
}

/* ───────── Equipment ───────── */

const dark = { color: '#2c353b', roughness: 0.45, metalness: 0.2 }

/** Internal filter, 1 unit tall; the layout stretches it to the water depth. */
function Filter() {
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.42, 1, 0.26]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      {[0.12, 0.2, 0.28, 0.36].map((y) => (
        <mesh key={y} position={[0, y, 0.132]}>
          <boxGeometry args={[0.3, 0.025, 0.006]} />
          <meshStandardMaterial color="#12181b" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[-0.27, 0.9, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.05, 0.16, 12]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <boxGeometry args={[0.46, 0.05, 0.3]} />
        <meshStandardMaterial color="#1d2428" roughness={0.4} />
      </mesh>
    </group>
  )
}

function Heater() {
  return (
    <group rotation={[0, 0, 0.08]}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 1.0, 16]} />
        <meshPhysicalMaterial color="#d9f4ff" transparent opacity={0.35} roughness={0.05} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.032, 0.032, 0.82, 10]} />
        <meshStandardMaterial color="#b9643a" emissive="#ff6a2a" emissiveIntensity={0.35} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.16, 16]} />
        <meshStandardMaterial color="#1b2226" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.13, 0.07]}>
        <sphereGeometry args={[0.018, 10, 8]} />
        <meshStandardMaterial color="#ff2a1a" emissive="#ff2a1a" emissiveIntensity={3} />
      </mesh>
    </group>
  )
}

function AirStone() {
  return (
    <group>
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.15, 0.08, 18]} />
        <meshStandardMaterial color="#8fa3ab" roughness={1} />
      </mesh>
    </group>
  )
}

function Pump() {
  return (
    <group rotation={[0, 0, -Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.12, 24]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      <mesh position={[0, 0.065, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.13, 0.018, 8, 24]} />
        <meshStandardMaterial color="#4a90b8" roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.09, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.06, 20]} />
        <meshStandardMaterial color="#1b2226" />
      </mesh>
    </group>
  )
}

/** LED bar on top of the tank; built 1 × 1 and stretched to the tank by the layout. */
function LedLight() {
  return (
    <group>
      <mesh position={[0, 0.04, 0]} castShadow>
        <boxGeometry args={[1, 0.08, 1]} />
        <meshStandardMaterial color="#1f262a" roughness={0.35} metalness={0.5} />
      </mesh>
      <mesh position={[0, -0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.94, 0.7]} />
        <meshStandardMaterial color="#ffffff" emissive="#fff4d6" emissiveIntensity={2.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
