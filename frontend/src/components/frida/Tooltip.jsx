import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Tooltip — muestra contenido al hover, usa tokens del design system.
 * Posiciones: top (default), bottom, left, right
 */
export default function Tooltip({ content, position = 'top', delay = 200, children }) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const timerRef = useRef(null)

  const show = () => {
    timerRef.current = setTimeout(() => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      const gap = 8

      let top, left
      switch (position) {
        case 'bottom':
          top  = rect.bottom + gap + window.scrollY
          left = rect.left + rect.width / 2 + window.scrollX
          break
        case 'left':
          top  = rect.top + rect.height / 2 + window.scrollY
          left = rect.left - gap + window.scrollX
          break
        case 'right':
          top  = rect.top + rect.height / 2 + window.scrollY
          left = rect.right + gap + window.scrollX
          break
        default: // top
          top  = rect.top - gap + window.scrollY
          left = rect.left + rect.width / 2 + window.scrollX
      }
      setCoords({ top, left })
      setVisible(true)
    }, delay)
  }

  const hide = () => {
    clearTimeout(timerRef.current)
    setVisible(false)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  /* ── Transform origin per position ── */
  const transforms = {
    top:    { x: '-50%', y: '-100%' },
    bottom: { x: '-50%', y: '0%' },
    left:   { x: '-100%', y: '-50%' },
    right:  { x: '0%', y: '-50%' },
  }[position] ?? { x: '-50%', y: '-100%' }

  const initial = {
    top:    { opacity: 0, y: -4 },
    bottom: { opacity: 0, y: 4 },
    left:   { opacity: 0, x: -4 },
    right:  { opacity: 0, x: 4 },
  }[position] ?? { opacity: 0, y: -4 }

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{ display: 'contents' }}
      >
        {children}
      </span>

      {createPortal(
        <AnimatePresence>
          {visible && (
            <motion.div
              initial={initial}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: coords.top,
                left: coords.left,
                transform: `translate(${transforms.x}, ${transforms.y})`,
                zIndex: 9990,
                pointerEvents: 'none',

                /* glassmorphism usando tokens */
                background: 'rgba(23,28,33,0.88)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                padding: '6px 12px',
                maxWidth: '220px',

                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                fontWeight: 600,
                color: '#fff',
                whiteSpace: 'nowrap',
                lineHeight: 1.4,
              }}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
