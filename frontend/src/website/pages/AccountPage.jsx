import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRightIcon, ArrowClockwiseIcon, BedIcon, CalendarBlankIcon, EnvelopeSimpleIcon, HeartIcon,
  MapPinIcon, StarIcon, UmbrellaSimpleIcon, ClockCounterClockwiseIcon, SignOutIcon, SquaresFourIcon,
} from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SplitText from '@/components/bits/SplitText'
import Counter from '@/components/bits/Counter'
import HoldButton from '@/components/bits/HoldButton'
import PeekRating from '@/components/bits/PeekRating'
import { toast } from 'sonner'
import { useTheme } from '@/context/ThemeContext'
import { useParametros } from '@/hooks/useParametros'
import { useEstadoPersistente } from '@/hooks/useEstadoPersistente'
import { ROOMS } from '../../data/rooms'
import { CoronaFlores } from '@/components/marca/Wordmark'
import ConfirmarSalida from '@/components/marca/ConfirmarSalida'
import { useSesion, esPersonal, rutaSalir } from '@/lib/sesion'
import s from './AccountPage.module.css'

const SECCIONES = { proximas: 'upcoming', historial: 'past', favoritos: 'favorites', mensajes: 'messages' }

const fotoDe = titulo => ROOMS.find(r => r.title === titulo)?.img

const MOCK_BOOKINGS = [
  {
    id: 'BK001',
    room: 'Suite Coral Grande',
    location: 'Cabañas Frida, Chelem',
    checkIn: '2026-04-15',
    checkOut: '2026-04-19',
    status: 'upcoming',
  },
  {
    id: 'BK002',
    room: 'Estudio Frida Clásico',
    location: 'Casa Frida, Chuburná',
    checkIn: '2026-03-01',
    checkOut: '2026-03-03',
    status: 'past',
  },
]

const STATUS_META = {
  upcoming:  { label: 'Próxima',    className: 'bg-secondary text-secondary-foreground' },
  confirmed: { label: 'Confirmada', className: 'bg-primary text-primary-foreground' },
  past:      { label: 'Completada', className: 'bg-muted text-muted-foreground' },
}

const MOCK_MESSAGES = [
  {
    id: 1,
    from: 'Equipo Hoteles Frida',
    subject: 'Confirmación de tu reserva BK001',
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

const entrada = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Vacio({ Icono, titulo, sub }) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-state__icon"><Icono size={30} /></span>
      <div className="empty-state__title">{titulo}</div>
      <div className="empty-state__sub">{sub}</div>
    </div>
  )
}

export default function AccountPage({ bookings: externalBookings, favoritesCount = 0, onOpenDetail }) {
  const { reduceMotion } = useTheme()
  const { sesion } = useSesion()
  const navigate = useNavigate()
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  const salir = () => navigate(rutaSalir('/'), { replace: true })
  // Pestaña en la URL (?seccion=historial); con nombres en español.
  const [{ seccion }, set] = useParametros({ seccion: 'proximas' })
  const activeTab = SECCIONES[seccion] ?? 'upcoming'
  const setActiveTab = v => set({ seccion: Object.keys(SECCIONES).find(k => SECCIONES[k] === v) })
  // Mientras no haya backend, un arreglo vacío también cae al ejemplo.
  const [cancelados, setCancelados] = useEstadoPersistente('frida-reservas-canceladas', [])
  const displayBookings = (externalBookings?.length ? externalBookings : MOCK_BOOKINGS)
    .filter(b => !cancelados.includes(b.id))

  const cancelar = booking => {
    setCancelados(c => [...c, booking.id])
    toast.success('Reserva cancelada', { description: `${booking.room}, ${booking.id}. Te enviamos la confirmación por correo.` })
  }

  const upcomingBookings = displayBookings.filter(b => b.status === 'upcoming' || b.status === 'confirmed')
  const pastBookings     = displayBookings.filter(b => b.status === 'past')

  const STATS = [
    { Icono: BedIcon,             label: 'Reservas activas', value: upcomingBookings.length, flor: 'morado' },
    { Icono: HeartIcon,           label: 'Favoritos',        value: favoritesCount,          flor: 'rojo' },
    { Icono: StarIcon,            label: 'Estancias',        value: pastBookings.length,     flor: 'dorado' },
    { Icono: EnvelopeSimpleIcon,  label: 'Mensajes',         value: MOCK_MESSAGES.length,    flor: 'turquesa' },
  ]

  return (
    <div className={s.wrapper}>
      {/* ── Hero banner ── */}
      <header className={`${s.hero} sobre-noche`}>
        <CoronaFlores className={s.heroCorona} />
        <p className={s.heroGreeting}>Te damos la bienvenida{sesion?.nombre ? `, ${sesion.nombre.split(' ')[0]}` : ''}</p>
        {reduceMotion
          ? <h1 className={s.heroName}>Mi cuenta</h1>
          : <SplitText text="Mi cuenta" tag="h1" className={s.heroName} splitType="chars" delay={40} duration={0.7}
              from={{ opacity: 0, y: '0.45em' }} to={{ opacity: 1, y: 0 }} textAlign="left" rootMargin="0px" />}
        <div className={s.heroAcciones}>
          {esPersonal(sesion) && (
            <Button asChild variant="secondary" size="sm">
              <Link to="/admin"><SquaresFourIcon size={15} weight="bold" /> Ir al panel</Link>
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setConfirmarSalida(true)}>
            <SignOutIcon size={15} weight="bold" /> Cerrar sesión
          </Button>
        </div>
      </header>
      <ConfirmarSalida abierto={confirmarSalida} onCambiar={setConfirmarSalida} onSalir={salir} />

      {/* ── Stats row ── */}
      <div className={s.statsRow}>
        {STATS.map((stat, i) => (
          <motion.div key={stat.label} {...entrada} transition={{ ...entrada.animate.transition, delay: i * 0.08 }}>
            <Card className="py-5">
              <CardContent className="flex items-center gap-4">
                <span className={s.statIcon} style={{ background: `var(--flor-${stat.flor})`, color: `var(--flor-${stat.flor}-fg)` }}>
                  <stat.Icono size={22} weight="fill" aria-hidden="true" />
                </span>
                <div>
                  <div className={s.statValor}>
                    <span className="sr-only">{stat.value}</span>
                    <span aria-hidden="true">
                      {reduceMotion
                        ? stat.value
                        : <Counter value={stat.value} places={stat.value >= 10 ? [10, 1] : [1]} fontSize={28} padding={2} gap={0}
                            textColor="var(--card-foreground)" fontWeight={700}
                            gradientFrom="var(--card)" gradientTo="transparent" gradientHeight={6} />}
                    </span>
                  </div>
                  <div className={s.statLabel}>{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Main content ── */}
      <div className={s.content}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList aria-label="Secciones de cuenta" className="mb-6 max-w-full overflow-x-auto justify-start">
            <TabsTrigger value="upcoming">Próximas</TabsTrigger>
            <TabsTrigger value="past">Historial</TabsTrigger>
            <TabsTrigger value="favorites">Favoritos</TabsTrigger>
            <TabsTrigger value="messages">
              Mensajes
              {MOCK_MESSAGES.some(m => m.unread) && <span className={s.tabDot} aria-label="sin leer" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            <motion.section {...entrada} aria-label="Próximas reservas">
              {upcomingBookings.length === 0
                ? <Vacio Icono={UmbrellaSimpleIcon} titulo="No tienes reservas próximas" sub="Cuando reserves una habitación, aparecerá aquí." />
                : upcomingBookings.map(b => <BookingCard key={b.id} booking={b} onOpen={onOpenDetail} onCancel={cancelar} />)}
            </motion.section>
          </TabsContent>

          <TabsContent value="past">
            <motion.section {...entrada} aria-label="Historial de reservas">
              {pastBookings.length === 0
                ? <Vacio Icono={ClockCounterClockwiseIcon} titulo="Sin estancias anteriores" sub="Tu historial de reservas aparecerá aquí." />
                : pastBookings.map(b => <BookingCard key={b.id} booking={b} pastMode />)}
            </motion.section>
          </TabsContent>

          <TabsContent value="favorites">
            <motion.div {...entrada}>
              <Vacio
                Icono={HeartIcon}
                titulo={favoritesCount > 0
                  ? `${favoritesCount} habitación${favoritesCount !== 1 ? 'es' : ''} en favoritos`
                  : 'Sin favoritos aún'}
                sub={favoritesCount > 0
                  ? 'Visita las habitaciones para verlas en detalle.'
                  : 'Marca con el corazón las habitaciones que te interesen para guardarlas aquí.'}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="messages">
            <motion.section {...entrada} aria-label="Mensajes">
              {MOCK_MESSAGES.map(msg => (
                <article key={msg.id} className={`${s.messageCard} ${msg.unread ? s.messageCardUnread : ''}`}>
                  <div className={s.messageAvatar}>
                    <EnvelopeSimpleIcon size={18} weight="bold" aria-hidden="true" />
                  </div>
                  <div className={s.messageBody}>
                    <div className={s.messageHeader}>
                      <p className={s.messageFrom}>{msg.from}</p>
                      <time className={s.messageTime}>{msg.time}</time>
                    </div>
                    <h2 className={s.messageSubject}>{msg.subject}</h2>
                    <p className={s.messagePreview}>{msg.preview}</p>
                  </div>
                  {msg.unread && <div className={s.unreadDot} aria-label="sin leer" />}
                </article>
              ))}
            </motion.section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

/* ── BookingCard subcomponent ── */
function BookingCard({ booking, onOpen, onCancel, pastMode = false }) {
  const meta = STATUS_META[booking.status] ?? STATUS_META.past
  const foto = booking.img || fotoDe(booking.room)

  return (
    <article className={s.bookingCard}>
      <div className={s.bookingImg}>
        {foto && <img src={foto} alt={booking.room} />}
        <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
          <Badge className={meta.className}>{meta.label}</Badge>
        </div>
      </div>
      <div className={s.bookingBody}>
        <div>
          <h2 className={s.bookingTitle}>{booking.room}</h2>
          <div className={s.bookingDetail}>
            <MapPinIcon size={13} weight="fill" aria-hidden="true" />
            {booking.location}
          </div>
          <div className={s.bookingDetail}>
            <CalendarBlankIcon size={13} aria-hidden="true" />
            <time dateTime={booking.checkIn}>{formatDate(booking.checkIn)}</time>
            {' → '}
            <time dateTime={booking.checkOut}>{formatDate(booking.checkOut)}</time>
          </div>
        </div>
        <div className={s.bookingActions}>
          {pastMode ? (
            // PeekRating (React Bits): se "prueba" la calificación al pasar y se fija al hacer clic
            <div className={s.calificar}>
              <span className={s.calificarLabel}>Califica tu estancia</span>
              <PeekRating
                size={22}
                labels={['Mala', 'Regular', 'Buena', 'Muy buena', 'Excelente']}
                activeColor="var(--primary)"
                idleColor="var(--input)"
                tipColor="var(--foreground)"
                tipTextColor="var(--background)"
                ariaLabel={`Califica tu estancia en ${booking.room}`}
                onChange={v => v && toast.success('¡Gracias por tu calificación!', { description: `${v} de 5 para ${booking.room}.` })}
              />
            </div>
          ) : (
            // HoldButton (React Bits): cancelar exige mantener pulsado, no un clic
            <HoldButton
              size="sm"
              radius={999}
              holdTime={1500}
              doneLabel="Cancelada"
              backgroundColor="var(--muted)"
              textColor="var(--foreground)"
              fillColor="var(--destructive)"
              fillTextColor="var(--destructive-foreground)"
              onHold={() => setTimeout(() => onCancel?.(booking), 700)}
            >
              Mantén para cancelar
            </HoldButton>
          )}
          <Button
            variant={pastMode ? 'outline' : 'default'}
            onClick={() => !pastMode && onOpen?.(booking)}
          >
            {pastMode ? 'Reservar de nuevo' : 'Ver reserva'}
            {pastMode ? <ArrowClockwiseIcon size={14} weight="bold" /> : <ArrowRightIcon size={14} weight="bold" />}
          </Button>
        </div>
      </div>
    </article>
  )
}
