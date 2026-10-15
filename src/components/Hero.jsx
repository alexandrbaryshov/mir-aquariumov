import { useCallback, useEffect, useRef, useState } from 'react'
import {
  motion,
  animate,
  useScroll,
  useTransform,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useMotionTemplate,
  useInView,
  usePageInView,
  useReducedMotion,
} from 'motion/react'
import ChromaVideo from './ChromaVideo.jsx'
import { settle, startPreload, usePreload } from '../preload.js'
import { shop } from '../data.js'
import tracks from '../fishTracks.json'
import { asset } from '../asset.js'
import { INTRO as T, introVars } from '../intro.js'

/* ───────── Dive-in ─────────
 * One "travel" value (0 → 1) moves the camera forward by DIVE.distance. Every layer
 * sits at its own depth and scales about the vanishing point by d / (d − travel),
 * which is exactly how a forward dolly projects: near corals swell and rush out of
 * frame, mid corals drift past slower, the far plate barely grows.
 *
 * Built so that a phone only ever moves finished bitmaps around:
 * - the layers move as Web Animations, which run on the compositor; travel is sampled
 *   at even time steps, so the easing lives in the keyframes;
 * - blur and colour are baked into the coral and depth-of-field images
 *   (sources/coral/bake-dive.mjs, one set per layout). A CSS blur on a layer scaled up
 *   to 20× has to be repainted at that size, which can stall a phone (Safari paints on
 *   the main thread) for a second or two right after the corals;
 * - corals stop growing at MAX_SCALE, long after they left the frame, and switch off.
 */
const DIVE = { duration: 3.6, distance: 0.82, ease: [0.35, 0.1, 0.15, 1] }
const TALL = typeof window !== 'undefined' && window.matchMedia('(max-aspect-ratio: 1/1)').matches
const diveImg = (key, layout) => asset(`img/dive/${key}-${layout}.webp`)
const DOF = asset('img/dive/hero-water-dof.webp')
const MAX_WAIT_MS = 2500 // never keep the scene frozen longer than this on a slow network
const FONT_GRACE_MS = 800 // how long the frames, once ready, may wait for the fonts
const MAX_SCALE = 8

const PLATE_DEPTH = 12
// Far → near. Depth 1 = where the camera ends up after travelling DIVE.distance + a bit.
// side: tall cluster framing the gap on the left and right; bed: low heads along the bottom.
const CORALS = [
  { key: 'mid-l', depth: 1.45, base: 'bed' },
  { key: 'mid-r', depth: 1.35, base: 'bed' },
  { key: 'near-b', depth: 0.95, base: 'bed' },
  { key: 'near-l', depth: 0.9, base: 'side' },
  { key: 'near-r', depth: 0.86, base: 'side' },
]
const INTRO_IMAGES = [asset('img/hero-water.jpg'), DOF, ...CORALS.map((c) => diveImg(c.key, TALL ? 'tall' : 'wide'))]
const project = (depth) => (t) => depth / (depth - DIVE.distance * t)
const plateScale = project(PLATE_DEPTH)
const clamp01 = (v) => Math.min(1, Math.max(0, v))

/** cubic-bezier(x1, y1, x2, y2) as a function of time, solved by bisection. */
function cubicBezier(x1, y1, x2, y2) {
  const at = (s, a, b) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3
  return (x) => {
    let lo = 0
    let hi = 1
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2
      if (at(mid, x1, x2) < x) lo = mid
      else hi = mid
    }
    return at((lo + hi) / 2, y1, y2)
  }
}
const diveEase = cubicBezier(...DIVE.ease)
const TRAVEL = Array.from({ length: 41 }, (_, i) => diveEase(i / 40))
const diveFrames = (fn) => TRAVEL.map(fn)

/** Scale with the camera, fade out on the last stretch while rushing out of frame, switch off. */
function coralFrames(depth) {
  const p = project(depth)
  const end = Math.min(MAX_SCALE, p(1))
  const from = 1 + (end - 1) * 0.55
  const to = 1 + (end - 1) * 0.92
  return diveFrames((t) => {
    const s = Math.min(end, p(t))
    const opacity = clamp01((to - s) / (to - from))
    return { transform: `scale(${s.toFixed(4)})`, opacity, visibility: opacity > 0 ? 'visible' : 'hidden' }
  })
}

/** Share of the dive's duration at which travel reaches `t` (for the ?dive= QA hook). */
function diveTimeAt(t) {
  let lo = 0
  let hi = 1
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (diveEase(mid) < t) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

function decode(src) {
  const img = new Image()
  img.src = src
  return img.decode().catch(() => {})
}

// Fonts the first screen is set in. The intro waits a little for them, so the name
// and the plaque don't jump when the web font swaps in mid-animation.
const INTRO_FONTS = ['500 1em Literata', '400 1em "JetBrains Mono"', '400 1em "Golos Text"', '600 1em "Golos Text"']

function fontsReady() {
  if (!document.fonts) return Promise.resolve()
  return Promise.all(INTRO_FONTS.map((f) => document.fonts.load(f, 'Мир аквариумов 0'))).catch(() => {})
}

// Mouse-only effects. The name ripples in through an SVG filter that is redrawn every
// frame: cheap on a desktop, but phones (Safari above all) render it on the main thread,
// so touch screens get a CSS fade and settle instead. The torch follows the mouse and
// blends over the whole hero (mix-blend-mode), which only costs a phone.
const finePointer = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

const rand = (i, salt) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}
// CSS animations (styles.css): they keep rising whatever the main thread is doing.
const bubbles = Array.from({ length: 14 }, (_, i) => ({
  left: `${3 + rand(i, 1) * 94}%`,
  '--size': `${4 + rand(i, 2) * 10}px`,
  '--dur': `${8 + rand(i, 3) * 8}s`,
  '--delay': `${-rand(i, 4) * 12}s`,
  '--drift': `${(rand(i, 5) - 0.5) * 50}px`,
}))

export default function Hero({ onStart }) {
  const ref = useRef(null)
  const titleRef = useRef(null)
  const reduce = useReducedMotion()
  const [play, setPlay] = useState(false)
  const [diveDone, setDiveDone] = useState(false)
  const inView = useInView(ref, { amount: 0.05 })
  const pageVisible = usePageInView()
  const { scrollYProgress: viewProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  // Read through a function on purpose, which keeps the values below on the main thread.
  // Motion would otherwise hand them to a native view timeline, and Chrome insets that by
  // html's scroll-padding-top (84px): at rest the name stood at 83 % opacity, the hint at 7 %.
  const scrollYProgress = useTransform(() => viewProgress.get())

  // The fish clips are the heaviest part of the first screen: start them right away,
  // alongside the dive frames, so the first fish is ready when the dive ends.
  useEffect(() => {
    if (reduce) settle() // static fish: nothing heavy to wait for
    else startPreload()
  }, [reduce])

  // Start as soon as the dive frames are decoded and the fonts are in. Fonts get at
  // most FONT_GRACE_MS on top of the frames, and nothing waits past MAX_WAIT_MS.
  useEffect(() => {
    let alive = true
    const go = () => alive && setPlay(true)
    if (reduce) {
      go()
      return
    }
    const fonts = fontsReady()
    Promise.all(INTRO_IMAGES.map(decode))
      .then(() => Promise.race([fonts, new Promise((resolve) => setTimeout(resolve, FONT_GRACE_MS))]))
      .then(go)
    const t = setTimeout(go, MAX_WAIT_MS)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [reduce])

  useEffect(() => {
    if (play) onStart?.()
  }, [play, onStart])

  // The camera layers (see DIVE). `travel` mirrors their progress for the marine snow.
  const cameraRef = useRef(null)
  const dofRef = useRef(null)
  const deepRef = useRef(null)
  const coralRefs = useRef({})
  const travel = useMotionValue(reduce ? 1 : 0)
  useEffect(() => {
    if (!play) return
    if (reduce) {
      travel.set(1)
      setDiveDone(true)
      return
    }
    const timing = { duration: DIVE.duration * 1000, easing: 'linear', fill: 'both' }
    const layers = [
      [cameraRef.current, diveFrames((t) => ({ transform: `scale(${plateScale(t).toFixed(4)})` }))],
      [dofRef.current, diveFrames((t) => ({ opacity: 1 - t }))],
      [deepRef.current, diveFrames((t) => ({ opacity: clamp01(1 - t / 0.7) }))],
      ...CORALS.map((c) => [coralRefs.current[c.key], coralFrames(c.depth)]),
    ]
    const anims = layers.filter(([el]) => el).map(([el, frames]) => el.animate(frames, timing))
    // QA hook: ?dive=0.4 freezes the camera at that point of the dive.
    const frozen = parseFloat(new URLSearchParams(window.location.search).get('dive'))
    if (!Number.isNaN(frozen)) {
      travel.set(frozen)
      anims.forEach((a) => {
        a.pause()
        a.currentTime = diveTimeAt(frozen) * timing.duration
      })
      return () => anims.forEach((a) => a.cancel())
    }
    const a = animate(travel, 1, { duration: DIVE.duration, ease: DIVE.ease, onComplete: () => setDiveDone(true) })
    return () => {
      a.stop()
      anims.forEach((x) => x.cancel())
    }
  }, [play, reduce, travel])

  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.04, 1.14])
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -120])
  // The plaque fades on scroll by itself (an ancestor with opacity < 1 would switch off
  // its backdrop blur); its entrance is a CSS animation that overrides this meanwhile.
  const fade = useTransform(scrollYProgress, [0, 0.55], [1, 0])
  const hintFade = useTransform(scrollYProgress, [0, 0.1], [1, 0])

  const mx = useMotionValue(-400)
  const my = useMotionValue(-400)
  const sx = useSpring(mx, { stiffness: 140, damping: 22, mass: 0.6 })
  const sy = useSpring(my, { stiffness: 140, damping: 22, mass: 0.6 })
  const torch = useMotionTemplate`radial-gradient(380px circle at ${sx}px ${sy}px, rgba(255,255,255,0.3), rgba(255,255,255,0) 65%)`
  const onPointerMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set(e.clientX - r.left)
    my.set(e.clientY - r.top)
  }

  // ── Logo: appears from transparency through a fine ripple (SVG displacement). On
  // touch screens it is a CSS fade instead (see finePointer): no style is driven here.
  const reveal = useMotionValue(reduce ? 1 : 0)
  const turbRef = useRef(null)
  const dispRef = useRef(null)
  const logoOpacity = useTransform(reveal, [0, 0.55, 1], [0, 0.85, 1])
  const logoScale = useTransform(reveal, [0, 1], [1.07, 1])
  const logoFilter = useTransform(reveal, (p) =>
    p >= 0.999 ? 'none' : `url(#mir-aquariumov-ripple) blur(${((1 - p) * 5).toFixed(2)}px)`,
  )
  useMotionValueEvent(reveal, 'change', (p) => {
    const k = 1 - p
    dispRef.current?.setAttribute('scale', (46 * k ** 1.3).toFixed(2))
    turbRef.current?.setAttribute('baseFrequency', `${(0.01 + 0.016 * k).toFixed(4)} ${(0.06 + 0.1 * k).toFixed(4)}`)
  })
  useEffect(() => {
    if (!play || reduce || !finePointer) return
    const a = animate(reveal, 1, { delay: T.logo, duration: T.logoDur, ease: [0.22, 1, 0.36, 1] })
    return () => a.stop()
  }, [play, reduce, reveal])

  return (
    <section
      id="top"
      ref={ref}
      className="hero"
      style={introVars}
      onPointerMove={finePointer ? onPointerMove : undefined}
      data-intro={!play ? 'waiting' : diveDone ? 'done' : 'diving'}
    >
      {/* Far plate: the reef the camera glides towards. */}
      <div ref={cameraRef} className="hero-camera" style={{ transform: `scale(${plateScale(reduce ? 1 : 0)})` }}>
        <motion.div className="hero-media" style={{ y: bgY, scale: bgScale }}>
          <img src={asset('img/hero-water.jpg')} alt="" fetchPriority="high" />
          {/* Depth of field: the plate blurred, visible only towards the edges (corals)… */}
          <img src={DOF} alt="" className="hero-dof" aria-hidden />
          {/* …and almost up to the centre at the start of the dive, fading as the camera moves in. */}
          {!reduce && <img ref={dofRef} src={DOF} alt="" className="hero-dof is-start" aria-hidden />}
        </motion.div>
      </div>
      {finePointer && <motion.div className="hero-torch" style={{ background: torch }} aria-hidden />}

      {!reduce && (
        <div className="bubbles" aria-hidden>
          {bubbles.map((style, i) => (
            <span key={i} className="bubble" style={style} />
          ))}
        </div>
      )}

      <FishSwim heroRef={ref} titleRef={titleRef} start={play} reduce={reduce} />

      <svg className="sr-filter" aria-hidden width="0" height="0">
        <filter id="mir-aquariumov-ripple" x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence ref={turbRef} type="fractalNoise" baseFrequency="0.026 0.16" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="noise" scale="46" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <motion.div className="hero-center" style={{ y: titleY, opacity: fade }}>
        <p className="hero-kicker intro-in">Выставка — магазин</p>
        <motion.h1
          ref={titleRef}
          className={'hero-name' + (finePointer ? '' : ' intro-in')}
          style={finePointer ? { opacity: logoOpacity, scale: logoScale, filter: logoFilter } : undefined}
          data-testid="hero-name"
        >
          <span className="hero-name-line">Мир</span> <span className="hero-name-line">аквариумов</span>
        </motion.h1>
      </motion.div>

      {/* Foreground: corals the camera passes between, marine snow, deep-water haze. */}
      {!reduce && (
        <div className="dive" aria-hidden>
          <div ref={deepRef} className="dive-deep" />
          {!diveDone &&
            CORALS.map((c) => (
              <div key={c.key} ref={(el) => (coralRefs.current[c.key] = el)} className={`dive-coral is-${c.base} c-${c.key}`}>
                <picture>
                  <source media="(max-aspect-ratio: 1/1)" srcSet={diveImg(c.key, 'tall')} />
                  <img src={diveImg(c.key, 'wide')} alt="" decoding="async" />
                </picture>
              </div>
            ))}
          <DiveSnow travel={travel} active={inView && pageVisible} />
        </div>
      )}

      <div className="hero-bottom wrap">
        <motion.div className="hero-plaque intro-in" style={{ opacity: fade }}>
          <p className="hero-lead intro-in">Живые рыбы, морские кораллы и всё для аквариума — в одном зале в Чебоксарах.</p>
          <div className="hero-actions intro-in">
            <motion.a href="#builder" className="btn btn-primary" whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
              Собрать аквариум
            </motion.a>
            <motion.a href="#booking" className="btn btn-glass" whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
              Записаться на выставку
            </motion.a>
          </div>
          <ul className="hero-facts intro-in">
            <li>
              <span>Адрес</span>
              <a href={shop.routeUrl} target="_blank" rel="noopener">
                {shop.addressFull}
              </a>
            </li>
            <li>
              <span>Телефон</span>
              <a href={shop.phoneHref}>{shop.phone}</a>
            </li>
          </ul>
        </motion.div>
      </div>

      {/* Scroll hint: comes up once the intro has settled, goes as soon as the page moves. */}
      <motion.div className="hero-hint" style={{ opacity: hintFade }} aria-hidden data-testid="scroll-hint">
        <span className="hero-hint-inner intro-in">
          Листайте вниз
          <svg className="hero-hint-arrow" viewBox="0 0 12 18" width="10" height="15">
            <path d="M6 1.5v14M1.5 11 6 15.5 10.5 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </motion.div>

      <svg className="hero-wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden>
        <motion.path
          fill="var(--paper)"
          initial={false}
          animate={{
            d: [
              'M0 50 C 240 10, 480 90, 720 50 S 1200 10, 1440 50 V90 H0 Z',
              'M0 40 C 240 80, 480 20, 720 55 S 1200 80, 1440 40 V90 H0 Z',
            ],
          }}
          transition={{ duration: 6, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        />
      </svg>
    </section>
  )
}

/**
 * Marine snow: specks in a 3D volume that stream past the camera as it travels
 * (synced to the same travel value), then keep a slow drift so the water stays alive.
 */
const SNOW_FAR = 4
const SNOW_NEAR = 0.12
const DRIFT = 0.035 // depth units per second after the dive

function DiveSnow({ travel, active }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!active) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let w = 0
    let h = 0
    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const sprite = document.createElement('canvas')
    sprite.width = sprite.height = 64
    const sc = sprite.getContext('2d')
    const grad = sc.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.35, 'rgba(255,255,255,0.55)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    sc.fillStyle = grad
    sc.fillRect(0, 0, 64, 64)

    const spawn = (p, z) => {
      p.x = (Math.random() * 2 - 1) * 2.4
      p.y = (Math.random() * 2 - 1) * 1.5
      p.z = z
      p.s = 0.35 + Math.random() * 0.9
      return p
    }
    const n = w < 700 ? 70 : 120
    const ps = Array.from({ length: n }, () => spawn({}, SNOW_NEAR + Math.random() * (SNOW_FAR - SNOW_NEAR)))

    let last = performance.now()
    let lastTravel = travel.get()
    let raf = 0
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = travel.get()
      const dz = (t - lastTravel) * DIVE.distance * 2.6 + DRIFT * dt
      lastTravel = t
      const cx = w / 2
      const cy = h * 0.45
      const f = h * 0.5
      ctx.clearRect(0, 0, w, h)
      for (const p of ps) {
        p.z -= dz
        if (p.z < SNOW_NEAR) spawn(p, SNOW_FAR)
        const sx = (p.x / p.z) * f + cx
        const sy = (p.y / p.z) * f + cy
        if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) {
          spawn(p, SNOW_FAR)
          continue
        }
        const r = (p.s * 2.2) / p.z
        let a = Math.min(1, (SNOW_FAR - p.z) / 1.6) * 0.55
        if (p.z < 0.5) a *= p.z / 0.5 // huge near specks stay soft bokeh
        // Streak while the camera moves fast: a line back to where the speck just was.
        if (dz > 0.004) {
          const pz = p.z + dz
          ctx.globalAlpha = a * 0.45
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = Math.max(0.6, r * 0.7)
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo((p.x / pz) * f + cx, (p.y / pz) * f + cy)
          ctx.lineTo(sx, sy)
          ctx.stroke()
        }
        ctx.globalAlpha = a
        ctx.drawImage(sprite, sx - r, sy - r, r * 2, r * 2)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [active, travel])

  return <canvas ref={ref} className="dive-snow" />
}

/* ───────── Swimming fish ─────────
 * Each clip is a real 3D swim-through generated on green screen: the fish enters
 * from one edge, turns towards the camera, shows its side and back, and leaves
 * through another edge. A clip only restarts while the frame is empty, so the
 * fish never flips flat in view. Variety comes from clip order, mirroring,
 * height and the pauses between passes.
 *
 * "behind" passes cross the name under the letters; "graze" passes run along the
 * lower edge of the name in front of it, so the fish slips over the letters.
 */

const SCRIPT = [
  { clip: 0, mode: 'behind', mirror: false },
  { clip: 1, mode: 'graze', mirror: false },
  { clip: 1, mode: 'behind', mirror: true },
  { clip: 0, mode: 'graze', mirror: true },
]

function nextPass(i, history) {
  if (i < SCRIPT.length) return SCRIPT[i]
  const recentBehind = history.slice(-2).every((p) => p.mode === 'behind')
  return {
    clip: Math.random() < 0.5 ? 0 : 1,
    mirror: Math.random() < 0.5,
    mode: recentBehind || Math.random() < 0.3 ? 'graze' : 'behind',
  }
}

/** QA hook: ?fish=b:graze:4.2[:m] freezes one pass at a given clip time. */
function readQa() {
  const raw = new URLSearchParams(window.location.search).get('fish')
  if (!raw) return null
  const [c, mode = 'behind', t = '3', m] = raw.split(':')
  return { clip: c === 'b' ? 1 : 0, mode, mirror: m === 'm', seek: parseFloat(t) || 0 }
}

/** Places the clip layer for a pass using the pre-measured fish bounding boxes. */
function layout(pass, hero, title, jitter) {
  const track = tracks.clips[pass.clip]
  const W = hero.width
  const H = hero.height
  const fishPx = W < 700 ? W * 0.8 : Math.min(860, Math.max(320, W * 0.38))
  const width = fishPx / track.sideWidth
  const height = width * track.aspect
  const left = (W - width) / 2
  const th = title.bottom - title.top
  const boxes = track.samples.filter((s) => s.length === 5)
  const toX = (x) => left + (pass.mirror ? 1 - x : x) * width
  const over = boxes.filter((s) => {
    const a = toX(s[1])
    const b = toX(s[3])
    return Math.max(a, b) > title.left && Math.min(a, b) < title.right
  })
  const pool = over.length ? over : boxes
  let top
  if (pass.mode === 'graze') {
    const minTop = Math.min(...pool.map((s) => s[2]))
    top = title.bottom - th * 0.32 - minTop * height
  } else {
    const cy = pool.reduce((sum, s) => sum + (s[2] + s[4]) / 2, 0) / pool.length
    top = (title.top + title.bottom) / 2 - cy * height + jitter * th * 0.25
  }
  // Only guard against the whole swim ending up outside the hero; parts that
  // stray past its edges (close-ups near the camera) are simply clipped.
  const cyAll = boxes.reduce((sum, s) => sum + (s[2] + s[4]) / 2, 0) / boxes.length
  top = Math.max(-cyAll * height + H * 0.1, Math.min(top, H * 0.85 - cyAll * height))
  return { left, top, width, height }
}

function FishSwim({ heroRef, titleRef, start, reduce }) {
  const { clips } = usePreload()
  const clipsRef = useRef(clips)
  clipsRef.current = clips
  const qa = useRef(readQa()).current
  // The first pass waits only for the clip it needs; later passes use whatever is loaded.
  const firstClip = qa ? qa.clip : SCRIPT[0].clip
  const firstReady = !!clips[firstClip]
  const [pass, setPass] = useState(null)
  const [visible, setVisible] = useState(false)
  const waitingFrame = useRef(false) // a pass is set, its first frame not drawn yet
  const index = useRef(0)
  const history = useRef([])
  const timer = useRef(0)
  const startedAt = useRef(0)
  const inView = useInView(heroRef, { amount: 0.15 })
  const pageVisible = usePageInView()

  // Gentle parallax against the pointer adds depth without sliding the fish "flatly".
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const x = useSpring(px, { stiffness: 40, damping: 18 })
  const y = useSpring(py, { stiffness: 40, damping: 18 })
  useEffect(() => {
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return
      px.set((e.clientX / window.innerWidth - 0.5) * -24)
      py.set((e.clientY / window.innerHeight - 0.5) * -14)
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [px, py])

  const geometry = useCallback(() => {
    const hero = heroRef.current?.getBoundingClientRect()
    const t = titleRef.current?.getBoundingClientRect()
    if (!hero || !t) return null
    return { hero, title: { left: t.left - hero.left, right: t.right - hero.left, top: t.top - hero.top, bottom: t.bottom - hero.top } }
  }, [heroRef, titleRef])

  const launch = useCallback(() => {
    const g = geometry()
    if (!g) return
    const spec = { ...(qa ?? nextPass(index.current, history.current)), jitter: qa ? 0 : Math.random() - 0.5 }
    if (!clipsRef.current[spec.clip]) spec.clip = clipsRef.current.findIndex(Boolean)
    if (spec.clip < 0) return
    history.current.push(spec)
    index.current += 1
    // The layer fades in with the clip's first good frame, not when the clip is asked to start.
    waitingFrame.current = true
    setPass({ ...spec, box: layout(spec, g.hero, g.title, spec.jitter), token: index.current })
  }, [geometry, qa])

  const onFrame = useCallback(() => {
    if (!waitingFrame.current) return
    waitingFrame.current = false
    setVisible(true)
  }, [])

  useEffect(() => {
    if (start && !startedAt.current) startedAt.current = performance.now()
  }, [start])

  // First pass: after the intro, as soon as its clip is fully in memory.
  useEffect(() => {
    if (!start || reduce || !firstReady || index.current > 0) return
    const wait = qa ? 50 : Math.max(0, T.fish * 1000 - (performance.now() - startedAt.current))
    timer.current = setTimeout(launch, wait)
    return () => clearTimeout(timer.current)
  }, [start, reduce, firstReady, launch, qa])

  // On resize, re-place the current pass without restarting its clip.
  useEffect(() => {
    const onResize = () => {
      const g = geometry()
      if (g) setPass((p) => p && { ...p, box: layout(p, g.hero, g.title, p.jitter) })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [geometry])

  const onEnded = () => {
    if (qa) return
    setVisible(false)
    timer.current = setTimeout(launch, 1400 + Math.random() * 3200)
  }

  if (reduce) return <img src={asset('img/fish-cutout.png')} alt="" className="hero-fish-static" />
  if (!pass) return null

  return (
    <motion.div
      className="hero-fish"
      style={{
        left: pass.box.left,
        top: pass.box.top,
        width: pass.box.width,
        height: pass.box.height,
        zIndex: pass.mode === 'graze' ? 3 : 1,
        scaleX: pass.mirror ? -1 : 1,
        x,
        y,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: visible ? 0.5 : 0.25 }}
      data-testid="hero-fish"
      data-mode={pass.mode}
      data-clip={pass.clip}
    >
      <ChromaVideo
        sources={clips}
        active={pass.clip}
        token={pass.token}
        seek={qa ? qa.seek : null}
        paused={!inView || !pageVisible}
        className="hero-fish-canvas"
        onEnded={onEnded}
        onFrame={onFrame}
      />
    </motion.div>
  )
}
