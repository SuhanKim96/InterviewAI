import { useEffect, useState } from 'react'
import { motion, useReducedMotion, useSpring, useMotionValueEvent } from 'framer-motion'

// Shared transitions
export const spring = { type: 'spring', stiffness: 380, damping: 28 }
export const softSpring = { type: 'spring', stiffness: 220, damping: 26 }
export const easeOut = { duration: 0.35, ease: [0.16, 1, 0.3, 1] }

// Shared variants
export const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: easeOut },
}

export const staggerContainer = (stagger = 0.07, delayChildren = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren } },
})

export const pageVariants = {
  initial: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16, ease: 'easeIn' } },
}

// Step view wrapper — pairs with <AnimatePresence mode="wait"> in App.jsx
export function PageTransition({ className = '', children }) {
  return (
    <motion.main className={className} variants={pageVariants} initial="initial" animate="enter" exit="exit">
      {children}
    </motion.main>
  )
}

// Scroll-triggered reveal (fires once when scrolled into view)
export function Reveal({ delay = 0, className = '', children }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={{
        hidden: fadeInUp.hidden,
        visible: { ...fadeInUp.visible, transition: { ...easeOut, delay } },
      }}
    >
      {children}
    </motion.div>
  )
}

// Staggered list: wrap items in <StaggerItem> inside a <StaggerList>
export function StaggerList({ className = '', stagger = 0.07, delayChildren = 0, inView = false, children }) {
  const viewProps = inView
    ? { whileInView: 'visible', viewport: { once: true, margin: '-60px' } }
    : { animate: 'visible' }
  return (
    <motion.div className={className} initial="hidden" variants={staggerContainer(stagger, delayChildren)} {...viewProps}>
      {children}
    </motion.div>
  )
}

export function StaggerItem({ className = '', children, ...props }) {
  return (
    <motion.div className={className} variants={fadeInUp} {...props}>
      {children}
    </motion.div>
  )
}

// Count-up number. MotionConfig doesn't cover non-transform animations,
// so this checks reduced-motion itself and renders the value directly.
export function AnimatedNumber({ value, decimals = 1, className = '' }) {
  const reduced = useReducedMotion()
  const target = Number(value)
  const springValue = useSpring(0, { stiffness: 80, damping: 20 })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (!reduced) springValue.set(target)
  }, [target, reduced, springValue])

  useMotionValueEvent(springValue, 'change', (v) => setDisplay(v.toFixed(decimals)))

  if (reduced || Number.isNaN(target)) {
    return <span className={className}>{value}</span>
  }
  return <span className={className}>{display}</span>
}
