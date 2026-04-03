import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * ConfirmButton — button that on click opens an inline dropdown tooltip
 * asking for confirmation before executing the action.
 *
 * Props:
 *   onConfirm      fn       — called when user confirms
 *   label          string   — question shown in the tooltip
 *   confirmLabel   string   — confirm button text
 *   cancelLabel    string   — cancel button text
 *   children       node     — button content (icon, text, etc.)
 *   buttonStyle    object   — style overrides for the trigger button
 */
export default function ConfirmButton({
  onConfirm,
  label = '¿Confirmar acción?',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  children,
  buttonStyle,
  align = 'right',  // 'right' | 'left'
  ...props
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const dropdownPos = align === 'right' ? { right: 0 } : { left: 0 }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        style={{
          width: '34px',
          height: '34px',
          borderRadius: 'var(--radius-full)',
          border: '1.5px solid rgba(186,26,26,0.25)',
          background: open ? 'rgba(186,26,26,0.09)' : 'transparent',
          color: 'var(--error)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          transition: 'background 0.15s',
          flexShrink: 0,
          ...buttonStyle,
        }}
        {...props}
      >
        {children}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              zIndex: 300,
              background: 'var(--surface)',
              border: '1px solid var(--outline-var)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)',
              padding: '14px 16px',
              minWidth: '190px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              ...dropdownPos,
            }}
          >
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--on-surface)',
              margin: 0,
              lineHeight: 1.5,
            }}>
              {label}
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--outline-var)',
                  background: 'transparent',
                  color: 'var(--on-surface-var)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container-low)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => { setOpen(false); onConfirm() }}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--error)',
                  color: '#fff',
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
