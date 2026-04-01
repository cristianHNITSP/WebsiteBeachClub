import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Tooltip — muestra contenido al hover, anclado al elemento trigger.
 * Posiciones: top (default), bottom, left, right
 *
 * Arquitectura de posicionamiento:
 *   - El trigger usa display:inline-flex para que getBoundingClientRect() devuelva coords reales.
 *   - El portal usa position:fixed + coords de viewport (sin scrollY) → no sigue al scroll.
 *   - La capa externa (motion.div) tiene el CSS transform de centrado y solo anima opacity,
 *     evitando conflictos entre el transform de centrado y los transforms de framer-motion.
 *   - La capa interna (motion.div) maneja el pequeño nudge direccional sin tocar el posicionamiento.
 */
export default function Tooltip({ content, position = 'top', delay = 200, children }) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords]   = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const timerRef   = useRef(null)

  const show = () => {
    timerRef.current = setTimeout(() => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      const gap  = 8

      // Viewport coords (no scroll offset) → position: fixed
      const positions = {
        top:    { top: rect.top    - gap,             left: rect.left + rect.width  / 2 },
        bottom: { top: rect.bottom + gap,             left: rect.left + rect.width  / 2 },
        left:   { top: rect.top    + rect.height / 2, left: rect.left - gap              },
        right:  { top: rect.top    + rect.height / 2, left: rect.right + gap             },
      }

      setCoords(positions[position] ?? positions.top)
      setVisible(true)
    }, delay)
  }

  const hide = () => {
    clearTimeout(timerRef.current)
    setVisible(false)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  // CSS transform solo para centrar el tooltip respecto al punto de anclaje
  const centerTransform = {
    top:    'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0%)',
    left:   'translate(-100%, -50%)',
    right:  'translate(0%, -50%)',
  }[position] ?? 'translate(-50%, -100%)'

  // Pequeño desplazamiento inicial para la animación de entrada
  const nudgeInitial = {
    top:    { y:  5 },
    bottom: { y: -5 },
    left:   { x:  5 },
    right:  { x: -5 },
  }[position] ?? { y: 5 }

  return (
    <>
      {/* display:inline-flex garantiza un bounding box real para getBoundingClientRect */}
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{ display: 'inline-flex' }}
      >
        {children}
      </span>

      {createPortal(
        <AnimatePresence>
          {visible && (
            /*
             * Capa externa: position:fixed + CSS transform de centrado.
             * Solo anima opacity → framer-motion NO genera su propio transform
             * aquí, por lo que el CSS transform de centrado no se sobreescribe.
             */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                transform: centerTransform,
                zIndex: 9990,
                pointerEvents: 'none',
              }}
            >
              {/*
               * Capa interna: solo maneja el nudge direccional (x/y).
               * Al estar dentro de la capa de centrado, sus transforms
               * son relativos y no afectan el posicionamiento.
               */}
              <motion.div
                initial={nudgeInitial}
                animate={{ x: 0, y: 0 }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
                style={{
                  background: 'rgba(23,28,33,0.92)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)',
                  padding: '6px 12px',
                  maxWidth: '240px',
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
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
