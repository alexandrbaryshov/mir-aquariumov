import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useMotionValueEvent,
  useInView,
} from 'motion/react'
import { halls } from '../data.js'

/**
 * Horizontal carousel driven by ← / → buttons (plus swipe, trackpad and arrow keys).
 * Vertical page scroll passes straight through — nothing is pinned.
 */
export default function Halls() {
  const trackRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(1)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const { scrollX, scrollXProgress } = useScroll({ container: trackRef })
  const bar = useSpring(scrollXProgress, { stiffness: 220, damping: 34 })

  const step = () => {
    const track = trackRef.current
    const card = track?.querySelector('.hall-card')
    if (!card) return 0
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0
    return card.getBoundingClientRect().width + gap
  }

  const sync = (x) => {
    const track = trackRef.current
    if (!track) return
    const s = step()
    if (!s) return
    const end = x >= track.scrollWidth - track.clientWidth - 4
    const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0
    const fit = Math.max(1, Math.min(halls.length, Math.floor((track.clientWidth - pad + 24) / s)))
    setVisible(fit)
    setIndex(end ? halls.length - fit : Math.min(halls.length - fit, Math.round(x / s)))
    setAtStart(x <= 4)
    setAtEnd(end)
  }
  useMotionValueEvent(scrollX, 'change', sync)
  useEffect(() => {
    const onResize = () => sync(trackRef.current?.scrollLeft ?? 0)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // One card per click; scroll-snap settles it on the nearest card edge.
  const go = (dir) => trackRef.current?.scrollBy({ left: dir * step(), behavior: 'smooth' })

  const pad2 = (n) => String(n).padStart(2, '0')
  const range = visible > 1 ? `${pad2(index + 1)}–${pad2(index + visible)}` : pad2(index + 1)

  return (
    <section id="halls" className="halls" aria-labelledby="halls-title">
      <div className="halls-head wrap">
        <div>
          <p className="eyebrow">Ассортимент · {halls.length} разделов</p>
          <h2 id="halls-title" className="section-title">
            В зале <em>всё живое</em>
          </h2>
          <p className="halls-lead muted">Рыб, креветок и кораллы можно рассмотреть вживую, прежде чем выбрать.</p>
        </div>
        <div className="halls-controls">
          <div className="halls-counter" aria-hidden>
            <span className="mono">
              {range} / {pad2(halls.length)}
            </span>
            <span className="halls-bar">
              <motion.span style={{ scaleX: bar }} />
            </span>
          </div>
          <div className="halls-arrows">
            <ArrowButton dir={-1} disabled={atStart} onClick={() => go(-1)} label="Предыдущий раздел" />
            <ArrowButton dir={1} disabled={atEnd} onClick={() => go(1)} label="Следующий раздел" />
          </div>
        </div>
      </div>

      <ul
        ref={trackRef}
        className="halls-track"
        tabIndex={0}
        aria-label="Разделы зала"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') (e.preventDefault(), go(1))
          if (e.key === 'ArrowLeft') (e.preventDefault(), go(-1))
        }}
      >
        {halls.map((h, i) => (
          <HallCard key={h.n} hall={h} active={i >= index && i < index + visible} />
        ))}
      </ul>
      <p className="sr-only" aria-live="polite">
        Показаны разделы {range} из {halls.length}
      </p>
    </section>
  )
}

function ArrowButton({ dir, disabled, onClick, label }) {
  return (
    <motion.button
      type="button"
      className="icon-btn arrow-btn"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      whileHover={disabled ? undefined : { scale: 1.06 }}
      whileTap={disabled ? undefined : { scale: 0.9, x: dir * 3 }}
      animate={{ opacity: disabled ? 0.35 : 1 }}
      data-testid={dir > 0 ? 'halls-next' : 'halls-prev'}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {dir > 0 ? <path d="M5 12h14M13 6l6 6-6 6" /> : <path d="M19 12H5M11 6l-6 6 6 6" />}
      </svg>
    </motion.button>
  )
}

function HallCard({ hall, active }) {
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const rotateX = useSpring(rx, { stiffness: 180, damping: 18 })
  const rotateY = useSpring(ry, { stiffness: 180, damping: 18 })
  const glareX = useTransform(rotateY, [-8, 8], ['20%', '80%'])
  // The reef video (3.5 MB) only starts downloading once its card is near the viewport,
  // so it doesn't compete with the hero fish clips on first load.
  const videoRef = useRef(null)
  const nearView = useInView(videoRef, { once: true, margin: '0px 400px 200px 400px' })

  const onMove = (e) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 12)
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 10)
  }
  const onLeave = () => {
    rx.set(0)
    ry.set(0)
  }

  return (
    <motion.li
      className={'hall-card' + (active ? ' is-active' : '')}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      initial="rest"
      whileHover="hover"
    >
      <div className="hall-media">
        {hall.video ? (
          <motion.video
            ref={videoRef}
            src={nearView ? hall.video : undefined}
            poster={hall.img}
            muted
            loop
            autoPlay
            playsInline
            preload="none"
            variants={{ rest: { scale: 1 }, hover: { scale: 1.06 } }}
            transition={{ type: 'spring', bounce: 0, visualDuration: 0.6 }}
          />
        ) : (
          <motion.img
            src={hall.img}
            alt=""
            loading="lazy"
            variants={{ rest: { scale: 1 }, hover: { scale: 1.06 } }}
            transition={{ type: 'spring', bounce: 0, visualDuration: 0.6 }}
          />
        )}
        <motion.span className="hall-glare" style={{ left: glareX }} aria-hidden />
        <span className="hall-n">{hall.n}</span>
      </div>
      <div className="hall-body">
        <p className="mono hall-meta">{hall.meta}</p>
        <h3>{hall.title}</h3>
        <p>{hall.text}</p>
      </div>
    </motion.li>
  )
}
