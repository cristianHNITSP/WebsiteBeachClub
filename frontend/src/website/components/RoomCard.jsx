import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge, Icon, Button } from '@/components/frida'
import s from './RoomCard.module.css'

function StarRating({ rating }) {
  const full = Math.round(rating)
  return (
    <span style={{ color: 'var(--gold)', letterSpacing: '1px' }}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
    </span>
  )
}

export default function RoomCard({ room, onSelect, isFav, onToggleFav, vertical = true }) {
  const [hovered, setHovered] = useState(false)
  const locationLabel = room.location === 'chelem' ? 'Cabañas Frida — Chelem' : 'Casa Frida — Chuburná'

  return (
    <motion.article
      onClick={() => onSelect(room)}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`${s.card} ${!vertical ? s.cardHorizontal : ''}`}
      style={{ boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)' }}
    >
      {/* ── Image ── */}
      <figure className={s.figure}>
        <motion.img
          src={room.img}
          alt={room.title}
          loading="lazy"
          animate={{ scale: hovered ? 1.06 : 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={s.img}
        />

        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={s.overlay}
            >
              <motion.span
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 6, opacity: 0 }}
                transition={{ delay: 0.05 }}
                className={s.overlayBtn}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>visibility</span>
                Ver detalle
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={s.badgePos}>
          {room.hasDiscount
            ? <Badge variant="discount">-{room.discountPercent}%</Badge>
            : <Badge variant="tag">{room.tag}</Badge>
          }
        </div>

        <figcaption style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
          {room.title}
        </figcaption>

        <motion.button
          onClick={e => { e.stopPropagation(); onToggleFav(room.id) }}
          title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className={s.favBtn}
          style={{
            background: isFav ? '#ef4444' : 'rgba(255,255,255,0.9)',
            color: isFav ? '#fff' : '#888',
          }}
        >
          {isFav ? '♥' : '♡'}
        </motion.button>
      </figure>

      {/* ── Body ── */}
      <div className={s.body}>
        <div>
          <div className={s.location}>
            <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>location_on</span>
            {locationLabel}
          </div>

          <h3 className={s.title}>{room.title}</h3>

          <div className={s.ratingRow}>
            <StarRating rating={room.rating} />
            <span className={s.ratingNum}>{room.rating.toFixed(1)}</span>
            <span className={s.ratingCount}>({room.reviews} reseñas)</span>
          </div>

          <p className={s.desc}>{room.desc}</p>

          {room.size && (
            <div className={s.sizeBadge}>
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>straighten</span>
              {room.size}
            </div>
          )}
        </div>

        {/* Price footer */}
        <div className={s.footer}>
          <div>
            {room.hasDiscount && (
              <del className={s.priceOriginal}>MXN ${room.basePrice.toLocaleString()}</del>
            )}
            <div className={s.priceRow}>
              <span className={s.priceAmount}>${room.price.toLocaleString()}</span>
              <span className={s.priceLabel}>MXN / noche</span>
            </div>
          </div>
          <Button
            variant="primary"
            style={{ fontSize: '12px', padding: '9px 18px' }}
            onClick={e => { e.stopPropagation(); onSelect(room) }}
          >
            Ver detalle <Icon name="arrow_forward" size={14} />
          </Button>
        </div>
      </div>
    </motion.article>
  )
}
