import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { merge, paint, part, rng } from './geo.js'

/* Procedural fish: an ellipsoid body (tapered towards the tail), eyes, fins and a
 * separate tail mesh that wags. Colours are painted per vertex from (x, y)
 * normalised over the body: x −1 tail … 1 head, y −1 belly … 1 back. */

const C = new THREE.Color()
const set = (c, hex) => c.set(hex)
const lerpHex = (c, a, b, t) => c.set(a).lerp(C.set(b), Math.min(1, Math.max(0, t)))

const SPECIES = {
  neon: {
    len: 0.34, h: 0.085, w: 0.06, speed: 0.95, band: [0.3, 0.75], school: 0.5,
    body: (x, y, c) => (y > 0.38 ? set(c, '#62735a') : y > -0.02 ? set(c, '#1fc0ff') : x < 0.2 ? set(c, '#e5303a') : set(c, '#e9eef0')),
    tail: { kind: 'fork', len: 0.11, h: 0.075, color: '#c9d3d6' },
    dorsal: { len: 0.07, h: 0.05, color: '#c9d3d6' },
  },
  guppy: {
    len: 0.34, h: 0.1, w: 0.07, speed: 0.75, band: [0.45, 0.95],
    body: (x, y, c) => lerpHex(c, '#ff8a2a', '#a5afa8', (x + 0.4) * 1.4),
    tail: { kind: 'fan', len: 0.26, spread: 1.1, paint: (r, c) => lerpHex(c, '#ff7a1a', '#3a62d9', r * 1.2) },
    dorsal: { len: 0.1, h: 0.08, color: '#ffb35a' },
  },
  betta: {
    len: 0.46, h: 0.15, w: 0.1, speed: 0.45, band: [0.6, 0.98],
    body: (x, y, c) => lerpHex(c, '#d0122f', '#2a49c9', (0.6 - x) * 0.9 + y * 0.2),
    tail: { kind: 'fan', len: 0.46, spread: 1.7, paint: (r, c) => lerpHex(c, '#c8102e', '#2340c4', r * 1.15) },
    dorsal: { len: 0.24, h: 0.2, color: '#2a49c9' },
    anal: { len: 0.32, h: 0.24, color: '#c01530' },
  },
  angel: {
    len: 0.5, h: 0.5, w: 0.075, speed: 0.4, band: [0.35, 0.85],
    body: (x, y, c) => {
      const band = [0.5, 0.0, -0.48].some((b) => Math.abs(x - b) < 0.09)
      return band ? set(c, '#2b2b2b') : lerpHex(c, '#cfcbbb', '#f2efe4', (y + 1) / 2)
    },
    tail: { kind: 'fork', len: 0.2, h: 0.2, color: '#d8d4c4' },
    dorsal: { len: 0.36, h: 0.55, sweep: 0.55, color: '#d8d4c4' },
    anal: { len: 0.36, h: 0.55, sweep: 0.55, color: '#d8d4c4' },
  },
  clown: {
    len: 0.56, h: 0.24, w: 0.13, speed: 0.6, band: [0.15, 0.6], home: 'anemone',
    body: (x, y, c) => {
      for (const [b, wd] of [[0.52, 0.1], [0.02, 0.13], [-0.62, 0.08]]) {
        const d = Math.abs(x - b)
        if (d < wd) return set(c, '#fbfbf7')
        if (d < wd + 0.035) return set(c, '#1b1b1b')
      }
      return set(c, '#ff7417')
    },
    tail: { kind: 'fan', len: 0.2, spread: 1.0, paint: (r, c) => (r > 0.82 ? set(c, '#1b1b1b') : set(c, '#ff7417')) },
    dorsal: { len: 0.26, h: 0.1, color: '#ff7417' },
  },
  chromis: {
    len: 0.42, h: 0.19, w: 0.09, speed: 0.85, band: [0.35, 0.9], school: 0.7,
    body: (x, y, c) => lerpHex(c, '#8fe3d0', '#3aa0c8', (y + 0.6) * 0.8),
    tail: { kind: 'fork', len: 0.16, h: 0.14, color: '#69c9cf' },
    dorsal: { len: 0.18, h: 0.08, color: '#4bb2c7' },
  },
  tang: {
    len: 1.0, h: 0.78, w: 0.15, speed: 0.6, band: [0.3, 0.8],
    body: (x, y, c) => (Math.abs(x + 0.72) < 0.05 && Math.abs(y) < 0.12 ? set(c, '#ffffff') : lerpHex(c, '#ffc928', '#ffe06a', (y + 1) / 2)),
    tail: { kind: 'fork', len: 0.24, h: 0.28, color: '#ffcf33' },
    dorsal: { len: 0.6, h: 0.16, color: '#ffd23f' },
    anal: { len: 0.45, h: 0.14, color: '#ffd23f' },
  },
  platy: {
    len: 0.36, h: 0.14, w: 0.08, speed: 0.7, band: [0.3, 0.85],
    body: (x, y, c) => lerpHex(c, '#ff5a1f', '#ffb347', (y + 1) / 2 - x * 0.2),
    tail: { kind: 'fan', len: 0.14, spread: 1.0, paint: (r, c) => lerpHex(c, '#ff5a1f', '#1d1d1d', (r - 0.7) * 3) },
    dorsal: { len: 0.1, h: 0.06, color: '#ff7a2a' },
  },
  barb: {
    len: 0.38, h: 0.2, w: 0.07, speed: 0.9, band: [0.35, 0.8], school: 0.7,
    body: (x, y, c) => ([0.52, 0.12, -0.26, -0.6].some((b) => Math.abs(x - b) < 0.07) ? set(c, '#1c1c1c') : lerpHex(c, '#f6c94a', '#f2e6b0', (y + 1) / 2)),
    tail: { kind: 'fork', len: 0.13, h: 0.11, color: '#e8462e' },
    dorsal: { len: 0.12, h: 0.09, color: '#d23a26' },
  },
  cory: {
    len: 0.38, h: 0.14, w: 0.1, speed: 0.5, band: [0, 0.06],
    body: (x, y, c) => (Math.sin(x * 40) * Math.sin(y * 30) > 0.55 ? set(c, '#3b3328') : lerpHex(c, '#d9ccb2', '#a8987a', (y + 1) / 2)),
    tail: { kind: 'fork', len: 0.12, h: 0.1, color: '#cfc2a6' },
    dorsal: { len: 0.1, h: 0.12, color: '#bfb194' },
  },
  discus: {
    len: 0.62, h: 0.58, w: 0.09, speed: 0.35, band: [0.35, 0.85],
    body: (x, y, c) => (Math.sin(y * 13 + Math.sin(x * 9) * 1.4) > 0.35 ? set(c, '#ff8a2a') : lerpHex(c, '#1f6fd0', '#4fb2f0', (y + 1) / 2)),
    tail: { kind: 'fan', len: 0.14, spread: 1.1, paint: (r, c) => lerpHex(c, '#2a78d4', '#9fd2f7', r) },
    dorsal: { len: 0.5, h: 0.12, sweep: 0.2, color: '#2a78d4' },
    anal: { len: 0.45, h: 0.11, sweep: 0.2, color: '#2a78d4' },
  },
  gramma: {
    len: 0.44, h: 0.17, w: 0.08, speed: 0.6, band: [0.12, 0.55],
    body: (x, y, c) => (x > -0.05 ? set(c, '#8b3fc4') : set(c, '#ffd23f')),
    tail: { kind: 'fork', len: 0.13, h: 0.12, color: '#ffd23f' },
    dorsal: { len: 0.24, h: 0.08, color: '#7a36b0' },
  },
  mandarin: {
    len: 0.4, h: 0.16, w: 0.11, speed: 0.3, band: [0.01, 0.18],
    body: (x, y, c) => (Math.abs(Math.sin(x * 16 + Math.sin(y * 10) * 1.6)) < 0.3 ? set(c, '#2e9fd0') : lerpHex(c, '#ff7a1f', '#e3561a', (y + 1) / 2)),
    tail: { kind: 'fan', len: 0.15, spread: 1.2, paint: (r, c) => lerpHex(c, '#ff7a1f', '#2e9fd0', r) },
    dorsal: { len: 0.14, h: 0.16, color: '#ff7a1f' },
  },
  bluetang: {
    len: 1.0, h: 0.66, w: 0.14, speed: 0.6, band: [0.3, 0.8],
    body: (x, y, c) => {
      // The black "palette" sweeping from the eye to the tail, with a blue patch inside.
      const p = y - (0.25 - (x - 0.3) * 0.35)
      if (Math.abs(p) < 0.16 && x < 0.55 && x > -0.75) return Math.abs(p) < 0.06 && x < 0.05 && x > -0.45 ? set(c, '#2a6ae0') : set(c, '#14161c')
      return lerpHex(c, '#1f4fd0', '#3b7cf0', (y + 1) / 2)
    },
    tail: { kind: 'fork', len: 0.24, h: 0.28, color: '#ffd23f' },
    dorsal: { len: 0.6, h: 0.14, color: '#14161c' },
    anal: { len: 0.45, h: 0.12, color: '#1f4fd0' },
  },
  shrimp: { crawl: true, len: 0.24, color: '#2f6fd6', speed: 0.18 },
  cleaner: { crawl: true, len: 0.4, color: '#e2403a', stripe: true, speed: 0.15 },
  snail: { crawl: true, shape: 'snail', len: 0.32, color: '#e3b23c', speed: 0.06 },
  star: { crawl: true, shape: 'star', len: 0.5, color: '#e8632e', speed: 0.05 },
}

function finGeo({ len, h, sweep = 0.25 }, up = 1) {
  const s = new THREE.Shape()
  s.moveTo(len * 0.35, 0)
  s.lineTo(-len * 0.65, 0)
  s.quadraticCurveTo(-len * (0.65 + sweep), h * 0.8 * up, -len * (0.55 + sweep), h * up)
  s.quadraticCurveTo(-len * 0.1, h * 0.6 * up, len * 0.35, 0)
  return new THREE.ShapeGeometry(s, 6)
}

function tailGeo(t) {
  if (t.kind === 'fan') {
    const g = new THREE.CircleGeometry(t.len, 22, Math.PI - t.spread / 2, t.spread)
    return paint(g, (x, y, z, c) => t.paint(Math.hypot(x, y) / t.len, c))
  }
  const s = new THREE.Shape()
  s.moveTo(0.02, 0)
  s.lineTo(-t.len, t.h)
  s.quadraticCurveTo(-t.len * 0.62, 0, -t.len, -t.h)
  s.lineTo(0.02, 0)
  return part(new THREE.ShapeGeometry(s, 6), t.color)
}

function buildFish(id) {
  const sp = SPECIES[id]
  if (sp.shape === 'snail') return buildSnail(sp)
  if (sp.shape === 'star') return buildStar(sp)
  if (sp.crawl) return buildShrimp(sp)
  const { len, h, w } = sp
  const body = new THREE.SphereGeometry(1, 24, 16)
  const pos = body.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const k = x < 0 ? 1 + x * 0.5 : 1 - x * x * 0.12
    pos.setXYZ(i, (x * len) / 2, (pos.getY(i) * h * k) / 2, (pos.getZ(i) * w * k) / 2)
  }
  body.computeVertexNormals()
  const skin = paint(body.toNonIndexed(), (x, y, z, c) => sp.body((x / len) * 2, (y / h) * 2, c))
  const eyes = [1, -1].map((s) => {
    const e = new THREE.SphereGeometry(Math.max(0.012, h * 0.11), 10, 8)
    e.translate(len * 0.33, h * 0.1, (s * w) / 2.6)
    return part(e, '#111111')
  })
  const fins = []
  if (sp.dorsal) {
    const d = finGeo(sp.dorsal, 1)
    d.translate(0, h * 0.42, 0)
    fins.push(part(d, sp.dorsal.color))
  }
  if (sp.anal) {
    const a = finGeo(sp.anal, -1)
    a.translate(-len * 0.05, -h * 0.4, 0)
    fins.push(part(a, sp.anal.color))
  }
  const pect = finGeo({ len: len * 0.22, h: h * 0.35 }, 1)
  pect.rotateX(Math.PI / 2 + 0.5)
  pect.translate(len * 0.12, -h * 0.12, w * 0.45)
  const pectL = part(pect, sp.dorsal?.color ?? '#cccccc')
  const pectR = pectL.clone()
  pectR.scale(1, 1, -1)
  fins.push(pectL, pectR)
  return {
    body: merge([skin, ...eyes]),
    fins: merge(fins),
    tail: tailGeo(sp.tail),
    tailX: -len * 0.47,
    size: len,
  }
}

function buildShrimp(sp) {
  const L = sp.len
  const parts = []
  for (let i = 0; i < 6; i++) {
    const f = i / 5
    const r = L * (0.16 - f * 0.08)
    const s = new THREE.SphereGeometry(r, 10, 8)
    s.scale(1.25, 1, 0.9)
    s.translate(L * (0.35 - f * 0.75), L * 0.1 + Math.sin(f * Math.PI) * L * 0.12, 0)
    parts.push(paint(s.toNonIndexed(), (x, y, z, c) => (sp.stripe && y > L * 0.2 ? set(c, '#ffffff') : set(c, sp.color))))
  }
  for (const s of [1, -1]) {
    const a = new THREE.CylinderGeometry(0.004, 0.006, L * 1.3, 4)
    a.rotateZ(-Math.PI / 2 + 0.35)
    a.rotateY(s * 0.35)
    a.translate(L * 0.9, L * 0.32, s * L * 0.12)
    parts.push(part(a, sp.stripe ? '#ffffff' : '#a9c7ff'))
  }
  for (let i = 0; i < 4; i++)
    for (const s of [1, -1]) {
      const leg = new THREE.CylinderGeometry(0.004, 0.004, L * 0.22, 4)
      leg.rotateX(s * 0.5)
      leg.translate(L * (0.25 - i * 0.12), 0, s * L * 0.06)
      parts.push(part(leg, sp.color))
    }
  const fan = new THREE.CircleGeometry(L * 0.18, 8, Math.PI - 0.7, 1.4)
  fan.rotateX(Math.PI / 2)
  fan.translate(-L * 0.42, L * 0.08, 0)
  parts.push(part(fan, sp.color))
  return { body: merge(parts), fins: null, tail: null, tailX: 0, size: L }
}

/** Apple snail: a banded spiral shell on a pale foot, with feelers. Heads along +x. */
function buildSnail(sp) {
  const L = sp.len
  const foot = new THREE.SphereGeometry(L * 0.5, 16, 8)
  foot.scale(1.25, 0.28, 0.55)
  foot.translate(0.04 * L, L * 0.07, 0)
  const parts = [part(foot, '#e7d3a6')]
  for (let i = 0; i < 5; i++) {
    const r = L * 0.4 * 0.72 ** i
    const a = i * 1.5
    const s = new THREE.SphereGeometry(r, 16, 12)
    s.translate(-L * 0.08 + Math.cos(a) * L * 0.1 * (1 - i / 5), L * 0.34 + i * L * 0.075, Math.sin(a) * L * 0.1 * (1 - i / 5))
    parts.push(paint(s.toNonIndexed(), (x, y, z, c) => (Math.sin(y * 70 + Math.atan2(z, x) * 2) > 0.55 ? set(c, '#6b4a1f') : set(c, sp.color))))
  }
  for (const s of [1, -1]) {
    const f = new THREE.CylinderGeometry(0.005, 0.008, L * 0.4, 5)
    f.rotateZ(-Math.PI / 2 + 0.4)
    f.rotateY(s * 0.4)
    f.translate(L * 0.6, L * 0.14, s * L * 0.08)
    parts.push(part(f, '#d8c18e'))
  }
  return { body: merge(parts), fins: null, tail: null, tailX: 0, size: L }
}

/** Starfish: five tapered arms, lying flat, with paler bumps. */
function buildStar(sp) {
  const L = sp.len
  const s = new THREE.Shape()
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2
    const r = i % 2 ? L * 0.16 : L * 0.5
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.03, bevelSegments: 2 })
  g.rotateX(-Math.PI / 2)
  g.translate(0, 0.02, 0)
  const body = paint(g.index ? g.toNonIndexed() : g, (x, y, z, c) => (Math.sin(x * 60) * Math.sin(z * 60) > 0.6 ? set(c, '#ffd0a8') : lerpHex(c, sp.color, '#b8381a', Math.hypot(x, z) / (L * 0.5))))
  return { body, fins: null, tail: null, tailX: 0, size: L }
}

const fishMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.08 })
const finMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })

const TAU = Math.PI * 2
const SIZE = 1.35 // real proportions make neons vanishingly small; a touch of toy scale
const angleLerp = (a, b, t) => a + ((((b - a + Math.PI) % TAU) + TAU) % TAU - Math.PI) * t

/**
 * One fauna line item: `count` fish (or shrimp). They drop in through the surface,
 * then wander inside the water volume; schools share a target, clownfish hover over
 * an anemone if there is one. Leaving: they swim up and vanish.
 */
export function School({ p, count, world, homes, leaving, registry, onSelect, setHover, reduce }) {
  const sp = SPECIES[p.id]
  const geo = useMemo(() => buildFish(p.id), [p.id])
  useEffect(
    () => () => {
      geo.body.dispose()
      geo.fins?.dispose()
      geo.tail?.dispose()
    },
    [geo],
  )
  const groups = useRef([])
  const tails = useRef([])
  const sim = useRef(null)
  const v = useMemo(() => new THREE.Vector3(), [])

  if (!sim.current) {
    const r = rng(p.seed)
    sim.current = {
      r,
      t0: performance.now(),
      shared: null,
      fish: Array.from({ length: count }, (_, i) => ({
        pos: new THREE.Vector3((r() - 0.5) * 1.2, 0, (r() - 0.5) * 0.8),
        vel: new THREE.Vector3(0, -1, 0),
        target: null,
        offset: new THREE.Vector3((r() - 0.5) * 0.7, (r() - 0.5) * 0.3, (r() - 0.5) * 0.5),
        yaw: r() * TAU,
        phase: r() * TAU,
        entering: true,
        delay: i * 0.12,
        pauseUntil: 0,
        scale: 1,
      })),
    }
  }

  useEffect(() => {
    const first = groups.current[0]
    if (first) registry.current.set(p.uid, { obj: first, h: sp.crawl ? 0.25 : 0.35 })
    return () => registry.current.delete(p.uid)
  }, [p.uid, registry, sp.crawl])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const w = world.current
    const s = sim.current
    const now = performance.now()
    const age = (now - s.t0) / 1000
    const xLim = w.W / 2 - 0.4
    const zLim = w.D / 2 - 0.35
    const top = w.waterTop - 0.2
    const pick = (f) => {
      if (sp.home && homes.length) {
        const hm = homes[Math.floor(s.r() * homes.length)]
        const hx = hm.u * (w.W / 2 - 0.45)
        const hz = hm.v * (w.D / 2 - 0.4)
        return new THREE.Vector3(hx + (s.r() - 0.5) * 0.7, w.ground(hz) + 0.55 + s.r() * 0.45, hz + (s.r() - 0.5) * 0.5)
      }
      const x = (s.r() * 2 - 1) * xLim
      const z = (s.r() * 2 - 1) * zLim
      if (sp.crawl) return new THREE.Vector3(x, 0, z)
      const floor = w.ground(z) + 0.3
      const [lo, hi] = sp.band
      return new THREE.Vector3(x, floor + (top - floor) * (lo + s.r() * (hi - lo)), z)
    }

    s.fish.forEach((f, i) => {
      const g = groups.current[i]
      if (!g) return
      if (age < f.delay) {
        g.visible = false
        return
      }
      if (!g.visible) {
        g.visible = true
        f.pos.y = reduce ? top - 0.4 : w.waterTop + 0.7
        f.vel.set(0, -0.6, 0)
      }
      const speed = sp.speed * (reduce ? 0.5 : 1)

      if (leaving) {
        f.vel.lerp(v.set(f.vel.x * 0.5, 1.6, f.vel.z * 0.5), dt * 4)
        f.scale = Math.max(0, f.scale - dt * 2.4)
      } else if (f.entering) {
        // Falls through the surface, then sinks slower in the water.
        if (f.pos.y > w.waterTop) f.vel.y -= 2.45 * dt
        else f.vel.y = THREE.MathUtils.lerp(f.vel.y, sp.crawl ? -0.7 : -0.25, Math.min(1, dt * 3))
        if (sp.crawl ? f.pos.y < w.ground(f.pos.z) + 0.06 : f.pos.y < w.waterTop - 0.5) f.entering = false
      } else if (sp.crawl) {
        if (!f.target) f.target = pick(f)
        v.set(f.target.x - f.pos.x, 0, f.target.z - f.pos.z)
        const d = v.length()
        if (d < 0.08) {
          f.target = pick(f)
          f.pauseUntil = now + 800 + s.r() * 2600
        }
        const moving = now > f.pauseUntil
        v.normalize().multiplyScalar(moving ? speed : 0)
        f.vel.lerp(v, dt * 3)
      } else {
        // Schools share one target; each fish keeps its own offset around it.
        let tgt
        if (sp.school) {
          if (!s.shared || s.fish[0].pos.distanceTo(s.shared) < 0.35) s.shared = pick(f)
          tgt = v.copy(s.shared).addScaledVector(f.offset, sp.school * 1.6)
        } else {
          if (!f.target || f.pos.distanceTo(f.target) < 0.3) f.target = pick(f)
          tgt = v.copy(f.target)
        }
        tgt.sub(f.pos)
        const d = tgt.length()
        tgt.normalize().multiplyScalar(speed * Math.min(1, 0.35 + d))
        f.vel.lerp(tgt, dt * 1.6)
      }

      f.pos.addScaledVector(f.vel, dt)
      // Keep inside the glass and above the ground.
      f.pos.x = THREE.MathUtils.clamp(f.pos.x, -xLim, xLim)
      f.pos.z = THREE.MathUtils.clamp(f.pos.z, -zLim, zLim)
      const floor = w.ground(f.pos.z)
      if (sp.crawl) {
        if (!f.entering && !leaving) f.pos.y = floor + 0.04 + Math.abs(Math.sin(now / 160 + f.phase)) * 0.01
        else if (f.pos.y < floor + 0.04) f.pos.y = floor + 0.04
      } else if (!f.entering && !leaving) {
        f.pos.y = THREE.MathUtils.clamp(f.pos.y, floor + 0.25, top)
      }

      const hv = Math.hypot(f.vel.x, f.vel.z)
      if (hv > 0.02) f.yaw = angleLerp(f.yaw, Math.atan2(-f.vel.z, f.vel.x), Math.min(1, dt * 5))
      const pitch = sp.crawl ? 0 : THREE.MathUtils.clamp(f.vel.y / Math.max(0.2, speed * 1.4), -0.6, 0.6)
      g.position.copy(f.pos)
      g.rotation.set(0, f.yaw, pitch * 0.7, 'YZX')
      g.scale.setScalar(f.scale * SIZE)
      const tail = tails.current[i]
      if (tail) {
        const pace = 4 + (f.vel.length() / Math.max(0.1, speed)) * 6
        tail.rotation.y = Math.sin(now / 1000 * pace + f.phase) * (p.id === 'betta' ? 0.25 : 0.45)
      }
    })
  })

  const handlers = {
    onClick: (e) => {
      if (e.delta > 6) return
      e.stopPropagation()
      onSelect(p.uid)
    },
    onPointerOver: (e) => {
      e.stopPropagation()
      setHover(p.uid)
    },
    onPointerOut: () => setHover(null),
  }

  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} ref={(el) => (groups.current[i] = el)} visible={false} {...handlers}>
          <mesh geometry={geo.body} material={fishMat} castShadow />
          {geo.fins && <mesh geometry={geo.fins} material={finMat} />}
          {geo.tail && (
            <group position={[geo.tailX, 0, 0]} ref={(el) => (tails.current[i] = el)}>
              <mesh geometry={geo.tail} material={finMat} />
            </group>
          )}
        </group>
      ))}
    </group>
  )
}
