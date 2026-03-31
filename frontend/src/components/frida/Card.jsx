export function GlassCard({ style, children, ...props }) {
  return (
    <div
      className="glass-card"
      style={{ borderRadius: 'var(--radius-lg)', ...style }}
      {...props}
    >
      {children}
    </div>
  )
}

export function SurfaceCard({ style, children, ...props }) {
  return (
    <div
      style={{
        background: 'var(--surface-lowest)',
        border: '1px solid var(--outline-var)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export function ElevatedCard({ style, children, ...props }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
