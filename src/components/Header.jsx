import { useRef, useState } from 'react'
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useScroll,
  useSpring,
  useMotionValueEvent,
} from 'motion/react'
import { useActiveSection, useMediaQuery } from '../hooks.js'
import { Logo } from './Logo.jsx'
import { shop } from '../data.js'

const nav = [
  { id: 'halls', label: 'Ассортимент' },
  { id: 'shop', label: 'Витрина' },
  { id: 'builder', label: 'Конструктор' },
  { id: 'steps', label: 'Первый аквариум' },
  { id: 'visit', label: 'Контакты' },
]
const navIds = nav.map((n) => n.id)

const sheet = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { when: 'beforeChildren', staggerChildren: 0.06 } },
  exit: { opacity: 0, transition: { when: 'afterChildren', staggerChildren: 0.03, staggerDirection: -1 } },
}
const sheetItem = {
  hidden: { opacity: 0, y: 24 },
  shown: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.3, visualDuration: 0.4 } },
  exit: { opacity: 0, y: 12 },
}

export default function Header({ count, onCartClick, cartButtonRef, theme, setTheme, revealed = true }) {
  const { scrollY, scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })
  const [hidden, setHidden] = useState(false)
  const [solid, setSolid] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const wasRevealed = useRef(false)
  const active = useActiveSection(navIds)

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    // Hide only on genuine small scroll steps; big jumps (anchor links,
    // restored scroll after reload) keep the header where it is.
    if (y < prev || y < 320 || menuOpen) setHidden(false)
    else if (y - prev < 150) setHidden(true)
    setSolid(y > 40)
  })

  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const dark = theme === 'dark' || (theme == null && systemDark)

  return (
    <>
      <motion.header
        className={'site-header' + (solid ? ' is-solid' : '')}
        initial={revealed ? false : { y: '-110%' }}
        animate={{ y: hidden || !revealed ? '-110%' : '0%' }}
        onFocus={() => setHidden(false)}
        // First appearance is part of the hero intro (after the logo ripples in).
        transition={{ type: 'spring', bounce: 0, visualDuration: 0.5, delay: revealed && !wasRevealed.current ? 2.4 : 0 }}
        onAnimationComplete={() => {
          if (revealed) wasRevealed.current = true
        }}
      >
        <motion.div className="scroll-progress" style={{ scaleX: progress }} aria-hidden />
        <div className="header-inner">
          <a href="#top" className="brand" aria-label="Мир аквариумов — на главную">
            <Logo />
            <span className="brand-name">
              Мир<br />аквариумов
            </span>
          </a>

          <LayoutGroup id="nav">
            <nav className="main-nav" aria-label="Разделы">
              {nav.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={'nav-link' + (active === item.id ? ' is-active' : '')}
                  aria-current={active === item.id ? 'true' : undefined}
                >
                  {active === item.id && (
                    <motion.span
                      layoutId="nav-pill"
                      className="nav-pill"
                      transition={{ type: 'spring', bounce: 0.25, visualDuration: 0.4 }}
                    />
                  )}
                  <span className="nav-label">{item.label}</span>
                </a>
              ))}
            </nav>
          </LayoutGroup>

          <div className="header-actions">
            <button
              type="button"
              className={'theme-toggle' + (dark ? ' is-dark' : '')}
              onClick={() => setTheme(dark ? 'light' : 'dark')}
              aria-label={dark ? 'Включить дневную тему' : 'Включить ночную тему'}
              aria-pressed={dark}
            >
              <motion.span
                layout
                className="theme-knob"
                transition={{ type: 'spring', stiffness: 600, damping: 32 }}
              >
                {dark ? <MoonIcon /> : <SunIcon />}
              </motion.span>
            </button>

            <motion.button
              ref={cartButtonRef}
              type="button"
              className="cart-button"
              onClick={onCartClick}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              aria-label={`Корзина, товаров: ${count}`}
              data-testid="cart-button"
            >
              <BagIcon />
              <span className="cart-label">Корзина</span>
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={count}
                  className="cart-count"
                  initial={{ scale: 0.4, opacity: 0, y: -8 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.4, opacity: 0, y: 8 }}
                  transition={{ type: 'spring', bounce: 0.55, visualDuration: 0.35 }}
                  data-testid="cart-count"
                >
                  {count}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            <button
              type="button"
              className="menu-button"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="sr-only">{menuOpen ? 'Закрыть меню' : 'Открыть меню'}</span>
              <motion.span className="burger" animate={menuOpen ? 'open' : 'closed'} aria-hidden>
                <motion.i variants={{ closed: { rotate: 0, y: -4 }, open: { rotate: 45, y: 0 } }} />
                <motion.i variants={{ closed: { rotate: 0, y: 4 }, open: { rotate: -45, y: 0 } }} />
              </motion.span>
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="mobile-menu"
            className="mobile-menu"
            aria-label="Меню"
            variants={sheet}
            initial="hidden"
            animate="shown"
            exit="exit"
          >
            {nav.map((item, i) => (
              <motion.a
                key={item.id}
                href={`#${item.id}`}
                variants={sheetItem}
                onClick={() => setMenuOpen(false)}
              >
                <span className="mobile-num" aria-hidden>0{i + 1}</span>
                {item.label}
              </motion.a>
            ))}
            <motion.p variants={sheetItem} className="mobile-hours">
              {shop.addressFull} · <a href={shop.phoneHref}>{shop.phone}</a>
            </motion.p>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
      </g>
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor" />
    </svg>
  )
}
function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 8h14l-1.2 12H6.2L5 8z" strokeLinejoin="round" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </svg>
  )
}
