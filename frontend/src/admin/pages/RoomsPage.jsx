import { useState } from 'react'
import { ROOMS_DATA } from '../../data/admin'

export default function RoomsPage() {
  const [selectedRoom, setSelectedRoom] = useState(ROOMS_DATA[0])

  return (
    <div>
      {/* Page header */}
      <div className="admin-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className="admin-page-eyebrow">Room Management</span>
            <h1 className="admin-page-title">
              Configuración de<br />
              <em>Habitaciones</em>
            </h1>
            <p className="admin-page-sub">
              Gestiona precios, disponibilidad, amenidades y estado operacional
              de cada habitación y suite.
            </p>
          </div>
          <button className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
            Nueva habitación
          </button>
        </div>
      </div>

      {/* Room config grid */}
      <div className="room-config-grid">
        {/* Main hero card */}
        <div>
          <div className="room-config-hero" onClick={() => {}}>
            <img src={selectedRoom.img} alt={selectedRoom.name} />
            <div className="room-config-hero__overlay" />
            <div className="room-config-hero__badge">
              <span className={`status-badge ${selectedRoom.status === 'active' ? 'status-badge--active' : 'status-badge--maintenance'}`}>
                {selectedRoom.status === 'active' ? 'Activa' : 'Mantenimiento'}
              </span>
            </div>
            <div className="room-config-hero__info">
              <div className="room-config-hero__eyebrow">{selectedRoom.type}</div>
              <div className="room-config-hero__title">{selectedRoom.name}</div>
            </div>
          </div>

          {/* Detail cards below hero */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px' }}>
            <div className="admin-card">
              <span className="admin-card__label">Tarifa base / noche</span>
              <div style={{
                fontFamily: 'var(--font-headline)',
                fontSize: '2rem',
                color: 'var(--on-surface)',
                lineHeight: '1',
              }}>
                MXN ${selectedRoom.rate.toLocaleString()}
              </div>
            </div>
            <div className="admin-card admin-card--primary">
              <span className="admin-card__label">Estado</span>
              <div style={{
                fontFamily: 'var(--font-headline)',
                fontSize: '1.5rem',
                color: '#fff',
                lineHeight: '1',
                textTransform: 'capitalize',
              }}>
                {selectedRoom.status === 'active' ? 'Disponible' : 'En mantenimiento'}
              </div>
              <div className="metric-card--primary metric-card__sub" style={{ marginTop: '8px' }}>
                {selectedRoom.status === 'active' ? 'Lista para reservas' : 'Estimado: hoy 6 PM'}
              </div>
            </div>
            <div className="admin-card" style={{ background: 'var(--tertiary-fixed)' }}>
              <span className="admin-card__label" style={{ color: 'var(--tertiary)' }}>Ocupación mes</span>
              <div style={{
                fontFamily: 'var(--font-headline)',
                fontSize: '2rem',
                color: 'var(--on-surface)',
                lineHeight: '1',
              }}>
                78%
              </div>
            </div>
          </div>

          {/* Bottom room list */}
          <div style={{ marginTop: '32px' }}>
            <h3 className="admin-section-title">Todas las Habitaciones</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {ROOMS_DATA.map(room => (
                <div
                  key={room.id}
                  style={{
                    borderRadius: 'var(--radius-xl)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: selectedRoom.id === room.id ? '2px solid var(--primary)' : '2px solid transparent',
                    transition: 'border-color 0.2s',
                  }}
                  onClick={() => setSelectedRoom(room)}
                >
                  <div style={{ position: 'relative', height: '180px' }}>
                    <img
                      src={room.img}
                      alt={room.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(23,28,33,0.7), transparent)',
                    }} />
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '16px',
                      right: '12px',
                    }}>
                      <div style={{
                        fontFamily: 'var(--font-headline)',
                        fontSize: '1rem',
                        color: '#fff',
                        fontWeight: '700',
                      }}>
                        {room.name}
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '4px',
                      }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                          {room.type}
                        </span>
                        <span className={`status-badge ${room.status === 'active' ? 'status-badge--active' : 'status-badge--maintenance'}`}>
                          {room.status === 'active' ? 'Activa' : 'Mant.'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{
                    padding: '14px 16px',
                    background: 'var(--surface-container-low)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: '600' }}>
                      MXN ${room.rate.toLocaleString()} / noche
                    </span>
                    <button className="btn-outline" style={{ height: '30px', padding: '0 12px', fontSize: '10px' }}>
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="room-config-sidebar">
          <div className="admin-card">
            <span className="admin-card__label">Acciones rápidas</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {[
                { icon: 'edit', label: 'Editar detalles', action: () => {} },
                { icon: 'photo_camera', label: 'Gestionar fotos', action: () => {} },
                { icon: 'price_change', label: 'Actualizar tarifas', action: () => {} },
                { icon: 'block', label: 'Bloquear fechas', action: () => {} },
                { icon: 'build', label: 'Reportar mantenimiento', action: () => {} },
              ].map((item, i) => (
                <button
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--outline-variant)',
                    background: 'var(--surface-container-lowest)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--on-surface)',
                    transition: 'background 0.2s',
                  }}
                  onClick={item.action}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--surface-tint)' }}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-card">
            <span className="admin-card__label">Próximas reservas</span>
            {[
              { guest: 'Ana Martínez', dates: 'Abr 1–5', nights: 4 },
              { guest: 'Elena Castro', dates: 'Abr 10–14', nights: 4 },
              { guest: 'Patricia López', dates: 'Abr 20–24', nights: 4 },
            ].map((res, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: i < 2 ? '1px solid var(--surface-container-highest)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: '700', fontSize: '13px', color: 'var(--on-surface)' }}>
                    {res.guest}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--outline)', marginTop: '2px' }}>
                    {res.dates}
                  </div>
                </div>
                <span className="chip">{res.nights} noches</span>
              </div>
            ))}
          </div>

          <div className="admin-card admin-card--primary">
            <span className="admin-card__label">RevPAR</span>
            <div style={{ fontFamily: 'var(--font-headline)', fontSize: '2.5rem', color: '#fff', lineHeight: '1', marginBottom: '8px' }}>
              $287.70
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
              Revenue per available room · +8% MoM
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
