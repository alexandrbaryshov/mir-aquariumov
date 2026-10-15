import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, LayoutGroup, usePresenceData, useInView } from 'motion/react'
import { places } from '../data.js'

const SWIPE = 80

/** «Дом, офис, частный дом»: где живут аквариумы — карусель со свайпом и автоперелистыванием. */
export default function Places() {
  const [[index, dir], setState] = useState([0, 1])
  const [paused, setPaused] = useState(false)
  const ref = useRef(null)
  const inView = useInView(ref, { amount: 0.4 })

  const go = (d) => setState(([i]) => [(i + d + places.length) % places.length, d])
  const goTo = (i) => setState(([cur]) => [i, i > cur ? 1 : -1])

  useEffect(() => {
    if (paused || !inView) return
    const t = setTimeout(() => go(1), 7000)
    return () => clearTimeout(t)
  }, [index, paused, inView])

  return (
    <section
      ref={ref}
      className="reviews places"
      aria-roledescription="карусель"
      aria-labelledby="places-title"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="wrap reviews-inner">
        <div className="reviews-head">
          <p className="eyebrow">Где живут аквариумы</p>
          <h2 id="places-title" className="section-title">
            Дом, офис, <em>частный дом</em>
          </h2>
          <div className="reviews-arrows">
            <motion.button type="button" className="icon-btn" onClick={() => go(-1)} aria-label="Предыдущий пример" whileTap={{ scale: 0.88, x: -3 }}>
              ←
            </motion.button>
            <motion.button type="button" className="icon-btn" onClick={() => go(1)} aria-label="Следующий пример" whileTap={{ scale: 0.88, x: 3 }}>
              →
            </motion.button>
          </div>
        </div>

        <div
          className="review-stage"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') go(1)
            if (e.key === 'ArrowLeft') go(-1)
          }}
          aria-live={paused ? 'polite' : 'off'}
        >
          <AnimatePresence custom={dir} mode="popLayout" initial={false}>
            <Slide key={index} place={places[index]} onSwipe={go} n={index} />
          </AnimatePresence>
        </div>

        <LayoutGroup id="place-dots">
          <div className="dots" role="tablist" aria-label="Выбор примера">
            {places.map((p, i) => (
              <button
                key={p.title}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`${i + 1}: ${p.title}`}
                className="dot"
                onClick={() => goTo(i)}
              >
                {i === index && <motion.span layoutId="dot-active" className="dot-active" />}
              </button>
            ))}
          </div>
        </LayoutGroup>
      </div>
    </section>
  )
}

function Slide({ place, onSwipe, n, ref }) {
  // Direction comes from <AnimatePresence custom>, and stays correct while this slide exits.
  const dir = usePresenceData() ?? 1
  return (
    <motion.figure
      ref={ref}
      className="review place"
      initial={{ x: dir * 120, opacity: 0, rotate: dir * 2 }}
      animate={{ x: 0, opacity: 1, rotate: 0 }}
      exit={{ x: dir * -120, opacity: 0, rotate: dir * -2 }}
      transition={{ type: 'spring', bounce: 0.15, visualDuration: 0.5 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      onDragEnd={(_, info) => {
        if (info.offset.x < -SWIPE || info.velocity.x < -500) onSwipe(1)
        else if (info.offset.x > SWIPE || info.velocity.x > 500) onSwipe(-1)
      }}
      whileDrag={{ cursor: 'grabbing' }}
      aria-label={`${n + 1} из ${places.length}: ${place.title}`}
    >
      <div className="place-media">
        <img src={place.img} alt="" draggable={false} loading="lazy" />
      </div>
      <figcaption className="place-text">
        <span className="review-n" aria-hidden>
          {String(n + 1).padStart(2, '0')}
        </span>
        <strong className="place-title">{place.title}</strong>
        <p>{place.text}</p>
        <a href="#visit" className="place-link" onPointerDown={(e) => e.stopPropagation()}>
          Подобрать аквариум в магазине →
        </a>
      </figcaption>
    </motion.figure>
  )
}
