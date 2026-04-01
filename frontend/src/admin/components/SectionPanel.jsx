import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Icon from '@/components/frida/Icon'
import s from './SectionPanel.module.css'

/* ── Confirm-exit modal ── */
function ConfirmModal({ onConfirm, onCancel }) {
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--outline-var)',
            borderRadius: 'var(--radius-xl)',
            padding: '32px',
            width: '100%', maxWidth: '400px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{
            width: '46px', height: '46px', borderRadius: '50%',
            background: 'rgba(217,119,6,0.12)',
            display: 'grid', placeItems: 'center', marginBottom: '18px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#d97706' }}>
              warning
            </span>
          </div>

          <div style={{
            fontFamily: 'var(--font-headline)', fontSize: '1.15rem',
            color: 'var(--on-surface)', marginBottom: '8px',
          }}>
            ¿Descartar cambios?
          </div>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '13px',
            color: 'var(--on-surface-var)', lineHeight: 1.65, marginBottom: '24px',
          }}>
            Tienes cambios sin guardar. Si regresas ahora, toda la información capturada se perderá.
          </p>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              style={{
                padding: '9px 18px', borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--outline-var)', background: 'transparent',
                color: 'var(--on-surface)', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container-low)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Seguir editando
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: '9px 18px', borderRadius: 'var(--radius-md)',
                border: 'none', background: 'rgba(186,26,26,0.88)',
                color: '#fff', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Descartar y salir
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

/* ── SectionPanel ────────────────────────────────────────────────
   Ocupa todo el área de contenido del AdminLayout.
   Mismo patrón que AdminAccountPage pero reutilizable.

   Props:
     eyebrow   string    — etiqueta superior pequeña
     title     ReactNode — título principal (puede tener <em>)
     subtitle  string    — descripción corta bajo el título
     onBack    fn        — navegar de regreso
     dirty     boolean   — si true, el botón de retroceso dispara ConfirmModal
     actions   ReactNode — botones al lado derecho del header (ej. Guardar)
     children  ReactNode — contenido del formulario / información
   ──────────────────────────────────────────────────────────────── */
export default function SectionPanel({
  eyebrow, title, subtitle,
  onBack, dirty = false,
  actions, children,
}) {
  const [showConfirm, setShowConfirm] = useState(false)

  const handleBack = () => {
    if (dirty) setShowConfirm(true)
    else onBack()
  }

  return (
    <>
      {/* Header — uses admin-page-header flex (space-between, flex-wrap) from admin.css */}
      <div className="admin-page-header">
        <div className={s.titleGroup}>
          {/* Back button */}
          <button className={s.backBtn} onClick={handleBack}>
            <Icon name="arrow_back" size={18} />
          </button>

          <div>
            {eyebrow && <span className="admin-page-eyebrow">{eyebrow}</span>}
            <h1 className="admin-page-title">{title}</h1>
            {subtitle && <p className={s.subtitle}>{subtitle}</p>}
          </div>
        </div>

        {/* Right-side actions */}
        {actions && (
          <div className="admin-page-header-actions">
            <div className="admin-page-header-actions-row">{actions}</div>
          </div>
        )}
      </div>

      {/* Content */}
      {children}

      {/* Confirm modal */}
      {showConfirm && (
        <ConfirmModal
          onConfirm={() => { setShowConfirm(false); onBack() }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
