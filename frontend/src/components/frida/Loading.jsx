/**
 * Loading — spinner y overlay de carga, usa tokens del design system.
 * Variantes: spinner (default), dots, page (overlay completo)
 */

/* ── Keyframes inyectados una vez ── */
const STYLE_ID = 'frida-loading-styles'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = `
    @keyframes frida-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes frida-bounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }
  `
  document.head.appendChild(s)
}

/* ── Spinner ── */
export function Spinner({ size = 32, color = 'var(--primary)', strokeWidth = 3, style }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: 'var(--radius-full)',
        border: `${strokeWidth}px solid var(--surface-container-highest)`,
        borderTopColor: color,
        animation: 'frida-spin 0.75s linear infinite',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}

/* ── Dots ── */
export function LoadingDots({ color = 'var(--primary)', size = 8, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', ...style }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: 'var(--radius-full)',
            background: color,
            display: 'inline-block',
            animation: `frida-bounce 1.2s ease-in-out ${i * 0.16}s infinite`,
          }}
        />
      ))}
    </span>
  )
}

/* ── Page overlay ── */
export function LoadingPage({ text = 'Cargando…', visible = true }) {
  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.45)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--outline-var)',
        borderRadius: 'var(--radius-xl)',
        padding: '36px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '18px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <Spinner size={44} strokeWidth={4} />
        {text && (
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--on-surface-var)',
            letterSpacing: '0.04em',
          }}>
            {text}
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Default export: Spinner ── */
export default Spinner
