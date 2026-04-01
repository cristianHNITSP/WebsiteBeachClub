import { useState } from 'react'

const MOCK_BOOKINGS = [
  {
    id: 'BK001',
    room: 'Suite Coral Grande',
    location: 'Cabañas Frida — Chelem',
    checkIn: '2026-04-15',
    checkOut: '2026-04-19',
    status: 'upcoming',
    img: 'https://placehold.co/180x120/003b41/006971?text=Suite',
  },
  {
    id: 'BK002',
    room: 'Estudio Frida Clásico',
    location: 'Casa Frida — Chuburná',
    checkIn: '2026-03-01',
    checkOut: '2026-03-03',
    status: 'past',
    img: 'https://placehold.co/180x120/003b41/006971?text=Estudio',
  },
]

export default function AccountPage({ bookings: externalBookings, favoritesCount, onOpenDetail }) {
  const [activeTab, setActiveTab] = useState('upcoming')
  const displayBookings = externalBookings || MOCK_BOOKINGS

  const upcomingBookings = displayBookings.filter(b => b.status === 'upcoming' || b.status === 'confirmed')
  const pastBookings = displayBookings.filter(b => b.status === 'past')

  const statusColors = {
    upcoming: '#16a34a',
    confirmed: '#006971',
    past: '#7e7480',
  }

  const statusLabels = {
    upcoming: 'Próxima',
    confirmed: 'Confirmada',
    past: 'Completada',
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="account-page-wrapper">
      {/* Hero banner */}
      <header className="account-hero">
        <p className="account-hero__greeting">Bienvenida de vuelta</p>
        <h1 className="account-hero__name">Mi Cuenta</h1>
      </header>

      {/* Stats row */}
      <section className="account-stats" aria-label="Resumen de cuenta">
        <article className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(0,59,65,0.1)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>hotel</span>
          </div>
          <div>
            <div className="stat-value">{upcomingBookings.length}</div>
            <div className="stat-label">Reservas activas</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(126,70,154,0.1)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '20px' }}>favorite</span>
          </div>
          <div>
            <div className="stat-value">{favoritesCount || 0}</div>
            <div className="stat-label">Favoritos</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--gold)', fontSize: '20px' }}>star</span>
          </div>
          <div>
            <div className="stat-value">{pastBookings.length}</div>
            <div className="stat-label">Estancias</div>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(0,105,113,0.1)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--surface-tint)', fontSize: '20px' }}>mail</span>
          </div>
          <div>
            <div className="stat-value">2</div>
            <div className="stat-label">Mensajes</div>
          </div>
        </article>
      </section>

      {/* Main content */}
      <div className="account-content">
        <nav className="tabs" aria-label="Secciones de cuenta">
          {[
            { key: 'upcoming', label: 'Próximas' },
            { key: 'past', label: 'Historial' },
            { key: 'favorites', label: 'Favoritos' },
            { key: 'messages', label: 'Mensajes' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`tab-btn${activeTab === tab.key ? ' tab-btn--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Upcoming */}
        {activeTab === 'upcoming' && (
          <section aria-label="Próximas reservas">
            {upcomingBookings.length === 0 ? (
              <div className="empty-state" role="status">
                <span className="empty-state__icon">🏖️</span>
                <div className="empty-state__title">No tienes reservas próximas</div>
                <div className="empty-state__sub">Cuando reserves una habitación, aparecerá aquí.</div>
              </div>
            ) : (
              upcomingBookings.map(booking => (
                <article key={booking.id} className="booking-card">
                  <div className="booking-card__image">
                    <img src={booking.img} alt={booking.room} />
                    <span
                      className="booking-card__badge"
                      style={{ background: statusColors[booking.status] || 'var(--surface-tint)' }}
                    >
                      {statusLabels[booking.status] || booking.status}
                    </span>
                  </div>
                  <div className="booking-card__body">
                    <div>
                      <h2 className="booking-card__title">{booking.room}</h2>
                      <div className="booking-card__details">
                        <span className="material-symbols-outlined" style={{ fontSize: '12px', marginRight: '4px' }}>location_on</span>
                        {booking.location}
                      </div>
                      <div className="booking-card__details" style={{ marginTop: '6px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '12px', marginRight: '4px' }}>calendar_today</span>
                        <time dateTime={booking.checkIn}>{formatDate(booking.checkIn)}</time>
                        {' → '}
                        <time dateTime={booking.checkOut}>{formatDate(booking.checkOut)}</time>
                      </div>
                    </div>
                    <button
                      className="booking-card__cta"
                      onClick={() => onOpenDetail && onOpenDetail(booking)}
                    >
                      Ver reserva
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>arrow_forward</span>
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        )}

        {/* Past */}
        {activeTab === 'past' && (
          <section aria-label="Historial de reservas">
            {pastBookings.length === 0 ? (
              <div className="empty-state" role="status">
                <span className="empty-state__icon">📋</span>
                <div className="empty-state__title">Sin estancias anteriores</div>
                <div className="empty-state__sub">Tu historial de reservas aparecerá aquí.</div>
              </div>
            ) : (
              pastBookings.map(booking => (
                <article key={booking.id} className="booking-card">
                  <div className="booking-card__image">
                    <img src={booking.img} alt={booking.room} />
                    <span className="booking-card__badge" style={{ background: statusColors[booking.status] }}>
                      {statusLabels[booking.status]}
                    </span>
                  </div>
                  <div className="booking-card__body">
                    <div>
                      <h2 className="booking-card__title">{booking.room}</h2>
                      <div className="booking-card__details">
                        <span className="material-symbols-outlined" style={{ fontSize: '12px', marginRight: '4px' }}>location_on</span>
                        {booking.location}
                      </div>
                      <div className="booking-card__details" style={{ marginTop: '6px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '12px', marginRight: '4px' }}>calendar_today</span>
                        <time dateTime={booking.checkIn}>{formatDate(booking.checkIn)}</time>
                        {' → '}
                        <time dateTime={booking.checkOut}>{formatDate(booking.checkOut)}</time>
                      </div>
                    </div>
                    <button className="booking-card__cta">
                      Reservar de nuevo
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>refresh</span>
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        )}

        {/* Favorites */}
        {activeTab === 'favorites' && (
          <section className="empty-state" aria-label="Favoritos" role="status">
            <span className="empty-state__icon">♡</span>
            <div className="empty-state__title">
              {favoritesCount > 0 ? `${favoritesCount} habitación${favoritesCount !== 1 ? 'es' : ''} en favoritos` : 'Sin favoritos aún'}
            </div>
            <div className="empty-state__sub">
              {favoritesCount > 0
                ? 'Visita las habitaciones para verlas en detalle.'
                : 'Marca con ♡ las habitaciones que te interesen para guardarlas aquí.'}
            </div>
          </section>
        )}

        {/* Messages */}
        {activeTab === 'messages' && (
          <section aria-label="Mensajes">
            {[
              {
                id: 1,
                from: 'Equipo Hoteles Frida',
                subject: 'Confirmación de tu reserva #BK001',
                preview: 'Tu reserva en Suite Coral Grande ha sido confirmada...',
                time: 'Hace 2 horas',
                unread: true,
              },
              {
                id: 2,
                from: 'Concierge',
                subject: 'Recomendaciones para tu estancia en Chelem',
                preview: 'Hola, te compartimos algunas actividades locales...',
                time: 'Hace 1 día',
                unread: false,
              },
            ].map(msg => (
              <article
                key={msg.id}
                style={{
                  display: 'flex',
                  gap: '14px',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: msg.unread ? 'rgba(0,105,113,0.04)' : 'rgba(255,255,255,0.5)',
                  border: msg.unread ? '1px solid rgba(0,105,113,0.12)' : '1px solid rgba(255,255,255,0.3)',
                  marginBottom: '10px',
                  cursor: 'pointer',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary-container), var(--primary))',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  flexShrink: 0,
                  fontSize: '18px',
                }}>
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontWeight: '700', fontSize: '13px', color: 'var(--on-surface)' }}>
                      {msg.from}
                    </p>
                    <time style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--outline)' }}>
                      {msg.time}
                    </time>
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: '600', fontSize: '13px', color: 'var(--on-surface)', marginTop: '2px' }}>
                    {msg.subject}
                  </h2>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--outline)', marginTop: '4px' }}>
                    {msg.preview}
                  </p>
                </div>
                {msg.unread && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--surface-tint)',
                    flexShrink: 0,
                    marginTop: '6px',
                  }} />
                )}
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
