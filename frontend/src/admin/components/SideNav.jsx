import { useState } from 'react'
import Icon from '@/components/frida/Icon'

const NAV_ITEMS = [
  { key: 'dashboard',    label: 'Tablero',           icon: 'grid_view' },
  { key: 'calendar',     label: 'Reservaciones',      icon: 'calendar_month' },
  { key: 'rooms',        label: 'Habitaciones',       icon: 'bed' },
  { key: 'users',        label: 'Lista de Huéspedes', icon: 'group' },
  { key: 'housekeeping', label: 'Limpieza',           icon: 'cleaning_services' },
  { key: 'shop',         label: 'Boutique',           icon: 'bar_chart' },
  { key: 'marketing',    label: 'Marketing',          icon: 'campaign' },
]

function SideItem({ item, active, onClick }) {
  const [hov, setHov] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 16px',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        borderRight: active ? '3px solid var(--primary)' : '3px solid transparent',
        background: active ? '#fff' : (hov ? 'var(--surface-container)' : 'transparent'),
        color: active ? 'var(--primary)' : (hov ? 'var(--on-surface)' : 'var(--on-surface-var)'),
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 500,
        fontFamily: 'var(--font-body)',
        width: '100%',
        textAlign: 'left',
        boxShadow: active ? 'var(--shadow-sm)' : 'none',
        transform: active ? 'translateX(4px)' : 'translateX(0)',
        transition: 'all 0.2s ease',
      }}
    >
      <Icon name={item.icon} size={20} />
      {item.label}
    </button>
  )
}

export default function SideNav({ page, onNavigate }) {
  return (
    <aside style={{
      position: 'fixed', top: '80px', left: 0, bottom: 0,
      width: '288px',
      display: 'flex', flexDirection: 'column',
      background: 'var(--surface)',
      borderRight: '1px solid var(--outline-var)',
      overflowY: 'auto',
      zIndex: 40,
    }}>
      {/* Marca */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--outline-var)' }}>
        <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '18px', color: 'var(--gold)' }}>
          Grand Oasis
        </div>
        <div style={{ fontSize: '12px', color: 'var(--on-surface-var)', marginTop: '2px' }}>
          Gerente · Hoteles Frida
        </div>
      </div>

      {/* Navegación */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {NAV_ITEMS.map(item => (
          <SideItem
            key={item.key}
            item={item}
            active={page === item.key}
            onClick={() => onNavigate(item.key)}
          />
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--outline-var)' }}>
        <SideItem
          item={{ key: 'login', label: 'Cerrar sesión', icon: 'logout' }}
          active={false}
          onClick={() => onNavigate('login')}
        />
      </div>
    </aside>
  )
}
