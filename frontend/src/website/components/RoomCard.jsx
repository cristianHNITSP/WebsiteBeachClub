function StarRating({ rating }) {
  const stars = []
  for (let i = 1; i <= 5; i++) {
    stars.push(i <= Math.round(rating) ? '★' : '☆')
  }
  return (
    <span className="room-card__stars-text" style={{ color: 'var(--gold)' }}>
      {stars.join('')}
    </span>
  )
}

export default function RoomCard({ room, onSelect, isFav, onToggleFav, vertical }) {
  const locationLabel = room.location === 'chelem' ? 'Cabañas Frida — Chelem' : 'Casa Frida — Chuburná'

  return (
    <div
      className={`room-card${vertical ? ' room-card--vertical' : ''}`}
      onClick={() => onSelect(room)}
    >
      <div className="room-card__image">
        <img src={room.img} alt={room.title} loading="lazy" />
        {room.hasDiscount ? (
          <span className="room-card__discount">-{room.discountPercent}%</span>
        ) : (
          <span className="room-card__tag">{room.tag}</span>
        )}
        <button
          className={`room-card__fav${isFav ? ' room-card__fav--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFav(room.id)
          }}
          title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          {isFav ? '♥' : '♡'}
        </button>
      </div>

      <div className="room-card__body">
        <div>
          <h3 className="room-card__title">{room.title}</h3>
          <div className="room-card__location">{locationLabel}</div>
          <div className="room-card__stars">
            <StarRating rating={room.rating} />
            <span className="room-card__rating-num">{room.rating.toFixed(1)}</span>
            <span className="room-card__reviews">({room.reviews} reseñas)</span>
          </div>
          <p className="room-card__desc">{room.desc}</p>
        </div>

        <div className="room-card__footer">
          <div>
            {room.hasDiscount && (
              <div className="room-card__price-original">MXN ${room.basePrice.toLocaleString()}</div>
            )}
            <span className="room-card__price">
              MXN ${room.price.toLocaleString()}
            </span>
            <span className="room-card__price-unit">/ noche</span>
          </div>
          <button
            className="room-card__cta"
            onClick={(e) => {
              e.stopPropagation()
              onSelect(room)
            }}
          >
            Ver detalle
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  )
}
