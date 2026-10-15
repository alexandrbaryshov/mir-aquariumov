import { useRef, useState } from 'react'
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react'
import { steps } from '../data.js'

export default function Steps() {
  const listRef = useRef(null)
  const [active, setActive] = useState(0)
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 70%', 'end 55%'] })
  const draw = useSpring(scrollYProgress, { stiffness: 120, damping: 28 })

  return (
    <section id="steps" className="steps wrap" aria-labelledby="steps-title">
      <div className="steps-media">
        <div className="steps-sticky">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.img
              key={steps[active].img}
              src={steps[active].img}
              alt=""
              initial={{ opacity: 0, scale: 1.08, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.98, filter: 'blur(6px)' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </AnimatePresence>
          <span className="steps-badge mono">
            Шаг {active + 1} из {steps.length}
          </span>
        </div>
      </div>

      <div className="steps-content">
        <p className="eyebrow">Как мы помогаем</p>
        <h2 id="steps-title" className="section-title">
          Первый аквариум — <em>вместе с нами</em>
        </h2>

        <ol className="steps-list" ref={listRef}>
          <span className="steps-line" aria-hidden>
            <motion.span className="steps-line-fg" style={{ scaleY: draw, originY: 0 }} />
          </span>
          {steps.map((s, i) => (
            <motion.li
              key={s.title}
              className={'step' + (i === active ? ' is-active' : '')}
              onViewportEnter={() => setActive(i)}
              viewport={{ amount: 0.6, margin: '-15% 0px -25% 0px' }}
              initial={{ opacity: 0.35 }}
              animate={{ opacity: i === active ? 1 : 0.45 }}
            >
              <motion.span
                className="step-dot"
                animate={{ scale: i <= active ? 1 : 0.6 }}
                transition={{ type: 'spring', bounce: 0.5 }}
              >
                {i + 1}
              </motion.span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
