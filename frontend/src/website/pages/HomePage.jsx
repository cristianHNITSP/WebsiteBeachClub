import { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { SUCURSALES } from '../../data/rooms'
import RoomCard from '../components/RoomCard'

/* ── Animation presets ── */
const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
}
const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
}
const stagger = (delay = 0) => ({
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay } },
})

function ScrollReveal({ children, delay = 0, className, style }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={stagger(delay)}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}

const EXPERIENCE_ITEMS = [
  {
    icon: 'beach_access',
    title: 'Acceso directo al mar',
    desc: 'Todas nuestras propiedades están a pasos de la playa yucateca.',
    color: 'linear-gradient(135deg, #006971 0%, #00a0ac 100%)',
  },
  {
    icon: 'spa',
    title: 'Bienestar & Spa',
    desc: 'Tratamientos artesanales con ingredientes de la región para renovar cuerpo y mente.',
    color: 'linear-gradient(135deg, #7e2fa0 0%, #c07ef0 100%)',
  },
  {
    icon: 'restaurant',
    title: 'Gastronomía local',
    desc: 'Desayunos con productos frescos de productores yucatecos de temporada.',
    color: 'linear-gradient(135deg, #a06000 0%, #f59e0b 100%)',
  },
]

export default function HomePage({ onNavigate, onSelectRoom, rooms, favorites, onToggleFav }) {
  const [sucursal, setSucursal] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const filteredRooms = rooms.filter(r => {
    if (categoryFilter === 'familia') return r.roomType === 'familiar'
    if (categoryFilter === 'deal') return r.hasDiscount
    return true
  }).slice(0, 6)

  const handleSearch = () => onNavigate('search')

  return (
    <div>
      {/* ══════════ HERO ══════════ */}
      <section className="hero">
        <div className="hero__bg-placeholder" />

        {/* Ambient floating orbs */}
        <div className="hero__orb hero__orb--1" />
        <div className="hero__orb hero__orb--2" />
        <div className="hero__orb hero__orb--3" />

        <div className="hero__overlay" />

        <div className="hero__content">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="hero__badge"
          >
            <span className="hero__badge-dot" />
            Chelem &amp; Chuburná · Yucatán
          </motion.div>

          {/* Title */}
          <motion.h1
            className="hero__title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
          >
            Reserva tu estancia en<br />
            <em>Hoteles Frida</em>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="hero__subtitle"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.26 }}
          >
            Dos propiedades únicas en la costa yucateca, donde el Mar Caribe
            se encuentra con la autenticidad de una hospitalidad de ensueño.
          </motion.p>

          {/* Search box */}
          <motion.div
            className="hero__search-box"
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          >
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
                  style={{ width: '100%', height: '42px', fontSize: '13px' }}
                  onClick={handleSearch}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>search</span>
                  Buscar
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        <button className="hero__scroll-btn" onClick={() => {
          document.getElementById('sucursales')?.scrollIntoView({ behavior: 'smooth' })
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>south</span>
          Descubrir
        </button>
      </section>

      {/* ══════════ SUCURSALES ══════════ */}
      <section className="section" id="sucursales">
        <div className="section__container">
          <ScrollReveal>
            <div className="section__heading">
              <h2 className="section__title">Nuestras Sucursales</h2>
              <div className="section__accent" />
              <p className="section__sub">
                Dos destinos, una sola promesa: vivir Yucatán con todos los sentidos.
              </p>
            </div>
          </ScrollReveal>

          <div className="sucursal-grid">
            {SUCURSALES.map((s, i) => (
              <ScrollReveal key={s.key} delay={i * 0.12}>
                <div
                  className="sucursal-card"
                  onClick={() => onNavigate('search')}
                >
                  <div
                    className="sucursal-card__img-placeholder"
                    style={{
                      background: s.key === 'chelem'
                        ? 'linear-gradient(145deg, #002a2e 0%, #003b41 30%, #006971 65%, #009aa5 100%)'
                        : 'linear-gradient(145deg, #1a0a2e 0%, #4a1a7a 30%, #7e2fa0 65%, #c07ef0 100%)'
                    }}
                  />
                  <div className="sucursal-card__overlay" />
                  <div className="sucursal-card__body">
                    <div>
                      <div className="sucursal-card__name">{s.name}</div>
                      <div className="sucursal-card__sub">{s.subtitle}</div>
                    </div>
                    <div className="sucursal-card__arrow">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FEATURED ROOMS ══════════ */}
      <section className="section--alt" id="habitaciones">
        <div className="section__container">
          <div className="section-header-row">
            <ScrollReveal>
              <div className="section__heading" style={{ marginBottom: 0 }}>
                <h2 className="section__title">Habitaciones Destacadas</h2>
                <div className="section__accent" />
                <p className="section__sub">Selección curada de nuestros espacios más especiales.</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
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
            </ScrollReveal>
          </div>

          <div className="home-rooms-grid" style={{ marginTop: '36px' }}>
            {filteredRooms.map((room, i) => (
              <ScrollReveal key={room.id} delay={i * 0.07} style={{ height: '100%' }}>
                <RoomCard
                  room={room}
                  onSelect={onSelectRoom}
                  isFav={favorites.includes(room.id)}
                  onToggleFav={onToggleFav}
                  vertical
                />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ EXPERIENCE STRIP ══════════ */}
      <section className="section">
        <div className="section__container">
          <ScrollReveal>
            <div className="section__heading" style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 className="section__title">La experiencia Frida</h2>
              <div className="section__accent" style={{ margin: '12px auto 10px' }} />
              <p className="section__sub">Todo lo que necesitas para una estancia perfecta.</p>
            </div>
          </ScrollReveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px' }}>
            {EXPERIENCE_ITEMS.map((item, i) => (
              <ScrollReveal key={i} delay={i * 0.12}>
                <motion.div
                  whileHover={{ y: -6, boxShadow: '0 20px 48px rgba(0,59,65,0.14)' }}
                  transition={{ duration: 0.3 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    padding: '36px 28px 32px',
                    borderRadius: '20px',
                    background: 'var(--surface-lowest)',
                    border: '1px solid var(--outline-var)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '18px',
                    background: item.color,
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: '20px',
                    color: '#fff',
                    fontSize: '26px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                  }}>
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <h3 style={{
                    fontFamily: 'var(--font-headline)',
                    fontSize: '1.15rem',
                    fontWeight: '700',
                    color: 'var(--on-surface)',
                    marginBottom: '10px',
                    lineHeight: 1.2,
                  }}>{item.title}</h3>
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    color: 'var(--on-surface-var)',
                    lineHeight: '1.7',
                  }}>{item.desc}</p>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
