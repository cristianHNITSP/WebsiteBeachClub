export default function PageHeader({ eyebrow, title, subtitle, date, actions, style }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: '32px',
      ...style,
    }}>
      <div>
        {eyebrow && (
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--gold)',
          }}>
            {eyebrow}
          </span>
        )}
        <h1 style={{
          fontFamily: 'var(--font-headline)',
          fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
          fontWeight: 700,
          color: 'var(--on-surface)',
          lineHeight: 1.2,
          marginTop: eyebrow ? '4px' : 0,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: 'var(--on-surface-var)', marginTop: '4px', fontSize: '16px' }}>
            {subtitle}
          </p>
        )}
        {date && (
          <p style={{ color: 'var(--on-surface-var)', marginTop: '4px', fontSize: '14px' }}>
            {date}
          </p>
        )}
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  )
}
