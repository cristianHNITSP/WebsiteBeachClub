import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRightIcon, EyeIcon, MapPinIcon, RulerIcon, StarIcon } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import PulseHeart from '@/components/bits/PulseHeart'
import s from './RoomCard.module.css'

function StarRating({ rating }) {
  const full = Math.round(rating)
  return (
    <span className="inline-flex text-secondary" aria-hidden="true">
      {[0, 1, 2, 3, 4].map(i => <StarIcon key={i} size={14} weight={i < full ? 'fill' : 'regular'} />)}
    </span>
  )
}

export default function RoomCard({ room, onSelect, isFav, onToggleFav, vertical = true }) {
  const [hovered, setHovered] = useState(false)
  const locationLabel = room.location === 'chelem' ? 'Cabañas Frida, Chelem' : 'Casa Frida, Chuburná'

  return (
    <article
      onClick={() => onSelect(room)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`${s.card} ${!vertical ? s.cardHorizontal : ''}`}
    >
      {/* ── Image ── */}
      <figure className={s.figure}>
        <motion.img
          src={room.img}
          alt={room.title}
          loading="lazy"
          animate={{ scale: hovered ? 1.05 : 1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
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
              <span className={s.overlayBtn}>
                <EyeIcon size={16} weight="bold" />
                Ver detalle
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={s.badgePos}>
          {room.hasDiscount
            ? <Badge className="bg-flor-rojo text-[var(--flor-rojo-fg)] font-bold">-{room.discountPercent}%</Badge>
            : <Badge className="bg-primary text-primary-foreground">{room.tag}</Badge>
          }
        </div>

        {/* PulseHeart (React Bits): se contrae a un punto, cambia de color y late.
            El span corta el clic para que no abra la tarjeta. */}
        <span className={s.favBtn} onClick={e => e.stopPropagation()}>
          <PulseHeart
            liked={isFav}
            onChange={() => onToggleFav(room.id)}
            showCount={false}
            size={20}
            corner={999}
            label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            likedColor="var(--flor-rojo)"
            idleColor="var(--muted-foreground)"
            pillColor="var(--card)"
            textColor="var(--card-foreground)"
          />
        </span>
      </figure>

      {/* ── Body ── */}
      <div className={s.body}>
        <div>
          <div className={s.location}>
            <MapPinIcon size={12} weight="fill" aria-hidden="true" />
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
            <Badge variant="outline" className="mt-3 gap-1 text-muted-foreground">
              <RulerIcon size={12} aria-hidden="true" />
              {room.size}
            </Badge>
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
          <Button onClick={e => { e.stopPropagation(); onSelect(room) }}>
            Ver detalle <ArrowRightIcon size={14} weight="bold" />
          </Button>
        </div>
      </div>
    </article>
  )
}
