const variants = {
  default:  { background: 'var(--surface-container)', color: 'var(--on-surface)',    borderRadius: 'var(--radius-full)', padding: '2px 8px'   },
  discount: { background: 'var(--error)',              color: '#fff',                 borderRadius: 'var(--radius-sm)',   padding: '4px 10px', fontWeight: 700 },
  tag:      { background: 'var(--primary)',            color: '#fff',                 borderRadius: 'var(--radius-sm)',   padding: '4px 10px' },
  gold:     { background: 'var(--gold-fixed)',         color: 'var(--gold-dark)',     borderRadius: 'var(--radius-full)', padding: '2px 10px', fontWeight: 600 },
  outline:  { background: 'transparent',              color: 'var(--on-surface-var)', borderRadius: 'var(--radius-full)', padding: '2px 10px', border: '1px solid var(--outline)' },
}

export default function Badge({ variant = 'default', style, children }) {
  return (
    <span style={{
      display: 'inline-block',
      fontSize: '11px',
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      ...variants[variant],
      ...style,
    }}>
      {children}
    </span>
  )
}
