import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Icon, StatCard, Badge } from '@/components/frida'
import NavItem from '@/components/frida/NavItem'
import s from './AccountPage.module.css'

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

const STATUS_VARIANT = {
  upcoming:  { badge: 'tag',     label: 'Próxima' },
  confirmed: { badge: 'tag',     label: 'Confirmada' },
  past:      { badge: 'default', label: 'Completada' },
}

const TABS = [
  { key: 'upcoming',  label: 'Próximas' },
  { key: 'past',      label: 'Historial' },
  { key: 'favorites', label: 'Favoritos' },
  { key: 'messages',  label: 'Mensajes' },
]

const MOCK_MESSAGES = [
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
]

const tabVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.15 } },
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AccountPage({ bookings: externalBookings, favoritesCount = 0, onOpenDetail }) {
  const [activeTab, setActiveTab] = useState('upcoming')
  const displayBookings = externalBookings || MOCK_BOOKINGS

  const upcomingBookings = displayBookings.filter(b => b.status === 'upcoming' || b.status === 'confirmed')
  const pastBookings     = displayBookings.filter(b => b.status === 'past')

  return (
    <div className={s.wrapper}>
      {/* ── Hero banner ── */}
      <header className={s.hero}>
        <motion.p
          className={s.heroGreeting}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Bienvenida de vuelta
        </motion.p>
        <motion.h1
          className={s.heroName}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          Mi Cuenta
        </motion.h1>
      </header>

      {/* ── Stats row ── */}
      <div className={s.statsRow}>
        {[
          { icon: 'hotel',    label: 'Reservas activas', value: upcomingBookings.length, color: 'var(--primary)' },
          { icon: 'favorite', label: 'Favoritos',        value: favoritesCount,          color: 'var(--secondary)' },
          { icon: 'star',     label: 'Estancias',        value: pastBookings.length,     color: 'var(--gold)' },
          { icon: 'mail',     label: 'Mensajes',         value: 2,                       color: 'var(--primary)' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
          >
            <StatCard
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              color={stat.color}
            />
          </motion.div>
        ))}
      </div>

      {/* ── Main content ── */}
      <div className={s.content}>
        {/* Tabs */}
        <nav className={s.tabs} aria-label="Secciones de cuenta">
          {TABS.map(tab => (
            <NavItem
              key={tab.key}
              active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                whiteSpace: 'nowrap',
                color: activeTab === tab.key ? 'var(--primary)' : undefined,
              }}
            >
              {tab.label}
            </NavItem>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} variants={tabVariants} initial="initial" animate="animate" exit="exit">

            {/* ── Upcoming ── */}
            {activeTab === 'upcoming' && (
              <section aria-label="Próximas reservas">
                {upcomingBookings.length === 0 ? (
                  <div className={s.emptyState} role="status">
                    <span className={s.emptyIcon}>🏖️</span>
                    <div className={s.emptyTitle}>No tienes reservas próximas</div>
                    <div className={s.emptySub}>Cuando reserves una habitación, aparecerá aquí.</div>
                  </div>
                ) : (
                  upcomingBookings.map(booking => (
                    <BookingCard key={booking.id} booking={booking} onOpen={onOpenDetail} />
                  ))
                )}
              </section>
            )}

            {/* ── Past ── */}
            {activeTab === 'past' && (
              <section aria-label="Historial de reservas">
                {pastBookings.length === 0 ? (
                  <div className={s.emptyState} role="status">
                    <span className={s.emptyIcon}>📋</span>
                    <div className={s.emptyTitle}>Sin estancias anteriores</div>
                    <div className={s.emptySub}>Tu historial de reservas aparecerá aquí.</div>
                  </div>
                ) : (
                  pastBookings.map(booking => (
                    <BookingCard key={booking.id} booking={booking} pastMode />
                  ))
                )}
              </section>
            )}

            {/* ── Favorites ── */}
            {activeTab === 'favorites' && (
              <div className={s.emptyState} role="status" aria-label="Favoritos">
                <span className={s.emptyIcon}>♡</span>
                <div className={s.emptyTitle}>
                  {favoritesCount > 0
                    ? `${favoritesCount} habitación${favoritesCount !== 1 ? 'es' : ''} en favoritos`
                    : 'Sin favoritos aún'}
                </div>
                <div className={s.emptySub}>
                  {favoritesCount > 0
                    ? 'Visita las habitaciones para verlas en detalle.'
                    : 'Marca con ♡ las habitaciones que te interesen para guardarlas aquí.'}
                </div>
              </div>
            )}

            {/* ── Messages ── */}
            {activeTab === 'messages' && (
              <section aria-label="Mensajes">
                {MOCK_MESSAGES.map(msg => (
                  <article
                    key={msg.id}
                    className={`${s.messageCard} ${msg.unread ? s.messageCardUnread : ''}`}
                  >
                    <div className={s.messageAvatar}>
                      <span className="material-symbols-outlined">mail</span>
                    </div>
                    <div className={s.messageBody}>
                      <div className={s.messageHeader}>
                        <p className={s.messageFrom}>{msg.from}</p>
                        <time className={s.messageTime}>{msg.time}</time>
                      </div>
                      <h2 className={s.messageSubject}>{msg.subject}</h2>
                      <p className={s.messagePreview}>{msg.preview}</p>
                    </div>
                    {msg.unread && <div className={s.unreadDot} />}
                  </article>
                ))}
              </section>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ── BookingCard subcomponent ── */
function BookingCard({ booking, onOpen, pastMode = false }) {
  const meta = STATUS_VARIANT[booking.status] ?? STATUS_VARIANT.past

  return (
    <article className={s.bookingCard}>
      <div className={s.bookingImg}>
        <img src={booking.img} alt={booking.room} />
        <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
          <Badge variant={meta.badge}>{meta.label}</Badge>
        </div>
      </div>
      <div className={s.bookingBody}>
        <div>
          <h2 className={s.bookingTitle}>{booking.room}</h2>
          <div className={s.bookingDetail}>
            <Icon name="location_on" size={12} />
            {booking.location}
          </div>
          <div className={s.bookingDetail}>
            <Icon name="calendar_today" size={12} />
            <time dateTime={booking.checkIn}>{formatDate(booking.checkIn)}</time>
            {' → '}
            <time dateTime={booking.checkOut}>{formatDate(booking.checkOut)}</time>
          </div>
        </div>
        <div className={s.bookingActions}>
          <Button
            variant="primary"
            style={{ fontSize: '12px', padding: '7px 16px' }}
            onClick={() => !pastMode && onOpen?.(booking)}
          >
            {pastMode ? 'Reservar de nuevo' : 'Ver reserva'}
            <Icon name={pastMode ? 'refresh' : 'arrow_forward'} size={12} />
          </Button>
        </div>
      </div>
    </article>
  )
}
