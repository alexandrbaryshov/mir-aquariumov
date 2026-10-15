import { useRef } from 'react'
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  usePageInView,
  useReducedMotion,
} from 'motion/react'

const wrap = (min, max, v) => {
  const range = max - min
  return ((((v - min) % range) + range) % range) + min
}

const words = ['Пресноводные рыбы', 'Морские кораллы', 'Креветки', 'Живые растения', 'Аквариумы и оборудование', 'Корм и декор', 'Продавцы — аквариумисты']

/** Marquee whose speed and direction follow the scroll velocity. */
export default function Ticker({ baseVelocity = -2.2 / 1.5 }) {
  const baseX = useMotionValue(0)
  const { scrollY } = useScroll()
  const scrollVelocity = useVelocity(scrollY)
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 })
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false })
  const skew = useTransform(smoothVelocity, [-2500, 0, 2500], [8, 0, -8])
  const x = useTransform(baseX, (v) => `${wrap(-25, -50, v)}%`)
  const direction = useRef(1)
  const pageVisible = usePageInView()
  const reduce = useReducedMotion()

  useAnimationFrame((_, delta) => {
    if (!pageVisible || reduce) return
    let moveBy = direction.current * baseVelocity * (delta / 1000)
    const f = velocityFactor.get()
    if (f < 0) direction.current = -1
    else if (f > 0) direction.current = 1
    moveBy += direction.current * moveBy * f
    baseX.set(baseX.get() + moveBy)
  })

  const row = words.map((w) => (
    <span key={w} className="ticker-item">
      {w}
      <svg viewBox="0 0 30 14" width="26" aria-hidden>
        <path d="M2 7c4-5 12-6 18-1l7-4v10l-7-4c-6 5-14 4-18-1z" fill="currentColor" />
      </svg>
    </span>
  ))

  return (
    <div className="ticker">
      <p className="sr-only">{words.join(' · ')}</p>
      <motion.div className="ticker-track" style={{ x, skewX: skew }} aria-hidden>
        {row}
        {row}
        {row}
        {row}
      </motion.div>
    </div>
  )
}
