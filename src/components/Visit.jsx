import { useId, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { faq, formatPrice, shop } from '../data.js'

// Set by the GitHub Pages build (see .github/workflows/deploy.yml), where there is no backend.
const DEMO_BOOKING = import.meta.env.VITE_DEMO_BOOKING === '1'

const topics = ['Записаться на выставку', 'Подбор аквариума', 'Забрать заказ']
// How a topic reads in the confirmation: «Завтра, посещение выставки».
const topicSummary = { 'Записаться на выставку': 'посещение выставки' }

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

function nextDays(n = 6) {
  const fmt = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return { iso: [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'), label: i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : cap(fmt.format(d)) }
  })
}

const phoneOk = (v) => v.replace(/\D/g, '').length >= 10

export default function Visit({ lines, onBooked }) {
  const days = useMemo(() => nextDays(), [])
  const [form, setForm] = useState({ name: '', phone: '', date: days[0].iso, topic: topics[0], guests: 2, comment: '', agree: false })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | success | error
  const [result, setResult] = useState(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const validate = () => {
    const e = {}
    if (form.name.trim().length < 2) e.name = 'Как к вам обращаться? Нужно хотя бы 2 буквы.'
    if (!phoneOk(form.phone)) e.phone = 'Нужен телефон из 10–11 цифр, чтобы подтвердить визит.'
    if (!form.agree) e.agree = 'Без согласия мы не сможем вам перезвонить.'
    return e
  }

  const submit = async (ev) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) {
      document.getElementById(`f-${Object.keys(e)[0]}`)?.focus()
      return
    }
    setStatus('sending')
    try {
      if (DEMO_BOOKING) {
        // Static hosting (GitHub Pages) has no /api/booking: pretend the request went through.
        await new Promise((r) => setTimeout(r, 600))
        setResult({ id: 'MA-' + Math.floor(1000 + Math.random() * 9000), cartCount: lines.length })
        setStatus('success')
        onBooked()
        return
      }
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, cart: lines.map((l) => ({ id: l.id, qty: l.qty })) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error(data.error || `Сервер ответил ${res.status}`)
      setResult({ id: data.id, cartCount: lines.length })
      setStatus('success')
      onBooked()
    } catch (err) {
      setResult({ error: err.message })
      setStatus('error')
    }
  }

  const day = days.find((d) => d.iso === form.date)

  return (
    <section id="visit" className="visit" aria-labelledby="visit-title">
      <div className="wrap visit-grid">
        <div className="visit-info">
          <p className="eyebrow">Контакты</p>
          <h2 id="visit-title" className="section-title">
            Приходите <em>посмотреть вживую</em>
          </h2>
          <dl className="visit-facts">
            <div>
              <dt className="mono">Адрес</dt>
              <dd>{shop.addressFull}</dd>
            </div>
            <div>
              <dt className="mono">Часы</dt>
              <dd className="is-tbd">{shop.hours}</dd>
            </div>
            <div>
              <dt className="mono">Телефон</dt>
              <dd>
                <a href={shop.phoneHref}>{shop.phone}</a>
              </dd>
            </div>
          </dl>

          <div className="visit-map">
            <div className="visit-map-frame">
              <iframe
                src={shop.mapWidget}
                title={`«${shop.name}» на Яндекс Картах — ${shop.addressFull}`}
                loading="lazy"
                allowFullScreen
                data-testid="yandex-map"
              />
            </div>
            <div className="visit-map-actions">
              <a className="btn btn-primary" href={shop.phoneHref}>
                Позвонить
              </a>
              <a className="btn btn-ghost" href={shop.routeUrl} target="_blank" rel="noopener">
                Построить маршрут →
              </a>
            </div>
          </div>

          <h3 className="faq-title">Частые вопросы</h3>
          <div className="faq">
            {faq.map((f) => (
              <FaqItem key={f.q} {...f} />
            ))}
          </div>
        </div>

        <div className="visit-card" id="booking">
          <AnimatePresence mode="wait" initial={false}>
            {status === 'success' ? (
              <motion.div
                key="ok"
                className="success"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                role="status"
                data-testid="booking-success"
              >
                <svg viewBox="0 0 64 64" width="72" aria-hidden>
                  <motion.circle cx="32" cy="32" r="29" fill="none" stroke="var(--accent)" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
                  <motion.path d="M20 33l8 8 16-17" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.4 }} />
                </svg>
                <h3>Ждём вас, {form.name.trim()}!</h3>
                <p>
                  {day?.label}, {topicSummary[form.topic] ?? form.topic.toLowerCase()}. Номер записи <strong className="mono">{result?.id}</strong>.
                  {result?.cartCount ? ' Товары из корзины отложим к вашему приходу.' : ''}
                </p>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setStatus('idle')
                    setForm((f) => ({ ...f, comment: '' }))
                  }}
                >
                  Новая запись
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                className="booking"
                onSubmit={submit}
                noValidate
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                aria-label="Запись на визит"
              >
                <h3>Запись на визит</h3>

                <fieldset className="field">
                  <legend className="mono">Когда</legend>
                  <div className="day-chips">
                    {days.map((d) => (
                      <label key={d.iso} className={'chip' + (form.date === d.iso ? ' is-on' : '')}>
                        <input type="radio" name="date" value={d.iso} checked={form.date === d.iso} onChange={set('date')} />
                        {form.date === d.iso && <motion.span layoutId="day-pill" className="chip-pill" />}
                        <span>{d.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <Field id="f-topic" label="Цель визита">
                  <select id="f-topic" value={form.topic} onChange={set('topic')}>
                    {topics.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>

                <div className="field-row">
                  <Field id="f-name" label="Имя" error={errors.name}>
                    <motion.input id="f-name" autoComplete="name" value={form.name} onChange={set('name')} aria-invalid={!!errors.name} whileFocus={{ scale: 1.01 }} />
                  </Field>
                  <Field id="f-phone" label="Телефон" error={errors.phone}>
                    <motion.input id="f-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 ___ ___-__-__" value={form.phone} onChange={set('phone')} aria-invalid={!!errors.phone} whileFocus={{ scale: 1.01 }} />
                  </Field>
                </div>

                <div className="field">
                  <span className="mono field-label" id="guests-label">
                    Гостей
                  </span>
                  <div className="stepper" role="group" aria-labelledby="guests-label">
                    <button type="button" aria-label="Меньше гостей" onClick={() => setForm((f) => ({ ...f, guests: Math.max(1, f.guests - 1) }))}>
                      −
                    </button>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.output key={form.guests} initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
                        {form.guests}
                      </motion.output>
                    </AnimatePresence>
                    <button type="button" aria-label="Больше гостей" onClick={() => setForm((f) => ({ ...f, guests: Math.min(30, f.guests + 1) }))}>
                      +
                    </button>
                  </div>
                </div>

                <Field id="f-comment" label="Комментарий (необязательно)">
                  <textarea id="f-comment" rows={2} value={form.comment} onChange={set('comment')} placeholder="Например: хотим посмотреть морской риф" />
                </Field>

                {lines.length > 0 && (
                  <p className="cart-attach">
                    К записи приложим корзину: {lines.length} поз. на {formatPrice(lines.reduce((s, l) => s + l.price * l.qty, 0))}
                  </p>
                )}

                <div className="field">
                  <label className="agree">
                    <input id="f-agree" type="checkbox" checked={form.agree} onChange={set('agree')} aria-invalid={!!errors.agree} />
                    <span>Согласен на обработку имени и телефона для подтверждения визита</span>
                  </label>
                  <FieldError msg={errors.agree} />
                </div>

                <AnimatePresence>
                  {status === 'error' && (
                    <motion.p
                      className="form-error"
                      role="alert"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      data-testid="booking-error"
                    >
                      Не получилось отправить: {result?.error}. Попробуйте ещё раз или позвоните нам.
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={status === 'sending'}
                  whileTap={{ scale: 0.97 }}
                  layout
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={status === 'sending' ? 's' : 'i'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="btn-inner">
                      {status === 'sending' ? (
                        <>
                          <motion.span className="spinner" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} aria-hidden />
                          Отправляем…
                        </>
                      ) : (
                        'Записаться'
                      )}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

function Field({ id, label, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id} className="mono field-label">
        {label}
      </label>
      {children}
      <FieldError msg={error} id={`${id}-err`} />
    </div>
  )
}

function FieldError({ msg, id }) {
  return (
    <AnimatePresence initial={false}>
      {msg && (
        <motion.p
          id={id}
          className="field-error"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto', x: [0, -6, 6, -3, 0] }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ x: { duration: 0.35 } }}
        >
          {msg}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className={'faq-item' + (open ? ' is-open' : '')}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <span>{q}</span>
        <motion.span className="faq-icon" animate={{ rotate: open ? 45 : 0 }} aria-hidden>
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            className="faq-answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, visualDuration: 0.3 }}
          >
            <p>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
