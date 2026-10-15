import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { expo, shop } from '../data.js'
import { useDialog } from '../hooks.js'

const byId = Object.fromEntries(expo.map((p, i) => [p.id, { ...p, index: i }]))
// Rows of the wide layout: photos in a row share one height (see .expo-row).
const ROWS = [['anemone', 'gecko'], ['python', 'cichlids', 'oscars'], ['turtles']]
const SWIPE = 80

/** Last page: photos from the exhibition. The hero's «Записаться на выставку» leads here first. */
export default function Expo() {
  const [open, setOpen] = useState(null) // index in expo
  const close = useCallback(() => setOpen(null), [])
  const step = useCallback((d) => setOpen((i) => (i + d + expo.length) % expo.length), [])

  return (
    <section id="expo" className="expo" aria-labelledby="expo-title">
      <div className="wrap">
        <div className="expo-head">
          <p className="eyebrow">Выставка · {expo.length} снимков</p>
          <h2 id="expo-title" className="section-title">
            Кто живёт <em>на выставке</em>
          </h2>
          <p className="expo-lead">
            Морской риф, пресноводные цихлиды, черепахи, геккон и питон. Всех можно рассмотреть вблизи и расспросить о них
            продавцов — они сами аквариумисты.
          </p>
        </div>

        <div className="expo-grid" data-testid="expo-grid">
          {ROWS.map((row, r) => (
            <div key={r} className="expo-row">
              {row.map((id) => (
                <Photo key={id} photo={byId[id]} onOpen={() => setOpen(byId[id].index)} />
              ))}
              {r === ROWS.length - 1 && (
                <motion.div
                  className="expo-cta"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ type: 'spring', bounce: 0, visualDuration: 0.6, delay: 0.1 }}
                >
                  <a href={shop.routeUrl} target="_blank" rel="noopener" className="mono expo-cta-where">
                    {shop.addressFull} →
                  </a>
                  <p className="expo-cta-title">Хотите увидеть их вживую?</p>
                  <p className="expo-cta-text">Выберите удобный день — перезвоним и подтвердим визит.</p>
                  <div className="expo-cta-actions">
                    <motion.a href="#booking" className="btn btn-primary" whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
                      Записаться на выставку
                    </motion.a>
                    <a href={shop.phoneHref} className="expo-cta-phone">
                      {shop.phone}
                    </a>
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>{open != null && <Lightbox index={open} onClose={close} onStep={step} />}</AnimatePresence>
    </section>
  )
}

function Photo({ photo: p, onOpen }) {
  const ar = p.w / p.h
  return (
    <motion.figure
      className={'expo-photo' + (ar > 1.7 ? ' is-wide' : '')}
      // --ar: the file's proportions; --ar-m: on a phone, upright shots are cut to a square.
      style={{ '--ar': ar.toFixed(3), '--ar-m': Math.max(1, ar).toFixed(3) }}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ type: 'spring', bounce: 0, visualDuration: 0.6 }}
    >
      <button type="button" className="expo-open" onClick={onOpen} aria-label={`${p.title} — открыть фото`}>
        <img src={p.img} alt={p.alt} width={p.w} height={p.h} loading="lazy" decoding="async" />
      </button>
      <figcaption className="expo-caption">
        <span className="mono expo-zone">{p.zone}</span>
        <strong className="expo-title">{p.title}</strong>
        <span className="expo-text">{p.text}</span>
      </figcaption>
    </motion.figure>
  )
}

function Lightbox({ index, onClose, onStep }) {
  const p = expo[index]
  const closeRef = useRef(null)
  useDialog(true, onClose, closeRef)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') onStep(1)
      if (e.key === 'ArrowLeft') onStep(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onStep])

  return (
    <div className="dialog-layer">
      <motion.div className="dialog-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.figure
        className="lightbox"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lightbox-title"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', bounce: 0.1, visualDuration: 0.35 }}
        data-testid="expo-lightbox"
      >
        <div className="lightbox-media">
          <AnimatePresence mode="wait" initial={false}>
            <motion.img
              key={p.id}
              src={p.img}
              alt={p.alt}
              width={p.w}
              height={p.h}
              draggable={false}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.4}
              onDragEnd={(_, info) => {
                if (info.offset.x < -SWIPE || info.velocity.x < -500) onStep(1)
                else if (info.offset.x > SWIPE || info.velocity.x > 500) onStep(-1)
              }}
            />
          </AnimatePresence>
        </div>
        <figcaption className="lightbox-caption">
          <span className="mono">
            {String(index + 1).padStart(2, '0')} / {String(expo.length).padStart(2, '0')} · {p.zone}
          </span>
          <strong id="lightbox-title">{p.title}</strong>
          <span className="lightbox-text">{p.text}</span>
        </figcaption>
        <div className="lightbox-nav">
          <motion.button type="button" className="icon-btn" onClick={() => onStep(-1)} aria-label="Предыдущее фото" whileTap={{ scale: 0.88, x: -3 }}>
            ←
          </motion.button>
          <motion.button type="button" className="icon-btn" onClick={() => onStep(1)} aria-label="Следующее фото" whileTap={{ scale: 0.88, x: 3 }}>
            →
          </motion.button>
        </div>
        <motion.button
          ref={closeRef}
          type="button"
          className="icon-btn dialog-close"
          onClick={onClose}
          aria-label="Закрыть"
          whileHover={{ rotate: 90 }}
          whileTap={{ scale: 0.9 }}
        >
          ✕
        </motion.button>
      </motion.figure>
    </div>
  )
}
