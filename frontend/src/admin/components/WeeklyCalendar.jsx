import s from './WeeklyCalendar.module.css'

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// Skeleton booking bar positions per row index — visual variety while loading
const SKELETON_BARS = [
  [{ startDay: 0, span: 3 }, { startDay: 4, span: 3 }],
  [{ startDay: 1, span: 4 }],
  [{ startDay: 0, span: 2 }, { startDay: 3, span: 3 }],
  [{ startDay: 2, span: 4 }],
  [{ startDay: 0, span: 5 }],
]

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
 *   loading    — show skeleton placeholder rows
 */
export default function WeeklyCalendar({ data, weekDates, todayNum, loading = false }) {
  return (
    <div className={s.wrapper}>
      <div className={s.grid}>

        {/* ── Header ── */}
        <div className={s.header}>
          <div className={s.roomCol}>Habitación</div>
          <div className={s.daysRow}>
            {DAYS.map((day, i) => (
              <div
                key={i}
                className={`${s.dayCell}${!loading && weekDates[i].getDate() === todayNum ? ` ${s.dayCellToday}` : ''}`}
              >
                {loading ? (
                  <>
                    <div className={`${s.skeletonBase} ${s.skeletonDayName}`} />
                    <div className={`${s.skeletonBase} ${s.skeletonDayNum}`} />
                  </>
                ) : (
                  <>
                    <span className={s.dayName}>{day}</span>
                    <span className={s.dayNum}>{weekDates[i].getDate()}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Room rows ── */}
        {data.map((roomRow, rowIdx) => (
          <div key={roomRow.roomId} className={s.row}>
            <div className={s.roomInfo}>
              {loading ? (
                <>
                  <div className={`${s.skeletonBase} ${s.skeletonRoomName}`} />
                  <div className={`${s.skeletonBase} ${s.skeletonRoomType}`} />
                </>
              ) : (
                <>
                  <div className={s.roomName}>{roomRow.roomName}</div>
                  <div className={s.roomType}>{roomRow.roomType}</div>
                </>
              )}
            </div>

            <div className={s.rowCells}>
              {/* Background cell grid */}
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className={s.cell} />
              ))}

              {/* Skeleton booking bars while loading */}
              {loading && (SKELETON_BARS[rowIdx % SKELETON_BARS.length]).map((bar, bIdx) => (
                <div
                  key={bIdx}
                  className={`${s.skeletonBase} ${s.skeletonBooking}`}
                  style={{
                    left:  `calc(var(--cell-w) * ${bar.startDay} + 6px)`,
                    width: `calc(var(--cell-w) * ${bar.span} - 12px)`,
                  }}
                />
              ))}

              {/* Real booking bars */}
              {!loading && roomRow.bookings.map((booking, bIdx) => {
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
