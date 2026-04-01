import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const variants = (delay = 0) => ({
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay } },
})

export default function ScrollReveal({ children, delay = 0, className, style }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variants(delay)}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}
