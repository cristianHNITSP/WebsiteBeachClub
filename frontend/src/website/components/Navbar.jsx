import { useState } from 'react'

export default function Navbar({ view, onNavigate, overHero }) {
  const [darkMode, setDarkMode] = useState(false)

  const navClass = overHero ? 'navbar navbar--transparent' : 'navbar navbar--glass'

  return (
    <nav className={navClass}>
      <button className="navbar__logo" onClick={() => onNavigate('home')}>
        Hoteles Frida
      </button>

      <div className="navbar__nav">
        <button
          className={`navbar__link${view === 'search' ? ' navbar__link--active' : ''}`}
          onClick={() => onNavigate('search')}
        >
          Destinos
        </button>
        <button
          className={`navbar__link${view === 'search' ? ' navbar__link--active' : ''}`}
          onClick={() => onNavigate('search')}
        >
          Habitaciones
        </button>
        <button
          className={`navbar__link${view === 'account' ? ' navbar__link--active' : ''}`}
          onClick={() => onNavigate('account')}
        >
          Mis Reservas
        </button>
      </div>

      <div className="navbar__actions">
        <button
          className="navbar__btn-icon"
          onClick={() => setDarkMode(!darkMode)}
          title="Cambiar tema"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        <button
          className="navbar__btn-primary"
          onClick={() => onNavigate('search')}
        >
          Reservar
        </button>

        <a href="/admin" className="navbar__btn-staff" title="Acceso personal">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock</span>
        </a>
      </div>
    </nav>
  )
}
