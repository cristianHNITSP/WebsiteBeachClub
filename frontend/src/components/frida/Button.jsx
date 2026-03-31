import { useState } from 'react'

const base = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
  transition: 'all 0.2s ease',
  border: 'none',
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  position: 'relative',
  overflow: 'hidden',
}

const variants = {
  primary: (h) => ({
    background: h
      ? 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)'
      : 'linear-gradient(135deg, var(--primary) 0%, #009aa5 100%)',
    color: '#fff',
    padding: '10px 22px',
    borderRadius: 'var(--radius-full)',
    fontSize: '14px',
    letterSpacing: '0.04em',
    boxShadow: h
      ? '0 6px 20px rgba(0,105,113,0.50)'
      : '0 4px 14px rgba(0,105,113,0.35)',
    transform: h ? 'translateY(-1px)' : 'translateY(0)',
  }),
  outline: (h) => ({
    background: h ? 'var(--surface-container)' : 'transparent',
    color: 'var(--on-surface)',
    padding: '10px 20px',
    borderRadius: 'var(--radius-full)',
    fontSize: '14px',
    border: '1.5px solid var(--outline)',
  }),
  ghost: (h) => ({
    background: h ? 'var(--surface-container)' : 'transparent',
    color: 'var(--on-surface-var)',
    padding: '8px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    border: 'none',
  }),
  icon: (h) => ({
    background: h ? 'var(--surface-container)' : 'transparent',
    color: 'var(--on-surface-var)',
    width: '36px',
    height: '36px',
    padding: 0,
    borderRadius: 'var(--radius-full)',
    border: 'none',
  }),
  danger: (h) => ({
    background: h ? '#8c1515' : 'var(--error)',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: 'var(--radius-full)',
    fontSize: '14px',
    boxShadow: h ? '0 4px 14px rgba(186,26,26,0.45)' : '0 2px 8px rgba(186,26,26,0.25)',
  }),
}

export default function Button({ variant = 'primary', style, children, ...props }) {
  const [hovered, setHovered] = useState(false)
  const vStyle = (variants[variant] ?? variants.primary)(hovered)

  return (
    <button
      style={{ ...base, ...vStyle, ...style }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...props}
    >
      {children}
    </button>
  )
}
