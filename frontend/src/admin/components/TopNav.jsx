import Icon from '@/components/frida/Icon'
import Button from '@/components/frida/Button'
import NavItem from '@/components/frida/NavItem'
import Tooltip from '@/components/frida/Tooltip'
import { useTheme } from '@/context/ThemeContext'
import s from './TopNav.module.css'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Tablero' },
  { key: 'calendar',  label: 'Reservaciones' },
  { key: 'users',     label: 'Equipo' },
  { key: 'shop',      label: 'Boutique' },
]

export default function TopNav({ page, onNavigate, onToggleSidebar }) {
  const { isDark, toggleDark } = useTheme()

  return (
    <header
      className={s.topnav}
      style={{
        background: isDark ? 'rgba(17,24,32,0.92)' : 'rgba(247,249,255,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.04)',
      }}
    >
      {/* Hamburger — visible on tablet/mobile via CSS */}
      <button
        className={s.hamburger}
        onClick={onToggleSidebar}
        aria-label="Alternar menú lateral"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>menu</span>
      </button>

      {/* Logo */}
      <button className={s.logo} onClick={() => onNavigate('dashboard')}>
        <div className={s.logoIcon}>
          <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '16px' }}>waves</span>
        </div>
        <div className={s.logoText}>
          Hoteles<br />
          <span className={s.logoSub}>Frida · Admin</span>
        </div>
      </button>

      {/* Desktop nav — hidden on tablet/mobile via CSS */}
      <nav className={s.desktopNav} aria-label="Navegación del panel">
        <ul className={s.navList}>
          {NAV_ITEMS.map(item => (
            <li key={item.key}>
              <NavItem active={page === item.key} onClick={() => onNavigate(item.key)}>
                {item.label}
              </NavItem>
            </li>
          ))}
        </ul>
      </nav>

      {/* Actions */}
      <div className={s.actions}>
        <Tooltip content="Ver sitio público" position="bottom">
          <Button variant="ghost" onClick={() => (window.location.href = '/')} style={{ padding: '6px 12px', fontSize: '12px' }}>
            <Icon name="open_in_new" size={15} />
            <span className={s.verSitioLabel}> Ver Sitio</span>
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
              border: '2px solid var(--primary)',
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
