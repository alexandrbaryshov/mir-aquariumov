import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, LayoutGroup, animate, useInView, usePageInView, useReducedMotion } from 'motion/react'
import { formatPrice } from '../data.js'
import AnimatedNumber from './AnimatedNumber.jsx'
import { WATERS, TANKS, GROUPS, ITEMS, byId, tankById, fitsWater, capacity, DEFAULT_GROUND, goals } from '../builder/catalog.js'

// three.js + сцена грузятся отдельным чанком, только когда конструктор рядом с экраном.
const BuilderScene = lazy(() => import('../builder/Scene.jsx'))

let seq = 0
const uid = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`

// Where on the floor each kind of item likes to stand (v: −1 back glass … 1 front glass).
const ZONES = {
  vallis: [-1, -0.55],
  cabomba: [-1, -0.55],
  ludwigia: [-0.9, -0.35],
  gorgonian: [-1, -0.6],
  pillar: [-0.85, -0.35],
  sword: [-0.75, -0.15],
  slate: [-0.6, 0.2],
  crypt: [-0.3, 0.45],
  anubias: [-0.35, 0.45],
  hairgrass: [0.25, 0.85],
  shell: [0.2, 0.85],
  moss: [0.05, 0.8],
}
const DEFAULT_ZONE = [-0.65, 0.4]
// Spots taken by equipment (filter, heater, air stone or skimmer, CO₂ diffuser) in the same normalised units.
const RESERVED = [[0.93, -0.86], [-0.93, -0.9], [-0.4, -0.8], [-0.88, 0.72]]

function findSpot(id, placed, tank) {
  const [vMin, vMax] = ZONES[id] ?? DEFAULT_ZONE
  const [W, , D] = tank.size
  const floor = placed.filter((p) => !['fauna', 'tech'].includes(byId[p.id].group))
  let best = { u: 0, v: (vMin + vMax) / 2 }
  let bestScore = -Infinity
  for (let k = 0; k < 20; k++) {
    const u = (Math.random() * 2 - 1) * 0.88
    const v = vMin + Math.random() * (vMax - vMin)
    let score = 9
    for (const q of floor) score = Math.min(score, Math.hypot(((u - q.u) * W) / 2, ((v - q.v) * D) / 2))
    for (const [ru, rv] of RESERVED) score = Math.min(score, Math.hypot(((u - ru) * W) / 2, ((v - rv) * D) / 2) + 0.25)
    score += Math.random() * 0.2
    if (score > bestScore) {
      bestScore = score
      best = { u, v }
    }
  }
  return best
}

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export default function Builder({ onAdd, cartButtonRef }) {
  const reduce = useReducedMotion()
  const [water, setWater] = useState('fresh')
  const [tankId, setTankId] = useState('classic')
  const [ground, setGround] = useState('sand')
  const [placed, setPlaced] = useState([])
  const [tab, setTab] = useState('decor')
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [toast, setToast] = useState(null)
  const [announce, setAnnounce] = useState('')
  const [inCart, setInCart] = useState(false)

  const tank = tankById[tankId]
  const count = (id) => placed.filter((p) => p.id === id).length
  const load = placed.reduce((s, p) => s + (byId[p.id].load ?? 0), 0)
  const cap = capacity(tank, water)
  const price = tank.price + (ground ? byId[ground].price : 0) + placed.reduce((s, p) => s + byId[p.id].price, 0)
  const checklist = goals({ ground, placed })
  const doneCount = checklist.filter((g) => g.done).length
  const ready = doneCount === checklist.length

  const toastTimer = useRef(0)
  const say = useCallback((text) => {
    clearTimeout(toastTimer.current)
    setToast({ text, id: performance.now() })
    setAnnounce(text)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  // ── 3D stage: lazy mount, pause when off screen, turntable via drag.
  const stageRef = useRef(null)
  const chipRef = useRef(null)
  const near = useInView(stageRef, { once: true, margin: '700px 0px' })
  const visible = useInView(stageRef, { margin: '80px 0px' })
  const pageVisible = usePageInView()
  const [webgl] = useState(hasWebGL)
  const yawRef = useRef(-0.42)
  const pitchRef = useRef(0.2)
  const idleRef = useRef(performance.now())
  const drag = useRef(null)

  const onStageDown = (e) => {
    if (e.button !== 0 || e.target.closest('button')) return
    drag.current = { x: e.clientX, y: e.clientY, yaw: yawRef.current, pitch: pitchRef.current, mouse: e.pointerType === 'mouse' }
    idleRef.current = performance.now()
  }
  useEffect(() => {
    const move = (e) => {
      const d = drag.current
      if (!d) return
      yawRef.current = d.yaw + (e.clientX - d.x) * 0.008
      if (d.mouse) pitchRef.current = Math.min(0.62, Math.max(0.04, d.pitch + (e.clientY - d.y) * 0.004))
      idleRef.current = performance.now()
    }
    const up = () => (drag.current = null)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])
  const rotate = (d) => {
    yawRef.current += d
    idleRef.current = performance.now()
  }

  // ── Editing the set.
  const add = (id) => {
    const item = byId[id]
    if (!fitsWater(item, water)) return
    if (count(id) >= item.max) return say(item.max === 1 ? `${item.label} уже в аквариуме` : `${item.label}: больше ${item.max} не поместится`)
    if (item.minLiters && tank.liters < item.minLiters) return say(`${item.label} — для аквариума от ${item.minLiters} л`)
    if (item.load && load + item.load > cap) return say('Аквариум переполнен — возьмите объём побольше')
    const spot = ['fauna', 'tech'].includes(item.group) ? { u: 0, v: 0 } : findSpot(id, placed, tank)
    setPlaced((list) => [...list, { uid: uid(), id, ...spot, r: Math.random() * Math.PI * 2, seed: (Math.random() * 1e9) | 0 }])
    setAnnounce(`Добавлено: ${item.label}`)
    setInCart(false)
  }
  const removeUid = (u) => {
    const p = placed.find((x) => x.uid === u)
    if (!p) return
    setPlaced((list) => list.filter((x) => x.uid !== u))
    if (selected === u) setSelected(null)
    setAnnounce(`Убрано: ${byId[p.id].label}`)
    setInCart(false)
  }
  const remove = (id) => {
    const last = [...placed].reverse().find((p) => p.id === id)
    if (last) removeUid(last.uid)
  }

  const summarize = (list) => {
    const n = {}
    list.forEach((p) => (n[byId[p.id].label] = (n[byId[p.id].label] ?? 0) + 1))
    return Object.entries(n)
      .map(([k, v]) => (v > 1 ? `${k} ×${v}` : k))
      .join(', ')
  }

  const switchWater = (next) => {
    if (next === water) return
    const gone = placed.filter((p) => !fitsWater(byId[p.id], next))
    setPlaced((list) => list.filter((p) => fitsWater(byId[p.id], next)))
    if (ground && !fitsWater(byId[ground], next)) setGround(DEFAULT_GROUND[next])
    setWater(next)
    setSelected(null)
    setInCart(false)
    if (gone.length) say(`Убрали: ${summarize(gone)} — ${next === 'marine' ? 'в морской' : 'в пресной'} воде им не жить`)
    else say(next === 'marine' ? 'Морская вода: теперь доступны кораллы и морские рыбы' : 'Пресная вода: растения и пресноводные рыбы')
  }

  const switchTank = (next) => {
    if (next === tankId) return
    const t = tankById[next]
    const c = capacity(t, water)
    let total = 0
    const keep = []
    const gone = []
    for (const p of placed) {
      const it = byId[p.id]
      if ((it.minLiters && t.liters < it.minLiters) || (it.load && total + it.load > c)) gone.push(p)
      else {
        total += it.load ?? 0
        keep.push(p)
      }
    }
    setPlaced(keep)
    setTankId(next)
    setInCart(false)
    if (gone.length) say(`В «${t.label}» не поместились: ${summarize(gone)}`)
  }

  const clear = () => {
    setPlaced([])
    setGround(DEFAULT_GROUND[water])
    setSelected(null)
    setInCart(false)
    say('Аквариум пуст — собирайте заново')
  }

  const addSet = async (e) => {
    const btn = e.currentTarget
    const groupsCount = (g) => placed.filter((p) => byId[p.id].group === g).length
    const fish = placed.reduce((s, p) => s + (byId[p.id].group === 'fauna' ? byId[p.id].count : 0), 0)
    const specParts = [
      ground ? byId[ground].label.toLowerCase() : 'без грунта',
      groupsCount('decor') && `декор ${groupsCount('decor')}`,
      groupsCount('flora') && `${water === 'marine' ? 'кораллы' : 'растения'} ${groupsCount('flora')}`,
      groupsCount('tech') && summarize(placed.filter((p) => byId[p.id].group === 'tech')).toLowerCase(),
      fish && `жители: ${fish}`,
    ].filter(Boolean)
    const key = [...placed.map((p) => p.id)].sort().join('.')
    onAdd(`set-${water}-${tankId}-${ground ?? 'none'}-${key}`, {
      title: `Набор «${tank.label}», ${tank.liters} л, ${water === 'marine' ? 'морской' : 'пресный'}`,
      spec: specParts.join(' · '),
      price,
      img: null,
    })
    setInCart(true)
    say('Набор в корзине — обсудим его в магазине')
    const target = cartButtonRef.current
    if (!target) return
    const a = btn.getBoundingClientRect()
    const b = target.getBoundingClientRect()
    const dot = document.createElement('span')
    dot.className = 'fly-dot'
    dot.style.left = `${a.left + a.width / 2 - 9}px`
    dot.style.top = `${a.top + a.height / 2 - 9}px`
    document.body.appendChild(dot)
    const dx = b.left + b.width / 2 - (a.left + a.width / 2)
    const dy = b.top + b.height / 2 - (a.top + a.height / 2)
    await animate(dot, { x: [0, dx * 0.4, dx], y: [0, dy * 0.6 - 140, dy], scale: [1, 1.3, 0.35] }, { duration: 0.8, ease: 'easeInOut' })
    dot.remove()
  }

  // Selected item disappeared (removed from the panel, water switch…) → drop the chip.
  useEffect(() => {
    if (selected && !placed.some((p) => p.uid === selected)) setSelected(null)
  }, [placed, selected])

  const selectedItem = selected ? byId[placed.find((p) => p.uid === selected)?.id] : null
  const groupLabel = (g) => (water === 'marine' && g.marineLabel ? g.marineLabel : g.label)
  const groupCount = (g) => (g.id === 'tank' ? 0 : g.id === 'ground' ? (ground ? 1 : 0) : placed.filter((p) => byId[p.id].group === g.id).length)
  const fill = Math.min(1, load / cap)

  return (
    <section id="builder" className="builder" aria-labelledby="builder-title">
      <div className="wrap">
        <div className="builder-head">
          <div>
            <p className="eyebrow">Конструктор</p>
            <h2 id="builder-title" className="section-title">
              Соберите аквариум <em>как конструктор</em>
            </h2>
          </div>
          <p className="muted builder-lead">
            Выберите банку и добавляйте грунт, декор, растения, технику и жителей — всё сразу появляется
            в 3D. Крутите аквариум мышью или пальцем, нажмите на элемент, чтобы убрать его. Готовый набор —
            одной кнопкой в корзину.
          </p>
        </div>

        <div className="b-game">
          <div
            ref={stageRef}
            className={'b-stage' + (hovered ? ' is-hovering' : '')}
            onPointerDown={onStageDown}
            tabIndex={0}
            aria-label="3D-превью аквариума. Стрелки влево и вправо поворачивают его, Delete убирает выбранный элемент."
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') rotate(-0.35)
              else if (e.key === 'ArrowRight') rotate(0.35)
              else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) removeUid(selected)
              else if (e.key === 'Escape') setSelected(null)
              else return
              e.preventDefault()
            }}
          >
            <div className="b-canvas" data-testid="builder-canvas">
              {near && webgl ? (
                <SceneBoundary fallback={<StageNote text="3D не запустился на этом устройстве, но набор можно собрать по списку." />}>
                  <Suspense fallback={<StageNote text="Наливаем воду…" loading />}>
                    <BuilderScene
                      water={water}
                      tankId={tankId}
                      ground={ground}
                      placed={placed}
                      yawRef={yawRef}
                      pitchRef={pitchRef}
                      idleRef={idleRef}
                      selected={selected}
                      hovered={hovered}
                      onSelect={setSelected}
                      onHover={setHovered}
                      chipRef={chipRef}
                      active={visible && pageVisible}
                      reduce={reduce}
                    />
                  </Suspense>
                </SceneBoundary>
              ) : (
                <StageNote text={webgl ? 'Наливаем воду…' : '3D недоступен на этом устройстве, но набор можно собрать по списку.'} loading={webgl} />
              )}
            </div>

            <div className="b-hud">
              <span className="b-tag mono">
                {tank.label} · {tank.liters} л · {water === 'marine' ? 'морская' : 'пресная'}
              </span>
              <div className="b-rotate">
                <button type="button" onClick={() => rotate(-0.6)} aria-label="Повернуть аквариум влево">
                  ↺
                </button>
                <button type="button" onClick={() => rotate(0.6)} aria-label="Повернуть аквариум вправо">
                  ↻
                </button>
              </div>
            </div>

            <AnimatePresence>
              {placed.length === 0 && (
                <motion.p className="b-empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  Добавляйте элементы из списка — они сразу появятся в аквариуме
                </motion.p>
              )}
            </AnimatePresence>

            <div className="b-chip" ref={chipRef} data-show="false" aria-hidden={!selectedItem}>
              {selectedItem && (
                <div className="b-chip-inner">
                  <span>{selectedItem.label}</span>
                  <button type="button" onClick={() => removeUid(selected)}>
                    Убрать
                  </button>
                </div>
              )}
            </div>

            <AnimatePresence>
              {toast && (
                <motion.p
                  key={toast.id}
                  className="b-toast"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {toast.text}
                </motion.p>
              )}
            </AnimatePresence>

            <div className={'b-goals' + (ready ? ' is-ready' : '')}>
              <span className="b-goals-title mono">
                {ready ? 'Готов к запуску' : `Готовность ${doneCount}/${checklist.length}`}
              </span>
              <ul>
                {checklist.map((g) => (
                  <li key={g.id} className={g.done ? 'is-done' : ''}>
                    <svg viewBox="0 0 16 16" width="12" aria-hidden>
                      <motion.path
                        d="M3 8.5l3 3 7-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={false}
                        animate={{ pathLength: g.done ? 1 : 0 }}
                      />
                    </svg>
                    {g.label}
                  </li>
                ))}
              </ul>
            </div>
            <p className="sr-only" aria-live="polite">
              {announce}
            </p>
          </div>

          <div className="b-panel">
            <LayoutGroup id="b-tabs">
              <div className="b-tabs" role="tablist" aria-label="Разделы конструктора">
                {GROUPS.map((g) => {
                  const n = groupCount(g)
                  return (
                    <button
                      key={g.id}
                      type="button"
                      role="tab"
                      id={`b-tab-${g.id}`}
                      aria-selected={tab === g.id}
                      aria-controls="b-tabpanel"
                      className={'b-tab' + (tab === g.id ? ' is-active' : '')}
                      onClick={() => setTab(g.id)}
                    >
                      {tab === g.id && <motion.span layoutId="b-tab-pill" className="b-tab-pill" transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.3 }} />}
                      <span className="b-tab-label">{groupLabel(g)}</span>
                      {n > 0 && <span className="b-tab-count">{n}</span>}
                    </button>
                  )
                })}
              </div>
            </LayoutGroup>

            <div className="b-tabpanel" role="tabpanel" id="b-tabpanel" aria-labelledby={`b-tab-${tab}`}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab + water}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                >
                  {tab === 'tank' ? (
                    <TankTab water={water} tankId={tankId} onWater={switchWater} onTank={switchTank} cap={cap} />
                  ) : tab === 'ground' ? (
                    <GroundTab water={water} ground={ground} onGround={(g) => (setGround(g), setInCart(false))} />
                  ) : (
                    <ul className="b-items">
                      {ITEMS.filter((i) => i.group === tab && fitsWater(i, water)).map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          n={count(item.id)}
                          blocked={
                            (item.minLiters && tank.liters < item.minLiters && `для аквариума от ${item.minLiters} л`) ||
                            (item.load && count(item.id) < item.max && load + item.load > cap && 'не хватит места')
                          }
                          onAdd={() => add(item.id)}
                          onRemove={() => remove(item.id)}
                        />
                      ))}
                    </ul>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className={'b-load' + (fill >= 1 ? ' is-full' : fill > 0.75 ? ' is-high' : '')} aria-label={`Заселённость ${Math.round(fill * 100)}%`}>
              <span className="mono">Заселённость</span>
              <span className="b-load-bar" aria-hidden>
                <motion.span initial={false} animate={{ scaleX: fill }} transition={{ type: 'spring', bounce: 0.2, visualDuration: 0.4 }} />
              </span>
              <span className="b-load-num mono">{Math.round(fill * 100)}%</span>
            </div>

            <footer className="b-total">
              <div>
                <span className="mono">Смета набора · ориентировочно</span>
                <AnimatedNumber value={price} format={formatPrice} className="builder-price" testId="builder-price" />
              </div>
              <div className="b-actions">
                <button type="button" className="btn btn-ghost b-clear" onClick={clear}>
                  Очистить
                </button>
                <motion.button type="button" className="btn btn-primary" onClick={addSet} whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
                  {inCart ? 'В корзине ✓ Ещё раз' : 'Весь набор в корзину'}
                </motion.button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </section>
  )
}

function StageNote({ text, loading }) {
  return (
    <div className={'b-note-stage' + (loading ? ' is-loading' : '')}>
      <p>{text}</p>
    </div>
  )
}

function TankTab({ water, tankId, onWater, onTank, cap }) {
  return (
    <div className="b-tanktab">
      <p className="b-sub mono">Вода</p>
      <LayoutGroup id="b-water">
        <div className="segmented segmented-full">
          {WATERS.map((w) => (
            <button key={w.id} type="button" className={'seg' + (water === w.id ? ' is-active' : '')} aria-pressed={water === w.id} onClick={() => onWater(w.id)}>
              {water === w.id && <motion.span layoutId="b-water-pill" className="seg-pill" />}
              <span className="seg-label">{w.label}</span>
            </button>
          ))}
        </div>
      </LayoutGroup>
      <p className="b-sub mono">Объём</p>
      <div className="b-tanks" role="radiogroup" aria-label="Размер аквариума">
        {TANKS.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={tankId === t.id} className={'b-tank' + (tankId === t.id ? ' is-on' : '')} onClick={() => onTank(t.id)}>
            <TankGlyph size={t.size} />
            <span className="b-tank-name">{t.label}</span>
            <span className="b-tank-spec">
              {t.liters} л · {t.note}
            </span>
            <span className="b-tank-price mono">{formatPrice(t.price)}</span>
          </button>
        ))}
      </div>
      <p className="b-hint">Шкала заселённости внизу подскажет, сколько жителей выдержит банка: сейчас до {cap} «мест».</p>
    </div>
  )
}

function TankGlyph({ size: [w, h] }) {
  const W = 8 + w * 3.2
  const H = 4 + h * 3.3
  return (
    <svg viewBox="0 0 48 30" width="48" height="30" aria-hidden className="b-tank-glyph">
      <rect x={(48 - W) / 2} y={30 - H} width={W} height={H} rx="2" fill="color-mix(in srgb, var(--aqua) 22%, transparent)" stroke="currentColor" strokeWidth="1.5" />
      <path d={`M${(48 - W) / 2 + 1} ${30 - H * 0.82} H${(48 + W) / 2 - 1}`} stroke="var(--aqua)" strokeWidth="1.2" />
    </svg>
  )
}

function GroundTab({ water, ground, onGround }) {
  const options = ITEMS.filter((i) => i.group === 'ground' && fitsWater(i, water))
  return (
    <ul className="b-items" role="radiogroup" aria-label="Грунт">
      {options.map((g) => (
        <li key={g.id} className={'b-item' + (ground === g.id ? ' is-on' : '')}>
          <span className="b-swatch b-swatch-ground" style={{ '--c': g.color }} aria-hidden />
          <span className="b-item-text">
            <span className="b-item-name">{g.label}</span>
            {g.spec && <span className="b-item-spec">{g.spec}</span>}
          </span>
          <span className="b-item-price mono">{formatPrice(g.price)}</span>
          <button type="button" role="radio" aria-checked={ground === g.id} className={'b-toggle' + (ground === g.id ? ' is-on' : '')} onClick={() => onGround(g.id)} aria-label={g.label}>
            {ground === g.id ? 'Выбран ✓' : 'Выбрать'}
          </button>
        </li>
      ))}
      <li className={'b-item' + (!ground ? ' is-on' : '')}>
        <span className="b-swatch b-swatch-none" aria-hidden />
        <span className="b-item-text">
          <span className="b-item-name">Без грунта</span>
          <span className="b-item-spec">голое дно</span>
        </span>
        <span className="b-item-price mono">0 ₽</span>
        <button type="button" role="radio" aria-checked={!ground} className={'b-toggle' + (!ground ? ' is-on' : '')} onClick={() => onGround(null)} aria-label="Без грунта">
          {!ground ? 'Выбрано ✓' : 'Выбрать'}
        </button>
      </li>
    </ul>
  )
}

function ItemRow({ item, n, blocked, onAdd, onRemove }) {
  const single = item.max === 1
  return (
    <motion.li layout="position" className={'b-item' + (n ? ' is-on' : '')}>
      <span className="b-swatch" style={{ '--c': item.color }} aria-hidden>
        <GroupIcon group={item.group} />
      </span>
      <span className="b-item-text">
        <span className="b-item-name">{item.label}</span>
        <span className="b-item-spec">{blocked && !n ? blocked : item.spec}</span>
      </span>
      <span className="b-item-price mono">{formatPrice(item.price)}</span>
      {single ? (
        <button
          type="button"
          className={'b-toggle' + (n ? ' is-on' : '')}
          aria-pressed={!!n}
          aria-label={`${n ? 'Убрать' : 'Добавить'}: ${item.label}`}
          onClick={n ? onRemove : onAdd}
          disabled={!n && !!blocked}
        >
          {n ? 'Есть ✓' : '+ Добавить'}
        </button>
      ) : (
        <div className="b-stepper">
          <button type="button" aria-label={`Убрать: ${item.label}`} disabled={!n} onClick={onRemove}>
            −
          </button>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.output key={n} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} aria-label={`В наборе: ${n}`}>
              {n}
            </motion.output>
          </AnimatePresence>
          <button type="button" aria-label={`Добавить: ${item.label}`} disabled={n >= item.max || !!blocked} onClick={onAdd}>
            +
          </button>
        </div>
      )}
    </motion.li>
  )
}

function GroupIcon({ group }) {
  const p = {
    decor: 'M3 13c1-4 3-6 5-6s4 2 5 6z',
    flora: 'M8 14V6M8 9c-3 0-4-2-4-5 3 0 4 2 4 5zm0 2c3 0 4-2 4-5-3 0-4 2-4 5z',
    tech: 'M5 2h6v12H5zM7 5h2M7 8h2',
    fauna: 'M2 8c2-3 6-4 9-1l3-2v6l-3-2c-3 3-7 2-9-1z',
  }[group]
  return (
    <svg viewBox="0 0 16 16" width="16" height="16">
      <path d={p} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
