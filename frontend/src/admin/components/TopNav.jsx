import Icon from '@/components/frida/Icon'
import Button from '@/components/frida/Button'
import NavItem from '@/components/frida/NavItem'
import Tooltip from '@/components/frida/Tooltip'
import { useTheme } from '@/context/ThemeContext'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Tablero' },
  { key: 'calendar',  label: 'Reservaciones' },
  { key: 'users',     label: 'Equipo' },
  { key: 'shop',      label: 'Boutique' },
]

export default function TopNav({ page, onNavigate }) {
  const { isDark, toggleDark } = useTheme()

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: '64px', padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: isDark ? 'rgba(17,24,32,0.92)' : 'rgba(247,249,255,0.92)',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
      boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.04)',
      transition: 'background 0.3s ease, border-color 0.3s ease',
    }}>
      {/* Logo */}
      <button
        onClick={() => onNavigate('dashboard')}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}
      >
        <div style={{
          width: '30px', height: '30px', borderRadius: '9px',
          background: 'linear-gradient(135deg, var(--primary) 0%, #009aa5 100%)',
          display: 'grid', placeItems: 'center',
          boxShadow: '0 3px 10px rgba(0,105,113,0.35)',
        }}>
          <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '16px' }}>waves</span>
        </div>
        <div style={{
          fontFamily: 'var(--font-headline)', fontWeight: 700,
          fontSize: '13px', color: 'var(--on-surface)',
          lineHeight: 1.1, letterSpacing: '0.01em',
        }}>
          Hoteles<br />
          <span style={{
            fontSize: '8px', fontFamily: 'var(--font-body)', fontWeight: 800,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--primary)',
          }}>Frida · Admin</span>
        </div>
      </button>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center' }}>
        {NAV_ITEMS.map(item => (
          <NavItem key={item.key} active={page === item.key} onClick={() => onNavigate(item.key)}>
            {item.label}
          </NavItem>
        ))}
      </nav>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Tooltip content="Ver sitio público" position="bottom">
          <Button variant="ghost" onClick={() => (window.location.href = '/')} style={{ padding: '6px 12px', fontSize: '12px' }}>
            <Icon name="open_in_new" size={15} /> Ver Sitio
          </Button>
        </Tooltip>

        <Tooltip content={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} position="bottom">
          <Button variant="icon" onClick={toggleDark}>
            <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={18} />
          </Button>
        </Tooltip>

        <Tooltip content="Notificaciones" position="bottom">
          <Button variant="icon">
            <Icon name="notifications" size={18} />
          </Button>
        </Tooltip>

        <Tooltip content="Mi perfil" position="bottom">
          <button
            onClick={() => onNavigate('config')}
            style={{
              width: '34px', height: '34px',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden', cursor: 'pointer',
              border: `2px solid var(--primary)`,
              background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '18px' }}>person</span>
          </button>
        </Tooltip>
      </div>
    </header>
  )
}
