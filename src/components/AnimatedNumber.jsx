import { useEffect } from 'react'
import { motion, useSpring, useTransform } from 'motion/react'

/** Counts toward the new value on a spring; rendered straight from a motion value. */
export default function AnimatedNumber({ value, format = String, className, testId }) {
  const spring = useSpring(value, { stiffness: 90, damping: 20, restDelta: 0.5 })
  const text = useTransform(spring, (v) => format(v))
  useEffect(() => {
    spring.set(value)
  }, [spring, value])
  return (
    <span className={className} data-testid={testId} data-value={value}>
      <motion.span aria-hidden>{text}</motion.span>
      <span className="sr-only">{format(value)}</span>
    </span>
  )
}
