import { useState } from 'react'

const labelStyle = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--on-surface-var)',
}

const inputBase = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--outline-var)',
  background: 'var(--surface-lowest)',
  color: 'var(--on-surface)',
  fontSize: '14px',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  transition: 'border-color 0.2s ease',
}

export function Field({ label, style, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...style }}>
      {label && <label style={labelStyle}>{label}</label>}
      {children}
    </div>
  )
}

export function Input({ style, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      style={{ ...inputBase, borderColor: focused ? 'var(--primary)' : 'var(--outline-var)', ...style }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    />
  )
}

export function Select({ style, children, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      style={{ ...inputBase, borderColor: focused ? 'var(--primary)' : 'var(--outline-var)', appearance: 'none', cursor: 'pointer', ...style }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea({ style, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      style={{ ...inputBase, borderColor: focused ? 'var(--primary)' : 'var(--outline-var)', resize: 'vertical', minHeight: '100px', ...style }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    />
  )
}
