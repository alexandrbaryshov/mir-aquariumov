import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { MODELS, shared } from './models.jsx'
import { School } from './fauna.jsx'
import { groundGeo, groundTop, groundTexture, rayTexture } from './geo.js'
import { byId, tankById } from './catalog.js'

const WATER_TINT = { fresh: '#6cc9bb', marine: '#57b0e6' }
// Backdrop film on the back glass: top → bottom.
const BACKDROP = { fresh: ['#8fd3c8', '#2f7a72'], marine: ['#7cc2ee', '#1f5592'] }
const DROP = 0.95 // seconds from "above the tank" to resting on the ground
const SURF = 0.3 // part of the drop spent falling through air

/**
 * 3D aquarium for the builder. Everything visible is driven by props (water, tank,
 * ground, placed items); per-frame animation reads one shared `world` ref so tank
 * resizes, ground pouring and lighting never re-render React.
 */
export default function BuilderScene(props) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 30, near: 0.1, far: 120, position: [0, 5, 18] }}
      frameloop={props.active ? 'always' : 'never'}
      onPointerMissed={() => props.onSelect(null)}
      style={{ touchAction: 'pan-y' }}
    >
      <World {...props} />
    </Canvas>
  )
}

function World({ water, tankId, ground, placed, yawRef, pitchRef, idleRef, selected, hovered, onSelect, onHover, chipRef, reduce }) {
  const size = tankById[tankId].size
  const has = (id) => placed.some((p) => p.id === id)
  const lit = has('light')
  const flow = has('pump')
  const world = useRef(null)
  if (!world.current) {
    const w = { W: size[0], H: size[1], D: size[2], waterTop: size[1] * 0.9, g: ground ? 1 : 0, lit: 0 }
    w.ground = (z) => 0.03 + w.g * groundTop(z / w.D)
    world.current = w
  }
  const registry = useRef(new Map())
  const list = usePresence(placed)
  const homes = useMemo(() => placed.filter((p) => p.id === 'anemone').map(({ u, v }) => ({ u, v })), [placed])

  // A new ground type is poured in from empty.
  const firstGround = useRef(true)
  useEffect(() => {
    if (firstGround.current) {
      firstGround.current = false
      return
    }
    world.current.g = 0
  }, [ground])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const w = world.current
    const k = 1 - Math.exp(-dt * 5)
    w.W += (size[0] - w.W) * k
    w.H += (size[1] - w.H) * k
    w.D += (size[2] - w.D) * k
    w.waterTop = w.H * 0.9
    w.g += ((ground ? 1 : 0) - w.g) * (1 - Math.exp(-dt * 2.6))
    w.lit += ((lit ? 1 : 0) - w.lit) * (1 - Math.exp(-dt * 3))
    shared.uTime.value = state.clock.elapsedTime
    shared.uFlow.value += ((flow ? 2.4 : 1) - shared.uFlow.value) * k
    shared.uCaustic.value = w.lit
  }, -1)

  return (
    <>
      <Env />
      <Lights world={world} />
      <Rig world={world} yawRef={yawRef} pitchRef={pitchRef} idleRef={idleRef} reduce={reduce}>
        <Stand world={world} />
        <Ground world={world} kind={ground} />
        {list.map((p) =>
          byId[p.id].group === 'fauna' ? (
            <School
              key={p.uid}
              p={p}
              count={byId[p.id].count}
              world={world}
              homes={homes}
              leaving={!!p.leaving}
              registry={registry}
              onSelect={onSelect}
              setHover={onHover}
              reduce={reduce}
            />
          ) : (
            <Placed
              key={p.uid}
              p={p}
              world={world}
              leaving={!!p.leaving}
              active={selected === p.uid || hovered === p.uid}
              registry={registry}
              onSelect={onSelect}
              setHover={onHover}
              reduce={reduce}
            />
          ),
        )}
        {has('air') && <Bubbles world={world} kind="air" />}
        {has('filter') && <Bubbles world={world} kind="filter" />}
        {has('co2') && <Bubbles world={world} kind="co2" />}
        <Rays world={world} />
        <Tank world={world} water={water} />
      </Rig>
      <ShadowCatcher />
      <ChipTracker registry={registry} selected={selected} chipRef={chipRef} />
    </>
  )
}

/** Keeps leaving items mounted for a moment so they can animate out. */
function usePresence(list, ms = 520) {
  const [items, setItems] = useState(list)
  useEffect(() => {
    const ids = new Set(list.map((p) => p.uid))
    setItems((cur) => [
      ...list,
      ...cur.filter((p) => !ids.has(p.uid)).map((p) => (p.leaving ? p : { ...p, leaving: performance.now() })),
    ])
    const t = setTimeout(() => setItems((cur) => cur.filter((p) => !p.leaving || performance.now() - p.leaving < ms - 30)), ms)
    return () => clearTimeout(t)
  }, [list, ms])
  return items
}

function Env() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.55
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

function Lights({ world }) {
  const hemi = useRef()
  const spot = useRef()
  useFrame(() => {
    const w = world.current
    hemi.current.intensity = 0.55 + 0.3 * w.lit
    spot.current.intensity = 12 * w.lit
    spot.current.position.set(0, w.H + 1.4, 0.2)
  })
  return (
    <>
      <hemisphereLight ref={hemi} args={['#ffffff', '#9cc4c4', 0.55]} />
      <directionalLight
        position={[6, 11, 8]}
        intensity={1.25}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <directionalLight position={[-7, 4, -6]} intensity={0.3} color="#cfe9ff" />
      <spotLight ref={spot} angle={0.95} penumbra={0.85} decay={1.1} distance={0} color="#f3fbff" />
    </>
  )
}

/** Turntable for the aquarium (yaw) plus a camera that frames whatever tank size is active. */
function Rig({ world, yawRef, pitchRef, idleRef, reduce, children }) {
  const rig = useRef()
  const { camera, size } = useThree()
  const want = useMemo(() => new THREE.Vector3(), [])
  const placedOnce = useRef(false)
  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const w = world.current
    const idle = !reduce && performance.now() - idleRef.current > 4500
    const yaw = yawRef.current + (idle ? Math.sin(state.clock.elapsedTime * 0.25) * 0.22 : 0)
    rig.current.rotation.y += (yaw - rig.current.rotation.y) * (1 - Math.exp(-dt * 6))

    const aspect = size.width / Math.max(1, size.height)
    const fov = THREE.MathUtils.degToRad(camera.fov)
    const halfW = Math.atan(Math.tan(fov / 2) * aspect)
    const reach = Math.hypot(w.W, w.D) / 2 // the turntable can show the tank diagonally
    const distW = (reach + 0.8) / Math.tan(halfW) + w.D / 2
    const distH = (w.H / 2 + 1.5) / Math.tan(fov / 2) + w.D / 2
    const dist = Math.max(distW, distH, 7 + w.W * 0.85)
    const pitch = pitchRef.current
    // On tall (phone) stages lift the tank so the goals bar below doesn't cover it.
    const ty = w.H * 0.42 - (aspect < 1 ? (1 - aspect) * 2.4 : 0)
    want.set(0, ty + Math.sin(pitch) * dist, Math.cos(pitch) * dist)
    if (!placedOnce.current) {
      camera.position.copy(want)
      placedOnce.current = true
    } else camera.position.lerp(want, 1 - Math.exp(-dt * 4))
    camera.lookAt(0, ty, 0)
  })
  return (
    <group ref={rig} rotation={[0, yawRef.current, 0]}>
      {children}
    </group>
  )
}

function ShadowCatcher() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -1.6, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <shadowMaterial transparent opacity={0.18} />
    </mesh>
  )
}

/* ───────── Tank, stand, ground ───────── */

const RIM = 0.07

function Tank({ world, water }) {
  const glass = useRef()
  const waterRef = useRef()
  const surface = useRef()
  const rims = useRef([])
  const seams = useRef([])
  const mats = useMemo(() => {
    const hidden = new THREE.MeshBasicMaterial({ visible: false })
    const glassM = new THREE.MeshPhysicalMaterial({
      color: '#e8fbff',
      transparent: true,
      opacity: 0.1,
      roughness: 0.03,
      metalness: 0,
      envMapIntensity: 1.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    const waterM = new THREE.MeshPhysicalMaterial({
      color: WATER_TINT[water],
      transparent: true,
      opacity: 0.34,
      roughness: 0.25,
      metalness: 0,
      depthWrite: false,
    })
    const surfM = new THREE.MeshPhysicalMaterial({
      color: '#f3fdff',
      transparent: true,
      opacity: 0.22,
      roughness: 0.08,
      envMapIntensity: 1.8,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    return {
      glass: [glassM, glassM, hidden, glassM, glassM, glassM],
      water: [waterM, waterM, hidden, hidden, waterM, waterM],
      waterM,
      surf: surfM,
      rim: new THREE.MeshStandardMaterial({ color: '#1c282e', roughness: 0.45, metalness: 0.3 }),
      seam: new THREE.MeshStandardMaterial({ color: '#7fb2b8', transparent: true, opacity: 0.45, depthWrite: false }),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const tint = useMemo(() => new THREE.Color(), [])
  const backdrop = useRef()
  const backdropTex = useMemo(() => {
    const t = Object.fromEntries(
      Object.entries(BACKDROP).map(([k, [top, bottom]]) => {
        const c = document.createElement('canvas')
        c.width = 4
        c.height = 128
        const ctx = c.getContext('2d')
        const g = ctx.createLinearGradient(0, 0, 0, 128)
        g.addColorStop(0, top)
        g.addColorStop(1, bottom)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, 4, 128)
        const tex = new THREE.CanvasTexture(c)
        tex.colorSpace = THREE.SRGBColorSpace
        return [k, tex]
      }),
    )
    return t
  }, [])
  useEffect(() => () => Object.values(backdropTex).forEach((t) => t.dispose()), [backdropTex])

  useFrame((_, dt) => {
    const { W, H, D, waterTop, lit } = world.current
    glass.current.scale.set(W, H, D)
    glass.current.position.y = H / 2
    backdrop.current.scale.set(W - 0.08, waterTop, 1)
    backdrop.current.position.set(0, waterTop / 2, -D / 2 + 0.03)
    backdrop.current.material.color.setScalar(0.8 + 0.2 * lit)
    waterRef.current.scale.set(W - 0.05, waterTop, D - 0.05)
    waterRef.current.position.y = waterTop / 2
    surface.current.scale.set(W - 0.05, D - 0.05, 1)
    surface.current.position.y = waterTop
    tint.set(WATER_TINT[water])
    mats.waterM.color.lerp(tint, 1 - Math.exp(-dt * 3))
    mats.waterM.emissive.copy(mats.waterM.color).multiplyScalar(0.12 * lit)
    const r = rims.current
    const set = (m, x, y, z, sx, sy, sz) => {
      m.position.set(x, y, z)
      m.scale.set(sx, sy, sz)
    }
    ;[H - RIM / 2, RIM / 2].forEach((y, i) => {
      set(r[i * 4], 0, y, D / 2, W + 0.05, RIM, 0.05)
      set(r[i * 4 + 1], 0, y, -D / 2, W + 0.05, RIM, 0.05)
      set(r[i * 4 + 2], -W / 2, y, 0, 0.05, RIM, D + 0.05)
      set(r[i * 4 + 3], W / 2, y, 0, 0.05, RIM, D + 0.05)
    })
    ;[[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => set(seams.current[i], (sx * W) / 2, H / 2, (sz * D) / 2, 0.035, H, 0.035))
  })

  return (
    <group>
      <mesh ref={backdrop}>
        <planeGeometry />
        <meshBasicMaterial map={backdropTex[water]} />
      </mesh>
      <mesh ref={waterRef} material={mats.water} renderOrder={1}>
        <boxGeometry />
      </mesh>
      <mesh ref={surface} material={mats.surf} rotation-x={-Math.PI / 2} renderOrder={2}>
        <planeGeometry />
      </mesh>
      <mesh ref={glass} material={mats.glass} renderOrder={3}>
        <boxGeometry />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} ref={(el) => (rims.current[i] = el)} material={mats.rim} castShadow>
          <boxGeometry />
        </mesh>
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={i} ref={(el) => (seams.current[i] = el)} material={mats.seam} renderOrder={3}>
          <boxGeometry />
        </mesh>
      ))}
    </group>
  )
}

function Stand({ world }) {
  const body = useRef()
  const top = useRef()
  const seam = useRef()
  useFrame(() => {
    const { W, D } = world.current
    body.current.scale.set(W + 0.5, 1.56, D + 0.5)
    top.current.scale.set(W + 0.62, 0.09, D + 0.62)
    seam.current.scale.set(0.02, 1.3, 0.01)
    seam.current.position.z = (D + 0.5) / 2 + 0.005
  })
  return (
    <group>
      <mesh ref={body} position={[0, -0.86, 0]} castShadow receiveShadow>
        <boxGeometry />
        <meshStandardMaterial color="#29393f" roughness={0.6} />
      </mesh>
      <mesh ref={top} position={[0, -0.045, 0]} receiveShadow castShadow>
        <boxGeometry />
        <meshStandardMaterial color="#cbb791" roughness={0.65} />
      </mesh>
      <mesh ref={seam} position={[0, -0.86, 0]}>
        <boxGeometry />
        <meshStandardMaterial color="#1a2529" />
      </mesh>
    </group>
  )
}

const CAUSTIC = /* glsl */ `
float caustic(vec2 p) {
  float t = uTime * 0.55;
  vec2 q = p * 1.5;
  float c = sin(q.x * 2.1 + t) * sin(q.y * 1.7 - t * 0.8);
  c += sin((q.x + q.y) * 1.3 - t * 1.2) * 0.7;
  c += sin(length(q - vec2(sin(t * 0.3), cos(t * 0.4)) * 2.0) * 3.0 - t * 1.5) * 0.5;
  c = abs(c) / 2.2;
  return pow(1.0 - clamp(c, 0.0, 1.0), 7.0);
}
`

function Ground({ world, kind }) {
  const mesh = useRef()
  const geo = useMemo(() => groundGeo(), [])
  const textures = useRef({})
  const tex = useMemo(() => {
    if (!kind) return null
    return (textures.current[kind] ??= groundTexture(kind))
  }, [kind])
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide })
    m.onBeforeCompile = (s) => {
      s.uniforms.uTime = shared.uTime
      s.uniforms.uCaustic = shared.uCaustic
      s.vertexShader =
        'varying vec3 vCausticPos;\n' +
        s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCausticPos = (modelMatrix * vec4(transformed, 1.0)).xyz;')
      s.fragmentShader =
        'uniform float uTime;\nuniform float uCaustic;\nvarying vec3 vCausticPos;\n' +
        CAUSTIC +
        s.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.7, 0.95, 1.0) * caustic(vCausticPos.xz) * uCaustic * 0.5 * step(0.2, vCausticPos.y);',
        )
    }
    return m
  }, [])
  useEffect(() => {
    if (!tex) return
    mat.map = tex
    mat.needsUpdate = true
  }, [tex, mat])
  useEffect(() => () => Object.values(textures.current).forEach((t) => t.dispose()), [])

  useFrame(() => {
    const { W, D, g } = world.current
    mesh.current.visible = g > 0.01 && !!tex
    mesh.current.scale.set(W - 0.06, Math.max(0.001, g), D - 0.06)
    tex?.repeat.set(W / 2.2, D / 2.2)
  })
  return <mesh ref={mesh} geometry={geo} material={mat} position={[0, 0.03, 0]} receiveShadow />
}

/* ───────── Placed items ───────── */

function layout(p, w, model) {
  switch (p.id) {
    case 'filter': {
      const z = -w.D / 2 + 0.24
      const y = w.ground(z) - 0.03
      return { x: w.W / 2 - 0.34, y, z, sx: 1, sy: Math.max(0.5, w.waterTop - y - 0.1), sz: 1, ry: 0, wet: true }
    }
    case 'heater': {
      const z = -w.D / 2 + 0.2
      const y = w.ground(z) + 0.1
      return { x: -w.W / 2 + 0.3, y, z, sx: 1, sy: Math.min(1, (w.waterTop - y - 0.05) / 1.2), sz: 1, ry: 0, wet: true }
    }
    case 'air': {
      const z = -w.D / 2 + 0.36
      return { x: -w.W * 0.2, y: w.ground(z), z, sx: 1, sy: 1, sz: 1, ry: 0, wet: true }
    }
    case 'pump':
      return { x: -w.W / 2 + 0.12, y: w.waterTop * 0.7, z: -w.D * 0.12, sx: 1, sy: 1, sz: 1, ry: 0, wet: true }
    case 'light':
      return { x: 0, y: w.H, z: 0, sx: w.W * 0.97, sy: 1, sz: w.D * 0.62, ry: 0, wet: false }
    case 'canister':
      // Outside: on the floor right of the cabinet; the hoses reach the tank themselves.
      return { x: w.W / 2 + 0.75, y: -1.6, z: -w.D / 2 + 0.5, sx: 1, sy: 1, sz: 1, ry: 0, wet: false }
    case 'skimmer': {
      const z = -w.D / 2 + 0.26
      const y = w.ground(z) - 0.03
      return { x: -w.W * 0.2, y, z, sx: 1, sy: Math.max(0.5, w.waterTop - y + 0.15), sz: 1, ry: 0, wet: true }
    }
    case 'co2': {
      const z = w.D / 2 - 0.45
      return { x: -w.W / 2 + 0.55, y: w.ground(z), z, sx: 1, sy: 1, sz: 1, ry: 0, wet: true }
    }
    case 'feeder':
      return { x: w.W / 2 - 0.45, y: w.H, z: w.D / 2 - 0.2, sx: 1, sy: 1, sz: 1, ry: 0, wet: false }
    case 'thermo':
      return { x: -w.W / 2 + 0.45, y: w.waterTop * 0.35, z: w.D / 2 - 0.06, sx: 1, sy: 1, sz: 1, ry: 0, wet: true }
    default: {
      const x = p.u * (w.W / 2 - 0.5)
      const z = p.v * (w.D / 2 - 0.42)
      const y = w.ground(z) - 0.04
      const k = model.scale ?? 1
      const sy = Math.min(k, (w.waterTop - y - 0.15) / model.height)
      return { x, y, z, sx: k, sy, sz: k, ry: p.r, wet: true }
    }
  }
}

const easeOutBack = (k) => 1 + 2.4 * (k - 1) ** 3 + 1.4 * (k - 1) ** 2

const bubbleGeo = new THREE.SphereGeometry(1, 10, 8)
const bubbleMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, roughness: 0, envMapIntensity: 2, depthWrite: false })
const ringMat = () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide })

function Placed({ p, world, leaving, active, registry, onSelect, setHover, reduce }) {
  const item = byId[p.id]
  const model = MODELS[p.id]
  const g = useRef()
  const ring = useRef()
  const ripple = useRef()
  const burst = useRef([])
  const t = useRef({ born: performance.now(), left: 0, splash: 0, land: 0 })
  const rippleMat = useMemo(ringMat, [])
  const selMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e0452b', transparent: true, opacity: 0.85, depthWrite: false }), [])
  const burstSeeds = useMemo(() => Array.from({ length: 7 }, () => [Math.random() - 0.5, Math.random() - 0.5, 0.6 + Math.random() * 0.8, 0.025 + Math.random() * 0.03]), [])

  useEffect(() => {
    registry.current.set(p.uid, { obj: g.current, h: model.height * 0.95 })
    return () => registry.current.delete(p.uid)
  }, [p.uid, registry, model.height])

  useFrame((state) => {
    const w = world.current
    const L = layout(p, w, model)
    const now = performance.now()
    const tm = t.current
    const age = (now - tm.born) / 1000
    let y = L.y
    let s = 1
    let sq = 0
    let wob = 0
    const start = w.H + 1.3
    if (reduce) s = Math.min(1, age / 0.35)
    else if (age < DROP) {
      if (L.wet) {
        if (age < SURF) y = start + (w.waterTop - start) * (age / SURF) ** 2
        else {
          const k = (age - SURF) / (DROP - SURF)
          y = w.waterTop + (L.y - w.waterTop) * (1 - (1 - k) ** 3)
          if (!tm.splash) tm.splash = now
        }
      } else y = start + (L.y - start) * (1 - (1 - age / DROP) ** 3)
      s = 0.55 + 0.45 * easeOutBack(Math.min(1, age / 0.5))
      wob = Math.sin(age * 10) * 0.14 * (1 - age / DROP)
    } else {
      if (!tm.land) tm.land = now
      const k = (now - tm.land) / 260
      if (k < 1) sq = Math.sin(k * Math.PI) * 0.09
    }
    if (leaving) {
      if (!tm.left) tm.left = now
      const k = Math.min(1, (now - tm.left) / 450)
      s *= 1 - k * k
      y += k * 0.9
    }
    g.current.position.set(L.x, y, L.z)
    g.current.rotation.set(0, L.ry, wob)
    g.current.scale.set(L.sx * s * (1 + sq * 0.6), L.sy * s * (1 - sq), L.sz * s * (1 + sq * 0.6))

    // Selection ring on the ground.
    const r = ring.current
    r.visible = active && model.radius > 0 && !leaving
    if (r.visible) {
      r.position.set(L.x, w.ground(L.z) + 0.03, L.z)
      r.scale.setScalar(model.scale ?? 1)
      selMat.opacity = 0.55 + Math.sin(state.clock.elapsedTime * 5) * 0.25
    }

    // Splash ring where the item went through the surface.
    const rp = ripple.current
    const kr = tm.splash ? (now - tm.splash) / 900 : 1
    rp.visible = kr < 1
    if (rp.visible) {
      rp.position.set(L.x, w.waterTop + 0.01, L.z)
      rp.scale.setScalar(0.4 + kr * 2.2)
      rippleMat.opacity = (1 - kr) * 0.6
    }

    // A puff of bubbles when it lands.
    const kb = tm.land ? (now - tm.land) / 1300 : -1
    burst.current.forEach((b, i) => {
      if (!b) return
      b.visible = L.wet && kb >= 0 && kb < 1
      if (!b.visible) return
      const [dx, dz, sp, rad] = burstSeeds[i]
      b.position.set(L.x + dx * (0.3 + kb * 0.4), L.y + 0.15 + kb * sp * 1.6, L.z + dz * (0.3 + kb * 0.4))
      b.scale.setScalar(rad * (1 - kb * 0.4))
    })
  })

  return (
    <>
      <group
        ref={g}
        onClick={(e) => {
          if (e.delta > 6) return
          e.stopPropagation()
          onSelect(p.uid)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(p.uid)
        }}
        onPointerOut={() => setHover(null)}
      >
        <model.C seed={p.seed} color={item.color} world={world} />
      </group>
      <mesh ref={ring} rotation-x={-Math.PI / 2} material={selMat} visible={false} renderOrder={4}>
        <ringGeometry args={[model.radius * 0.86, model.radius, 48]} />
      </mesh>
      <mesh ref={ripple} rotation-x={-Math.PI / 2} material={rippleMat} visible={false} renderOrder={4}>
        <ringGeometry args={[0.26, 0.32, 40]} />
      </mesh>
      {burstSeeds.map((_, i) => (
        <mesh key={i} ref={(el) => (burst.current[i] = el)} geometry={bubbleGeo} material={bubbleMat} visible={false} />
      ))}
    </>
  )
}

/* ───────── Effects ───────── */

/** Bubble column from the air stone, a bubbly outflow from the filter, or a CO₂ mist. */
function Bubbles({ world, kind }) {
  const ref = useRef()
  const n = kind === 'air' ? 30 : kind === 'co2' ? 22 : 18
  const data = useMemo(
    () =>
      Array.from({ length: n }, () => ({
        k: Math.random(),
        x: (Math.random() - 0.5) * 0.1,
        z: (Math.random() - 0.5) * 0.1,
        s: 0.022 + Math.random() * 0.03,
        sp: 0.35 + Math.random() * 0.35,
        ph: Math.random() * 6,
      })),
    [n],
  )
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const pos = useMemo(() => new THREE.Vector3(), [])
  const scl = useMemo(() => new THREE.Vector3(), [])
  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const w = world.current
    const time = state.clock.elapsedTime
    data.forEach((d, i) => {
      d.k += dt * d.sp * (kind === 'air' ? 0.55 : kind === 'co2' ? 0.3 : 0.8)
      if (d.k > 1) d.k -= 1
      if (kind === 'co2') {
        // Fine mist off the diffuser disc, drifting a little as it rises.
        const z0 = w.D / 2 - 0.45
        const y0 = w.ground(z0) + 0.38
        pos.set(-w.W / 2 + 0.55 + d.x * 0.8 + Math.sin(time * 2 + d.ph) * 0.06 * d.k, y0 + d.k * (w.waterTop - y0 - 0.02), z0 + d.z * 0.8)
        scl.setScalar(d.s * 0.35)
      } else if (kind === 'air') {
        const z0 = -w.D / 2 + 0.36
        const y0 = w.ground(z0) + 0.1
        pos.set(-w.W * 0.2 + d.x + Math.sin(time * 3 + d.ph) * 0.04 * d.k, y0 + d.k * (w.waterTop - y0 - 0.02), z0 + d.z)
        scl.setScalar(d.s * (0.7 + d.k * 0.6))
      } else {
        const x0 = w.W / 2 - 0.34 - 0.36
        const y0 = w.waterTop - 0.18
        pos.set(x0 - d.k * 0.9 + d.x, y0 + d.k * d.k * 0.14 + Math.sin(time * 4 + d.ph) * 0.02, -w.D / 2 + 0.24 + d.z * 2)
        scl.setScalar(d.s * (1 - d.k * 0.6))
      }
      m.compose(pos, q, scl)
      ref.current.setMatrixAt(i, m)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[bubbleGeo, bubbleMat, n]} frustumCulled={false} renderOrder={2} />
}

/** Soft light shafts inside the water while the LED light is on. */
function Rays({ world }) {
  const group = useRef()
  const tex = useMemo(() => rayTexture(), [])
  const shafts = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        u: -0.8 + (i / 5) * 1.6 + (Math.random() - 0.5) * 0.2,
        w: 0.5 + Math.random() * 0.6,
        ry: (Math.random() - 0.5) * 1.2,
        tilt: 0.12 + Math.random() * 0.1,
        ph: Math.random() * 6,
        mat: new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
      })),
    [tex],
  )
  useFrame((state) => {
    const w = world.current
    group.current.visible = w.lit > 0.01
    if (!group.current.visible) return
    const h = w.waterTop - 0.3
    group.current.children.forEach((c, i) => {
      const s = shafts[i]
      c.position.set(s.u * (w.W / 2 - 0.4), w.waterTop - h / 2, (i % 2 ? -0.25 : 0.2) * w.D)
      c.scale.set(s.w, h, 1)
      s.mat.opacity = w.lit * (0.1 + 0.07 * Math.sin(state.clock.elapsedTime * 0.6 + s.ph))
    })
  })
  return (
    <group ref={group}>
      {shafts.map((s, i) => (
        <mesh key={i} material={s.mat} rotation={[0, s.ry, s.tilt]} renderOrder={2}>
          <planeGeometry />
        </mesh>
      ))}
    </group>
  )
}

/** Moves the HTML "Убрать" chip over the selected object every frame. */
function ChipTracker({ registry, selected, chipRef }) {
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, size }) => {
    const el = chipRef.current
    if (!el) return
    const entry = selected ? registry.current.get(selected) : null
    if (!entry?.obj) {
      if (el.dataset.show !== 'false') el.dataset.show = 'false'
      return
    }
    entry.obj.getWorldPosition(v)
    v.y += entry.h * Math.max(0.3, entry.obj.scale.y)
    v.project(camera)
    el.style.transform = `translate3d(${((v.x * 0.5 + 0.5) * size.width).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * size.height).toFixed(1)}px, 0)`
    if (el.dataset.show !== 'true') el.dataset.show = 'true'
  })
  return null
}
