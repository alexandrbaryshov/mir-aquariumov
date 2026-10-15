import { motion } from 'motion/react'
import { Logo } from './Logo.jsx'
import { shop } from '../data.js'

const lines = ['МИР', 'АКВАРИУМОВ'].map((w) => w.split(''))

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <Logo size={36} />
            <p>
              Магазин аквариумистики в Чебоксарах.
              <br />
              {shop.address} ·{' '}
              <a href={shop.phoneHref} className="footer-phone">
                {shop.phone}
              </a>
            </p>
          </div>
          <nav className="footer-nav" aria-label="Подвал">
            <a href="#halls">Ассортимент</a>
            <a href="#shop">Витрина</a>
            <a href="#builder">Конструктор</a>
            <a href="#visit">Контакты</a>
          </nav>
          <motion.button
            type="button"
            className="btn btn-ghost"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.95 }}
          >
            Всплыть наверх ↑
          </motion.button>
        </div>

        <motion.p
          className="footer-word"
          aria-hidden
          initial="hidden"
          whileInView="shown"
          viewport={{ once: true, amount: 0.5 }}
          variants={{ shown: { transition: { staggerChildren: 0.05 } } }}
        >
          {lines.map((chars, li) => (
            <span key={li} className="footer-word-line">
              {chars.map((ch, i) => (
                <motion.span
                  key={i}
                  variants={{ hidden: { y: '60%', opacity: 0 }, shown: { y: '0%', opacity: 1 } }}
                  whileHover={{ y: -18, color: 'var(--accent)', transition: { type: 'spring', bounce: 0.6 } }}
                >
                  {ch}
                </motion.span>
              ))}
            </span>
          ))}
        </motion.p>

        <p className="footer-small">
          © 2026 «{shop.name}», {shop.addressFull}. Фотографии иллюстративные, не из магазина. Цены
          ориентировочные — наличие и стоимость уточняйте по телефону.
        </p>
      </div>
    </footer>
  )
}
