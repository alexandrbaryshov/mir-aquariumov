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
import { startPreload, usePreload } from '../preload.js'
import { shop } from '../data.js'
import tracks from '../fishTracks.json'
import { asset } from '../asset.js'

// Intro timeline, seconds from the moment the dive starts. The name, kicker and
// plaque keep their original entrance; they simply wait for the corals to part.
const T = { logo: 0.95, logoDur: 1.9, kicker: 2.05, plaque: 2.65, fish: 3.6 }

/* ───────── Dive-in ─────────
 * One "travel" value (0 → 1) moves the camera forward by DIVE.distance. Every layer
 * sits at its own depth and scales about the vanishing point by d / (d − travel),
 * which is exactly how a forward dolly projects: near corals swell and rush out of
 * frame, mid corals drift past slower, the far plate barely grows.
 */
const DIVE = { duration: 3.6, distance: 0.82, ease: [0.35, 0.1, 0.15, 1] }
const SIDE = asset('img/coral-side.webp') // tall cluster: frames the gap on the left and right
const BED = asset('img/coral-bed.webp') // low heads along the bottom
const INTRO_IMAGES = [asset('img/hero-water.jpg'), SIDE, BED]
const MAX_WAIT_MS = 2500 // never keep the scene frozen longer than this on a slow network

const PLATE_DEPTH = 12
// Far → near. Depth 1 = where the camera ends up after travelling DIVE.distance + a bit.
const CORALS = [
  { key: 'mid-l', depth: 1.45, src: BED, cls: 'is-mid is-flip c-mid-l' },
  { key: 'mid-r', depth: 1.35, src: BED, cls: 'is-mid c-mid-r' },
  { key: 'near-b', depth: 0.95, src: BED, cls: 'is-near c-near-b' },
  { key: 'near-l', depth: 0.9, src: SIDE, cls: 'is-near is-flip c-near-l' },
  { key: 'near-r', depth: 0.86, src: SIDE, cls: 'is-near c-near-r' },
]
const project = (depth) => (t) => depth / (depth - DIVE.distance * t)

function decode(src) {
  const img = new Image()
  img.src = src
  return img.decode().catch(() => {})
}

const rand = (i, salt) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}
const bubbles = Array.from({ length: 14 }, (_, i) => ({
  left: 3 + rand(i, 1) * 94,
  size: 4 + rand(i, 2) * 10,
  duration: 8 + rand(i, 3) * 8,
  delay: -rand(i, 4) * 12,
  drift: (rand(i, 5) - 0.5) * 50,
}))

const item = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export default function Hero({ onStart }) {
  const ref = useRef(null)
  const titleRef = useRef(null)
  const reduce = useReducedMotion()
  const [play, setPlay] = useState(false)
  const [diveDone, setDiveDone] = useState(false)
  const inView = useInView(ref, { amount: 0.05 })
  const pageVisible = usePageInView()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  // Start as soon as the dive frames are decoded (or after MAX_WAIT_MS at worst).
  useEffect(() => {
    let alive = true
    const go = () => alive && setPlay(true)
    if (reduce) {
      go()
      return
    }
    Promise.all(INTRO_IMAGES.map(decode)).then(go)
    const t = setTimeout(go, MAX_WAIT_MS)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [reduce])

  useEffect(() => {
    if (!play) return
    onStart?.()
    startPreload() // fish clips download behind the dive
  }, [play, onStart])

  const travel = useMotionValue(reduce ? 1 : 0)
  useEffect(() => {
    if (!play) return
    // QA hook: ?dive=0.4 freezes the camera at that point of the dive.
    const frozen = parseFloat(new URLSearchParams(window.location.search).get('dive'))
    if (!Number.isNaN(frozen)) {
      travel.set(frozen)
      return
    }
    if (reduce) {
      travel.set(1)
      setDiveDone(true)
      return
    }
    const a = animate(travel, 1, { duration: DIVE.duration, ease: DIVE.ease, onComplete: () => setDiveDone(true) })
    return () => a.stop()
  }, [play, reduce, travel])

  const plateScale = useTransform(travel, project(PLATE_DEPTH))
  const dof = useTransform(travel, (t) => `${(8 + 32 * t).toFixed(1)}%`)
  const deep = useTransform(travel, [0, 0.7], [1, 0])

  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.04, 1.14])
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -120])
  const fade = useTransform(scrollYProgress, [0, 0.55], [1, 0])

  // Plaque: intro entrance × scroll fade on the plaque itself. An ancestor with
  // opacity < 1 would switch off its backdrop blur (it becomes a backdrop root).
  const plaqueIn = useMotionValue(reduce ? 1 : 0)
  const plaqueOpacity = useTransform(() => fade.get() * plaqueIn.get())
  const plaqueY = useTransform(plaqueIn, [0, 1], [30, 0])
  useEffect(() => {
    if (!play || reduce) return
    const a = animate(plaqueIn, 1, { delay: T.plaque, duration: 0.8, ease: [0.22, 1, 0.36, 1] })
    return () => a.stop()
  }, [play, reduce, plaqueIn])

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

  // ── Logo: appears from transparency through a fine ripple (SVG displacement).
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
    if (!play || reduce) return
    const a = animate(reveal, 1, { delay: T.logo, duration: T.logoDur, ease: [0.22, 1, 0.36, 1] })
    return () => a.stop()
  }, [play, reduce, reveal])

  return (
    <section
      id="top"
      ref={ref}
      className="hero"
      onPointerMove={onPointerMove}
      data-intro={!play ? 'waiting' : diveDone ? 'done' : 'diving'}
    >
      {/* Far plate: the reef the camera glides towards. */}
      <motion.div className="hero-camera" style={{ scale: plateScale, '--dof': dof }}>
        <motion.div className="hero-media" style={{ y: bgY, scale: bgScale }}>
          <img src={asset('img/hero-water.jpg')} alt="" fetchPriority="high" />
          {/* Depth of field: the same plate, blurred, visible only towards the edges (corals). */}
          <img src={asset('img/hero-water.jpg')} alt="" className="hero-dof" aria-hidden />
        </motion.div>
      </motion.div>
      <motion.div className="hero-torch" style={{ background: torch }} aria-hidden />

      {!reduce && (
        <div className="bubbles" aria-hidden>
          {bubbles.map((b, i) => (
            <motion.span
              key={i}
              className="bubble"
              style={{ left: `${b.left}%`, width: b.size, height: b.size }}
              animate={{ y: [0, -900], x: [0, b.drift, 0], opacity: [0, 0.9, 0.9, 0] }}
              transition={{
                duration: b.duration,
                delay: b.delay,
                repeat: Infinity,
                ease: 'linear',
                times: [0, 0.1, 0.85, 1],
                x: { duration: b.duration / 2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
              }}
            />
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
        <motion.p
          className="hero-kicker"
          initial={{ opacity: 0, y: 12 }}
          animate={play ? { opacity: 1, y: 0 } : undefined}
          transition={{ delay: reduce ? 0 : T.kicker, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Магазин аквариумистики · {shop.city}
        </motion.p>
        <motion.h1
          ref={titleRef}
          className="hero-name"
          style={{ opacity: logoOpacity, scale: logoScale, filter: logoFilter }}
          data-testid="hero-name"
        >
          <span className="hero-name-line">Мир</span> <span className="hero-name-line">аквариумов</span>
        </motion.h1>
      </motion.div>

      {/* Foreground: corals the camera passes between, marine snow, deep-water haze. */}
      {!reduce && (
        <div className="dive" aria-hidden>
          <motion.div className="dive-deep" style={{ opacity: deep }} />
          {!diveDone && CORALS.map((c) => <DiveCoral key={c.key} coral={c} travel={travel} />)}
          <DiveSnow travel={travel} active={inView && pageVisible} />
        </div>
      )}

      <div className="hero-bottom wrap">
        <motion.div
          className="hero-plaque"
          style={{ opacity: plaqueOpacity, y: plaqueY }}
          initial="hidden"
          animate={play ? 'shown' : 'hidden'}
          variants={{
            hidden: {},
            shown: { transition: { delayChildren: reduce ? 0 : T.plaque + 0.25, staggerChildren: reduce ? 0 : 0.12 } },
          }}
        >
          <motion.p className="hero-lead" variants={item}>
            Живые рыбы, морские кораллы и всё для аквариума — в одном зале в Чебоксарах.
          </motion.p>
          <motion.div className="hero-actions" variants={item}>
            <motion.a href="#shop" className="btn btn-primary" whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
              Смотреть витрину
            </motion.a>
            <motion.a href="#visit" className="btn btn-glass" whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
              Как нас найти
            </motion.a>
          </motion.div>
          <motion.ul className="hero-facts" variants={item}>
            <li>
              <span>Адрес</span>
              <a href={shop.routeUrl} target="_blank" rel="noopener">
                {shop.address}
              </a>
            </li>
            <li>
              <span>Телефон</span>
              <a href={shop.phoneHref}>{shop.phone}</a>
            </li>
            <li>
              <span>Часы</span>
              уточняйте по телефону
            </li>
          </motion.ul>
        </motion.div>
      </div>

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

/** One coral layer: full-frame box scaled about the vanishing point by its depth. */
function DiveCoral({ coral, travel }) {
  const scale = useTransform(travel, project(coral.depth))
  const end = project(coral.depth)(1)
  const opacity = useTransform(scale, [1 + (end - 1) * 0.55, 1 + (end - 1) * 0.92], [1, 0])
  return (
    <motion.div className={'dive-coral ' + coral.cls} style={{ scale, opacity }}>
      <img src={coral.src} alt="" decoding="async" />
    </motion.div>
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
  const { clips, done } = usePreload()
  const qa = useRef(readQa()).current
  const [pass, setPass] = useState(null)
  const [visible, setVisible] = useState(false)
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
    history.current.push(spec)
    index.current += 1
    setPass({ ...spec, box: layout(spec, g.hero, g.title, spec.jitter), token: index.current })
    setVisible(true)
  }, [geometry, qa])

  useEffect(() => {
    if (start && !startedAt.current) startedAt.current = performance.now()
  }, [start])

  // First pass: after the intro, and only once both clips are fully in memory.
  useEffect(() => {
    if (!start || reduce || !done || index.current > 0) return
    const wait = qa ? 50 : Math.max(0, T.fish * 1000 - (performance.now() - startedAt.current))
    timer.current = setTimeout(launch, wait)
    return () => clearTimeout(timer.current)
  }, [start, reduce, done, launch, qa])

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
      transition={{ duration: visible ? 0.35 : 0.25 }}
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
      />
    </motion.div>
  )
}
