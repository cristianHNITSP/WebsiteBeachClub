import { useState } from 'react'
import { motion } from 'framer-motion'
import { SUCURSALES } from '../../data/rooms'
import { Button, Icon, SectionHeader, SurfaceCard } from '@/components/frida'
import { Field, Input, Select } from '@/components/frida'
import RoomCard from '../components/RoomCard'
import ScrollReveal from '../components/ScrollReveal'
import s from './HomePage.module.css'

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
    if (categoryFilter === 'deal')    return r.hasDiscount
    return true
  }).slice(0, 6)

  return (
    <div>
      {/* ══════════ HERO ══════════ */}
      <section className="hero">
        <div className="hero__bg-placeholder" />
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
              <Field label="Destino / Sucursal">
                <Select value={sucursal} onChange={e => setSucursal(e.target.value)}>
                  <option value="">Todas las propiedades</option>
                  {SUCURSALES.map(sc => (
                    <option key={sc.key} value={sc.key}>{sc.name} — {sc.subtitle}</option>
                  ))}
                </Select>
              </Field>

              <div className={s.dateGrid}>
                <Field label="Llegada">
                  <Input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
                </Field>
                <Field label="Salida">
                  <Input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
                </Field>
              </div>

              <Field label=" ">
                <Button
                  variant="primary"
                  style={{ width: '100%', height: '42px', fontSize: '13px' }}
                  onClick={() => onNavigate('search')}
                >
                  <Icon name="search" size={17} />
                  Buscar
                </Button>
              </Field>
            </div>
          </motion.div>
        </div>

        <button
          className="hero__scroll-btn"
          onClick={() => document.getElementById('sucursales')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <Icon name="south" size={16} />
          Descubrir
        </button>
      </section>

      {/* ══════════ SUCURSALES ══════════ */}
      <section className="section" id="sucursales">
        <div className="section__container">
          <ScrollReveal>
            <SectionHeader
              eyebrow="Nuestros destinos"
              title="Nuestras Sucursales"
              subtitle="Dos destinos, una sola promesa: vivir Yucatán con todos los sentidos."
            />
          </ScrollReveal>

          <div className="sucursal-grid">
            {SUCURSALES.map((sc, i) => (
              <ScrollReveal key={sc.key} delay={i * 0.12}>
                <div className="sucursal-card" onClick={() => onNavigate('search')}>
                  <div
                    className="sucursal-card__img-placeholder"
                    style={{
                      background: sc.key === 'chelem'
                        ? 'linear-gradient(145deg, #002a2e 0%, #003b41 30%, #006971 65%, #009aa5 100%)'
                        : 'linear-gradient(145deg, #1a0a2e 0%, #4a1a7a 30%, #7e2fa0 65%, #c07ef0 100%)',
                    }}
                  />
                  <div className="sucursal-card__overlay" />
                  <div className="sucursal-card__body">
                    <div>
                      <div className="sucursal-card__name">{sc.name}</div>
                      <div className="sucursal-card__sub">{sc.subtitle}</div>
                    </div>
                    <div className="sucursal-card__arrow">
                      <Icon name="arrow_forward" size={18} />
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
          <div className={s.sectionHeaderRow}>
            <ScrollReveal>
              <SectionHeader
                eyebrow="Selección curada"
                title="Habitaciones Destacadas"
                subtitle="Nuestros espacios más especiales."
                style={{ marginBottom: 0 }}
              />
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className={s.filterGroup}>
                <div className={s.filterChips}>
                  {[
                    { key: 'all',    label: 'Todos' },
                    { key: 'familia', label: 'Familia' },
                    { key: 'deal',   label: 'Ofertas' },
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
                <Button
                  variant="ghost"
                  style={{ fontSize: '12px' }}
                  onClick={() => onNavigate('search')}
                >
                  Ver todos <Icon name="arrow_forward" size={14} />
                </Button>
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
            <SectionHeader
              eyebrow="Por qué elegirnos"
              title="La experiencia Frida"
              subtitle="Todo lo que necesitas para una estancia perfecta."
              center
              style={{ marginBottom: '48px' }}
            />
          </ScrollReveal>

          <div className={s.experienceGrid}>
            {EXPERIENCE_ITEMS.map((item, i) => (
              <ScrollReveal key={i} delay={i * 0.12} style={{ height: '100%' }}>
                <motion.div
                  whileHover={{ y: -6, boxShadow: '0 20px 48px rgba(0,59,65,0.14)' }}
                  transition={{ duration: 0.3 }}
                  style={{ height: '100%', borderRadius: '20px' }}
                >
                  <SurfaceCard style={{ borderRadius: '20px', height: '100%' }}>
                    <div className={s.experienceCard}>
                      <div
                        className={s.experienceIcon}
                        style={{ background: item.color }}
                      >
                        <span className="material-symbols-outlined">{item.icon}</span>
                      </div>
                      <h3 className={s.experienceTitle}>{item.title}</h3>
                      <p className={s.experienceDesc}>{item.desc}</p>
                    </div>
                  </SurfaceCard>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
