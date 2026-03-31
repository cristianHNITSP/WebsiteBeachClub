const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
  { key: 'calendar', label: 'Reservations', icon: 'calendar_month' },
  { key: 'users', label: 'Guest List', icon: 'group' },
  { key: 'housekeeping', label: 'Housekeeping', icon: 'cleaning_services' },
  { key: 'shop', label: 'Revenue', icon: 'bar_chart' },
  { key: 'marketing', label: 'Marketing', icon: 'campaign' },
]

export default function SideNav({ page, onNavigate }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <div className="admin-sidebar__property">Grand Oasis</div>
        <div className="admin-sidebar__role">Manager · Hoteles Frida</div>
      </div>

      <nav className="admin-sidebar__nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            className={`admin-sidebar__item${page === item.key ? ' admin-sidebar__item--active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <button
          className="admin-sidebar__upgrade-btn"
          onClick={() => onNavigate('rooms')}
        >
          Ver habitaciones
        </button>
        <button
          className="admin-sidebar__link"
          onClick={() => onNavigate('login')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
