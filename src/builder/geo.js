import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

/* Procedural geometry for the aquarium builder: everything is generated in code,
 * so the 3D scene needs no model downloads. 1 unit = 10 cm. */

export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Cheap smooth pseudo-noise, plenty for rocks and sand. */
export const noise = (x, y, z) =>
  Math.sin(x * 1.7 + y * 0.6) * Math.sin(y * 2.1 + z * 0.9) * Math.sin(z * 1.4 + x * 1.1) +
  0.5 * Math.sin(x * 3.9 + z * 2.7) * Math.sin(y * 3.3 - x * 1.9)

const _c = new THREE.Color()

/** Non-indexed copy with a flat vertex colour, ready to merge with other parts. */
export function part(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
  _c.set(color)
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) arr.set([_c.r, _c.g, _c.b], i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return g
}

/** Per-vertex colour from a function of the vertex position. */
export function paint(geo, fn) {
  const pos = geo.attributes.position
  const arr = new Float32Array(pos.count * 3)
  const col = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    fn(pos.getX(i), pos.getY(i), pos.getZ(i), col)
    arr.set([col.r, col.g, col.b], i * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return geo
}

export const merge = (parts) => mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false)

/** Push vertices along their direction from the centre by noise: lumpy rock. */
export function lumpy(geo, amp, freq, off = 0, smooth = false) {
  let g = geo
  if (smooth) {
    g.deleteAttribute('normal')
    g.deleteAttribute('uv')
    g = mergeVertices(g)
  }
  const pos = g.attributes.position
  const v = new THREE.Vector3()
  const n = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    n.copy(v).normalize()
    const d = noise(v.x * freq + off, v.y * freq + off * 0.7, v.z * freq - off) * amp
    v.addScaledVector(n, d)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2))
  g.computeVertexNormals()
  return g
}

const mix = (col, a, b, t) => col.set(a).lerp(_c.set(b), Math.min(1, Math.max(0, t)))

/* ───────── Decor ───────── */

export function stoneGeo(seed) {
  const r = rng(seed)
  const parts = []
  const rocks = [
    { s: 0.55, x: 0, z: 0, h: 1.25 },
    { s: 0.36, x: 0.62, z: 0.22, h: 0.9 },
    { s: 0.28, x: -0.55, z: 0.3, h: 0.8 },
  ]
  for (const k of rocks) {
    const g = lumpy(new THREE.IcosahedronGeometry(k.s, 1), k.s * 0.22, 2.2, r() * 10)
    g.scale(1 + r() * 0.2, k.h, 0.85 + r() * 0.2)
    g.rotateY(r() * Math.PI)
    g.translate(k.x, k.s * k.h * 0.55, k.z)
    paint(g, (x, y, z, c) => mix(c, '#5f6a70', '#b9c2c4', y / 1.1 + noise(x * 6, y * 9, z * 6) * 0.25))
    parts.push(g)
  }
  return merge(parts)
}

/** Tube whose radius tapers along the curve. */
function taperedTube(points, radius, tip, seg = 36, radial = 7) {
  const curve = new THREE.CatmullRomCurve3(points)
  const g = new THREE.TubeGeometry(curve, seg, radius, radial, false)
  const pos = g.attributes.position
  const v = new THREE.Vector3()
  for (let s = 0; s <= seg; s++) {
    const u = s / seg
    const c = curve.getPointAt(u)
    const k = 1 - (1 - tip) * u
    for (let j = 0; j <= radial; j++) {
      const i = s * (radial + 1) + j
      v.fromBufferAttribute(pos, i).sub(c).multiplyScalar(k).add(c)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
  }
  g.computeVertexNormals()
  return g
}

export function woodGeo(seed) {
  const r = rng(seed)
  const V = (x, y, z) => new THREE.Vector3(x, y, z)
  const main = [V(-1.1, 0.08, 0.1), V(-0.5, 0.3, -0.05), V(0.05, 0.45, 0.1), V(0.45, 0.95, -0.05), V(0.7, 1.6 + r() * 0.3, 0.15)]
  const parts = [taperedTube(main, 0.13, 0.3, 40, 8)]
  parts.push(taperedTube([V(0.05, 0.45, 0.1), V(0.4, 0.55, 0.35), V(0.95, 0.7, 0.4), V(1.25, 1.05, 0.5)], 0.07, 0.25, 20, 6))
  parts.push(taperedTube([V(-0.5, 0.3, -0.05), V(-0.6, 0.75, -0.2), V(-0.85, 1.15, -0.1)], 0.06, 0.25, 16, 6))
  parts.push(taperedTube([V(0.45, 0.95, -0.05), V(0.2, 1.25, -0.25), V(0.05, 1.55, -0.3)], 0.045, 0.25, 14, 6))
  const g = merge(parts)
  paint(g, (x, y, z, c) => mix(c, '#4a3221', '#a27a55', y / 1.6 + noise(x * 9, y * 12, z * 9) * 0.2))
  return g
}

export function amphoraGeo() {
  const pts = [
    [0.02, 0], [0.2, 0.03], [0.34, 0.22], [0.38, 0.5], [0.31, 0.8], [0.16, 0.98], [0.13, 1.1], [0.19, 1.16], [0.18, 1.2],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  const g = new THREE.LatheGeometry(pts, 24)
  paint(g, (x, y, z, c) => mix(c, '#8f4a2a', '#d58a57', 0.5 + noise(x * 7, y * 7, z * 7) * 0.35))
  // Lie it on its side, half sunk into the ground, mouth towards the viewer.
  g.rotateZ(Math.PI / 2 - 0.12)
  g.rotateY(-0.6)
  g.translate(0.5, 0.2, 0)
  return g
}

const reefPaint = (x, y, z, c) => {
  const n = noise(x * 4.1, y * 4.7, z * 4.3)
  if (n > 0.35) c.set('#c98aa8')
  else if (n > -0.1) mix(c, '#8a5a7c', '#a7678f', n + 0.5)
  else mix(c, '#b8a58e', '#d8c9b0', -n)
}

export function liveRockGeo(seed) {
  const r = rng(seed)
  const a = lumpy(new THREE.IcosahedronGeometry(0.62, 3), 0.2, 2.6, r() * 10, true)
  a.scale(1.35, 0.8, 1)
  a.translate(0, 0.38, 0)
  const b = lumpy(new THREE.IcosahedronGeometry(0.38, 3), 0.14, 3.2, r() * 10, true)
  b.translate(0.35 - r() * 0.7, 0.85, 0.1)
  const g = merge([a, b])
  return paint(g, reefPaint)
}

export function archGeo(seed) {
  const r = rng(seed)
  const g = lumpy(new THREE.TorusGeometry(1.0, 0.26, 10, 28, Math.PI), 0.12, 3, r() * 10, true)
  g.translate(0, -0.05, 0)
  return paint(g, reefPaint)
}

/** Stacked slate slabs stepping up and back: terraces. */
export function slateGeo(seed) {
  const r = rng(seed)
  const parts = []
  let y = 0
  for (let i = 0; i < 4; i++) {
    const h = 0.12 + r() * 0.06
    const g = lumpy(new THREE.BoxGeometry(1.3 - i * 0.22 + r() * 0.2, h, 0.8 - i * 0.1 + r() * 0.15, 4, 1, 3), 0.03, 4, r() * 10)
    g.rotateY((r() - 0.5) * 0.6)
    g.rotateZ((r() - 0.5) * 0.12)
    g.translate((r() - 0.5) * 0.3 + i * 0.08, y + h / 2, (r() - 0.5) * 0.2 - i * 0.06)
    y += h * 0.92
    parts.push(g)
  }
  return paint(merge(parts), (x, y, z, c) => mix(c, '#3d434a', '#858d94', 0.35 + y * 0.5 + noise(x * 5, y * 30, z * 5) * 0.3))
}

/** Spider wood: branches fanning up and out from a low knot, a few roots into the ground. */
export function rootGeo(seed) {
  const r = rng(seed)
  const V = (x, y, z) => new THREE.Vector3(x, y, z)
  const parts = []
  const n = 6
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.5
    const reach = 0.7 + r() * 0.5
    const up = 0.8 + r() * 0.8
    const cx = Math.cos(a)
    const sz = Math.sin(a)
    parts.push(
      taperedTube([V(0, 0.35, 0), V(cx * reach * 0.35, 0.55 + up * 0.3, sz * reach * 0.25), V(cx * reach * 0.75, 0.5 + up * 0.7, sz * reach * 0.55), V(cx * reach, 0.4 + up, sz * reach * 0.7)], 0.07, 0.15, 24, 6),
    )
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + r()
    parts.push(taperedTube([V(0, 0.42, 0), V(Math.cos(a) * 0.3, 0.2, Math.sin(a) * 0.25), V(Math.cos(a) * 0.55, 0, Math.sin(a) * 0.45)], 0.08, 0.4, 12, 6))
  }
  return paint(merge(parts), (x, y, z, c) => mix(c, '#5a4030', '#b58e66', y / 1.6 + noise(x * 9, y * 12, z * 9) * 0.2))
}

/** Two boulders with a slab across: a cave fish can swim through. */
export function caveGeo(seed) {
  const r = rng(seed)
  const parts = []
  for (const s of [-1, 1]) {
    const g = lumpy(new THREE.IcosahedronGeometry(0.4, 1), 0.09, 2.4, r() * 10)
    g.scale(0.8, 1.1, 0.9)
    g.translate(s * 0.48, 0.4, 0)
    parts.push(g)
  }
  const top = lumpy(new THREE.BoxGeometry(1.6, 0.22, 0.85, 4, 1, 3), 0.05, 3, r() * 10)
  top.rotateZ((r() - 0.5) * 0.15)
  top.translate(0, 0.9, 0)
  parts.push(top)
  return paint(merge(parts), (x, y, z, c) => mix(c, '#6f665c', '#c4baa9', y / 1.1 + noise(x * 6, y * 9, z * 6) * 0.25))
}

/** A conch lying on its side and a scallop. */
export function shellGeo(seed) {
  const r = rng(seed)
  const pts = [[0, 0], [0.12, 0.05], [0.24, 0.16], [0.3, 0.3], [0.26, 0.45], [0.17, 0.6], [0.09, 0.75], [0.02, 0.9]].map(([x, y]) => new THREE.Vector2(x, y))
  const conch = new THREE.LatheGeometry(pts, 22)
  const pos = conch.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const k = 1 + 0.08 * Math.sin(Math.atan2(z, x) * 3 + pos.getY(i) * 22) // spiral knobs
    pos.setXYZ(i, x * k, pos.getY(i), z * k)
  }
  conch.computeVertexNormals()
  paint(conch, (x, y, z, c) => mix(c, '#f0d8bd', '#c27d58', 0.5 + 0.5 * Math.sin(y * 30 + Math.atan2(z, x) * 2)))
  conch.rotateZ(Math.PI / 2 - 0.25)
  conch.translate(0.5, 0.22, 0.05)

  const fan = new THREE.CircleGeometry(0.28, 28, Math.PI * 0.12, Math.PI * 0.76)
  const fp = fan.attributes.position
  for (let i = 0; i < fp.count; i++) {
    const x = fp.getX(i)
    const y = fp.getY(i)
    fp.setZ(i, Math.abs(Math.sin(Math.atan2(y, x) * 14)) * 0.025 * Math.hypot(x, y) * 4 + (x * x + y * y) * 0.5)
  }
  fan.computeVertexNormals()
  paint(fan, (x, y, z, c) => mix(c, '#e3a07a', '#fbe9d8', Math.hypot(x, y) / 0.28))
  fan.rotateX(-Math.PI / 2 + 0.35)
  fan.translate(-0.35, 0.06, 0.12)
  const g = merge([conch, fan])
  g.rotateY(r() * Math.PI * 2)
  return g
}

/** A column of live rock, narrowing upwards. */
export function pillarGeo(seed) {
  const r = rng(seed)
  const parts = []
  let y = 0
  for (const s of [0.62, 0.5, 0.42, 0.3]) {
    const g = lumpy(new THREE.IcosahedronGeometry(s, 3), s * 0.3, 2.8, r() * 10, true)
    g.scale(1.15, 0.85, 1)
    g.translate((r() - 0.5) * 0.35, y + s * 0.75, (r() - 0.5) * 0.25)
    y += s * 1.2
    parts.push(g)
  }
  return paint(merge(parts), reefPaint)
}

/* ───────── Plants ───────── */

export function vallisGeo(seed) {
  const r = rng(seed)
  const parts = []
  for (let i = 0; i < 15; i++) {
    const L = 2.3 + r() * 1.2
    const g = new THREE.PlaneGeometry(0.075, L, 1, 12)
    g.translate(0, L / 2, 0)
    const bend = (r() - 0.5) * 0.9
    const lean = 0.2 + r() * 0.35
    const pos = g.attributes.position
    for (let k = 0; k < pos.count; k++) {
      const f = pos.getY(k) / L
      pos.setX(k, pos.getX(k) + Math.sin(f * Math.PI * 0.6) * bend * f)
      pos.setZ(k, pos.getZ(k) + lean * f * f)
    }
    g.rotateY(r() * Math.PI * 2)
    g.translate((r() - 0.5) * 0.45, 0, (r() - 0.5) * 0.3)
    parts.push(g)
  }
  const g = merge(parts)
  return paint(g, (x, y, z, c) => mix(c, '#2f6b33', '#7cc46a', y / 3.2))
}

function leafShape(len, width) {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.quadraticCurveTo(width, len * 0.42, 0, len)
  s.quadraticCurveTo(-width, len * 0.42, 0, 0)
  return s
}

function leaf(len, width, curl) {
  const g = new THREE.ShapeGeometry(leafShape(len, width), 8)
  const pos = g.attributes.position
  for (let k = 0; k < pos.count; k++) {
    const f = pos.getY(k) / len
    pos.setZ(k, pos.getZ(k) + curl * f * f + Math.abs(pos.getX(k)) * 0.25)
  }
  g.computeVertexNormals()
  return g
}

export function swordGeo(seed) {
  const r = rng(seed)
  const parts = []
  const n = 11
  for (let i = 0; i < n; i++) {
    const len = 0.9 + r() * 0.7
    const g = leaf(len, 0.2 + r() * 0.05, 0.35)
    g.translate(0, 0.08, 0)
    g.rotateX(-(0.18 + r() * 0.55))
    g.rotateY((i / n) * Math.PI * 2 + r() * 0.4)
    parts.push(g)
  }
  const g = merge(parts)
  return paint(g, (x, y, z, c) => mix(c, '#3d7f35', '#8fd06a', y / 1.4 + (Math.abs(x) + Math.abs(z) < 0.05 ? 0.3 : 0)))
}

export function anubiasGeo(seed) {
  const r = rng(seed)
  const rock = lumpy(new THREE.IcosahedronGeometry(0.3, 1), 0.07, 3, r() * 10)
  rock.scale(1.3, 0.75, 1)
  rock.translate(0, 0.16, 0)
  const parts = [part(rock, '#7d878b')]
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + r()
    const stem = new THREE.CylinderGeometry(0.012, 0.016, 0.32, 5)
    stem.translate(0, 0.16, 0)
    stem.rotateZ(0.35 + r() * 0.3)
    stem.rotateY(a)
    stem.translate(0, 0.28, 0)
    parts.push(part(stem, '#3c6b3a'))
    const l = leaf(0.42, 0.2, 0.1)
    l.rotateX(-1.0 - r() * 0.3)
    l.translate(0, 0, 0)
    l.rotateY(a + Math.PI / 2)
    const tip = new THREE.Vector3(Math.cos(a) * 0.2, 0.52, -Math.sin(a) * 0.2)
    l.translate(tip.x, tip.y, tip.z)
    parts.push(part(l, i % 2 ? '#24572f' : '#2f6f3c'))
  }
  return merge(parts)
}

/** Stems with whorls of needle-thin leaves. */
export function cabombaGeo(seed) {
  const r = rng(seed)
  const parts = []
  for (let s = 0; s < 7; s++) {
    const L = 2 + r() * 1.1
    const x0 = (r() - 0.5) * 0.45
    const z0 = (r() - 0.5) * 0.3
    const stem = new THREE.CylinderGeometry(0.012, 0.016, L, 4)
    stem.translate(x0, L / 2, z0)
    parts.push(stem)
    for (let y = 0.25; y < L; y += 0.16) {
      const k = 1 - (y / L) * 0.4
      for (let j = 0; j < 6; j++) {
        const g = new THREE.PlaneGeometry(0.2 * k, 0.026)
        g.translate(0.1 * k, 0, 0)
        g.rotateZ(0.35)
        g.rotateY((j / 6) * Math.PI * 2 + y * 3)
        g.translate(x0, y, z0)
        parts.push(g)
      }
    }
  }
  return paint(merge(parts), (x, y, z, c) => mix(c, '#3a7a2e', '#9be06a', y / 3))
}

/** Stems with pairs of oval leaves, green below and red towards the light. */
export function ludwigiaGeo(seed) {
  const r = rng(seed)
  const parts = []
  for (let s = 0; s < 6; s++) {
    const L = 1.4 + r() * 0.8
    const x0 = (r() - 0.5) * 0.35
    const z0 = (r() - 0.5) * 0.25
    const stem = new THREE.CylinderGeometry(0.014, 0.018, L, 5)
    stem.translate(x0, L / 2, z0)
    parts.push(stem)
    for (let y = 0.2, i = 0; y < L; y += 0.14, i++)
      for (const side of [0, Math.PI]) {
        const g = leaf(0.2, 0.08, 0.05)
        g.rotateZ(-Math.PI / 2 + 0.5)
        g.rotateY(side + i * (Math.PI / 2))
        g.translate(x0, y, z0)
        parts.push(g)
      }
  }
  return paint(merge(parts), (x, y, z, c) => mix(c, '#4c8a3a', '#d2453a', (y - 0.4) / 1.4))
}

/** Rosette of long wavy bronze-green leaves. */
export function cryptGeo(seed) {
  const r = rng(seed)
  const parts = []
  const n = 9
  for (let i = 0; i < n; i++) {
    const len = 0.55 + r() * 0.35
    const g = leaf(len, 0.11 + r() * 0.03, 0.25)
    const pos = g.attributes.position
    for (let k = 0; k < pos.count; k++) pos.setZ(k, pos.getZ(k) + Math.sin(pos.getY(k) * 18) * 0.02 * (pos.getY(k) / len))
    g.computeVertexNormals()
    g.translate(0, 0.05, 0)
    g.rotateX(-(0.35 + r() * 0.5))
    g.rotateY((i / n) * Math.PI * 2 + r() * 0.5)
    parts.push(g)
  }
  return paint(merge(parts), (x, y, z, c) => mix(c, '#3f5e2a', '#a5743e', y / 0.8))
}

/** A tuft of hair-thin blades: a lawn when several stand together. */
export function hairgrassGeo(seed) {
  const r = rng(seed)
  const parts = []
  for (let i = 0; i < 70; i++) {
    const L = 0.22 + r() * 0.28
    const g = new THREE.PlaneGeometry(0.014, L, 1, 3)
    g.translate(0, L / 2, 0)
    g.rotateX((r() - 0.5) * 0.5)
    g.rotateY(r() * Math.PI)
    const rad = Math.sqrt(r()) * 0.45
    const a = r() * Math.PI * 2
    g.translate(Math.cos(a) * rad, 0, Math.sin(a) * rad * 0.8)
    parts.push(g)
  }
  return paint(merge(parts), (x, y, z, c) => mix(c, '#3f8a35', '#a6e070', y / 0.45))
}

export function mossGeo(seed) {
  const g = lumpy(new THREE.IcosahedronGeometry(0.22, 4), 0.025, 22, seed % 7, true)
  g.translate(0, 0.2, 0)
  return paint(g, (x, y, z, c) => mix(c, '#1f5a23', '#4f9a45', 0.5 + noise(x * 30, y * 30, z * 30) * 0.5))
}

/* ───────── Corals ───────── */

export function leatherGeo(seed) {
  const r = rng(seed)
  const stalk = new THREE.CylinderGeometry(0.15, 0.24, 0.55, 14, 4)
  stalk.translate(0, 0.27, 0)
  const cap = new THREE.SphereGeometry(0.58, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2)
  const pos = cap.attributes.position
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k)
    const z = pos.getZ(k)
    const rr = Math.hypot(x, z) / 0.58
    const a = Math.atan2(z, x)
    pos.setY(k, pos.getY(k) * 0.32 + Math.sin(a * 6 + r() * 0.01) * 0.07 * rr ** 3)
  }
  cap.computeVertexNormals()
  cap.translate(0, 0.5, 0)
  const g = merge([part(stalk, '#d8c79c'), part(cap, '#e6d6ab')])
  return paint(g, (x, y, z, c) => {
    const speck = noise(x * 40, y * 40, z * 40) > 0.55
    return mix(c, '#cdb98c', speck ? '#f6efcf' : '#eadcb3', y / 0.7)
  })
}

export function anemoneGeo(seed, color = '#ff8f7a') {
  const r = rng(seed)
  const parts = []
  const base = new THREE.CylinderGeometry(0.18, 0.26, 0.26, 16)
  base.translate(0, 0.13, 0)
  parts.push(part(base, '#c4553f'))
  for (let i = 0; i < 38; i++) {
    const ring = i < 14 ? 0.06 : i < 26 ? 0.12 : 0.17
    const a = i * 2.39996 + r() * 0.2
    const len = 0.32 + r() * 0.18
    const t = new THREE.CylinderGeometry(0.02, 0.034, len, 6)
    t.translate(0, len / 2, 0)
    const tipBall = new THREE.SphereGeometry(0.045, 8, 6)
    tipBall.translate(0, len, 0)
    const m = merge([part(t, color), part(tipBall, '#ffd9cc')])
    m.rotateZ(0.25 + ring * 4.2)
    m.rotateY(a)
    m.translate(Math.cos(a) * ring, 0.24, -Math.sin(a) * ring)
    parts.push(m)
  }
  return merge(parts)
}

export function acroporaGeo(seed, color = '#b9a3e6') {
  const r = rng(seed)
  const parts = []
  const up = new THREE.Vector3(0, 1, 0)
  const q = new THREE.Quaternion()
  const grow = (start, dir, len, rad, depth) => {
    const g = new THREE.CylinderGeometry(rad * 0.72, rad, len, 7)
    g.translate(0, len / 2, 0)
    q.setFromUnitVectors(up, dir)
    g.applyQuaternion(q)
    g.translate(start.x, start.y, start.z)
    parts.push(part(g, color))
    const end = start.clone().addScaledVector(dir, len)
    if (depth === 0) {
      const tip = new THREE.SphereGeometry(rad * 0.75, 8, 6)
      tip.translate(end.x, end.y, end.z)
      parts.push(part(tip, '#efe8ff'))
      return
    }
    const kids = depth === 3 ? 4 : 3
    for (let k = 0; k < kids; k++) {
      const d = dir.clone()
      d.x += (r() - 0.5) * 1.1
      d.z += (r() - 0.5) * 1.1
      d.y += 0.25
      d.normalize()
      grow(end, d, len * (0.68 + r() * 0.15), rad * 0.72, depth - 1)
    }
  }
  grow(new THREE.Vector3(0, 0, 0), up.clone(), 0.32, 0.11, 3)
  const g = merge(parts)
  // Darker base, pale tips: recolour by height on top of the part colours.
  const col = g.attributes.color
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const k = 0.55 + Math.min(1, pos.getY(i) / 1.2) * 0.45
    col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k)
  }
  return g
}

export function zoaGeo(seed) {
  const r = rng(seed)
  const rock = lumpy(new THREE.IcosahedronGeometry(0.4, 2), 0.06, 3, r() * 10, true)
  rock.scale(1.2, 0.35, 1)
  rock.translate(0, 0.1, 0)
  const parts = [part(rock, '#8c7f6f')]
  const palettes = [['#4fbf5a', '#ff8a2a'], ['#3fb6c9', '#f2d14b'], ['#9a6bd6', '#7cf06a']]
  const [rim, eye] = palettes[seed % palettes.length]
  for (let i = 0; i < 22; i++) {
    const a = i * 2.39996
    const rr = 0.07 + Math.sqrt(i / 22) * 0.36
    const x = Math.cos(a) * rr
    const z = Math.sin(a) * rr * 0.85
    const h = 0.06 + r() * 0.05
    const stem = new THREE.CylinderGeometry(0.045, 0.05, h, 8)
    stem.translate(x, 0.2 + h / 2, z)
    const disc = new THREE.CylinderGeometry(0.072, 0.06, 0.018, 12)
    disc.translate(x, 0.2 + h, z)
    const dot = new THREE.CylinderGeometry(0.028, 0.028, 0.022, 8)
    dot.translate(x, 0.2 + h + 0.004, z)
    parts.push(part(stem, '#6a8f5a'), part(disc, rim), part(dot, eye))
  }
  return merge(parts)
}

/** Dome with meandering grooves. */
export function brainGeo(seed) {
  const off = rng(seed)() * 10
  const groove = (x, y, z) => Math.sin(x * 22 + Math.sin(z * 11 + off) * 2.2 + Math.sin(y * 9) * 1.5)
  const g = new THREE.SphereGeometry(0.45, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2)
  const pos = g.attributes.position
  const v = new THREE.Vector3()
  const n = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    n.copy(v).normalize()
    v.addScaledVector(n, Math.abs(groove(v.x, v.y, v.z)) * 0.035)
    pos.setXYZ(i, v.x, v.y * 0.72, v.z)
  }
  g.computeVertexNormals()
  return paint(g, (x, y, z, c) => mix(c, '#4e6b3a', '#c7e39a', Math.abs(groove(x, y / 0.72, z))))
}

/** Mushroom corals: flat discs on a low rock, pale in the middle. */
export function discoGeo(seed, color = '#4a7fd6') {
  const r = rng(seed)
  const rock = lumpy(new THREE.IcosahedronGeometry(0.35, 2), 0.06, 3, r() * 10, true)
  rock.scale(1.3, 0.45, 1)
  rock.translate(0, 0.12, 0)
  const parts = [part(rock, '#8c7f6f')]
  for (let i = 0; i < 8; i++) {
    const a = i * 2.39996
    const rr = 0.06 + Math.sqrt(i / 8) * 0.3
    const rad = 0.11 + r() * 0.04
    const disc = paint(new THREE.CylinderGeometry(rad, 0.05, 0.03, 18).toNonIndexed(), (x, y, z, c) => {
      const d = Math.hypot(x, z) / rad
      return d < 0.25 ? c.set('#cfe6ff') : mix(c, color, '#2b3f8f', d - 0.3 + (y < 0 ? 0.4 : 0))
    })
    disc.rotateX((r() - 0.5) * 0.6)
    disc.rotateZ((r() - 0.5) * 0.6)
    disc.translate(Math.cos(a) * rr, 0.22 + r() * 0.05, Math.sin(a) * rr * 0.8)
    parts.push(disc)
  }
  return merge(parts)
}

/** Sea fan: a flat net of branches. */
export function gorgonianGeo(seed, color = '#d8602f') {
  const r = rng(seed)
  const parts = []
  const up = new THREE.Vector3(0, 1, 0)
  const q = new THREE.Quaternion()
  const grow = (start, dir, len, rad, depth) => {
    const g = new THREE.CylinderGeometry(rad * 0.75, rad, len, 5)
    g.translate(0, len / 2, 0)
    q.setFromUnitVectors(up, dir)
    g.applyQuaternion(q)
    g.translate(start.x, start.y, start.z)
    parts.push(part(g, color))
    if (depth === 0) return
    const end = start.clone().addScaledVector(dir, len)
    for (const side of [-1, 1]) {
      const d = dir.clone()
      d.x += side * (0.35 + r() * 0.35)
      d.z += (r() - 0.5) * 0.12
      d.y += 0.15
      d.normalize()
      grow(end, d, len * (0.78 + r() * 0.12), rad * 0.75, depth - 1)
    }
  }
  grow(new THREE.Vector3(0, 0, 0), up.clone(), 0.35, 0.05, 5)
  return merge(parts)
}

/** Hammer coral: tentacles ending in anchor-shaped tips, on a stony base. */
export function euphylliaGeo(seed, color = '#7dd6b8') {
  const r = rng(seed)
  const base = new THREE.CylinderGeometry(0.22, 0.3, 0.25, 12)
  base.translate(0, 0.12, 0)
  const parts = [part(base, '#cfc6b4')]
  for (let i = 0; i < 26; i++) {
    const a = i * 2.39996 + r() * 0.2
    const rr = Math.sqrt(i / 26) * 0.24
    const len = 0.22 + r() * 0.14
    const t = new THREE.CylinderGeometry(0.018, 0.024, len, 6)
    t.translate(0, len / 2, 0)
    const tip = new THREE.CapsuleGeometry(0.03, 0.08, 3, 8)
    tip.rotateZ(Math.PI / 2)
    tip.translate(0, len, 0)
    const m = merge([part(t, color), part(tip, '#e8fff6')])
    m.rotateZ((r() - 0.5) * 0.6 + rr * 1.2)
    m.rotateY(a)
    m.translate(Math.cos(a) * rr, 0.22, -Math.sin(a) * rr)
    parts.push(m)
  }
  return merge(parts)
}

/* ───────── Substrate ───────── */

/** Top surface plus skirts down to y = 0, in unit X/Z; the mesh is scaled by tank width/depth. */
export function groundGeo(nx = 40, nz = 24) {
  const positions = []
  const uvs = []
  const idx = []
  const top = (u, v) => {
    const x = u - 0.5
    const z = v - 0.5
    return [x, 0.32 + 0.3 * (0.5 - z) + noise(x * 9, 0, z * 11) * 0.03, z]
  }
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      positions.push(...top(i / nx, j / nz))
      uvs.push(i / nx, j / nz)
    }
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i
      const b = a + 1
      const c = a + nx + 1
      const d = c + 1
      idx.push(a, c, b, b, c, d)
    }
  // Skirts: front, back, left, right.
  const skirt = (edge) => {
    const start = positions.length / 3
    edge.forEach(([u, v]) => {
      const p = top(u, v)
      positions.push(...p, p[0], 0, p[2])
      uvs.push(u, 0, u, 0.12)
    })
    for (let k = 0; k < edge.length - 1; k++) {
      const a = start + k * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const range = (n) => Array.from({ length: n + 1 }, (_, i) => i / n)
  skirt(range(nx).map((u) => [u, 1]))
  skirt(range(nx).map((u) => [1 - u, 0]))
  skirt(range(nz).map((v) => [0, v]))
  skirt(range(nz).map((v) => [1, 1 - v]))
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Same height formula as groundGeo (without the ripple), for items sitting on top. */
export const groundTop = (zNorm) => 0.32 + 0.3 * (0.5 - zNorm)

/** Speckled substrate texture drawn on a canvas. */
export function groundTexture(kind) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')
  const r = rng(kind.length * 97)
  const conf = {
    sand: { base: '#d9c7a1', dots: ['#c4b08a', '#efe4cb', '#b9a37c', '#f7efdc'], size: [0.6, 1.8], n: 3000 },
    gravel: { base: '#4b4f51', dots: ['#2d3133', '#6b7174', '#8a8f8f', '#3b2f28', '#a5a9a6'], size: [2.2, 5], n: 900 },
    soil: { base: '#3d2b20', dots: ['#2a1d15', '#5a4232', '#6d5240', '#1d140f'], size: [1.6, 3.6], n: 1400 },
    aragonite: { base: '#e4d9c6', dots: ['#d4c6ae', '#f6f0e4', '#e8bcbc', '#cbbb9f'], size: [0.8, 2.4], n: 2600 },
    pebble: { base: '#8a8073', dots: ['#b9ae9e', '#6d655b', '#a39684', '#d3c8b6', '#5a524a'], size: [4, 8], n: 520 },
    blacksand: { base: '#222327', dots: ['#3a3b40', '#141518', '#4a4b52', '#2e2f34'], size: [0.6, 1.6], n: 3200 },
    lava: { base: '#5e2c22', dots: ['#7a3b2c', '#3f1c16', '#8f4a36', '#2b1410', '#6a3326'], size: [2, 4.5], n: 1100 },
    coralsand: { base: '#ebdfcf', dots: ['#f8f1e6', '#d9c6ad', '#f2c9c0', '#fffaf2', '#cdb594'], size: [1.2, 3.4], n: 2000 },
  }[kind] ?? { base: '#ddd', dots: ['#ccc'], size: [1, 2], n: 500 }
  ctx.fillStyle = conf.base
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < conf.n; i++) {
    ctx.fillStyle = conf.dots[Math.floor(r() * conf.dots.length)]
    const s = conf.size[0] + r() * (conf.size[1] - conf.size[0])
    ctx.beginPath()
    ctx.ellipse(r() * 256, r() * 256, s, s * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2)
    ctx.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 4
  return t
}

/** Soft vertical gradient used by the light rays. */
export function rayTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 256
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, 'rgba(255,255,240,0.9)')
  g.addColorStop(1, 'rgba(255,255,240,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 256)
  const h = ctx.createLinearGradient(0, 0, 64, 0)
  h.addColorStop(0, 'rgba(0,0,0,1)')
  h.addColorStop(0.5, 'rgba(0,0,0,0)')
  h.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = h
  ctx.fillRect(0, 0, 64, 256)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
