import { useState } from 'react'

function StarRating({ rating }) {
  return (
    <span style={{ color: 'var(--gold)', fontSize: '16px', letterSpacing: '2px' }}>
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
    </span>
  )
}

export default function DetailPage({ room, onGoBack, onConfirm }) {
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(2)

  if (!room) {
    return (
      <div className="detail-page-wrapper">
        <div className="detail-page-inner">
          <button className="back-btn" onClick={onGoBack}>
            <span className="material-symbols-outlined">arrow_back</span>
            Volver
          </button>
          <p>Habitación no encontrada.</p>
        </div>
      </div>
    )
  }

  const locationLabel = room.location === 'chelem' ? 'Cabañas Frida — Chelem, Yucatán' : 'Casa Frida — Chuburná, Yucatán'

  const nights = checkIn && checkOut
    ? Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000))
    : 0

  const subtotal = nights * room.price
  const taxes = subtotal * 0.16
  const total = subtotal + taxes

  const canConfirm = checkIn && checkOut && nights > 0

  const amenityIcons = {
    wifi: { icon: 'wifi', label: 'WiFi incluido' },
    ac: { icon: 'ac_unit', label: 'Aire acond.' },
    parking: { icon: 'local_parking', label: 'Estacionamiento' },
  }

  return (
    <div className="detail-page-wrapper">
      <div className="detail-page-inner">
        <div style={{ paddingTop: '100px' }}>
          <button className="back-btn" onClick={onGoBack}>
            <span className="material-symbols-outlined">arrow_back</span>
            Volver a resultados
          </button>
        </div>

        <div className="detail-layout">
          {/* LEFT COLUMN */}
          <div>
            {/* Hero image */}
            <div className="detail-hero">
              <img src={room.img} alt={room.title} />
              <div className="detail-hero__overlay" />
              <div className="detail-hero__price">
                <div style={{ textAlign: 'right' }}>
                  {room.hasDiscount && (
                    <div style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.6)',
                      textDecoration: 'line-through',
                      textAlign: 'right',
                    }}>
                      MXN ${room.basePrice.toLocaleString()}
                    </div>
                  )}
                  <div className="detail-hero__price-amount">
                    MXN ${room.price.toLocaleString()}
                  </div>
                  <div className="detail-hero__price-label">por noche</div>
                </div>
              </div>
            </div>

            {/* Room info */}
            <div className="detail-card">
              <div className="detail-card__label">
                <span className="material-symbols-outlined" style={{ fontSize: '12px', marginRight: '4px' }}>location_on</span>
                {locationLabel}
              </div>
              <h1 className="detail-card__title">{room.title}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <StarRating rating={room.rating} />
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: '700', fontSize: '14px', color: 'var(--on-surface)' }}>
                  {room.rating.toFixed(1)}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--outline)' }}>
                  ({room.reviews} reseñas)
                </span>
                <span style={{
                  padding: '2px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--surface-container)',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: 'var(--on-surface-variant)',
                  marginLeft: '4px',
                }}>
                  {room.size}
                </span>
              </div>
              <p className="detail-card__desc">{room.desc}</p>

              <div className="detail-amenities">
                {room.amenities.map(a => amenityIcons[a] && (
                  <div key={a} className="detail-amenity">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--surface-tint)' }}>
                      {amenityIcons[a].icon}
                    </span>
                    {amenityIcons[a].label}
                  </div>
                ))}
                <div className="detail-amenity">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--surface-tint)' }}>hotel</span>
                  {room.roomType}
                </div>
              </div>
            </div>

            {/* Extra details */}
            <div className="detail-card">
              <div className="detail-card__label">Políticas & Condiciones</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                {[
                  { icon: 'login', label: 'Check-in', value: '3:00 PM' },
                  { icon: 'logout', label: 'Check-out', value: '12:00 PM' },
                  { icon: 'pets', label: 'Mascotas', value: 'No permitidas' },
                  { icon: 'smoke_free', label: 'Fumar', value: 'No fumador' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--surface-tint)', marginTop: '2px' }}>
                      {item.icon}
                    </span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: '700', color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {item.label}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: '600', color: 'var(--on-surface)', marginTop: '2px' }}>
                        {item.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SUMMARY SIDEBAR */}
          <div>
            <div className="summary-card">
              <div className="summary-card__title">Resumen de reserva</div>

              <div style={{ marginBottom: '16px' }}>
                <label className="field-label">Llegada</label>
                <input
                  type="date"
                  className="field-input"
                  value={checkIn}
                  onChange={e => setCheckIn(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="field-label">Salida</label>
                <input
                  type="date"
                  className="field-input"
                  value={checkOut}
                  onChange={e => setCheckOut(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="field-label">Huéspedes</label>
                <select
                  className="field-select"
                  value={guests}
                  onChange={e => setGuests(Number(e.target.value))}
                >
                  {[1,2,3,4,5,6].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'huésped' : 'huéspedes'}</option>
                  ))}
                </select>
              </div>

              {nights > 0 && (
                <>
                  <div className="summary-row">
                    <span className="summary-label">MXN ${room.price.toLocaleString()} × {nights} noche{nights !== 1 ? 's' : ''}</span>
                    <span className="summary-value">MXN ${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Impuestos (16%)</span>
                    <span className="summary-value">MXN ${Math.round(taxes).toLocaleString()}</span>
                  </div>
                  <div className="summary-total">
                    <span className="summary-total-label">Total</span>
                    <span className="summary-total-amount">MXN ${Math.round(total).toLocaleString()}</span>
                  </div>
                </>
              )}

              {!canConfirm && (
                <div style={{
                  marginTop: '14px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-container)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: 'var(--on-surface-variant)',
                  textAlign: 'center',
                }}>
                  Selecciona fechas para ver el precio total
                </div>
              )}

              <button
                className="summary-confirm"
                disabled={!canConfirm}
                onClick={() => canConfirm && onConfirm && onConfirm({ room, checkIn, checkOut, guests, total: Math.round(total) })}
              >
                {canConfirm ? 'Confirmar reserva' : 'Selecciona tus fechas'}
              </button>

              <div style={{ marginTop: '14px', textAlign: 'center' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--outline)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '12px', marginRight: '4px' }}>lock</span>
                  Pago seguro · Cancelación gratuita
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
