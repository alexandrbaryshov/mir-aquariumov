import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  stoneGeo,
  woodGeo,
  amphoraGeo,
  slateGeo,
  rootGeo,
  caveGeo,
  liveRockGeo,
  archGeo,
  pillarGeo,
  shellGeo,
  vallisGeo,
  cabombaGeo,
  ludwigiaGeo,
  swordGeo,
  cryptGeo,
  anubiasGeo,
  hairgrassGeo,
  mossGeo,
  leatherGeo,
  anemoneGeo,
  acroporaGeo,
  zoaGeo,
  brainGeo,
  discoGeo,
  gorgonianGeo,
  euphylliaGeo,
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
  cabomba: once(() => swayMaterial('cabomba', { amp: 0.22, speed: 1.0, height: 3, roughness: 0.65 })),
  ludwigia: once(() => swayMaterial('ludwigia', { amp: 0.1, speed: 1.2, height: 2.2, roughness: 0.55 })),
  sword: once(() => swayMaterial('sword', { amp: 0.08, speed: 1.3, height: 1.4, roughness: 0.55 })),
  crypt: once(() => swayMaterial('crypt', { amp: 0.05, speed: 1.1, height: 0.85, roughness: 0.6 })),
  hairgrass: once(() => swayMaterial('hairgrass', { amp: 0.04, speed: 1.6, height: 0.5, roughness: 0.7 })),
  anemone: once(() => swayMaterial('anemone', { amp: 0.06, speed: 2.1, height: 0.7, roughness: 0.45, side: THREE.FrontSide })),
  euphyllia: once(() => swayMaterial('euphyllia', { amp: 0.05, speed: 1.8, height: 0.6, roughness: 0.45, side: THREE.FrontSide })),
  gorgonian: once(() => swayMaterial('gorgonian', { amp: 0.05, speed: 0.8, height: 1.3, roughness: 0.6 })),
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
  slate: { C: geoModel(slateGeo, 'rock'), height: 0.65, radius: 0.85 },
  root: { C: geoModel(rootGeo, 'wood'), height: 1.9, radius: 1.1 },
  cave: { C: geoModel(caveGeo, 'rock'), height: 1.05, radius: 0.95 },
  liverock: { C: geoModel(liveRockGeo, 'coral'), height: 1.2, radius: 0.95 },
  arch: { C: geoModel(archGeo, 'coral'), height: 1.3, radius: 1.25 },
  pillar: { C: geoModel(pillarGeo, 'coral'), height: 2.4, radius: 0.8 },
  shell: { C: geoModel(shellGeo, 'matte'), height: 0.45, radius: 0.6, scale: 1.25 },
  vallis: { C: geoModel(vallisGeo, 'vallis', { cast: false }), height: 3.4, radius: 0.4 },
  cabomba: { C: geoModel(cabombaGeo, 'cabomba', { cast: false }), height: 3.1, radius: 0.4 },
  ludwigia: { C: geoModel(ludwigiaGeo, 'ludwigia'), height: 2.2, radius: 0.4 },
  sword: { C: geoModel(swordGeo, 'sword'), height: 1.4, radius: 0.75 },
  crypt: { C: geoModel(cryptGeo, 'crypt'), height: 0.85, radius: 0.6, scale: 1.2 },
  anubias: { C: geoModel(anubiasGeo, 'gloss'), height: 0.7, radius: 0.45, scale: 1.35 },
  hairgrass: { C: geoModel(hairgrassGeo, 'hairgrass', { cast: false }), height: 0.5, radius: 0.5, scale: 1.2 },
  moss: { C: geoModel(mossGeo, 'moss'), height: 0.45, radius: 0.3, scale: 1.25 },
  leather: { C: geoModel(leatherGeo, 'leather'), height: 0.75, radius: 0.65, scale: 1.55 },
  anemone: { C: geoModel(anemoneGeo, 'anemone'), height: 0.75, radius: 0.45, scale: 1.7 },
  acropora: { C: geoModel(acroporaGeo, 'coral'), height: 1.3, radius: 0.7, scale: 1.5 },
  zoa: { C: geoModel(zoaGeo, 'coral'), height: 0.35, radius: 0.5, scale: 1.6 },
  brain: { C: geoModel(brainGeo, 'coral'), height: 0.5, radius: 0.5, scale: 1.5 },
  disco: { C: geoModel(discoGeo, 'coral'), height: 0.35, radius: 0.5, scale: 1.5 },
  gorgonian: { C: geoModel(gorgonianGeo, 'gorgonian'), height: 1.3, radius: 0.6, scale: 1.3 },
  euphyllia: { C: geoModel(euphylliaGeo, 'euphyllia'), height: 0.65, radius: 0.45, scale: 1.6 },
  filter: { C: Filter, height: 1, radius: 0.35 },
  canister: { C: Canister, height: 1.1, radius: 0 },
  heater: { C: Heater, height: 1.1, radius: 0.18 },
  thermo: { C: Thermometer, height: 0.55, radius: 0 },
  feeder: { C: Feeder, height: 0.3, radius: 0 },
  air: { C: AirStone, height: 0.1, radius: 0.22 },
  co2: { C: Co2Diffuser, height: 0.4, radius: 0.2 },
  pump: { C: Pump, height: 0.4, radius: 0.25 },
  skimmer: { C: Skimmer, height: 1, radius: 0.22 },
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

const glass = { color: '#e3f7ff', transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }

/**
 * External canister filter: stands on the floor right of the cabinet (the layout puts
 * the group there, so local y 0 is the floor, 1.6 below the tank bottom). Its hoses
 * climb to the rim and hook over into the water, following the tank height.
 */
function Canister({ world }) {
  const rise = useRef([])
  const over = useRef([])
  const down = useRef([])
  useFrame(() => {
    const rim = world.current.H + 1.6 + 0.14
    const top = 1.08
    rise.current.forEach((m) => {
      m.scale.y = rim - top
      m.position.y = top + (rim - top) / 2
    })
    over.current.forEach((m) => (m.position.y = rim))
    down.current.forEach((m) => (m.position.y = rim - 0.45))
  })
  return (
    <group>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.26, 0.9, 24]} />
        <meshStandardMaterial color="#33424a" roughness={0.5} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.98, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.16, 24]} />
        <meshStandardMaterial color="#1d2529" roughness={0.4} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.255, 0.86, 0]}>
          <boxGeometry args={[0.03, 0.14, 0.09]} />
          <meshStandardMaterial color="#8fa0a8" roughness={0.4} metalness={0.4} />
        </mesh>
      ))}
      {[-0.09, 0.09].map((z, i) => (
        <group key={z}>
          <mesh ref={(el) => (rise.current[i] = el)} position={[0, 1.5, z]}>
            <cylinderGeometry args={[0.028, 0.028, 1, 8]} />
            <meshStandardMaterial color="#2b6f62" transparent opacity={0.85} roughness={0.3} />
          </mesh>
          <mesh ref={(el) => (over.current[i] = el)} position={[-0.5, 2, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.028, 0.028, 1, 8]} />
            <meshStandardMaterial color="#2b6f62" transparent opacity={0.85} roughness={0.3} />
          </mesh>
          <mesh ref={(el) => (down.current[i] = el)} position={[-1, 2, z]}>
            <cylinderGeometry args={[0.028, 0.028, 0.9, 8]} />
            <meshStandardMaterial color="#2b6f62" transparent opacity={0.85} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Protein skimmer: column with a collection cup, 1 unit tall, stretched to the water line. */
function Skimmer() {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[0.24, 0.12, 0.2]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, 0.66, 18]} />
        <meshStandardMaterial color="#3b4950" transparent opacity={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.86, 0]}>
        <cylinderGeometry args={[0.14, 0.12, 0.18, 18]} />
        <meshPhysicalMaterial {...glass} />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.12, 0.11, 0.08, 18]} />
        <meshStandardMaterial color="#9a8a5e" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.97, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.04, 18]} />
        <meshStandardMaterial color="#1b2226" roughness={0.4} />
      </mesh>
    </group>
  )
}

/** CO₂ diffuser: a glass cup with a ceramic disc on a short stem; bubbles come from Scene. */
function Co2Diffuser() {
  return (
    <group>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.06, 14]} />
        <meshStandardMaterial color="#7d878b" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.24, 8]} />
        <meshPhysicalMaterial {...glass} />
      </mesh>
      <mesh position={[0, 0.33, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.05, 0.1, 18]} />
        <meshPhysicalMaterial {...glass} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.015, 18]} />
        <meshStandardMaterial color="#f1f3ef" roughness={1} />
      </mesh>
    </group>
  )
}

/** Automatic feeder clipped to the rim: a box with a food drum. */
function Feeder({ color }) {
  return (
    <group>
      <mesh position={[0, 0.07, 0]} castShadow>
        <boxGeometry args={[0.34, 0.14, 0.24]} />
        <meshStandardMaterial color="#e9ecea" roughness={0.45} />
      </mesh>
      <mesh position={[0.02, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.2, 18]} />
        <meshPhysicalMaterial color={color} transparent opacity={0.75} roughness={0.2} />
      </mesh>
      <mesh position={[-0.12, 0.15, 0.125]}>
        <boxGeometry args={[0.06, 0.03, 0.01]} />
        <meshStandardMaterial color="#1b2226" emissive="#46e08a" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

/** Glass thermometer on the front pane. */
function Thermometer() {
  return (
    <group>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.52, 10]} />
        <meshPhysicalMaterial {...glass} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.36, 6]} />
        <meshStandardMaterial color="#d94f3d" emissive="#d94f3d" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.022, 10, 8]} />
        <meshStandardMaterial color="#d94f3d" emissive="#d94f3d" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.4, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.02, 14]} />
        <meshPhysicalMaterial {...glass} opacity={0.5} />
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
