export default function SectionHeader({ eyebrow, title, subtitle, center = false, style }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginBottom: '48px',
      alignItems: center ? 'center' : 'flex-start',
      textAlign: center ? 'center' : 'left',
      ...style,
    }}>
      {eyebrow && (
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--primary)',
        }}>
          {eyebrow}
        </span>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: center ? 'center' : 'flex-start' }}>
        {!center && (
          <div style={{
            width: '4px',
            height: '32px',
            borderRadius: '2px',
            background: 'linear-gradient(to bottom, var(--primary), var(--secondary))',
            flexShrink: 0,
          }} />
        )}
        <h2 style={{
          fontFamily: 'var(--font-headline)',
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          fontWeight: 700,
          color: 'var(--on-surface)',
          lineHeight: 1.2,
        }}>
          {title}
        </h2>
      </div>

      {subtitle && (
        <p style={{
          fontSize: '16px',
          color: 'var(--on-surface-var)',
          maxWidth: '560px',
          lineHeight: 1.6,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
