import s from './WeeklyCalendar.module.css'

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const BOOKING_CLASS = {
  primary:   s.bookingPrimary,
  secondary: s.bookingSecondary,
  blocked:   s.bookingBlocked,
  glass:     s.bookingGlass,
}

/**
 * WeeklyCalendar
 *
 * Props:
 *   data       — array of { roomId, roomName, roomType, bookings[] }
 *                bookings: { startDay (0-6), span, type, guestName, avatar? }
 *   weekDates  — array of 7 Date objects (Mon→Sun)
 *   todayNum   — today's date number (new Date().getDate())
 */
export default function WeeklyCalendar({ data, weekDates, todayNum }) {
  return (
    <div className={s.wrapper}>
      <div className={s.grid}>

        {/* ── Header ── */}
        <div className={s.header}>
          <div className={s.roomCol}>Habitación</div>
          <div className={s.daysRow}>
            {weekDates.map((date, i) => (
              <div
                key={i}
                className={`${s.dayCell}${date.getDate() === todayNum ? ` ${s.dayCellToday}` : ''}`}
              >
                <span className={s.dayName}>{DAYS[i]}</span>
                <span className={s.dayNum}>{date.getDate()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Room rows ── */}
        {data.map((roomRow) => (
          <div key={roomRow.roomId} className={s.row}>
            <div className={s.roomInfo}>
              <div className={s.roomName}>{roomRow.roomName}</div>
              <div className={s.roomType}>{roomRow.roomType}</div>
            </div>

            <div className={s.rowCells}>
              {/* Background cell grid */}
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className={s.cell} />
              ))}

              {/* Booking bars — positions are relative to --cell-w CSS variable */}
              {roomRow.bookings.map((booking, bIdx) => {
                const bookingCls = BOOKING_CLASS[booking.type] ?? s.bookingGlass
                return (
                  <div
                    key={bIdx}
                    className={`${s.booking} ${bookingCls}`}
                    style={{
                      left:  `calc(var(--cell-w) * ${booking.startDay} + 6px)`,
                      width: `calc(var(--cell-w) * ${booking.span}  - 12px)`,
                    }}
                    title={booking.guestName}
                  >
                    {booking.avatar && (
                      <div className={s.bookingAvatar}>
                        <img
                          src={booking.avatar}
                          alt={booking.guestName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div className={s.bookingName}>{booking.guestName}</div>
                      <div className={s.bookingSub}>
                        {booking.span} noche{booking.span !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {booking.type === 'primary' && (
                      <span className={s.bookingStatus}>Conf.</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

      </div>
    </div>
  )
}
