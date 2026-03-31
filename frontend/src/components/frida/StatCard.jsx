/**
 * StatCard — tarjeta de estadística reutilizable con:
 *   · Skeleton shimmer mientras loading=true
 *   · Count-up animation cuando el valor numérico se revela
 *   · Soporte para prefix/suffix (e.g. "$", "%", "k")
 */
import { useState, useEffect, useRef } from 'react'
import Skeleton from './Skeleton'

/* ── Count-up hook ── */
function useCountUp(target, active, duration = 900) {
  const [displayed, setDisplayed] = useState(0)
  const frameRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    if (!active || typeof target !== 'number') return
    setDisplayed(0)
    startRef.current = null

    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts
      const t = Math.min((ts - startRef.current) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setDisplayed(Math.round(eased * target))
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [target, active]) // eslint-disable-line

  return displayed
}

/* ── StatCard component ── */
export default function StatCard({
  icon,
  label,
  value,           // number → animates; string → shows as-is
  sub,             // optional sub-text below the label
  prefix = '',     // e.g. "$", "MXN"
  suffix = '',     // e.g. "%", "k", " noches"
  color = 'var(--primary)',
  loading = false,
}) {
  const isNumeric = typeof value === 'number'
  const animated = useCountUp(isNumeric ? value : 0, !loading && isNumeric)
  const displayVal = isNumeric ? animated : value

  /* ── Skeleton state ── */
  if (loading) {
    return (
      <div style={{
        background: 'var(--surface-container-low)',
        border: '1px solid var(--outline-var)',
        borderRadius: '12px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}>
        <Skeleton variant="rect" width="44px" height="44px" style={{ borderRadius: '12px', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton variant="text" width="40%" height="28px" />
          <Skeleton variant="text" width="70%" height="11px" />
        </div>
      </div>
    )
  }

  /* ── Live card ── */
  return (
    <div style={{
      background: 'var(--surface-container-low)',
      border: '1px solid var(--outline-var)',
      borderRadius: '12px',
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      boxShadow: 'var(--shadow-sm)',
      transition: 'background 0.3s ease, border-color 0.3s ease',
    }}>
      {/* Icon bubble */}
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        color: color,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon}</span>
      </div>

      {/* Text */}
      <div>
        <div style={{
          fontFamily: 'var(--font-headline)',
          fontSize: '1.75rem',
          fontWeight: 700,
          color: 'var(--on-surface)',
          lineHeight: 1,
        }}>
          {prefix}{displayVal}{suffix}
        </div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--outline)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginTop: '4px',
        }}>
          {label}
        </div>
        {sub && (
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            color: 'var(--on-surface-var)',
            marginTop: '3px',
          }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}
