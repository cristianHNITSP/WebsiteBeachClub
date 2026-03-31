import { useState } from 'react'

export default function NavItem({ active = false, transparent = false, style, children, ...props }) {
  const [hovered, setHovered] = useState(false)

  const lit = active || hovered
  const color = transparent
    ? (lit ? '#ffffff' : 'rgba(255,255,255,0.72)')
    : (lit ? 'var(--on-surface)' : 'var(--on-surface-var)')

  return (
    <button
      style={{
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
        color,
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        transition: 'all 0.2s ease',
        ...style,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...props}
    >
      {children}
    </button>
  )
}
