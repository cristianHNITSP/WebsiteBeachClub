import Icon from '@/components/frida/Icon'
import Button from '@/components/frida/Button'
import NavItem from '@/components/frida/NavItem'
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
      height: '80px', padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'rgba(247,249,255,0.88)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--outline-var)',
    }}>
      <button
        onClick={() => onNavigate('dashboard')}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-headline)', fontWeight: 700,
          fontSize: '16px', letterSpacing: '0.05em', textTransform: 'uppercase',
          color: 'var(--on-surface)',
        }}
      >
        Hoteles Frida
      </button>

      <nav style={{ display: 'flex', alignItems: 'center' }}>
        {NAV_ITEMS.map(item => (
          <NavItem key={item.key} active={page === item.key} onClick={() => onNavigate(item.key)}>
            {item.label}
          </NavItem>
        ))}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Button variant="ghost" onClick={() => (window.location.href = '/')}>
          <Icon name="open_in_new" size={18} /> Ver Sitio
        </Button>

        <Button variant="icon" onClick={toggleDark} title={isDark ? 'Modo claro' : 'Modo oscuro'}>
          <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={20} />
        </Button>

        <Button variant="icon" title="Notificaciones">
          <Icon name="notifications" size={20} />
        </Button>

        <button
          onClick={() => onNavigate('account')}
          title="Mi cuenta"
          style={{
            width: '40px', height: '40px',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden', cursor: 'pointer',
            border: '2px solid var(--outline-var)',
            transition: 'border-color 0.2s ease',
          }}
        >
          <img
            src="https://placehold.co/40x40/003b41/ffffff?text=A"
            alt="Avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </button>
      </div>
    </header>
  )
}
