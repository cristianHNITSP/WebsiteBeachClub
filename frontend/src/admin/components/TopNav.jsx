export default function TopNav({ page, onNavigate }) {
  const navItems = [
    { key: 'dashboard', label: 'Portfolio' },
    { key: 'calendar', label: 'Availability' },
    { key: 'rooms', label: 'Analytics' },
    { key: 'support', label: 'Support' },
  ]

  return (
    <header className="admin-topnav">
      <button
        className="admin-topnav__brand"
        onClick={() => onNavigate('dashboard')}
      >
        Luxe Artier
      </button>

      <nav className="admin-topnav__nav">
        {navItems.map(item => (
          <button
            key={item.key}
            className={`admin-topnav__link${page === item.key ? ' admin-topnav__link--active' : ''}`}
            onClick={() => item.key !== 'support' && onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="admin-topnav__actions">
        <button className="admin-topnav__icon-btn" title="Notificaciones">
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
        </button>
        <button className="admin-topnav__icon-btn" title="Configuración">
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>settings</span>
        </button>
        <div className="admin-topnav__avatar">
          <img
            src="https://placehold.co/40x40/003b41/ffffff?text=A"
            alt="Avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </div>
    </header>
  )
}
