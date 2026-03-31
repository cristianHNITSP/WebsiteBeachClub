/**
 * Design tokens — espejo JS de las variables CSS en index.css.
 * Úsalos en style props: style={{ color: t.color.primary }}
 */
const t = {
  color: {
    primary:             'var(--primary)',
    primaryDark:         'var(--primary-dark)',
    secondary:           'var(--secondary)',
    gold:                'var(--gold)',
    goldFixed:           'var(--gold-fixed)',
    goldDark:            'var(--gold-dark)',
    error:               'var(--error)',
    white:               '#ffffff',

    bg:                  'var(--bg)',
    surface:             'var(--surface)',
    surfaceContainer:    'var(--surface-container)',
    surfaceContainerLow: 'var(--surface-container-low)',
    surfaceLowest:       'var(--surface-lowest)',

    onSurface:    'var(--on-surface)',
    onSurfaceVar: 'var(--on-surface-var)',

    outline:    'var(--outline)',
    outlineVar: 'var(--outline-var)',
  },

  font: {
    headline: 'var(--font-headline)',
    body:     'var(--font-body)',
  },

  radius: {
    sm:   'var(--radius-sm)',
    md:   'var(--radius-md)',
    lg:   'var(--radius-lg)',
    xl:   'var(--radius-xl)',
    full: 'var(--radius-full)',
  },

  shadow: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
  },

  space: {
    1: '4px',  2: '8px',  3: '12px', 4: '16px',
    5: '20px', 6: '24px', 8: '32px', 10: '40px',
    12: '48px', 16: '64px', 20: '80px', 22: '88px',
  },

  transition: 'all 0.2s ease',
}

export default t
