import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

/* ── Tokens semánticos con design system ── */
const VARIANTS = {
  success: {
    icon: 'check_circle',
    color: '#16a34a',
    bg: 'rgba(22,163,74,0.10)',
    border: 'rgba(22,163,74,0.22)',
    progress: '#16a34a',
  },
  error: {
    icon: 'cancel',
    color: 'var(--error)',
    bg: 'rgba(186,26,26,0.10)',
    border: 'rgba(186,26,26,0.22)',
    progress: 'var(--error)',
  },
  warning: {
    icon: 'warning',
    color: 'var(--gold)',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.22)',
    progress: 'var(--gold)',
  },
  info: {
    icon: 'info',
    color: 'var(--primary)',
    bg: 'rgba(0,105,113,0.10)',
    border: 'rgba(0,105,113,0.22)',
    progress: 'var(--primary)',
  },
}

/* ── Single Toast item ── */
function ToastItem({ toast, onRemove }) {
  const v = VARIANTS[toast.type] ?? VARIANTS.info
  const progressRef = useRef(null)
  const duration = toast.duration ?? 4000

  useEffect(() => {
    const el = progressRef.current
    if (!el) return
    el.style.transition = `width ${duration}ms linear`
    requestAnimationFrame(() => { el.style.width = '0%' })
    const timer = setTimeout(() => onRemove(toast.id), duration)
    return () => clearTimeout(timer)
  }, [])                                                  // eslint-disable-line

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: 'var(--radius-lg)',
        background: `var(--surface-lowest)`,
        border: `1px solid ${v.border}`,
        boxShadow: 'var(--shadow-md)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        minWidth: '280px',
        maxWidth: '360px',
        overflow: 'hidden',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: '3px', background: v.color, borderRadius: '3px 0 0 3px',
      }} />

      {/* Icon */}
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '20px', color: v.color, flexShrink: 0, marginTop: '1px' }}
      >
        {v.icon}
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div style={{
            fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px',
            color: 'var(--on-surface)', marginBottom: '2px',
          }}>
            {toast.title}
          </div>
        )}
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: '13px',
          color: toast.title ? 'var(--on-surface-var)' : 'var(--on-surface)',
          lineHeight: 1.5,
        }}>
          {toast.message}
        </div>
      </div>

      {/* Close */}
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--on-surface-var)', padding: '2px', borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', flexShrink: 0,
          opacity: 0.6, transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
      </button>

      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px',
        background: 'var(--surface-container-highest)',
      }}>
        <div
          ref={progressRef}
          style={{
            height: '100%', width: '100%',
            background: v.progress,
            borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
          }}
        />
      </div>
    </motion.div>
  )
}

/* ── Container rendered in portal ── */
function ToastContainer({ toasts, onRemove }) {
  return createPortal(
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: '10px',
      alignItems: 'flex-end',
    }}>
      <AnimatePresence initial={false}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  )
}

/* ── Context ── */
const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  /**
   * addToast(message, options?)
   * options: { type, title, duration }
   */
  const addToast = useCallback((message, options = {}) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type: 'info', duration: 4000, ...options }])
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  )
}

/**
 * useToast() → addToast(message, { type, title, duration })
 * Tipos: 'success' | 'error' | 'warning' | 'info'
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
