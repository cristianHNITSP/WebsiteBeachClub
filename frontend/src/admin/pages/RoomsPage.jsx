import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  PlusIcon, PencilSimpleIcon, CameraIcon, ProhibitIcon, WrenchIcon, CaretLeftIcon, CaretRightIcon,
  MagnifyingGlassIcon, BedIcon, CalendarDotsIcon, CheckCircleIcon, ClockIcon, MoonIcon, SmileySadIcon,
  TrashIcon, ArrowCounterClockwiseIcon, WarningCircleIcon,
} from '@phosphor-icons/react'
import { SkeletonRoomHero, SkeletonDetailCard, SkeletonRoomCard, SkeletonReservationList, SkeletonCard } from '@/components/frida/Skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import JellyRadio from '@/components/bits/JellyRadio'
import AnimatedList from '@/components/bits/AnimatedList'
import CountUp from '@/components/bits/CountUp'
import BotonDestacado from '@/components/marca/BotonDestacado'
import TarjetaCifra from '@/components/marca/TarjetaCifra'
import ConfirmarDescarte from '@/components/marca/ConfirmarDescarte'
import Imagen from '@/components/marca/Imagen'
import Pista, { GrupoPistas } from '@/components/marca/Pista'
import { useTheme } from '@/context/ThemeContext'
import { useParametros } from '@/hooks/useParametros'
import { usePedido } from '@/hooks/usePedido'
import { api } from '@/lib/api'
import { useSesion } from '@/lib/sesion'
import { animacionItem } from '@/lib/animacionListas'
import { habitacionesApi, ESTADOS_HABITACION, pesos } from '../habitaciones'
import { reservasApi, hoy, sumarDias } from '../reservas'
import { aISO } from '@/lib/fechas'
import { usePropiedadActual } from '../propiedadActual'
import SectionPanel from '../components/SectionPanel'
import s from './RoomsPage.module.css'

const POR_PAGINA = 4


const FILTROS = [
  { value: 'todos',         label: 'Todos' },
  { value: 'activa',        label: 'Disponibles' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
]

const corto = iso => new Date(`${iso}T12:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
// Reservas de la API → filas de las listas de esta página.
const aFila = r => ({
  id: r.id, guest: r.huesped_nombre ?? (r.notas || 'Mantenimiento'), room: r.habitacion_nombre,
  dates: `${corto(r.llegada)} → ${corto(r.salida)}`, nights: r.noches,
  status: r.estado === 'retenida' ? 'pending' : 'confirmed',
})
const fecha = iso => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })

function Estado({ estado, corto = false }) {
  const activa = estado === 'activa'
  return (
    <span className={`status-badge ${activa ? 'status-badge--active' : 'status-badge--maintenance'}`}>
      {activa ? 'Activa' : estado === 'inactiva' ? 'Inactiva' : corto ? 'Mant.' : 'Mantenimiento'}
    </span>
  )
}

/** La portada de la habitación: con su esqueleto, su "Imagen no anexada" y su
 *  "Imagen no disponible / Reintentar" (componente Imagen). */
function Foto({ habitacion, className, ...animacion }) {
  return (
    <motion.div className={className} {...animacion}>
      <Imagen src={habitacion.foto} alt={habitacion.nombre} />
    </motion.div>
  )
}

function ErrorCarga({ error, onReintentar }) {
  return (
    <div className={s.vacio} role="alert">
      <span className={s.vacioIcono}><WarningCircleIcon size={30} /></span>
      <p>{error.message}</p>
      <Button variant="outline" size="sm" onClick={onReintentar}>Reintentar</Button>
    </div>
  )
}

export default function RoomsPage({ onNavigate, onEditRoom, onGestionarFotos }) {
  const { reduceMotion } = useTheme()
  const { sesion } = useSesion()
  const puede = permiso => sesion?.permisos?.includes(permiso)
  const nombrePropiedad = id => sesion?.propiedades?.find(p => p.id === id)?.nombre ?? 'Sin dato'

  // Pantalla en la URL: búsqueda, filtro, página, habitación elegida y vista.
  const [{ q, estado, pagina, habitacion: elegidaId, vista }, setParams] = useParametros({
    q: '', estado: 'todos', pagina: 1, habitacion: '', vista: 'habitaciones',
  })

  // La búsqueda se escribe en la URL (y se pide a la API) 300 ms después de teclear.
  const [texto, setTexto] = useState(q)
  useEffect(() => {
    if (texto === q) return
    const t = setTimeout(() => setParams({ q: texto, pagina: 1 }), 300)
    return () => clearTimeout(t)
  }, [texto]) // eslint-disable-line react-hooks/exhaustive-deps

  // La propiedad la elige el selector de la SideNav (para todo el panel).
  const { propiedadId } = usePropiedadActual()
  const lista = usePedido(
    senal => habitacionesApi.listar({ propiedad: propiedadId, q, estado: estado === 'todos' ? null : estado, pagina, por_pagina: POR_PAGINA }, senal),
    [propiedadId, q, estado, pagina],
  )
  // Otra propiedad: la página y la elegida de antes ya no aplican.
  const propiedadPrevia = useRef(propiedadId)
  useEffect(() => {
    if (propiedadPrevia.current === propiedadId) return
    propiedadPrevia.current = propiedadId
    setParams({ pagina: 1, habitacion: '' })
  }, [propiedadId]) // eslint-disable-line react-hooks/exhaustive-deps
  const items = lista.datos?.items ?? []
  const totalPages = lista.datos?.meta.paginas ?? 0
  const loading = lista.cargando

  // La elegida puede no estar en la página visible: se guarda la última vista.
  const [guardada, setGuardada] = useState(null)
  const selectedRoom = items.find(r => r.id === elegidaId) ?? (guardada?.id === elegidaId ? guardada : null) ?? items[0] ?? null

  const heroRef = useRef(null)
  const handleSelectRoom = room => {
    setGuardada(room)
    setParams({ habitacion: room.id })
    heroRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' })
  }

  const handleFilter = f => setParams({ estado: f, pagina: 1 })
  const limpiar = () => { setTexto(''); setParams({ q: '', estado: 'todos', pagina: 1 }) }
  const verVista = v => setParams({ vista: v }, { historial: true })

  // Al volver a la lista (con su botón o con "atrás" del navegador) se pide de
  // nuevo: en la papelera pudo restaurarse algo.
  const vistaPrevia = useRef(vista)
  useEffect(() => {
    if (vistaPrevia.current === vista) return
    vistaPrevia.current = vista
    if (vista === 'habitaciones') lista.recargar()
    else window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [vista]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mandar a la papelera (con "Deshacer") ──
  const [aBorrar, setABorrar] = useState(null)
  const mandarAPapelera = async () => {
    const h = aBorrar
    setABorrar(null)
    try {
      await habitacionesApi.aPapelera(h.id)
      setParams({ habitacion: '' })
      lista.recargar()
      toast.success(`«${h.nombre}» está en la papelera`, {
        description: 'Ya no aparece en el panel ni se puede reservar.',
        action: { label: 'Deshacer', onClick: () => habitacionesApi.restaurar(h.id).then(lista.recargar, e => toast.error(e.message)) },
      })
    } catch (e) {
      toast.error(e.message)
    }
  }

  // Próximas reservas de la habitación elegida (hoy en adelante, activas).
  const proximas = usePedido(
    senal => (selectedRoom
      ? reservasApi.listar({
        habitacion_id: selectedRoom.id, desde: aISO(hoy()), hasta: aISO(sumarDias(hoy(), 365)),
        estado: ['retenida', 'confirmada', 'en_curso'], limite: 200,
      }, senal)
      : null),
    [selectedRoom?.id],
  )
  const UPCOMING_BOOKINGS = (proximas.datos ?? []).map(aFila)
  // Métricas del mes de la habitación elegida (en vivo: son unas pocas reservas).
  const metrica = usePedido(
    senal => (selectedRoom ? api(`/api/admin/metricas/habitaciones/${selectedRoom.id}`, { senal }) : null),
    [selectedRoom?.id],
  )
  const confirmadas = UPCOMING_BOOKINGS.filter(b => b.status === 'confirmed').length

  // Mantenimiento: cambia el estado de la habitación (con su versión, como el formulario).
  const alternarMantenimiento = async () => {
    const h = selectedRoom
    const { id, propiedad_id, situacion, eliminado_en, foto, ...campos } = h // eslint-disable-line no-unused-vars
    try {
      const nueva = await habitacionesApi.editar(id, { ...campos, estado: h.estado === 'activa' ? 'mantenimiento' : 'activa' })
      setGuardada(nueva)
      lista.recargar()
      toast.success(nueva.estado === 'activa' ? `«${h.nombre}» está disponible` : `«${h.nombre}» está en mantenimiento`)
    } catch (e) {
      toast.error(e.message)
    }
  }
  const sinHabitaciones = !loading && !lista.error && lista.datos?.meta.total === 0 && !q && estado === 'todos'

  return (
    <AnimatePresence mode="wait" initial={false}>
      {vista === 'reservas' ? (
        /* ═══ Vista: próximas reservas (entra de lado: navegación) ═══ */
        <motion.div
          key="reservations"
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 32 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <SectionPanel
            eyebrow="Habitaciones"
            title={<>Próximas <em>reservas</em></>}
            subtitle={`${selectedRoom?.nombre ?? ''}: ${UPCOMING_BOOKINGS.length} reservas desde hoy`}
            onBack={() => verVista('habitaciones')}
          >
            <div className="inventory-grid" style={{ marginBottom: '28px' }}>
              <TarjetaCifra Icono={CalendarDotsIcon} flor="morado"   label="Total de reservas" value={UPCOMING_BOOKINGS.length} />
              <TarjetaCifra Icono={CheckCircleIcon}  flor="turquesa" label="Confirmadas"       value={confirmadas} />
              <TarjetaCifra Icono={ClockIcon}        flor="dorado"   label="Pendientes"        value={UPCOMING_BOOKINGS.length - confirmadas} />
              <TarjetaCifra Icono={MoonIcon}         flor="orquidea" label="Noches totales"    value={UPCOMING_BOOKINGS.reduce((n, b) => n + b.nights, 0)} />
            </div>

            {/* AnimatedList (React Bits): entrada escalonada, flechas del teclado */}
            <div className={s.listaReservas}>
              <AnimatedList
                items={UPCOMING_BOOKINGS}
                showGradients={false}
                displayScrollbar={false}
                maxHeight={9999}
                renderItem={(booking, i) => (
                  <div className={s.reserva}>
                    <span className={s.reservaNum}>{i + 1}</span>
                    <div className={s.reservaTexto}>
                      <div className={s.reservaHuesped}>{booking.guest}</div>
                      <div className={s.reservaCuarto}>{booking.room}</div>
                    </div>
                    <div className={s.reservaFechas}>
                      <div>{booking.dates}</div>
                      <div className={s.reservaNoches}>{booking.nights} noche{booking.nights !== 1 ? 's' : ''}</div>
                    </div>
                    <span className={`status-badge ${booking.status === 'confirmed' ? 'status-badge--active' : 'status-badge--maintenance'}`}>
                      {booking.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                    </span>
                  </div>
                )}
              />
            </div>
          </SectionPanel>
        </motion.div>
      ) : vista === 'papelera' ? (
        <motion.div
          key="papelera"
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 32 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <Papelera
            puedeVaciar={puede('papelera.vaciar')}
            nombrePropiedad={nombrePropiedad}
            onBack={() => verVista('habitaciones')}
          />
        </motion.div>
      ) : (
        /* ═══ Vista: habitaciones ═══ */
        <motion.div
          key="rooms"
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -32 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="admin-page-header">
            <div>
              <span className="admin-page-eyebrow">Gestión de habitaciones</span>
              <h1 className="admin-page-title">Configuración de <em>habitaciones</em></h1>
            </div>
            <div className="admin-page-header-actions">
              <div className="admin-page-header-actions-row">
                {puede('habitaciones.eliminar') && (
                  <Button variant="outline" onClick={() => verVista('papelera')}>
                    <TrashIcon size={16} weight="bold" /> Papelera
                  </Button>
                )}
                {puede('habitaciones.editar') && (
                  <BotonDestacado onClick={() => onNavigate('nueva-habitacion')}>
                    <PlusIcon size={16} weight="bold" /> Nueva habitación
                  </BotonDestacado>
                )}
              </div>
            </div>
          </div>

          <div className="room-config-grid">
            {/* ── Arriba: hero + tarjetas de detalle ── */}
            {loading ? (
              <div className="room-config-main-top">
                <SkeletonRoomHero />
                <div className="room-detail-cards" style={{ marginTop: '24px' }}>
                  <SkeletonDetailCard /><SkeletonDetailCard /><SkeletonDetailCard />
                </div>
              </div>
            ) : !selectedRoom ? (
              <div className="room-config-main-top">
                <div className={`${s.vacio} ${s.vacioHero}`} role="status">
                  <span className={s.vacioIcono}><BedIcon size={30} /></span>
                  <p>{sinHabitaciones ? 'Aún no hay habitaciones registradas.' : 'Elige una habitación de la lista.'}</p>
                  {sinHabitaciones && puede('habitaciones.editar') && (
                    <Button variant="outline" size="sm" onClick={() => onNavigate('nueva-habitacion')}>Crear la primera</Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="room-config-main-top">
                <div className="room-config-hero" ref={heroRef}>
                  {/* Imagen: entra desde abajo al cambiar de habitación */}
                  <AnimatePresence>
                    <Foto
                      key={selectedRoom.id}
                      habitacion={selectedRoom}
                      className={s.heroFoto}
                      initial={{ opacity: 0, scale: 1.07, y: 40 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />
                  </AnimatePresence>
                  <div className="room-config-hero__overlay" />

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedRoom.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22, delay: 0.1 }}
                      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                    >
                      <div className="room-config-hero__badge"><Estado estado={selectedRoom.estado} /></div>
                      <div className="room-config-hero__info">
                        <div className="room-config-hero__eyebrow">{selectedRoom.tipo}, {nombrePropiedad(selectedRoom.propiedad_id)}</div>
                        <div className="room-config-hero__title">{selectedRoom.nombre}</div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {puede('habitaciones.editar') && (
                    <Button className={s.editarHero} onClick={() => onEditRoom(selectedRoom)}>
                      <PencilSimpleIcon size={16} weight="bold" /> Editar habitación
                    </Button>
                  )}
                </div>

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
                      <span className="admin-card__label">Tarifa base por noche</span>
                      <div className="admin-card__valor">
                        MXN ${reduceMotion
                          ? (selectedRoom.tarifa_centavos / 100).toLocaleString('es-MX')
                          : <CountUp to={selectedRoom.tarifa_centavos / 100} separator="," duration={0.9} />}
                      </div>
                    </div>
                    <div className="admin-card admin-card--primary">
                      <span className="admin-card__label">Estado</span>
                      <div className="admin-card__valor">{ESTADOS_HABITACION[selectedRoom.estado]}</div>
                      <div className="metric-card--primary metric-card__sub" style={{ marginTop: '8px' }}>
                        {selectedRoom.estado === 'activa' ? 'Lista para reservas' : 'No se puede reservar'}
                      </div>
                    </div>
                    <div className="admin-card admin-card--turquesa">
                      <span className="admin-card__label">Ocupación del mes</span>
                      <div className="admin-card__valor">
                        {metrica.datos ? `${metrica.datos.ocupacion}%` : metrica.cargando ? '…' : 'Sin dato'}
                      </div>
                      {metrica.datos && (
                        <div className="metric-card__sub" style={{ marginTop: 8 }}>{metrica.datos.noches_vendidas} noches vendidas</div>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}

            {/* ── Abajo: lista de habitaciones ── */}
            <div className="room-config-main-bottom">
              <div className={s.listaCabecera}>
                <h3 className="admin-section-title" style={{ marginBottom: 0 }}>Todas las habitaciones</h3>
                <GrupoPistas>
                  <div className={s.paginador}>
                    <Pista contenido="Página anterior">
                      <Button variant="outline" size="icon" disabled={loading || pagina <= 1}
                        onClick={() => setParams({ pagina: pagina - 1 })} aria-label="Página anterior">
                        <CaretLeftIcon size={16} weight="bold" />
                      </Button>
                    </Pista>
                    <span className={s.paginas}>{loading || totalPages === 0 ? '0 / 0' : `${pagina} / ${totalPages}`}</span>
                    <Pista contenido="Página siguiente">
                      <Button variant="outline" size="icon" disabled={loading || pagina >= totalPages}
                        onClick={() => setParams({ pagina: pagina + 1 })} aria-label="Página siguiente">
                        <CaretRightIcon size={16} weight="bold" />
                      </Button>
                    </Pista>
                  </div>
                </GrupoPistas>
              </div>

              <div className={s.filtros} aria-disabled={loading}>
                <div className={s.buscador}>
                  <MagnifyingGlassIcon size={17} className={s.buscadorIcono} aria-hidden="true" />
                  <Input
                    type="search"
                    aria-label="Buscar habitación"
                    placeholder="Buscar habitación"
                    value={texto}
                    maxLength={120}
                    onChange={e => setTexto(e.target.value)}
                    disabled={loading}
                    className="h-10 pl-10"
                  />
                </div>
                {/* JellyRadio (React Bits): la pastilla elegida se hincha y empuja a sus vecinas */}
                <JellyRadio
                  items={FILTROS}
                  value={estado}
                  onChange={handleFilter}
                  ariaLabel="Filtrar por estado"
                  size="md"
                  disabled={loading}
                  chipColor="var(--muted)"
                  activeColor="var(--primary)"
                  textColor="var(--muted-foreground)"
                  activeTextColor="var(--primary-foreground)"
                />
              </div>

              {/* Alto fijo: paginar o filtrar no hace saltar el scroll */}
              <div className={s.rejillaCaja} aria-busy={lista.actualizando}>
                {loading ? (
                  <div className={s.rejilla}>
                    <SkeletonRoomCard /><SkeletonRoomCard /><SkeletonRoomCard /><SkeletonRoomCard />
                  </div>
                ) : lista.error ? (
                  <ErrorCarga error={lista.error} onReintentar={lista.recargar} />
                ) : items.length === 0 ? (
                  <div className={s.vacio} role="status">
                    <span className={s.vacioIcono}><SmileySadIcon size={30} /></span>
                    <p>{sinHabitaciones ? 'Aún no hay habitaciones registradas.' : 'No se encontraron habitaciones con esos filtros.'}</p>
                    {!sinHabitaciones && <Button variant="outline" size="sm" onClick={limpiar}>Limpiar filtros</Button>}
                  </div>
                ) : (
                  <div className={s.rejilla}>
                    <AnimatePresence mode="popLayout">
                      {items.map(room => {
                        const elegida = selectedRoom?.id === room.id
                        return (
                          <motion.div
                            key={room.id}
                            {...animacionItem}
                            className={`${s.tarjeta} ${elegida ? s.tarjetaElegida : ''}`}
                            onClick={() => handleSelectRoom(room)}
                          >
                            <div className={s.tarjetaFoto}>
                              <AnimatePresence mode="wait">
                                {elegida ? (
                                  /* Esta foto "está" en el hero */
                                  <motion.div key="placeholder" className={s.tarjetaHueco}
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                                    <BedIcon size={36} weight="duotone" aria-hidden="true" />
                                  </motion.div>
                                ) : (
                                  <motion.div key="img" className={s.tarjetaImagen}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -28, scale: 0.95 }}
                                    transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}>
                                    <Imagen src={room.foto} alt={room.nombre} />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              <div className={s.tarjetaVelo} />
                              <div className={s.tarjetaInfo}>
                                <div className={s.tarjetaNombre}>{room.nombre}</div>
                                <div className={s.tarjetaFila}>
                                  <span className={s.tarjetaTipo}>{room.tipo}</span>
                                  <Estado estado={room.estado} corto />
                                </div>
                              </div>
                            </div>
                            <div className={s.tarjetaPie}>
                              <span>{pesos(room.tarifa_centavos)} / noche</span>
                              {puede('habitaciones.editar') && (
                                <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); onEditRoom(room) }}>
                                  Editar
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* ── Lateral ── */}
            <div className="room-config-sidebar">
              {selectedRoom && (
                <div className="admin-card">
                  <span className="admin-card__label">Acciones rápidas</span>
                  <div className={s.acciones}>
                    {[
                      puede('habitaciones.editar') && { Icono: PencilSimpleIcon, label: 'Editar detalles', action: () => onEditRoom(selectedRoom) },
                      puede('habitaciones.editar') && { Icono: CameraIcon, label: 'Gestionar fotos', action: () => onGestionarFotos?.(selectedRoom) },
                      { Icono: ProhibitIcon, label: 'Bloquear fechas', action: () => toast.info('Bloquear fechas', { description: 'En Reservaciones, Línea de tiempo: clic en un hueco y elige Mantenimiento.' }) },
                      puede('habitaciones.editar') && {
                        Icono: WrenchIcon,
                        label: selectedRoom.estado === 'activa' ? 'Reportar mantenimiento' : 'Marcar disponible',
                        action: alternarMantenimiento,
                      },
                      puede('habitaciones.eliminar') && { Icono: TrashIcon, label: 'Mandar a la papelera', action: () => setABorrar(selectedRoom) },
                    ].filter(Boolean).map(item => (
                      <button key={item.label} className={s.accion} onClick={item.action}>
                        <span className={s.accionIcono}><item.Icono size={18} weight="bold" aria-hidden="true" /></span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading ? <SkeletonReservationList rows={2} /> : (
                <div className="admin-card">
                  <span className="admin-card__label">Próximas reservas</span>
                  {UPCOMING_BOOKINGS.length === 0 && (
                    <p className={s.reservaNoches} style={{ marginTop: 8 }}>
                      {proximas.error ? proximas.error.message : 'Sin reservas próximas.'}
                    </p>
                  )}
                  {UPCOMING_BOOKINGS.slice(0, 2).map(res => (
                    <div key={res.id} className={s.proxima}>
                      <div>
                        <div className={s.reservaHuesped}>{res.guest}</div>
                        <div className={s.reservaNoches}>{res.dates}</div>
                      </div>
                      <span className="chip">{res.nights} noches</span>
                    </div>
                  ))}
                  {UPCOMING_BOOKINGS.length > 2 && <Button variant="outline" className="mt-3 w-full" onClick={() => verVista('reservas')}>
                    <CalendarDotsIcon size={16} weight="bold" /> Ver {UPCOMING_BOOKINGS.length - 2} reservas más
                  </Button>}
                </div>
              )}

              {loading ? (
                <SkeletonCard height="140px" />
              ) : (
                <div className="admin-card admin-card--primary">
                  <span className="admin-card__label">RevPAR</span>
                  <div className="admin-card__valor" style={{ marginBottom: '8px' }}>
                    {metrica.datos ? pesos(metrica.datos.revpar_centavos) : 'Sin dato'}
                  </div>
                  <div className="metric-card--primary metric-card__sub" style={{ marginTop: 0 }}>
                    Ingreso por noche disponible de {selectedRoom?.nombre ?? 'la habitación'} este mes.
                  </div>
                </div>
              )}
            </div>
          </div>

          <ConfirmarDescarte
            abierto={!!aBorrar}
            titulo="¿Mandar a la papelera?"
            texto={aBorrar ? `«${aBorrar.nombre}» deja de aparecer en el panel y no se puede reservar. Puedes restaurarla desde la papelera.` : ''}
            accion="Mandar a la papelera"
            cancelar="Cancelar"
            onConfirmar={mandarAPapelera}
            onCancelar={() => setABorrar(null)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Lo que está en la papelera: restaurar o (solo gerente) eliminar definitivamente (deja la lápida). */
function Papelera({ puedeVaciar, nombrePropiedad, onBack }) {
  const pedido = usePedido(senal => habitacionesApi.papelera(null, senal), [])
  const items = pedido.datos?.items ?? []
  const [aBorrar, setABorrar] = useState(null)
  const [ocupada, setOcupada] = useState(null)

  const hacer = async (id, accion, exito) => {
    setOcupada(id)
    try {
      await accion(id)
      toast.success(exito)
      pedido.recargar()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setOcupada(null)
    }
  }

  return (
    <SectionPanel
      eyebrow="Habitaciones"
      title={<>La <em>papelera</em></>}
      subtitle="Lo que se mandó aquí no aparece en el panel ni se puede reservar. Se puede restaurar."
      onBack={onBack}
    >
      <div className={s.listaReservas}>
        {pedido.cargando ? (
          <SkeletonReservationList rows={3} />
        ) : pedido.error ? (
          <ErrorCarga error={pedido.error} onReintentar={pedido.recargar} />
        ) : items.length === 0 ? (
          <div className={s.vacio} role="status">
            <span className={s.vacioIcono}><TrashIcon size={30} /></span>
            <p>La papelera está vacía.</p>
          </div>
        ) : (
          <ul className={s.papelera}>
            {items.map(h => (
              <li key={h.id} className={s.reserva}>
                <div className={s.reservaTexto}>
                  <div className={s.reservaHuesped}>{h.nombre}</div>
                  <div className={s.reservaCuarto}>
                    {nombrePropiedad(h.propiedad_id)}. Enviada el {fecha(h.eliminado_en)}{h.motivo ? ` (${h.motivo})` : ''}.
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled={ocupada === h.id}
                  onClick={() => hacer(h.id, habitacionesApi.restaurar, `«${h.nombre}» está de vuelta`)}>
                  <ArrowCounterClockwiseIcon size={16} weight="bold" /> Restaurar
                </Button>
                {puedeVaciar && (
                  <Button variant="destructive" size="sm" disabled={ocupada === h.id} onClick={() => setABorrar(h)}>
                    Eliminar definitivamente
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmarDescarte
        abierto={!!aBorrar}
        titulo="¿Eliminar definitivamente?"
        texto={aBorrar ? `«${aBorrar.nombre}» se elimina para siempre y no se puede deshacer. Su historial (reservas, auditoría) se conserva y la mostrará como eliminada definitivamente.` : ''}
        accion="Eliminar definitivamente"
        cancelar="Cancelar"
        onConfirmar={() => { const h = aBorrar; setABorrar(null); hacer(h.id, habitacionesApi.borrarDefinitivo, `«${h.nombre}» se eliminó definitivamente`) }}
        onCancelar={() => setABorrar(null)}
      />
    </SectionPanel>
  )
}
