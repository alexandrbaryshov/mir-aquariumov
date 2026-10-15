import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStoredState } from './hooks.js'
import { products } from './data.js'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Ticker from './components/Ticker.jsx'
import Halls from './components/Halls.jsx'
import Shop from './components/Shop.jsx'
import Builder from './components/Builder.jsx'
import Places from './components/Places.jsx'
import Visit from './components/Visit.jsx'
import Expo from './components/Expo.jsx'
import Footer from './components/Footer.jsx'
import Cart from './components/Cart.jsx'

const byId = Object.fromEntries(products.map((p) => [p.id, p]))

export default function App() {
  const [cart, setCart] = useStoredState('mir-aquariumov-cart', [])
  const [theme, setTheme] = useStoredState('mir-aquariumov-theme', null)
  const [cartOpen, setCartOpen] = useState(false)
  // The hero starts its dive-in once its frames are decoded; the header joins the intro.
  const [started, setStarted] = useState(false)
  const onStart = useCallback(() => setStarted(true), [])
  const cartButtonRef = useRef(null)

  useEffect(() => {
    const root = document.documentElement
    if (theme) root.dataset.theme = theme
    else delete root.dataset.theme
  }, [theme])

  const addToCart = useCallback(
    (id, custom) =>
      setCart((items) =>
        items.some((i) => i.id === id)
          ? items.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i))
          : [...items, custom ? { id, qty: 1, custom } : { id, qty: 1 }],
      ),
    [setCart],
  )

  // Drop entries whose product no longer exists (stale localStorage).
  const lines = useMemo(
    () =>
      cart
        .map((i) => {
          const p = i.custom ?? byId[i.id]
          return p ? { ...i, title: p.title, price: p.price, img: p.img, spec: p.spec } : null
        })
        .filter(Boolean),
    [cart],
  )
  const count = lines.reduce((s, l) => s + l.qty, 0)

  return (
    <div className="site">
      <a className="skip-link" href="#main">
        К содержанию
      </a>
      <Header
        count={count}
        onCartClick={() => setCartOpen(true)}
        cartButtonRef={cartButtonRef}
        theme={theme}
        setTheme={setTheme}
        revealed={started}
      />
      <main id="main">
        <Hero onStart={onStart} />
        <Ticker />
        <Halls />
        <Shop onAdd={addToCart} cartButtonRef={cartButtonRef} />
        <Builder onAdd={addToCart} cartButtonRef={cartButtonRef} />
        <Places />
        <Visit lines={lines} onBooked={() => setCart([])} />
        <Expo />
      </main>
      <Footer />
      <Cart open={cartOpen} onClose={() => setCartOpen(false)} lines={lines} setCart={setCart} />
    </div>
  )
}
