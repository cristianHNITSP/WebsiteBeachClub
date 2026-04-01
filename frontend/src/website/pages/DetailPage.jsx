import { useState } from 'react'
import { Button, Icon, SurfaceCard } from '@/components/frida'
import { Field, Input, Select } from '@/components/frida'
import s from './DetailPage.module.css'

const AMENITY_META = {
  wifi:    { icon: 'wifi',           label: 'WiFi incluido' },
  ac:      { icon: 'ac_unit',        label: 'Aire acond.' },
  parking: { icon: 'local_parking',  label: 'Estacionamiento' },
}

const POLICIES = [
  { icon: 'login',      label: 'Check-in',  value: '3:00 PM' },
  { icon: 'logout',     label: 'Check-out', value: '12:00 PM' },
  { icon: 'pets',       label: 'Mascotas',  value: 'No permitidas' },
  { icon: 'smoke_free', label: 'Fumar',     value: 'No fumador' },
]

function StarRating({ rating }) {
  const full = Math.round(rating)
  return (
    <span style={{ color: 'var(--gold)', fontSize: '16px', letterSpacing: '2px' }}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
    </span>
  )
}

export default function DetailPage({ room, onGoBack, onConfirm }) {
  const [checkIn,  setCheckIn]  = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests,   setGuests]   = useState(2)

  if (!room) {
    return (
      <div className={s.wrapper}>
        <div className={s.inner}>
          <div className={s.backRow}>
            <Button variant="ghost" onClick={onGoBack}>
              <Icon name="arrow_back" size={16} /> Volver
            </Button>
          </div>
          <p>Habitación no encontrada.</p>
        </div>
      </div>
    )
  }

  const locationLabel = room.location === 'chelem'
    ? 'Cabañas Frida — Chelem, Yucatán'
    : 'Casa Frida — Chuburná, Yucatán'

  const nights   = checkIn && checkOut
    ? Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000))
    : 0
  const subtotal = nights * room.price
  const taxes    = subtotal * 0.16
  const total    = subtotal + taxes
  const canConfirm = checkIn && checkOut && nights > 0

  return (
    <div className={s.wrapper}>
      <div className={s.inner}>
        <div className={s.backRow}>
          <Button variant="ghost" onClick={onGoBack}>
            <Icon name="arrow_back" size={16} /> Volver a resultados
          </Button>
        </div>

        <div className={s.layout}>
          {/* ── LEFT COLUMN ── */}
          <div>
            {/* Hero image */}
            <div className={s.hero}>
              <img src={room.img} alt={room.title} />
              <div className={s.heroOverlay} />
              <div className={s.heroPrice}>
                {room.hasDiscount && (
                  <div className={s.heroPriceOriginal}>
                    MXN ${room.basePrice.toLocaleString()}
                  </div>
                )}
                <div className={s.heroPriceAmount}>MXN ${room.price.toLocaleString()}</div>
                <div className={s.heroPriceLabel}>por noche</div>
              </div>
            </div>

            {/* Room info card */}
            <SurfaceCard className={s.infoCard}>
              <div className={s.cardLabel}>
                <Icon name="location_on" size={12} />
                {locationLabel}
              </div>
              <h1 className={s.cardTitle}>{room.title}</h1>

              <div className={s.ratingRow}>
                <StarRating rating={room.rating} />
                <span className={s.ratingNum}>{room.rating.toFixed(1)}</span>
                <span className={s.ratingCount}>({room.reviews} reseñas)</span>
                {room.size && <span className={s.sizeBadge}>{room.size}</span>}
              </div>

              <p className={s.desc}>{room.desc}</p>

              <ul className={s.amenities}>
                {room.amenities.map(a => AMENITY_META[a] && (
                  <li key={a} className={s.amenityItem}>
                    <Icon name={AMENITY_META[a].icon} size={14} />
                    {AMENITY_META[a].label}
                  </li>
                ))}
                <li className={s.amenityItem}>
                  <Icon name="hotel" size={14} />
                  {room.roomType}
                </li>
              </ul>
            </SurfaceCard>

            {/* Policies card */}
            <SurfaceCard className={s.infoCard}>
              <div className={s.cardLabel}>Políticas &amp; Condiciones</div>
              <dl className={s.policiesGrid}>
                {POLICIES.map(item => (
                  <div key={item.label} className={s.policyItem}>
                    <Icon name={item.icon} size={18} style={{ color: 'var(--primary)', marginTop: '2px' }} />
                    <div>
                      <dt className={s.policyLabel}>{item.label}</dt>
                      <dd className={s.policyValue}>{item.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </SurfaceCard>
          </div>

          {/* ── BOOKING SIDEBAR ── */}
          <aside>
            <SurfaceCard className={s.summaryCard}>
              <div className={s.summaryTitle}>Resumen de reserva</div>

              <form onSubmit={e => e.preventDefault()}>
                <div className={s.fieldGap}>
                  <Field label="Llegada">
                    <Input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
                  </Field>
                </div>
                <div className={s.fieldGap}>
                  <Field label="Salida">
                    <Input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
                  </Field>
                </div>
                <div className={s.fieldGap}>
                  <Field label="Huéspedes">
                    <Select value={guests} onChange={e => setGuests(Number(e.target.value))}>
                      {[1,2,3,4,5,6].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'huésped' : 'huéspedes'}</option>
                      ))}
                    </Select>
                  </Field>
                </div>

                {nights > 0 && (
                  <>
                    <div className={s.summaryRow}>
                      <span className={s.summaryLabel}>
                        MXN ${room.price.toLocaleString()} × {nights} noche{nights !== 1 ? 's' : ''}
                      </span>
                      <span className={s.summaryValue}>MXN ${subtotal.toLocaleString()}</span>
                    </div>
                    <div className={s.summaryRow}>
                      <span className={s.summaryLabel}>Impuestos (16%)</span>
                      <span className={s.summaryValue}>MXN ${Math.round(taxes).toLocaleString()}</span>
                    </div>
                    <div className={s.summaryTotal}>
                      <span className={s.summaryTotalLabel}>Total</span>
                      <span className={s.summaryTotalAmount}>MXN ${Math.round(total).toLocaleString()}</span>
                    </div>
                  </>
                )}

                {!canConfirm && (
                  <div className={s.datePlaceholder}>
                    Selecciona fechas para ver el precio total
                  </div>
                )}

                <Button
                  variant={canConfirm ? 'primary' : 'ghost'}
                  disabled={!canConfirm}
                  style={{ width: '100%', height: '48px', marginTop: '18px', fontSize: '14px', justifyContent: 'center' }}
                  onClick={() => canConfirm && onConfirm?.({ room, checkIn, checkOut, guests, total: Math.round(total) })}
                >
                  {canConfirm ? 'Confirmar reserva' : 'Selecciona tus fechas'}
                </Button>

                <div className={s.secureNote}>
                  <Icon name="lock" size={12} />
                  Pago seguro · Cancelación gratuita
                </div>
              </form>
            </SurfaceCard>
          </aside>
        </div>
      </div>
    </div>
  )
}
