import { useState, useEffect } from 'react'
import { CALENDAR_DATA } from '../../data/admin'
import StatCard from '@/components/frida/StatCard'

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getWeekDates() {
  const today = new Date()
  const startOfWeek = new Date(today)
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  startOfWeek.setDate(diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })
}

const CALENDAR_STATS = [
  { icon: 'login',  label: 'Check-ins esta semana',  value: 8,  color: 'var(--surface-tint)' },
  { icon: 'logout', label: 'Check-outs esta semana', value: 5,  color: 'var(--secondary)' },
  { icon: 'hotel',  label: 'Noches reservadas',       value: 28, color: 'var(--primary)' },
  { icon: 'block',  label: 'Días bloqueados',         value: 2,  color: 'var(--outline)' },
]

export default function CalendarPage({ onNavigate }) {
  const weekDates = getWeekDates()
  const todayNum = new Date().getDate()
  const [property, setProperty] = useState('all')
  const [loading, setLoading] = useState(true)
  useEffect(() => { const t = setTimeout(() => setLoading(false), 1200); return () => clearTimeout(t) }, [])

  return (
    <div>
      {/* Page header */}
      <div className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">Vista semanal</span>
          <h1 className="admin-page-title">
            Calendario de<br />
            <em>Reservaciones</em>
          </h1>
          {/* Property filter */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: 'Todas las propiedades' },
              { key: 'chelem', label: 'Cabañas Frida — Chelem' },
              { key: 'chuburna', label: 'Casa Frida — Chuburná' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setProperty(opt.key)}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-full)',
                  border: `1.5px solid ${property === opt.key ? 'var(--primary)' : 'var(--outline-var)'}`,
                  background: property === opt.key ? 'rgba(0,105,113,0.10)' : 'transparent',
                  color: property === opt.key ? 'var(--primary)' : 'var(--on-surface-var)',
                  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="admin-page-header-actions">
          <div className="admin-page-header-actions-row">
            <button className="btn-outline">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_left</span>
              Anterior
            </button>
            <button className="btn-outline">Hoy</button>
            <button className="btn-outline">
              Siguiente
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
            </button>
            <button className="btn-primary" onClick={() => onNavigate('nueva-reserva')}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
              Nueva reserva
            </button>
          </div>
        </div>
      </div>

      {/* Calendar legend */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { color: 'var(--primary)', label: 'Reserva confirmada' },
          { color: 'var(--secondary)', label: 'Reserva pendiente' },
          { color: 'rgba(255,255,255,0.7)', label: 'En proceso', border: '1px solid rgba(255,255,255,0.5)' },
          { color: 'rgba(0,0,0,0.04)', label: 'Bloqueado', border: '1.5px dashed #cbd5e1' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px',
              height: '12px',
              borderRadius: 'var(--radius-full)',
              background: item.color,
              border: item.border || 'none',
            }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: '700', color: 'var(--on-surface-variant)' }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="calendar-grid" style={{ overflowX: 'auto' }}>
        {/* Header */}
        <div className="calendar-header">
          <div className="calendar-room-col">Habitación</div>
          <div className="calendar-days">
            {weekDates.map((date, i) => (
              <div
                key={i}
                className={`calendar-day-cell${date.getDate() === todayNum ? ' calendar-day-cell--today' : ''}`}
              >
                <span className="calendar-day-name">{DAYS[i]}</span>
                <span className="calendar-day-num">{date.getDate()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Room rows */}
        {CALENDAR_DATA.map((roomRow) => (
          <div key={roomRow.roomId} className="calendar-row">
            <div className="calendar-room-info">
              <div className="calendar-room-name">{roomRow.roomName}</div>
              <div className="calendar-room-type">{roomRow.roomType}</div>
            </div>
            <div className="calendar-row-cells">
              {/* Empty cells */}
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="calendar-cell" />
              ))}

              {/* Booking bars */}
              {roomRow.bookings.map((booking, bIdx) => {
                const cellWidth = 96
                const left = booking.startDay * cellWidth + 6
                const width = booking.span * cellWidth - 12

                const bookingClass = {
                  primary: 'calendar-booking--primary',
                  secondary: 'calendar-booking--secondary',
                  blocked: 'calendar-booking--blocked',
                  glass: 'calendar-booking--glass',
                }[booking.type] || 'calendar-booking--glass'

                return (
                  <div
                    key={bIdx}
                    className={`calendar-booking ${bookingClass}`}
                    style={{ left: `${left}px`, width: `${width}px` }}
                    title={booking.guestName}
                  >
                    {booking.avatar && (
                      <div className="calendar-booking__avatar">
                        <img
                          src={booking.avatar}
                          alt={booking.guestName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    <div>
                      <div className="calendar-booking__name">{booking.guestName}</div>
                      <div className="calendar-booking__sub">{booking.span} noche{booking.span !== 1 ? 's' : ''}</div>
                    </div>
                    {booking.type === 'primary' && (
                      <div style={{ marginLeft: 'auto' }}>
                        <span className="calendar-booking__status">Conf.</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary stats below calendar */}
      <div className="inventory-grid">
        {CALENDAR_STATS.map((stat, i) => (
          <StatCard key={i} loading={loading} {...stat} />
        ))}
      </div>

    </div>
  )
}
