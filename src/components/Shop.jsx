import { useCallback, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, LayoutGroup, useAnimate } from 'motion/react'
import { categories, products, formatPrice, shop } from '../data.js'
import { useDialog } from '../hooks.js'

const sorts = [
  { id: 'popular', label: 'Популярное' },
  { id: 'cheap', label: 'Дешевле' },
  { id: 'expensive', label: 'Дороже' },
]

export default function Shop({ onAdd, cartButtonRef }) {
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('popular')
  const [openId, setOpenId] = useState(null)
  const [scope, animate] = useAnimate()

  const visible = useMemo(() => {
    const list = products.filter((p) => cat === 'all' || p.cat === cat)
    const by = {
      popular: (a, b) => b.popular - a.popular,
      cheap: (a, b) => a.price - b.price,
      expensive: (a, b) => b.price - a.price,
    }[sort]
    return [...list].sort(by)
  }, [cat, sort])

  const open = products.find((p) => p.id === openId)

  // A droplet flies from the pressed button to the cart in the header.
  const flyToCart = useCallback(
    async (fromEl) => {
      const target = cartButtonRef.current
      if (!fromEl || !target) return
      const a = fromEl.getBoundingClientRect()
      const b = target.getBoundingClientRect()
      const dot = document.createElement('span')
      dot.className = 'fly-dot'
      dot.style.left = `${a.left + a.width / 2 - 9}px`
      dot.style.top = `${a.top + a.height / 2 - 9}px`
      scope.current.appendChild(dot)
      const dx = b.left + b.width / 2 - (a.left + a.width / 2)
      const dy = b.top + b.height / 2 - (a.top + a.height / 2)
      await animate(
        dot,
        { x: [0, dx * 0.5, dx], y: [0, Math.min(dy, 0) - 120, dy], scale: [1, 1.25, 0.35], opacity: [1, 1, 0.6] },
        { duration: 0.75, ease: 'easeInOut' },
      )
      dot.remove()
      animate(target, { rotate: [0, -10, 8, -4, 0] }, { duration: 0.45 })
    },
    [animate, scope, cartButtonRef],
  )

  const add = (product, el) => {
    onAdd(product.id)
    flyToCart(el)
  }

  return (
    <section id="shop" className="shop wrap" ref={scope} aria-labelledby="shop-title">
      <div className="shop-head">
        <div>
          <p className="eyebrow">Витрина</p>
          <h2 id="shop-title" className="section-title">
            Всё для аквариума — <em>от рыб до фильтра</em>
          </h2>
        </div>
        <p className="shop-note">
          Цены ориентировочные. Наличие и точную стоимость уточняйте по телефону{' '}
          <a href={shop.phoneHref}>{shop.phone}</a>.
        </p>
      </div>

      <div className="shop-controls">
        <LayoutGroup id="shop-cats">
          <div className="segmented" role="tablist" aria-label="Категории">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={cat === c.id}
                className={'seg' + (cat === c.id ? ' is-active' : '')}
                onClick={() => setCat(c.id)}
              >
                {cat === c.id && (
                  <motion.span layoutId="cat-pill" className="seg-pill" transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.35 }} />
                )}
                <span className="seg-label">{c.label}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>

        <label className="sort">
          <span className="mono">Порядок</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {sorts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <motion.ul layout className="product-grid" data-testid="product-grid">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={() => setOpenId(p.id)} onAdd={add} />
          ))}
        </AnimatePresence>
      </motion.ul>
      <p className="sr-only" aria-live="polite">
        Показано товаров: {visible.length}
      </p>

      <AnimatePresence>
        {open && <ProductDialog key={open.id} product={open} onClose={() => setOpenId(null)} onAdd={add} />}
      </AnimatePresence>
    </section>
  )
}

const ProductCard = ({ product: p, onOpen, onAdd, ref }) => (
  <motion.li
    ref={ref}
    layout
    initial={{ opacity: 0, scale: 0.92 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
    transition={{ type: 'spring', bounce: 0.18, visualDuration: 0.45 }}
    className="product"
  >
    <motion.article layoutId={`card-${p.id}`} className="product-card" whileHover="hover" initial="rest" animate="rest">
      <button type="button" className="product-open" onClick={onOpen} aria-label={`${p.title} — подробнее`}>
        <motion.div layoutId={`media-${p.id}`} className="product-media">
          <motion.img
            src={p.img}
            alt=""
            loading="lazy"
            variants={{ rest: { scale: 1 }, hover: { scale: 1.07 } }}
            transition={{ type: 'spring', bounce: 0, visualDuration: 0.5 }}
          />
          <span className="lot mono">№ {p.lot}</span>
        </motion.div>
      </button>
      <div className="product-body">
        <motion.h3 layoutId={`title-${p.id}`} className="product-title">
          {p.title}
        </motion.h3>
        <p className="product-spec">{p.spec}</p>
        <div className="product-foot">
          <span className="price">{formatPrice(p.price)}</span>
          <AddButton onAdd={(el) => onAdd(p, el)} label={`Добавить «${p.title}» в корзину`} />
        </div>
      </div>
    </motion.article>
  </motion.li>
)

function AddButton({ onAdd, label, big = false }) {
  const [done, setDone] = useState(false)
  const timer = useRef()
  const click = (e) => {
    onAdd(e.currentTarget)
    setDone(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setDone(false), 1400)
  }
  return (
    <motion.button
      type="button"
      className={'add-btn' + (big ? ' add-btn-big' : '') + (done ? ' is-done' : '')}
      onClick={click}
      whileTap={{ scale: 0.92 }}
      aria-label={label}
      layout
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={done ? 'done' : 'idle'}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          {done ? 'Добавлено ✓' : big ? 'Добавить в корзину' : '+ В корзину'}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}

function ProductDialog({ product: p, onClose, onAdd }) {
  const closeRef = useRef(null)
  useDialog(true, onClose, closeRef)
  return (
    <div className="dialog-layer">
      <motion.div
        className="dialog-backdrop"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.article
        layoutId={`card-${p.id}`}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`dlg-${p.id}`}
        transition={{ type: 'spring', bounce: 0.15, visualDuration: 0.45 }}
      >
        <motion.div layoutId={`media-${p.id}`} className="dialog-media">
          <img src={p.img} alt={p.title} />
        </motion.div>
        <div className="dialog-body">
          <motion.p className="mono lot-line" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            Артикул {p.lot}
          </motion.p>
          <motion.h3 layoutId={`title-${p.id}`} id={`dlg-${p.id}`} className="dialog-title">
            {p.title}
          </motion.h3>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ delay: 0.15 }}
          >
            <p className="product-spec">{p.spec}</p>
            <p className="dialog-desc">{p.desc}</p>
            <div className="dialog-foot">
              <span className="price price-big">{formatPrice(p.price)}</span>
              <AddButton big onAdd={(el) => onAdd(p, el)} label={`Добавить «${p.title}» в корзину`} />
            </div>
          </motion.div>
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
      </motion.article>
    </div>
  )
}
