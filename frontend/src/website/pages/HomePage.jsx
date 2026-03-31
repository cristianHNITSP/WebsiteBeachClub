import { useState, useEffect } from 'react'
import { SUCURSALES } from '../../data/rooms'
import RoomCard from '../components/RoomCard'

export default function HomePage({ onNavigate, onSelectRoom, rooms, favorites, onToggleFav }) {
  const [overHero, setOverHero] = useState(true)
  const [sucursal, setSucursal] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    const handler = () => {
      setOverHero(window.scrollY < 80)
    }
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const filteredRooms = rooms.filter(r => {
    if (categoryFilter === 'familia') return r.roomType === 'familiar'
    if (categoryFilter === 'deal') return r.hasDiscount
    return true
  }).slice(0, 6)

  const handleSearch = () => {
    onNavigate('search')
  }

  return (
    <div>
      {/* HERO */}
      <section className="hero">
        <div className="hero__bg-placeholder" />
        <div className="hero__overlay" />
        <div className="hero__content">
          <h1 className="hero__title">
            Reserva tu estancia en<br />Hoteles Frida
          </h1>
          <p className="hero__subtitle">
            Dos propiedades únicas en la costa yucateca, donde el Mar Caribe
            se encuentra con la autenticidad de una hospitalidad de ensueño.
          </p>

          <div className="hero__search-box">
            <div className="hero__search-grid">
              <div>
                <label className="field-label">Destino / Sucursal</label>
                <select
                  className="field-select"
                  value={sucursal}
                  onChange={e => setSucursal(e.target.value)}
                >
                  <option value="">Todas las propiedades</option>
                  {SUCURSALES.map(s => (
                    <option key={s.key} value={s.key}>{s.name} — {s.subtitle}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="field-label">Llegada</label>
                  <input
                    type="date"
                    className="field-input"
                    value={checkIn}
                    onChange={e => setCheckIn(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label">Salida</label>
                  <input
                    type="date"
                    className="field-input"
                    value={checkOut}
                    onChange={e => setCheckOut(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="field-label" style={{ opacity: 0 }}>_</label>
                <button
                  className="navbar__btn-primary"
                  style={{ width: '100%', height: '40px' }}
                  onClick={handleSearch}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '6px' }}>search</span>
                  Buscar
                </button>
              </div>
            </div>
          </div>
        </div>

        <button className="hero__scroll-btn" onClick={() => {
          document.getElementById('sucursales')?.scrollIntoView({ behavior: 'smooth' })
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>expand_more</span>
          Descubrir
        </button>
      </section>

      {/* SUCURSALES */}
      <section className="section" id="sucursales">
        <div className="section__container">
          <div className="section__heading">
            <h2 className="section__title">Nuestras Sucursales</h2>
            <div className="section__accent" />
            <p className="section__sub">
              Dos destinos, una sola promesa: vivir Yucatán con todos los sentidos.
            </p>
          </div>

          <div className="sucursal-grid">
            {SUCURSALES.map((s) => (
              <div
                key={s.key}
                className="sucursal-card"
                onClick={() => onNavigate('search')}
              >
                <div
                  className="sucursal-card__img-placeholder"
                  style={{
                    background: s.key === 'chelem'
                      ? 'linear-gradient(135deg, #003b41 0%, #006971 100%)'
                      : 'linear-gradient(135deg, #7e469a 0%, #003b41 100%)'
                  }}
                />
                <div className="sucursal-card__overlay" />
                <div className="sucursal-card__body">
                  <div>
                    <div className="sucursal-card__name">{s.name}</div>
                    <div className="sucursal-card__sub">{s.subtitle}</div>
                  </div>
                  <div className="sucursal-card__arrow">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED ROOMS */}
      <section className="section--alt" id="habitaciones">
        <div className="section__container">
          <div className="section-header-row">
            <div className="section__heading" style={{ marginBottom: 0 }}>
              <h2 className="section__title">Habitaciones Destacadas</h2>
              <div className="section__accent" />
              <p className="section__sub">Selección curada de nuestros espacios más especiales.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'familia', label: 'Familia' },
                  { key: 'deal', label: 'Ofertas' },
                ].map(cat => (
                  <button
                    key={cat.key}
                    className={`filter-chip${categoryFilter === cat.key ? ' filter-chip--active' : ''}`}
                    onClick={() => setCategoryFilter(cat.key)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <button className="view-all-btn" onClick={() => onNavigate('search')}>
                Ver todos
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
              </button>
            </div>
          </div>

          <div className="home-rooms-grid" style={{ marginTop: '32px' }}>
            {filteredRooms.map(room => (
              <RoomCard
                key={room.id}
                room={room}
                onSelect={onSelectRoom}
                isFav={favorites.includes(room.id)}
                onToggleFav={onToggleFav}
                vertical
              />
            ))}
          </div>
        </div>
      </section>

      {/* EXPERIENCE STRIP */}
      <section className="section">
        <div className="section__container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {[
              { icon: 'beach_access', title: 'Acceso directo al mar', desc: 'Todas nuestras propiedades están a pasos de la playa.' },
              { icon: 'spa', title: 'Bienestar & Spa', desc: 'Tratamientos artesanales con ingredientes de la región.' },
              { icon: 'restaurant', title: 'Gastronomía local', desc: 'Desayunos con productos frescos de productores yucatecos.' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '32px 24px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, var(--primary-container), var(--primary))',
                  display: 'grid',
                  placeItems: 'center',
                  marginBottom: '16px',
                  color: '#fff',
                  fontSize: '24px',
                }}>
                  <span className="material-symbols-outlined">{item.icon}</span>
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-headline)',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  color: 'var(--on-surface)',
                  marginBottom: '8px',
                }}>{item.title}</h3>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: 'var(--on-surface-variant)',
                  lineHeight: '1.65',
                }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
