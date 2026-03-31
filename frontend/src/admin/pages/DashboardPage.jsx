import { STATS, BOOKINGS_DATA } from '../../data/admin'

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const REVENUE = [62, 75, 88, 72, 95, 78, 84, 92, 70, 88, 96, 100]

const ACTIVITY = [
  {
    icon: 'hotel',
    iconClass: 'activity-icon--secondary',
    title: 'Nueva reserva confirmada',
    sub: 'Ana Martínez · Suite Coral Grande · 4 noches',
    time: 'Hace 12 min',
  },
  {
    icon: 'star',
    iconClass: 'activity-icon--gold',
    title: 'Reseña 5 estrellas recibida',
    sub: 'Carlos R. · "Experiencia increíble, el personal es excepcional"',
    time: 'Hace 1 hora',
  },
  {
    icon: 'cleaning_services',
    iconClass: 'activity-icon--surface',
    title: 'Housekeeping completado',
    sub: 'Suite Horizonte Azul · Lista para check-in',
    time: 'Hace 2 horas',
  },
  {
    icon: 'payments',
    iconClass: 'activity-icon--secondary',
    title: 'Pago procesado',
    sub: 'Laura J. · Villa Chuburná Sunset · MXN $15,600',
    time: 'Hace 3 horas',
  },
  {
    icon: 'logout',
    iconClass: 'activity-icon--surface',
    title: 'Check-out completado',
    sub: 'Miguel T. · Cabaña del Manglar',
    time: 'Hace 5 horas',
  },
]

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div>
      {/* Page header */}
      <div className="admin-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className="admin-page-eyebrow">Operational Insight</span>
            <h1 className="admin-page-title">
              Hoteles Frida<br />
              <em>Performance Dashboard</em>
            </h1>
            <p className="admin-page-sub">
              Monitoreo en tiempo real de ocupación, ingresos y actividad operacional
              de ambas propiedades.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="admin-date" style={{ textTransform: 'capitalize' }}>{today}</div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
              <button className="btn-outline">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
                Exportar
              </button>
              <button className="btn-primary">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                Nueva reserva
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="metrics-grid">
        {/* Occupancy */}
        <div className="metric-card metric-card--light">
          <div className="metric-card__label">Ocupación actual</div>
          <div>
            <div className="metric-card__value">{STATS.occupancy}%</div>
            <div className="metric-card__trend">
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#16a34a' }}>trending_up</span>
              +6% vs. semana pasada
            </div>
          </div>
          <div style={{
            height: '4px',
            borderRadius: '2px',
            background: 'var(--surface-container-high)',
            marginTop: '16px',
          }}>
            <div style={{
              height: '100%',
              width: `${STATS.occupancy}%`,
              background: 'linear-gradient(90deg, var(--surface-tint), var(--secondary))',
              borderRadius: '2px',
            }} />
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '8px',
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            color: 'var(--outline)',
          }}>
            <span>{STATS.available} disponibles</span>
            <span>{STATS.total} total</span>
          </div>
        </div>

        {/* ADR */}
        <div className="metric-card metric-card--primary">
          <div className="metric-card__label">Tarifa promedio diaria</div>
          <div>
            <div className="metric-card__value" style={{ fontSize: '3.5rem' }}>
              ${STATS.adr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="metric-card__trend">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>trending_up</span>
              +12% vs. mes anterior
            </div>
            <div className="metric-card--primary metric-card__sub">
              ADR por encima del objetivo trimestral de $320 MXN
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="metric-card metric-card--gold">
          <div className="metric-card__label">Ingresos del día</div>
          <div>
            <div className="metric-card__value">
              ${(STATS.dailyRevenue / 1000).toFixed(1)}k
            </div>
            <div className="metric-card__trend">
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--tertiary)' }}>trending_up</span>
              MXN proyectados
            </div>
          </div>
        </div>
      </div>

      {/* Chart + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '32px', marginBottom: '48px' }}>
        {/* Chart */}
        <div>
          <div className="chart-area">
            <div className="chart-header">
              <div className="chart-title">Revenue Growth</div>
              <div className="chart-legend">
                <div className="chart-legend__item">
                  <div className="chart-legend__dot" style={{ background: 'var(--primary)' }} />
                  Ingresos 2026
                </div>
                <div className="chart-legend__item">
                  <div className="chart-legend__dot" style={{ background: 'var(--secondary-container)' }} />
                  Proyección
                </div>
              </div>
            </div>
            <div className="chart-bars">
              {REVENUE.map((val, i) => (
                <div key={i} className="chart-bar-wrap">
                  <div
                    className="chart-bar"
                    style={{ height: `${val}%` }}
                    title={`${MONTHS[i]}: ${val}%`}
                  />
                </div>
              ))}
            </div>
            <div className="chart-months">
              {MONTHS.map(m => (
                <span key={m} className="chart-month">{m}</span>
              ))}
            </div>
          </div>

          {/* Featured suite */}
          <div className="featured-suite">
            <img
              src="https://placehold.co/1200x400/003b41/006971?text=Suite+Horizonte+Azul"
              alt="Suite Horizonte Azul"
            />
            <div className="featured-suite__overlay" />
            <div className="featured-suite__content">
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: '10px',
                fontWeight: '700',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--tertiary-fixed)',
                display: 'block',
                marginBottom: '12px',
              }}>
                Habitación premium
              </span>
              <h3 style={{
                fontFamily: 'var(--font-headline)',
                fontSize: '1.75rem',
                color: '#fff',
                marginBottom: '12px',
              }}>
                Suite Horizonte Azul
              </h3>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.75)',
                lineHeight: '1.65',
                marginBottom: '20px',
              }}>
                Próximo check-in: 3 de Abril · Sofia Hernández
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <span className="status-badge status-badge--maintenance">
                  En preparación
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="activity-feed">
          <div className="activity-feed__title">Actividad Reciente</div>
          {ACTIVITY.map((item, i) => (
            <div key={i} className="activity-item">
              <div className={`activity-icon ${item.iconClass}`}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {item.icon}
                </span>
              </div>
              <div>
                <div className="activity-title">{item.title}</div>
                <div className="activity-sub">{item.sub}</div>
                <div className="activity-time">{item.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory health section */}
      <div className="inventory-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
          <div>
            <span className="admin-page-eyebrow" style={{ marginBottom: '8px' }}>Inventory Status</span>
            <h2 className="admin-section-title" style={{ marginBottom: 0 }}>Resumen Operacional</h2>
          </div>
          <button className="btn-outline">Ver detalle completo</button>
        </div>

        <div className="inventory-grid">
          {[
            { label: 'Habitaciones ocupadas', value: `${STATS.total - STATS.available}/${STATS.total}`, sub: 'Ocupación 84% · Por encima del objetivo' },
            { label: 'Check-ins hoy', value: '8', sub: 'Próximo: Ana Martínez · 3:00 PM' },
            { label: 'Check-outs hoy', value: '5', sub: 'Completados: 3 · Pendientes: 2' },
            { label: 'En mantenimiento', value: '1', sub: 'Suite Horizonte Azul · Listo 6 PM' },
          ].map((item, i) => (
            <div key={i} className="inventory-card">
              <span className="inventory-card__label">{item.label}</span>
              <div className="inventory-card__value">{item.value}</div>
              <div className="inventory-card__sub">{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
