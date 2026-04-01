import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Badge from '@/components/frida/Badge'
import Icon from '@/components/frida/Icon'

function StarRating({ rating }) {
  const full = Math.round(rating)
  return (
    <span style={{ color: 'var(--gold)', letterSpacing: '1px' }}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
    </span>
  )
}

export default function RoomCard({ room, onSelect, isFav, onToggleFav, vertical }) {
  const [hovered, setHovered] = useState(false)
  const locationLabel = room.location === 'chelem' ? 'Cabañas Frida — Chelem' : 'Casa Frida — Chuburná'

  return (
    <motion.article
      onClick={() => onSelect(room)}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'var(--surface-lowest)',
        border: '1px solid var(--outline-var)',
        cursor: 'pointer',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transition: 'box-shadow 0.3s ease',
        height: '100%',
      }}
    >
      {/* ── Image ── */}
      <figure style={{
        position: 'relative',
        flexShrink: 0,
        overflow: 'hidden',
        margin: 0,
        ...(vertical ? { height: '220px', width: '100%' } : { width: '268px', minHeight: '200px' }),
      }}>
        <motion.img
          src={room.img}
          alt={room.title}
          loading="lazy"
          animate={{ scale: hovered ? 1.06 : 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />

        {/* Hover overlay */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,30,35,0.72) 0%, rgba(0,0,0,0.12) 100%)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                paddingBottom: '20px',
              }}
            >
              <motion.span
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 6, opacity: 0 }}
                transition={{ delay: 0.05 }}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  backdropFilter: 'blur(8px)',
                  color: '#fff',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize: '12px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>visibility</span>
                Ver detalle
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badge */}
        <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
          {room.hasDiscount
            ? <Badge variant="discount">-{room.discountPercent}%</Badge>
            : <Badge variant="tag">{room.tag}</Badge>
          }
        </div>

        {/* Fav button — figcaption oculto para accesibilidad */}
        <figcaption style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
          {room.title}
        </figcaption>
        <motion.button
          onClick={e => { e.stopPropagation(); onToggleFav(room.id) }}
          title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          style={{
            position: 'absolute', top: '12px', right: '12px',
            width: '34px', height: '34px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: isFav ? '#ef4444' : 'rgba(255,255,255,0.9)',
            color: isFav ? '#fff' : '#888',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {isFav ? '♥' : '♡'}
        </motion.button>
      </figure>

      {/* ── Body ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '22px 22px 20px', flex: 1,
      }}>
        <div>
          {/* Location chip */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: 'var(--primary)',
            marginBottom: '6px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>location_on</span>
            {locationLabel}
          </div>

          <h3 style={{
            fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '19px',
            color: 'var(--on-surface)', marginBottom: '10px', lineHeight: 1.2,
          }}>
            {room.title}
          </h3>

          {/* Rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginBottom: '12px' }}>
            <StarRating rating={room.rating} />
            <span style={{ fontWeight: 700, color: 'var(--on-surface)', fontSize: '13px' }}>{room.rating.toFixed(1)}</span>
            <span style={{ color: 'var(--on-surface-var)', fontSize: '12px' }}>({room.reviews} reseñas)</span>
          </div>

          <p style={{
            fontSize: '13.5px', color: 'var(--on-surface-var)', lineHeight: 1.65,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {room.desc}
          </p>

          {/* Size badge */}
          {room.size && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              marginTop: '10px', padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--surface-container)',
              fontSize: '11px', fontWeight: 600, color: 'var(--on-surface-var)',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>straighten</span>
              {room.size}
            </div>
          )}
        </div>

        {/* Price footer */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          marginTop: '18px', paddingTop: '16px',
          borderTop: '1px solid var(--outline-var)',
        }}>
          <div>
            {room.hasDiscount && (
              <del style={{ fontSize: '12px', color: 'var(--on-surface-var)', marginBottom: '1px', display: 'block' }}>
                MXN ${room.basePrice.toLocaleString()}
              </del>
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontWeight: 800, fontSize: '22px', color: 'var(--on-surface)', fontFamily: 'var(--font-body)' }}>
                ${room.price.toLocaleString()}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--on-surface-var)', fontWeight: 500 }}>MXN / noche</span>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={e => { e.stopPropagation(); onSelect(room) }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '9px 18px', borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, var(--primary) 0%, #009aa5 100%)',
              color: '#fff', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px',
              letterSpacing: '0.04em',
              boxShadow: '0 4px 14px rgba(0,105,113,0.35)',
            }}
          >
            Ver detalle <Icon name="arrow_forward" size={14} />
          </motion.button>
        </div>
      </div>
    </motion.article>
  )
}
