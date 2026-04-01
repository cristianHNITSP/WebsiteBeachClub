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

/* ── Room-specific skeletons ── */

/** Replica la card hero de habitaciones: imagen grande con overlay de info */
export function SkeletonRoomHero({ style }) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      height: '500px',
      ...style,
    }}>
      <Skeleton variant="rect" style={{ height: '100%', borderRadius: 0 }} />
      {/* Badge placeholder — top-left */}
      <div style={{ position: 'absolute', top: '32px', left: '32px' }}>
        <Skeleton variant="text" width="80px" height="22px" style={{ borderRadius: 'var(--radius-full)' }} />
      </div>
      {/* Info placeholder — bottom-left */}
      <div style={{ position: 'absolute', bottom: '32px', left: '32px', right: '32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Skeleton variant="text" width="90px" height="11px" />
        <Skeleton variant="text" width="55%" height="32px" />
      </div>
      {/* Edit button placeholder — bottom-right */}
      <div style={{ position: 'absolute', bottom: '20px', right: '20px' }}>
        <Skeleton variant="text" width="148px" height="36px" style={{ borderRadius: 'var(--radius-md)' }} />
      </div>
    </div>
  )
}

/** Replica las admin-card pequeñas de detalle (tarifa, estado, ocupación) */
export function SkeletonDetailCard({ style }) {
  return (
    <div style={{
      background: 'var(--surface-container-low)',
      borderRadius: 'var(--radius-xl)',
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      ...style,
    }}>
      <Skeleton variant="text" width="60%" height="11px" />
      <Skeleton variant="text" width="45%" height="32px" />
    </div>
  )
}

/** Replica la card "Próximas reservas": label + N filas con nombre/fecha a la izquierda y chip a la derecha */
export function SkeletonReservationList({ rows = 3, style }) {
  return (
    <div style={{
      background: 'var(--surface-container-low)',
      borderRadius: 'var(--radius-xl)',
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: '0',
      ...style,
    }}>
      <Skeleton variant="text" width="45%" height="11px" style={{ marginBottom: '14px' }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: i < rows - 1 ? '1px solid var(--surface-container-highest)' : 'none',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Skeleton variant="text" width="110px" height="13px" />
            <Skeleton variant="text" width="70px" height="10px" />
          </div>
          <Skeleton variant="text" width="60px" height="24px" style={{ borderRadius: 'var(--radius-full)' }} />
        </div>
      ))}
    </div>
  )
}

/** Replica una card de la lista de habitaciones (imagen 180px + footer con precio y botón) */
export function SkeletonRoomCard({ style }) {
  return (
    <div style={{
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      border: '2px solid transparent',
      ...style,
    }}>
      {/* Image area */}
      <Skeleton variant="rect" style={{ height: '180px', borderRadius: 0 }} />
      {/* Footer */}
      <div style={{
        padding: '14px 16px',
        background: 'var(--surface-container-low)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Skeleton variant="text" width="120px" height="13px" />
        <Skeleton variant="text" width="52px" height="28px" style={{ borderRadius: 'var(--radius-md)' }} />
      </div>
    </div>
  )
}
