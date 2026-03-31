import { motion } from 'framer-motion'
import Button from '@/components/frida/Button'
import NavItem from '@/components/frida/NavItem'
import Icon from '@/components/frida/Icon'
import { useTheme } from '@/context/ThemeContext'

export default function Navbar({ view, onNavigate, overHero }) {
  const { isDark, toggleDark } = useTheme()

  const navBg = overHero
    ? { background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }
    : {
        background: isDark ? 'rgba(17,24,32,0.92)' : 'rgba(247,249,255,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: '72px', padding: '0 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      transition: 'all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      ...navBg,
    }}>
      {/* Logo */}
      <button
        onClick={() => onNavigate('home')}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}
      >
        {/* Logo mark */}
        <div style={{
          width: '32px', height: '32px',
          borderRadius: '10px',
          background: overHero
            ? 'rgba(255,255,255,0.18)'
            : 'linear-gradient(135deg, var(--primary) 0%, #009aa5 100%)',
          border: overHero ? '1px solid rgba(255,255,255,0.3)' : 'none',
          display: 'grid', placeItems: 'center',
          fontSize: '16px',
          flexShrink: 0,
          boxShadow: overHero ? 'none' : '0 4px 12px rgba(0,105,113,0.35)',
          transition: 'all 0.3s ease',
        }}>
          <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '17px' }}>waves</span>
        </div>

        <div style={{
          fontFamily: 'var(--font-headline)',
          fontWeight: 700,
          fontSize: '17px',
          letterSpacing: '0.02em',
          color: overHero ? '#fff' : 'var(--on-surface)',
          transition: 'color 0.25s ease',
          lineHeight: 1.1,
        }}>
          Hoteles<br />
          <span style={{
            fontSize: '10px',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: overHero ? 'rgba(255,255,255,0.65)' : 'var(--primary)',
            transition: 'color 0.25s ease',
          }}>Frida</span>
        </div>
      </button>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <NavItem active={view === 'home'}    transparent={overHero} onClick={() => onNavigate('home')}>Inicio</NavItem>
        <NavItem active={view === 'search'}  transparent={overHero} onClick={() => onNavigate('search')}>Destinos</NavItem>
        <NavItem active={view === 'search'}  transparent={overHero} onClick={() => onNavigate('search')}>Habitaciones</NavItem>
        <NavItem active={view === 'account'} transparent={overHero} onClick={() => onNavigate('account')}>Mis Reservas</NavItem>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Button
          variant="icon"
          onClick={toggleDark}
          title={isDark ? 'Modo claro' : 'Modo oscuro'}
          style={overHero ? { color: '#fff' } : {}}
        >
          <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={20} />
        </Button>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate('search')}
          style={{
            height: '38px',
            padding: '0 20px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--primary) 0%, #009aa5 100%)',
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '12px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            boxShadow: '0 4px 16px rgba(0,105,113,0.4)',
            transition: 'box-shadow 0.2s ease',
          }}
        >
          Reservar
        </motion.button>

        <a
          href="/admin"
          title="Acceso personal"
          style={{
            width: '34px', height: '34px',
            borderRadius: 'var(--radius-full)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(255,255,255,0.10)',
            color: overHero ? '#fff' : 'var(--on-surface-var)',
            transition: 'all 0.2s ease',
            opacity: 0.7,
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
        >
          <Icon name="lock" size={17} />
        </a>
      </div>
    </nav>
  )
}
