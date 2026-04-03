import { useState } from 'react'
import Icon from '@/components/frida/Icon'
import s from './SideNav.module.css'

/* ── Navigation groups ── */
const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { key: 'dashboard', label: 'Tablero',      icon: 'grid_view',        badge: null },
      { key: 'calendar',  label: 'Reservaciones', icon: 'calendar_month',   badge: 3 },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { key: 'rooms',        label: 'Habitaciones', icon: 'bed',               badge: null },
      //{ key: 'housekeeping', label: 'Limpieza',      icon: 'cleaning_services', badge: 2 },
      { key: 'users',        label: 'Usuarios',      icon: 'group',             badge: null },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { key: 'shop',      label: 'Tienda',  icon: 'storefront',   badge: null },
      { key: 'sales',     label: 'Ventas',    icon: 'receipt_long', badge: null },
      //{ key: 'marketing', label: 'Marketing', icon: 'campaign',     badge: null },
    ],
  },
]

const PROPERTIES = [
  { id: 'Chelem',    name: 'Cabañas Frida',     location: 'Chelem, Yucatán' },
  { id: 'chuburna', name: 'Casa Frida',      location: 'Chuburná, Yucatán' },
]

/* ── Single nav item ── */
function SideItem({ item, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`${s.navItem} ${active ? s.navItemActive : ''}`}
    >
      {active && <span className={s.activeIndicator} />}
      <span className={s.navItemIcon}>
        <Icon name={item.icon} size={17} />
      </span>
      <span className={s.navItemLabel}>{item.label}</span>
      {item.badge != null && (
        <span className={`${s.badge} ${active ? s.badgeActive : ''}`}>
          {item.badge}
        </span>
      )}
    </button>
  )
}

export default function SideNav({ page, onNavigate, isOpen }) {
  const [propertyOpen, setPropertyOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(PROPERTIES[0])

  return (
    <aside className={`${s.sidenav} ${isOpen ? s.sidenavOpen : ''}`}>

      {/* ── Property switcher ── */}
      <div className={s.propertySection}>
        <button
          className={s.propertyBtn}
          onClick={() => setPropertyOpen(o => !o)}
        >
          <span className={s.propertyIcon}>
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '16px' }}>hotel</span>
          </span>
          <div className={s.propertyInfo}>
            <div className={s.propertyName}>{selectedProperty.name}</div>
            <div className={s.propertyLocation}>{selectedProperty.location}</div>
          </div>
          <span className={`material-symbols-outlined ${s.chevron} ${propertyOpen ? s.chevronOpen : ''}`}>
            expand_more
          </span>
        </button>

        {propertyOpen && (
          <div className={s.dropdown}>
            {PROPERTIES.map(p => (
              <button
                key={p.id}
                className={s.dropdownItem}
                onClick={() => { setSelectedProperty(p); setPropertyOpen(false) }}
              >
                <span className="material-symbols-outlined" style={{
                  fontSize: '14px',
                  color: selectedProperty.id === p.id ? 'var(--primary)' : 'var(--outline)',
                }}>
                  {selectedProperty.id === p.id ? 'radio_button_checked' : 'radio_button_unchecked'}
                </span>
                <div>
                  <div className={s.dropdownItemName}>{p.name}</div>
                  <div className={s.dropdownItemLocation}>{p.location}</div>
                </div>
              </button>
            ))}
            <button className={s.dropdownAdd}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add_circle</span>
              Agregar propiedad
            </button>
          </div>
        )}
      </div>

      {/* ── Navigation groups ── */}
      <nav className={s.nav} aria-label="Navegación lateral">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={s.navGroup}>
            <p className={s.groupLabel}>{group.label}</p>
            <ul className={s.navList}>
              {group.items.map(item => (
                <li key={item.key}>
                  <SideItem
                    item={item}
                    active={page === item.key}
                    onClick={() => onNavigate(item.key)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Profile footer ── */}
      <div className={s.profileSection}>
        <div className={s.quickActions}>
          <button className={s.quickBtn} onClick={() => onNavigate('config')}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>settings</span>
            Config.
          </button>
          <button className={`${s.quickBtn} ${s.quickBtnDanger}`} onClick={() => onNavigate('login')}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>logout</span>
            Salir
          </button>
        </div>

        <div className={s.profileRow} onClick={() => onNavigate('config')}>
          <div className={s.avatar}>
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '17px' }}>person</span>
          </div>
          <div className={s.profileInfo}>
            <div className={s.profileName}>Gerente General</div>
            <div className={s.profileEmail}>admin@hoteles-frida.mx</div>
          </div>
          <span className={s.onlineDot} />
        </div>
      </div>
    </aside>
  )
}
