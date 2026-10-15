import { motion } from 'motion/react'

/** Fish mark: the tail wags on hover (keyframes inside a variant). */
export function Logo({ size = 30 }) {
  return (
    <motion.svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden
      initial="rest"
      whileHover="wag"
      animate="rest"
      className="logo-mark"
    >
      <circle cx="20" cy="20" r="19" fill="var(--accent)" />
      <path d="M8 20c4.5-6.5 12-7.5 17.5-2" fill="none" stroke="var(--paper)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M8 20c4.5 6.5 12 7.5 17.5 2" fill="none" stroke="var(--paper)" strokeWidth="2.4" strokeLinecap="round" />
      <motion.path
        d="M25.5 18 L32 13.5 L32 26.5 L25.5 22"
        fill="var(--paper)"
        style={{ originX: '25.5px', originY: '20px' }}
        variants={{
          rest: { rotate: 0 },
          wag: { rotate: [0, -14, 12, -8, 0], transition: { duration: 0.7 } },
        }}
      />
      <circle cx="13.5" cy="19" r="1.6" fill="var(--paper)" />
    </motion.svg>
  )
}
