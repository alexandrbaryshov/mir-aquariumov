import { useRef } from 'react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react'
import { formatPrice } from '../data.js'
import { useDialog } from '../hooks.js'
import AnimatedNumber from './AnimatedNumber.jsx'

export default function Cart({ open, onClose, lines, setCart }) {
  const closeRef = useRef(null)
  useDialog(open, onClose, closeRef)
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0)

  const reorder = (ids) => setCart((items) => ids.map((id) => items.find((i) => i.id === id)).filter(Boolean))
  const changeQty = (id, d) =>
    setCart((items) =>
      items.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(99, i.qty + d)) } : i)),
    )
  const remove = (id) => setCart((items) => items.filter((i) => i.id !== id))

  return (
    <AnimatePresence>
      {open && (
        <div className="drawer-layer" key="cart">
          <motion.div
            className="dialog-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', bounce: 0, visualDuration: 0.4 }}
            data-testid="cart-drawer"
          >
            <header className="drawer-head">
              <h2 id="cart-title">Корзина</h2>
              <motion.button
                ref={closeRef}
                type="button"
                className="icon-btn"
                onClick={onClose}
                aria-label="Закрыть корзину"
                whileHover={{ rotate: 90 }}
              >
                ✕
              </motion.button>
            </header>

            {lines.length === 0 ? (
              <EmptyCart onClose={onClose} />
            ) : (
              <>
                <p className="drawer-hint mono">Перетащите за ⋮⋮, чтобы расставить по важности</p>
                <motion.div className="drawer-scroll" layoutScroll>
                  <Reorder.Group axis="y" values={lines.map((l) => l.id)} onReorder={reorder} className="cart-list">
                    <AnimatePresence initial={false}>
                      {lines.map((l) => (
                        <CartLine
                          key={l.id}
                          line={l}
                          onMinus={() => changeQty(l.id, -1)}
                          onPlus={() => changeQty(l.id, 1)}
                          onRemove={() => remove(l.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </Reorder.Group>
                </motion.div>
                <footer className="drawer-foot">
                  <div className="total">
                    <span>Итого</span>
                    <AnimatedNumber value={total} format={formatPrice} className="total-sum" testId="cart-total" />
                  </div>
                  <motion.a
                    href="#visit"
                    className="btn btn-primary btn-block"
                    onClick={onClose}
                    whileTap={{ scale: 0.97 }}
                  >
                    Оформить заявку
                  </motion.a>
                  <p className="drawer-small">Оплата в магазине. Наличие и цены подтвердим по телефону.</p>
                </footer>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

function CartLine({ line, onMinus, onPlus, onRemove }) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      value={line.id}
      dragListener={false}
      dragControls={controls}
      className="cart-line"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0, x: 60, transition: { duration: 0.25 } }}
      whileDrag={{ scale: 1.03, boxShadow: '0 18px 40px -12px rgba(6,40,46,.35)' }}
      data-testid="cart-line"
    >
      <div className="cart-line-inner">
        <button
          type="button"
          className="drag-handle"
          onPointerDown={(e) => controls.start(e)}
          aria-label={`Переместить «${line.title}»`}
          style={{ touchAction: 'none' }}
        >
          ⋮⋮
        </button>
        {line.img ? <img src={line.img} alt="" /> : <span className="cart-thumb-custom" aria-hidden>✦</span>}
        <div className="cart-line-text">
          <p className="cart-line-title">{line.title}</p>
          <p className="cart-line-spec">{line.spec}</p>
          <div className="qty">
            <button type="button" onClick={onMinus} aria-label="Меньше" disabled={line.qty <= 1}>
              −
            </button>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={line.qty}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                aria-label={`Количество: ${line.qty}`}
              >
                {line.qty}
              </motion.span>
            </AnimatePresence>
            <button type="button" onClick={onPlus} aria-label="Больше">
              +
            </button>
          </div>
        </div>
        <div className="cart-line-end">
          <span className="price">{formatPrice(line.price * line.qty)}</span>
          <button type="button" className="link-btn" onClick={onRemove} aria-label={`Удалить «${line.title}»`}>
            Удалить
          </button>
        </div>
      </div>
    </Reorder.Item>
  )
}

function EmptyCart({ onClose }) {
  return (
    <div className="empty">
      <motion.svg
        viewBox="0 0 120 80"
        width="140"
        aria-hidden
        animate={{ x: [-10, 10, -10], y: [0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M14 40c16-20 46-24 68-6l22-14v40l-22-14c-22 18-52 14-68-6z" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="34" cy="37" r="3" fill="currentColor" />
      </motion.svg>
      <p>Пока пусто — рыбка скучает.</p>
      <a href="#shop" className="btn btn-ghost" onClick={onClose}>
        Перейти к витрине
      </a>
    </div>
  )
}
