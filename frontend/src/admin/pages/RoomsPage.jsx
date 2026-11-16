import { Fragment, useState, useEffect, useRef } from 'react'
import { LiquidSegments } from '@/components/devl/liquid-segments'
import { toast } from '@/admin/toast'
import {
  ArrowLeftIcon, ArrowUpRightIcon, PlusIcon, PencilSimpleIcon, CameraIcon, ProhibitIcon, WrenchIcon,
  MagnifyingGlassIcon, BedIcon, CalendarDotsIcon, CheckCircleIcon, ClockIcon, MoonIcon,
  TrashIcon, ArrowCounterClockwiseIcon, WarningCircleIcon,
} from '@phosphor-icons/react'
import { SkeletonRoomCard, SkeletonReservationList } from '@/components/frida/Skeleton'
import { Button } from '@/components/coss/button'
import { DropletButton } from '@/components/devl/droplet-button'
import TarjetaCifra from '@/components/marca/TarjetaCifra'
import ConfirmarRiesgo from '@/components/marca/ConfirmarRiesgo'
import Imagen from '@/components/marca/Imagen'
import Paginador from '@/components/marca/Paginador'
import { Florecita } from '@/components/marca/Wordmark'
import { useParametros } from '@/hooks/useParametros'
import { useRecargarAlCambiar } from '@/hooks/useRecargarAlCambiar'
import { usePedido } from '@/hooks/usePedido'
import { api } from '@/lib/api'
import { useSesion } from '@/lib/sesion'
import Inicial from '../components/Inicial'
import PortadaHabitacion from '../components/PortadaHabitacion'
import { habitacionesApi, pesos } from '../habitaciones'
import { ESTADOS_DIA, estadoDelDia } from '../estadoDia'
import { expandirDesde, recogerHacia } from '../transicionPanel'
import { reservasApi, hoy, hoyISO, sumarDias } from '../reservas'
import { aISO } from '@/lib/fechas'
import { florDeLugar, usePropiedadActual } from '../propiedadActual'
import SectionPanel from '../components/SectionPanel'
import s from './RoomsPage.module.css'

// Una destacada y el resto: con múltiplos de 6 la rejilla de 3 columnas cierra exacta.
const TAMANOS = [6, 12, 24, 48]
const CAMA = { king: 'King', queen: 'Queen', matrimonial: 'Matrimonial', individuales: 'Individuales' }
const datosDe = r => [`Hasta ${r.capacidad} personas`, r.tamano_m2 && `${r.tamano_m2} m²`, r.cama && `cama ${CAMA[r.cama].toLowerCase()}`].filter(Boolean).join(', ')


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

function Estado({ estado }) {
  const activa = estado === 'activa'
  return (
    <span className={`${s.chip} ${activa ? s.chipVerde : s.chipDorado}`}>
      {activa ? 'Activa' : estado === 'inactiva' ? 'Inactiva' : 'Mantenimiento'}
    </span>
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
  const { sesion } = useSesion()
  const puede = permiso => sesion?.permisos?.includes(permiso)
  const nombrePropiedad = id => sesion?.propiedades?.find(p => p.id === id)?.nombre ?? 'Sin dato'

  // Pantalla en la URL: búsqueda, filtro, página, habitación elegida y vista.
  const [{ q, estado, pagina, por_pagina: porPaginaUrl, habitacion: elegidaId, vista }, setParams] = useParametros({
    q: '', estado: 'todos', pagina: 1, por_pagina: 6, habitacion: '', vista: 'habitaciones',
  })

  const porPagina = TAMANOS.includes(porPaginaUrl) ? porPaginaUrl : TAMANOS[0]

  // La propiedad la elige el selector de la SideNav (para todo el panel).
  const { propiedadId } = usePropiedadActual()
  const lista = usePedido(
    senal => habitacionesApi.listar({ propiedad: propiedadId, q, estado: estado === 'todos' ? null : estado, pagina, por_pagina: porPagina }, senal),
    [propiedadId, q, estado, pagina, porPagina],
  )
  useRecargarAlCambiar('habitacion', lista.recargar) // otra persona (o el bot) cambió habitaciones
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
  const enPagina = items.find(r => r.id === elegidaId) ?? (guardada?.id === elegidaId ? guardada : null)
  // Abierta por URL y fuera de la página visible (recargar, enlace compartido): se pide sola.
  const suelta = usePedido(senal => (elegidaId && !enPagina ? habitacionesApi.obtener(elegidaId, senal) : null), [elegidaId, Boolean(enPagina)])
  const selectedRoom = elegidaId ? (enPagina ?? suelta.datos ?? null) : null

  // El detalle nace de su tarjeta y, al volver, regresa a ella.
  const handleSelectRoom = (room, e) => expandirDesde(e.currentTarget, () => {
    setGuardada(room)
    setParams({ habitacion: room.id }, { historial: true })
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  })
  const volvio = useRef(false) // al regresar, las tarjetas ya están: no entran de nuevo
  const volverALista = () => {
    const id = elegidaId
    volvio.current = true
    recogerHacia(() => setParams({ habitacion: '' }, { historial: true }), () => document.querySelector(`[data-habitacion="${id}"]`))
  }
  // Qué pasa hoy en cada habitación de la página (el renglón de la tarjeta).
  const deHoy = usePedido(
    senal => reservasApi.listar({ propiedad: propiedadId, desde: hoyISO(), hasta: aISO(sumarDias(hoy(), 1)), estado: ['confirmada', 'en_curso'], limite: 200 }, senal),
    [propiedadId],
  )
  const dia = estadoDelDia(items, deHoy.datos ?? [], hoyISO())
  const lugarDe = id => sesion?.propiedades?.find(p => p.id === id)?.lugar.split(',')[0] ?? ''

  const handleFilter = f => setParams({ estado: f, pagina: 1 })
  const limpiar = () => setParams({ q: '', estado: 'todos', pagina: 1 })
  const verVista = v => setParams({ vista: v }, { historial: true })
  const abrirVista = (v, e) => expandirDesde(e.currentTarget, () => verVista(v))
  const cerrarVista = () => recogerHacia(() => verVista('habitaciones'))

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
    <>
      {vista === 'reservas' ? (
        /* ═══ Vista: próximas reservas ═══ */
          <SectionPanel
            title={<>Próximas <em>reservas</em></>}
            subtitle={`${selectedRoom?.nombre ?? ''}: ${UPCOMING_BOOKINGS.length} reservas desde hoy`}
            onBack={cerrarVista}
          >
            <div className="inventory-grid" style={{ marginBottom: '28px' }}>
              <TarjetaCifra Icono={CalendarDotsIcon} flor="morado"   label="Total de reservas" value={UPCOMING_BOOKINGS.length} />
              <TarjetaCifra Icono={CheckCircleIcon}  flor="turquesa" label="Confirmadas"       value={confirmadas} />
              <TarjetaCifra Icono={ClockIcon}        flor="dorado"   label="Pendientes"        value={UPCOMING_BOOKINGS.length - confirmadas} />
              <TarjetaCifra Icono={MoonIcon}         flor="orquidea" label="Noches totales"    value={UPCOMING_BOOKINGS.reduce((n, b) => n + b.nights, 0)} />
            </div>

            <ol className={s.listaReservas}>
              {UPCOMING_BOOKINGS.map((booking, i) => (
                  <li key={booking.id ?? i} className={s.reserva}>
                    <span className={s.reservaNum}>{i + 1}</span>
                    <div className={s.reservaTexto}>
                      <div className={s.reservaHuesped}>{booking.guest}</div>
                      <div className={s.reservaCuarto}>{booking.room}</div>
                    </div>
                    <div className={s.reservaFechas}>
                      <div>{booking.dates}</div>
                      <div className={s.reservaNoches}>{booking.nights} noche{booking.nights !== 1 ? 's' : ''}</div>
                    </div>
                    <span className={`${s.chip} ${booking.status === 'confirmed' ? s.chipVerde : s.chipDorado}`}>
                      {booking.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                    </span>
                  </li>
              ))}
            </ol>
          </SectionPanel>
      ) : vista === 'papelera' ? (
          <Papelera
            puedeVaciar={puede('papelera.vaciar')}
            nombrePropiedad={nombrePropiedad}
            onBack={cerrarVista}
          />
      ) : selectedRoom ? (
        /* ═══ Detalle: nace de la tarjeta y regresa a ella ═══ */
        <div>
          <div className={s.portadaDetalle}>
            {selectedRoom.foto ? <Imagen src={selectedRoom.foto} alt={selectedRoom.nombre} /> : <PortadaHabitacion tipo={selectedRoom.tipo} color={florDeLugar(lugarDe(selectedRoom.propiedad_id))} grande />}
            <div className={s.detalleBarra}>
              <Button variant="outline" className="rounded-full bg-background" onClick={volverALista}>
                <ArrowLeftIcon size={15} weight="bold" /> Habitaciones
              </Button>
              <span className={s.detalleAcciones}>
                {puede('habitaciones.editar') && <Button variant="outline" className="rounded-full bg-background" onClick={() => onGestionarFotos?.(selectedRoom)}><CameraIcon size={15} weight="bold" /> Fotos</Button>}
                <Button variant="outline" className="rounded-full bg-background" onClick={() => toast.info('Bloquear fechas', { description: 'En Reservaciones, Línea de tiempo: clic en un hueco y elige Mantenimiento.' })}><ProhibitIcon size={15} weight="bold" /> Bloquear fechas</Button>
                {puede('habitaciones.editar') && <DropletButton onClick={() => onEditRoom(selectedRoom)}><PencilSimpleIcon size={15} weight="bold" /> Editar</DropletButton>}
              </span>
            </div>
          </div>

          <div className={s.detalle}>
            <div className={s.detallePrincipal}>
              <div className={s.chips}>
                <span className={s.chip}><Florecita color={florDeLugar(lugarDe(selectedRoom.propiedad_id))} tamano={11} />{lugarDe(selectedRoom.propiedad_id) || nombrePropiedad(selectedRoom.propiedad_id)}</span>
                <span className={s.chip}>{selectedRoom.tipo}</span>
                <span className={s.chip}>Hasta {selectedRoom.capacidad} personas</span>
                <Estado estado={selectedRoom.estado} />
              </div>
              <h1 className="admin-page-title">{selectedRoom.nombre}</h1>
              {selectedRoom.descripcion && <p className={s.descripcion}>{selectedRoom.descripcion}</p>}
              <div className="inventory-grid">
                <TarjetaCifra label="Tarifa base" prefijo="$" value={selectedRoom.tarifa_centavos / 100} sub="Por noche" />
                <TarjetaCifra label="Ocupación del mes" value={metrica.datos ? metrica.datos.ocupacion : 'Sin dato'} sufijo={metrica.datos ? '%' : ''} sub={metrica.datos ? `${metrica.datos.noches_vendidas} noches vendidas` : undefined} />
                <TarjetaCifra label="RevPAR" value={metrica.datos ? pesos(metrica.datos.revpar_centavos) : 'Sin dato'} sub="Ingreso por noche disponible" />
              </div>
            </div>

            <div className={s.detalleLateral}>
              <section className={s.panel}>
                <h2 className={s.panelTitulo}>Próximas reservas</h2>
                {UPCOMING_BOOKINGS.length === 0 && <p className={s.reservaNoches}>{proximas.error ? proximas.error.message : 'Sin reservas próximas.'}</p>}
                <ul className={s.proximas}>
                  {UPCOMING_BOOKINGS.slice(0, 3).map(res => (
                    <li key={res.id}>
                      <Inicial nombre={res.guest} />
                      <span className={s.proximaTexto}><b>{res.guest}</b><span>{res.dates}</span></span>
                      <span className={s.chip}>{res.nights} noches</span>
                    </li>
                  ))}
                </ul>
                {UPCOMING_BOOKINGS.length > 3 && <Button variant="outline" size="sm" className="mt-2 w-full rounded-full" onClick={e => abrirVista('reservas', e)}>
                  <CalendarDotsIcon size={15} weight="bold" /> Ver {UPCOMING_BOOKINGS.length - 3} reservas más
                </Button>}
              </section>
              {(puede('habitaciones.editar') || puede('habitaciones.eliminar')) && (
                <section className={s.panel}>
                  <h2 className={s.panelTitulo}>Más acciones</h2>
                  <div className={s.acciones}>
                    {puede('habitaciones.editar') && <Button variant="outline" size="sm" className="rounded-full" onClick={alternarMantenimiento}><WrenchIcon size={15} weight="bold" /> {selectedRoom.estado === 'activa' ? 'Reportar mantenimiento' : 'Marcar disponible'}</Button>}
                    {puede('habitaciones.eliminar') && <Button variant="outline" size="sm" className="rounded-full" onClick={() => setABorrar(selectedRoom)}><TrashIcon size={15} weight="bold" /> Mandar a la papelera</Button>}
                  </div>
                </section>
              )}
            </div>
          </div>

          <ConfirmarRiesgo
            abierto={!!aBorrar}
            riesgo="medio"
            titulo={aBorrar ? `¿Mandar «${aBorrar.nombre}» a la papelera?` : ''}
            consecuencias={[
              'Deja de aparecer en el panel y no se puede reservar.',
              'Sus reservas abiertas NO se cancelan, pero no se podrá registrar su llegada ni su salida.',
              'Al pasar la última noche de sus reservas, la habitación se elimina sola.',
            ]}
            deshacer="Se restaura desde la papelera, con todo y sus reservas."
            accion="Mandar a la papelera"
            onConfirmar={mandarAPapelera}
            onCancelar={() => setABorrar(null)}
          />
        </div>
      ) : (
        /* ═══ Lista: las tarjetas de la previa ═══ */
        <div>
          <div className={s.cabecera}>
            <div>
              <h1 className="admin-page-title">Habitaciones</h1>
              <p className="admin-date">{lista.datos ? `${lista.datos.meta.total} en total. Toca una para abrirla` : 'Toca una para abrirla'}</p>
            </div>
            <div className={s.herramientas} aria-disabled={loading}>
              {/* LiquidSegments (devl.dev): la gota elegida se estira hacia la opción nueva */}
              <LiquidSegments options={FILTROS} value={estado} onValueChange={handleFilter} aria-label="Filtrar por estado" size="default" />
              {puede('habitaciones.eliminar') && (
                <Button variant="outline" size="icon-lg" aria-label="Papelera" onClick={e => abrirVista('papelera', e)}><TrashIcon size={16} weight="bold" /></Button>
              )}
              {puede('habitaciones.editar') && (
                <Button variant="outline" size="lg" onClick={() => onNavigate('nueva-habitacion')}>
                  <PlusIcon size={16} weight="bold" /> Nueva habitación
                </Button>
              )}
            </div>
          </div>

          <div aria-busy={lista.actualizando}>
            {loading ? (
              <div className={s.cuartos}>{[0, 1, 2, 3].map(i => <SkeletonRoomCard key={i} />)}</div>
            ) : lista.error ? (
              <ErrorCarga error={lista.error} onReintentar={lista.recargar} />
            ) : items.length === 0 ? (
              <div className={s.vacio} role="status">
                <span className={s.vacioIcono}><BedIcon size={30} /></span>
                <p>{sinHabitaciones ? 'Aún no hay habitaciones registradas.' : 'No se encontraron habitaciones con esos filtros.'}</p>
                {sinHabitaciones
                  ? puede('habitaciones.editar') && <Button variant="outline" size="sm" onClick={() => onNavigate('nueva-habitacion')}>Crear la primera</Button>
                  : <Button variant="outline" size="sm" onClick={limpiar}>Limpiar filtros</Button>}
              </div>
            ) : (
              <div className={`${s.cuartos} ${volvio.current ? '' : 'entra-escalonado'}`}>
                {items.map((room, i) => {
                  const lugar = lugarDe(room.propiedad_id)
                  const color = florDeLugar(lugar)
                  const h = dia[room.id]
                  // Con todas las propiedades, un encabezado al empezar cada sucursal (vienen ordenadas
                  // por propiedad desde la API, también entre páginas).
                  const sucursal = !propiedadId && room.propiedad_id !== items[i - 1]?.propiedad_id
                    && sesion?.propiedades?.find(p => p.id === room.propiedad_id)
                  return (
                    <Fragment key={room.id}>
                    {sucursal && (
                      <h3 className={s.sucursal}>
                        <Florecita color={color} tamano={16} />{sucursal.nombre}<span className={s.sucursalLugar}>{sucursal.lugar}</span>
                      </h3>
                    )}
                    <button type="button" data-habitacion={room.id} onClick={e => handleSelectRoom(room, e)} aria-label={`Abrir ${room.nombre}`}
                      className={`${s.cuarto} ${i === 0 ? s.cuartoDestacado : ''}`}>
                      <span className={s.portada}>
                        {room.foto ? <Imagen src={room.foto} alt="" /> : <PortadaHabitacion tipo={room.tipo} color={color} grande={i === 0} />}
                        {!room.foto && <span className={s.marca} style={{ color }} aria-hidden="true">${(room.tarifa_centavos / 100000).toFixed(1)}k</span>}
                        <span className={s.abrir} aria-hidden="true"><ArrowUpRightIcon size={14} weight="bold" /></span>
                      </span>
                      <span className={s.cuartoCuerpo}>
                        <span className={s.chips}>
                          <span className={s.chip}><Florecita color={color} tamano={11} />{lugar}</span>
                          <span className={s.chip}>{room.tipo}</span>
                          {room.estado !== 'activa' && <Estado estado={room.estado} />}
                          <span className={s.precio}>${(room.tarifa_centavos / 100).toLocaleString('es-MX', { minimumFractionDigits: room.tarifa_centavos % 100 ? 2 : 0 })} la noche</span>
                        </span>
                        <span className={s.cuartoNombre}>{room.nombre}</span>
                        {i === 0 && room.descripcion && <span className={s.cuartoTexto}>{room.descripcion}</span>}
                        <span className={s.cuartoMeta}>{datosDe(room)}. {h ? ESTADOS_DIA[h.estado].texto : ''}</span>
                        {room.amenidades?.length > 0 && (
                          <span className={s.amenidades}>
                            {room.amenidades.slice(0, 4).map(a => <span key={a} className={s.chip}>{a}</span>)}
                            {room.amenidades.length > 4 && <span className={s.chip}>+{room.amenidades.length - 4}</span>}
                          </span>
                        )}
                      </span>
                    </button>
                    </Fragment>
                  )
                })}
              </div>
            )}
          </div>

          {lista.datos && lista.datos.meta.total > 0 && (
            <div className={s.pie}>
              <p className={s.rango} aria-live="polite">
                Mostrando {(pagina - 1) * porPagina + 1} a {Math.min(pagina * porPagina, lista.datos.meta.total)} de {lista.datos.meta.total}
                <strong className={s.paginaActual}>Página {pagina} de {totalPages}</strong>
              </p>
              <div className={s.porPagina}>
                <span id="por-pagina-etiqueta" className={s.rango}>Por página</span>
                <LiquidSegments
                  options={TAMANOS.map(n => ({ value: String(n), label: String(n) }))} value={String(porPagina)}
                  onValueChange={v => setParams({ por_pagina: Number(v), pagina: 1 })} size="sm" aria-label="Habitaciones por página"
                />
              </div>
              {totalPages > 1 && <Paginador id="pag-habitaciones" pagina={pagina} total={totalPages} onCambiar={v => setParams({ pagina: v })} etiqueta="Páginas de habitaciones" />}
            </div>
          )}
        </div>
      )}
    </>
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

      <ConfirmarRiesgo
        abierto={!!aBorrar}
        riesgo="alto"
        titulo={aBorrar ? `¿Eliminar «${aBorrar.nombre}» definitivamente?` : ''}
        consecuencias={[
          'Se borran sus datos y sus fotos.',
          'Su historial de reservas y la auditoría se conservan y la mostrarán como eliminada.',
        ]}
        accion="Eliminar definitivamente"
        onConfirmar={() => { const h = aBorrar; setABorrar(null); hacer(h.id, habitacionesApi.borrarDefinitivo, `«${h.nombre}» se eliminó definitivamente`) }}
        onCancelar={() => setABorrar(null)}
      />
    </SectionPanel>
  )
}
