import { useLayoutEffect, useRef } from 'react'

const words = ['Пресноводные рыбы', 'Морские кораллы', 'Креветки', 'Живые растения', 'Аквариумы и оборудование', 'Корм и декор', 'Продавцы — аквариумисты']

const COPIES = 4
const SPEED = 36 // px per second

/**
 * Marquee drifting slowly to the left on its own, whatever the page does. It is a
 * CSS animation (runs on the compositor) that moves the track by exactly one copy
 * of the row per cycle, so the loop is seamless; the cycle length is set from the
 * row's measured width to keep the speed the same on every screen.
 */
export default function Ticker() {
  const track = useRef(null)

  useLayoutEffect(() => {
    const el = track.current
    const measure = () => el.style.setProperty('--ticker-duration', `${(el.scrollWidth / COPIES / SPEED).toFixed(2)}s`)
    measure()
    const ro = new ResizeObserver(measure) // web fonts arriving change the row width
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const row = words.map((w) => (
    <span key={w} className="ticker-item">
      {w}
      <svg viewBox="0 0 30 14" width="26" aria-hidden>
        <path d="M2 7c4-5 12-6 18-1l7-4v10l-7-4c-6 5-14 4-18-1z" fill="currentColor" />
      </svg>
    </span>
  ))

  return (
    <div className="ticker">
      <p className="sr-only">{words.join(' · ')}</p>
      <div ref={track} className="ticker-track" aria-hidden data-testid="ticker-track">
        {Array.from({ length: COPIES }, (_, i) => (
          <span key={i} className="ticker-row">
            {row}
          </span>
        ))}
      </div>
    </div>
  )
}
