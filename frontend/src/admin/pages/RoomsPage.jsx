import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ROOMS_DATA } from '../../data/admin'
import { SkeletonRoomHero, SkeletonDetailCard, SkeletonRoomCard, SkeletonReservationList } from '@/components/frida/Skeleton'
import StatCard from '@/components/frida/StatCard'
import SectionPanel from '../components/SectionPanel'

const PAGE_SIZE = 4

const UPCOMING_BOOKINGS = [
  { id: 'BK001', guest: 'Ana Martínez',     room: 'Suite Coral Grande',       dates: 'Abr 1–5',    nights: 4,  status: 'confirmed' },
  { id: 'BK002', guest: 'Elena Castro',      room: 'Suite Coral Grande',       dates: 'Abr 10–14',  nights: 4,  status: 'confirmed' },
  { id: 'BK003', guest: 'Patricia López',    room: 'Suite Horizonte Azul',     dates: 'Abr 20–24',  nights: 4,  status: 'pending'   },
  { id: 'BK004', guest: 'Carlos Rodríguez',  room: 'Cabaña del Manglar',       dates: 'Abr 22–25',  nights: 3,  status: 'confirmed' },
  { id: 'BK005', guest: 'Sofia Hernández',   room: 'Suite Horizonte Azul',     dates: 'May 1–7',    nights: 6,  status: 'confirmed' },
  { id: 'BK006', guest: 'Laura Jiménez',     room: 'Villa Chuburná Sunset',    dates: 'May 3–8',    nights: 5,  status: 'confirmed' },
  { id: 'BK007', guest: 'Miguel Torres',     room: 'Habitación Familiar Arena',dates: 'May 10–13',  nights: 3,  status: 'pending'   },
  { id: 'BK008', guest: 'Fernando Díaz',     room: 'Cabaña Brisa Marina',      dates: 'May 15–18',  nights: 3,  status: 'confirmed' },
  { id: 'BK009', guest: 'Valeria Montoya',   room: 'Suite Frida Clásica',      dates: 'May 20–23',  nights: 3,  status: 'confirmed' },
  { id: 'BK010', guest: 'Andrés Morales',    room: 'Villa Flamingo Rosado',    dates: 'Jun 1–6',    nights: 5,  status: 'pending'   },
  { id: 'BK011', guest: 'Isabella Reyes',    room: 'Estudio Palapa Norte',     dates: 'Jun 5–7',    nights: 2,  status: 'confirmed' },
  { id: 'BK012', guest: 'Roberto Sánchez',   room: 'Suite Cenote Esmeralda',   dates: 'Jun 12–17',  nights: 5,  status: 'confirmed' },
]

export default function RoomsPage({ onNavigate, onEditRoom, onGestionarFotos }) {
  const [selectedRoom, setSelectedRoom] = useState(ROOMS_DATA[0])
  const [searchQuery, setSearchQuery]   = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage]   = useState(0)

  const filtered = useMemo(() => ROOMS_DATA.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  }), [statusFilter, searchQuery])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  const [loading, setLoading] = useState(true)
  useEffect(() => { const t = setTimeout(() => setLoading(false), 1400); return () => clearTimeout(t) }, [])

  const heroRef = useRef(null)

  const handleSelectRoom = (room) => {
    setSelectedRoom(room)
    heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const [showReservations, setShowReservations] = useState(false)

  const handleFilter = (f) => { setStatusFilter(f); setCurrentPage(0) }
  const handleSearch = (e) => { setSearchQuery(e.target.value); setCurrentPage(0) }

  useEffect(() => {
    if (showReservations) window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [showReservations]) // eslint-disable-line

  return (
    <AnimatePresence mode="wait" initial={false}>
      {showReservations ? (
        <motion.div
          key="reservations"
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 32 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <SectionPanel
            eyebrow="Habitaciones"
            title={<>Próximas<br /><em>Reservas</em></>}
            subtitle={`${UPCOMING_BOOKINGS.length} reservas confirmadas y pendientes`}
            onBack={() => setShowReservations(false)}
          >
            {/* Stats con StatCard */}
            <div className="inventory-grid" style={{ marginBottom: '28px' }}>
              <StatCard icon="calendar_month" label="Total reservas" value={UPCOMING_BOOKINGS.length}                                       color="var(--primary)"   />
              <StatCard icon="check_circle"   label="Confirmadas"    value={UPCOMING_BOOKINGS.filter(b => b.status === 'confirmed').length}  color="#16a34a"          />
              <StatCard icon="schedule"       label="Pendientes"     value={UPCOMING_BOOKINGS.filter(b => b.status === 'pending').length}    color="#d97706"          />
              <StatCard icon="hotel"          label="Noches totales" value={UPCOMING_BOOKINGS.reduce((s, b) => s + b.nights, 0)}            color="var(--secondary)" />
            </div>

            {/* Lista con animación escalonada */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {UPCOMING_BOOKINGS.map((booking, i) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: i * 0.04 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    background: 'var(--surface-container-low)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '16px 20px',
                    border: '1px solid var(--outline-var)',
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                    background: 'var(--surface-container-high)',
                    display: 'grid', placeItems: 'center',
                    fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800,
                    color: 'var(--outline)',
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', color: 'var(--on-surface)' }}>
                      {booking.guest}
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--outline)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {booking.room}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>
                      {booking.dates}
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--outline)', marginTop: '2px' }}>
                      {booking.nights} noche{booking.nights !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <span style={{
                    flexShrink: 0, padding: '4px 12px', borderRadius: 'var(--radius-full)',
                    fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800,
                    background: booking.status === 'confirmed' ? 'rgba(22,163,74,0.12)' : 'rgba(217,119,6,0.12)',
                    color:      booking.status === 'confirmed' ? '#16a34a'              : '#d97706',
                  }}>
                    {booking.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                  </span>
                </motion.div>
              ))}
            </div>
          </SectionPanel>
        </motion.div>
      ) : (
        <motion.div
          key="rooms"
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -32 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
      {/* Page header */}
      <div className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">Gestión de habitaciones</span>
          <h1 className="admin-page-title">
            Configuración de<br />
            <em>Habitaciones</em>
          </h1>
        </div>
        <div className="admin-page-header-actions">
          <div className="admin-page-header-actions-row">
            <button className="btn-primary" onClick={() => onNavigate('nueva-habitacion')}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
              Nueva habitación
            </button>
          </div>
        </div>
      </div>

      {/* Room config grid */}
      <div className="room-config-grid">

        {/* ── Skeleton: top (hero + detail cards) ── */}
        {loading && (
          <div className="room-config-main-top">
            <SkeletonRoomHero />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px' }}>
              <SkeletonDetailCard />
              <SkeletonDetailCard />
              <SkeletonDetailCard />
            </div>
          </div>
        )}

        {/* ── Skeleton: bottom (room list) ── */}
        {loading && (
          <div className="room-config-main-bottom">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <SkeletonRoomCard />
              <SkeletonRoomCard />
              <SkeletonRoomCard />
              <SkeletonRoomCard />
            </div>
          </div>
        )}

        {/* ── Real content: top (hero + detail cards) ── */}
        {!loading && <div className="room-config-main-top">
          {/* ── Hero card ── */}
          <div className="room-config-hero" ref={heroRef}>
            {/* Animated image — crossfades + slides from below on room change */}
            <AnimatePresence>
              <motion.img
                key={selectedRoom.id}
                src={selectedRoom.img}
                alt={selectedRoom.name}
                initial={{ opacity: 0, scale: 1.07, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%', objectFit: 'cover',
                }}
              />
            </AnimatePresence>

            <div className="room-config-hero__overlay" />

            {/* Animated overlay info */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedRoom.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, delay: 0.1 }}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              >
                <div className="room-config-hero__badge">
                  <span className={`status-badge ${selectedRoom.status === 'active' ? 'status-badge--active' : 'status-badge--maintenance'}`}>
                    {selectedRoom.status === 'active' ? 'Activa' : 'Mantenimiento'}
                  </span>
                </div>
                <div className="room-config-hero__info">
                  <div className="room-config-hero__eyebrow">{selectedRoom.type}</div>
                  <div className="room-config-hero__title">{selectedRoom.name}</div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Edit button on hero */}
            <button
              className="btn-primary"
              style={{
                position: 'absolute', bottom: '20px', right: '20px', zIndex: 10,
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              }}
              onClick={() => onEditRoom(selectedRoom)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
              Editar habitación
            </button>
          </div>

          {/* Detail cards — animate on room change */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRoom.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="room-detail-cards"
            >
              <div className="admin-card">
                <span className="admin-card__label">Tarifa base / noche</span>
                <div style={{ fontFamily: 'var(--font-headline)', fontSize: '2rem', color: 'var(--on-surface)', lineHeight: '1' }}>
                  MXN ${selectedRoom.rate.toLocaleString()}
                </div>
              </div>
              <div className="admin-card admin-card--primary">
                <span className="admin-card__label">Estado</span>
                <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1.5rem', color: '#fff', lineHeight: '1', textTransform: 'capitalize' }}>
                  {selectedRoom.status === 'active' ? 'Disponible' : 'En mantenimiento'}
                </div>
                <div className="metric-card--primary metric-card__sub" style={{ marginTop: '8px' }}>
                  {selectedRoom.status === 'active' ? 'Lista para reservas' : 'Estimado: hoy 6 PM'}
                </div>
              </div>
              <div className="admin-card" style={{ background: 'var(--tertiary-fixed)' }}>
                <span className="admin-card__label" style={{ color: 'var(--tertiary)' }}>Ocupación mes</span>
                <div style={{ fontFamily: 'var(--font-headline)', fontSize: '2rem', color: 'var(--on-surface)', lineHeight: '1' }}>78%</div>
              </div>
            </motion.div>
          </AnimatePresence>

        </div>}

        {/* ── Real content: bottom (room list) ── */}
        {!loading && <div className="room-config-main-bottom">
          <div style={{ marginTop: '0' }}>

            {/* Fila 1: título + paginación */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="admin-section-title" style={{ marginBottom: 0 }}>Todas las Habitaciones</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage === 0}
                  style={{
                    width: '32px', height: '32px', borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--outline-var)', background: 'transparent',
                    cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 0 ? 0.35 : 1,
                    display: 'grid', placeItems: 'center',
                    color: 'var(--on-surface)', transition: 'opacity 0.2s',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
                </button>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--outline)', minWidth: '44px', textAlign: 'center' }}>
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage >= totalPages - 1}
                  style={{
                    width: '32px', height: '32px', borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--outline-var)', background: 'transparent',
                    cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage >= totalPages - 1 ? 0.35 : 1,
                    display: 'grid', placeItems: 'center',
                    color: 'var(--on-surface)', transition: 'opacity 0.2s',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
                </button>
              </div>
            </div>

            {/* Fila 2: búsqueda + filtros */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'var(--surface-container)', border: '1px solid var(--outline-var)',
                borderRadius: 'var(--radius-full)', padding: '8px 16px', flex: '1', minWidth: '180px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--outline)' }}>search</span>
                <input
                  type="text"
                  placeholder="Buscar habitación..."
                  value={searchQuery}
                  onChange={handleSearch}
                  style={{
                    border: 'none', background: 'transparent', outline: 'none',
                    fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--on-surface)',
                    width: '100%',
                  }}
                />
              </div>
              {['all', 'active', 'maintenance'].map(s => (
                <button
                  key={s}
                  onClick={() => handleFilter(s)}
                  style={{
                    padding: '8px 14px', borderRadius: 'var(--radius-full)',
                    border: `1.5px solid ${statusFilter === s ? 'var(--primary)' : 'var(--outline-var)'}`,
                    background: statusFilter === s ? 'rgba(0,105,113,0.10)' : 'transparent',
                    color: statusFilter === s ? 'var(--primary)' : 'var(--on-surface-var)',
                    fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {{ all: 'Todos', active: 'Disponibles', maintenance: 'Mantenimiento' }[s]}
                </button>
              ))}
            </div>

            {/* Grid con altura mínima fija para evitar saltos de scroll al paginar/filtrar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', minHeight: '492px', alignContent: 'start' }}>
              <AnimatePresence mode="popLayout">
                {paginated.map(room => (
                  <motion.div
                    key={room.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.22 }}
                    style={{
                      borderRadius: 'var(--radius-xl)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: selectedRoom.id === room.id ? '2px solid var(--primary)' : '2px solid transparent',
                      transition: 'border-color 0.2s',
                    }}
                    onClick={() => handleSelectRoom(room)}
                  >
                    {/* Card image area */}
                    <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
                      <AnimatePresence mode="wait">
                        {room.id === selectedRoom.id ? (
                          /* Placeholder — this image is "shown" in the hero */
                          <motion.div
                            key="placeholder"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{
                              position: 'absolute', inset: 0,
                              background: 'linear-gradient(135deg, var(--primary-container, rgba(0,105,113,0.25)), var(--surface-container-high))',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--primary)', opacity: 0.35 }}>
                              hotel
                            </span>
                          </motion.div>
                        ) : (
                          /* Real image — flies up when selected */
                          <motion.img
                            key="img"
                            src={room.img}
                            alt={room.name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -28, scale: 0.95 }}
                            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                            style={{
                              position: 'absolute', inset: 0,
                              width: '100%', height: '100%', objectFit: 'cover',
                            }}
                          />
                        )}
                      </AnimatePresence>
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to top, rgba(23,28,33,0.7), transparent)',
                        pointerEvents: 'none',
                      }} />
                      <div style={{ position: 'absolute', bottom: '12px', left: '16px', right: '12px' }}>
                        <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1rem', color: '#fff', fontWeight: '700' }}>
                          {room.name}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                            {room.type}
                          </span>
                          <span className={`status-badge ${room.status === 'active' ? 'status-badge--active' : 'status-badge--maintenance'}`}>
                            {room.status === 'active' ? 'Activa' : 'Mant.'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card footer */}
                    <div style={{
                      padding: '14px 16px',
                      background: 'var(--surface-container-low)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: '600' }}>
                        MXN ${room.rate.toLocaleString()} / noche
                      </span>
                      <button
                        className="btn-outline"
                        style={{ height: '30px', padding: '0 12px', fontSize: '10px' }}
                        onClick={e => { e.stopPropagation(); onEditRoom(room) }}
                      >
                        Editar
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '48px 24px',
                background: 'var(--surface-container-low)',
                borderRadius: 'var(--radius-xl)',
                border: '1px dashed var(--outline-var)',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--outline)', display: 'block', marginBottom: '12px' }}>
                  search_off
                </span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--outline)' }}>
                  No se encontraron habitaciones con esos filtros
                </p>
              </div>
            )}
          </div>
        </div>}

        {/* Sidebar — siempre visible; Acciones rápidas sin skeleton */}
        <div className="room-config-sidebar">
          <div className="admin-card">
            <span className="admin-card__label">Acciones rápidas</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {[
                { icon: 'edit',          label: 'Editar detalles',          action: () => onEditRoom(selectedRoom) },
                { icon: 'photo_camera',  label: 'Gestionar fotos',          action: () => onGestionarFotos?.(selectedRoom) },
               // { icon: 'price_change',  label: 'Actualizar tarifas',       action: () => {} },
                { icon: 'block',         label: 'Bloquear fechas',          action: () => {} },
                { icon: 'build',         label: 'Reportar mantenimiento',   action: () => {} },
              ].map((item, i) => (
                <button
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px', borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--outline-variant)',
                    background: 'var(--surface-container-lowest)',
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                    fontSize: '13px', fontWeight: '600', color: 'var(--on-surface)',
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

          {loading ? <SkeletonReservationList rows={2} /> : (
            <div className="admin-card">
              <span className="admin-card__label">Próximas reservas</span>
              {UPCOMING_BOOKINGS.slice(0, 2).map((res, i) => (
                <div
                  key={res.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: i < 1 ? '1px solid var(--surface-container-highest)' : 'none',
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
              <button
                onClick={() => setShowReservations(true)}
                style={{
                  width: '100%', marginTop: '12px',
                  padding: '9px 0', borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--outline-var)', background: 'transparent',
                  fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                  color: 'var(--primary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,105,113,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>calendar_month</span>
                Ver {UPCOMING_BOOKINGS.length - 2} reservas más
              </button>
            </div>
          )}

          {loading ? (
            <StatCard loading icon="bar_chart" label="RevPAR" value={287} prefix="$" color="var(--primary)" />
          ) : (
            <div className="admin-card admin-card--primary">
              <span className="admin-card__label">RevPAR</span>
              <div style={{ fontFamily: 'var(--font-headline)', fontSize: '2.5rem', color: '#fff', lineHeight: '1', marginBottom: '8px' }}>
                $287.70
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                Revenue per available room · +8% MoM
              </div>
            </div>
          )}
        </div>
      </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
