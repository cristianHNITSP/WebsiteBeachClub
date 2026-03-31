/**
 * Skeleton — placeholder de carga con shimmer, usa tokens del design system.
 * Variantes: rect (default), circle, text
 */
export default function Skeleton({ variant = 'rect', width, height, style, className }) {
  const shimmerStyle = {
    background: 'linear-gradient(90deg, var(--surface-container) 0%, var(--surface-container-highest) 48%, var(--surface-container) 100%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.6s linear infinite',
    borderRadius:
      variant === 'circle' ? 'var(--radius-full)'
      : variant === 'text'  ? 'var(--radius-sm)'
      : 'var(--radius-md)',
    display: 'block',
    flexShrink: 0,
    width:  width  ?? (variant === 'circle' ? '40px' : '100%'),
    height: height ?? (variant === 'circle' ? '40px' : variant === 'text' ? '14px' : '80px'),
    ...style,
  }

  return <span style={shimmerStyle} className={className} />
}

/* ── Compound helpers ── */
export function SkeletonText({ lines = 3, lastWidth = '60%', style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? lastWidth : '100%'}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ height = '160px', style }) {
  return (
    <div style={{
      background: 'var(--surface-container-low)',
      borderRadius: 'var(--radius-xl)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      ...style,
    }}>
      <Skeleton variant="text" width="40%" height="12px" />
      <Skeleton variant="rect" height={height} style={{ borderRadius: 'var(--radius-lg)' }} />
      <SkeletonText lines={2} lastWidth="70%" />
    </div>
  )
}
