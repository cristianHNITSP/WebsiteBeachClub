import { useState } from 'react'
import { motion } from 'motion/react'
import { toast } from '@/admin/toast'
import { SignInIcon, SignOutIcon, CurrencyDollarIcon, ArrowUUpLeftIcon, ProhibitIcon, CheckCircleIcon, HourglassMediumIcon, HouseLineIcon, SealCheckIcon, ClockCountdownIcon, WrenchIcon, BedIcon, CalendarDotsIcon, MoonStarsIcon, EnvelopeSimpleIcon, PhoneIcon } from '@phosphor-icons/react'
import { Sheet, SheetDescription, SheetPopup, SheetTitle } from '@/components/coss/sheet'
import { Badge } from '@/components/coss/badge'
import { InkStamp } from '@/components/devl/ink-stamp'
import { MoneyInput } from '@/components/devl/money-input'
import { SplitButton } from '@/components/devl/split-button'
import { Button } from '@/components/coss/button'
import { Input } from '@/components/coss/input'
import { Label } from '@/components/coss/label'
import { SkeletonCard } from '@/components/frida/Skeleton'
import Selector from '@/admin/components/Selector'
import Inicial from './Inicial'
import ConfirmarRiesgo from '@/components/marca/ConfirmarRiesgo'
import OpcionesCobro from './OpcionesCobro'
import { usePedido } from '@/hooks/usePedido'
import { useSesion } from '@/lib/sesion'
import { SITUACION, habitacionEliminada } from '@/lib/situacion'
import AvisoHabitacionEliminada from './AvisoHabitacionEliminada'
import { pesos } from '../habitaciones'
import { FUENTES, deFuera as esDeFuera, reservasApi } from '../reservas'
import s from './DetalleReserva.module.css'

/*
 * Detalle de una reserva (panel lateral). Lo que se HACE va arriba, a la vista:
 * check-in, check-out, cobrar (todo, o noche por noche) y cancelar; debajo, el
 * desglose por noche (cuál ya está pagada), los datos, los pagos y el historial.
 * Todo lo decide y lo calcula la API; aquí solo se muestra y se pide.
 *
 * `accion` ('pago' | 'salida'): abre ya el cobro; con 'salida', al cobrar lo
 * pendiente registra también el check-out (la salida exige no deber nada).
 */

const ESTADO = {
  retenida: 'Pendiente de pago', confirmada: 'Confirmada', en_curso: 'En curso',
  completada: 'Completada', expirada: 'Vencida', cancelada: 'Cancelada',
}
const EVENTO = {
  crear: 'Creada', mover: 'Fechas o habitación cambiadas', llegada: 'Check-in registrado',
  salida: 'Check-out registrado', cancelar: 'Cancelada', pago: 'Pago registrado', devolucion: 'Devolución registrada',
  expirar: 'Venció sin pagarse',
}
const CONCEPTO = { anticipo: 'Anticipo', total: 'Total', saldo: 'Saldo', abono: 'Abono', devolucion: 'Devolución' }
const NOCHE = { pagada: 'Pagada', parcial: 'Pagada en parte', pendiente: 'Por cobrar' }
const INSIGNIA_NOCHE = { pagada: 'success', parcial: 'warning', pendiente: 'error' }
const MXN = [{ code: 'MXN', locale: 'es-MX', name: 'Peso mexicano' }]
const METODOS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
]
const fecha = iso => { const t = new Date(`${iso}T12:00`).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }); return t.charAt(0).toUpperCase() + t.slice(1) }
const momento = iso => new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
// Las noches son fechas de Mérida (como en la API), no del reloj de quien mira.
const hoyISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Merida' })
const aCentavos = texto => Math.round(Number(texto) * 100)
const COBRABLE = ['confirmada', 'en_curso', 'completada']

/* La cabecera como la de un pedido en camino: qué pasa ahora, en grande, y en qué etapa va. */
const ETAPAS = ['Reservada', 'Confirmada', 'Check-in', 'Check-out']
const ETAPA = { retenida: 1, confirmada: 2, en_curso: 3, completada: 4 }
function situacionDe(r, hoy) {
  const n = `${r.noches} noche${r.noches !== 1 ? 's' : ''}`
  if (r.tipo === 'bloqueo') return { Icono: WrenchIcon, tono: 'apagado', titulo: 'En mantenimiento', antes: `Del ${fecha(r.llegada).toLowerCase()} al ${fecha(r.salida).toLowerCase()}` }
  switch (r.estado) {
    case 'retenida': return { Icono: HourglassMediumIcon, tono: 'aviso', titulo: 'Falta confirmar el pago', antes: `Llegaría el ${fecha(r.llegada).toLowerCase()}, ${n}` }
    case 'confirmada': return r.llegada <= hoy
      ? { Icono: CheckCircleIcon, tono: 'marca', titulo: 'Llega hoy', antes: `Sale el ${fecha(r.salida).toLowerCase()}, ${n}` }
      : { Icono: CheckCircleIcon, tono: 'marca', titulo: 'Lista para su llegada', antes: `Llega el ${fecha(r.llegada).toLowerCase()}, ${n}` }
    case 'en_curso': return r.salida <= hoy
      ? { Icono: HouseLineIcon, tono: 'exito', titulo: 'Sale hoy', antes: `Llegó el ${fecha(r.llegada).toLowerCase()}, ${n}` }
      : { Icono: HouseLineIcon, tono: 'exito', titulo: 'Hospedada ahora', antes: `Sale el ${fecha(r.salida).toLowerCase()}, ${n}` }
    case 'completada': return { Icono: SealCheckIcon, tono: 'exito', titulo: 'Estancia terminada', antes: `Salió el ${fecha(r.salida).toLowerCase()}, ${n}` }
    case 'cancelada': return { Icono: ProhibitIcon, tono: 'peligro', titulo: 'Reserva cancelada', antes: `Era para el ${fecha(r.llegada).toLowerCase()}, ${n}` }
    default: return { Icono: ClockCountdownIcon, tono: 'apagado', titulo: 'Venció sin pagarse', antes: `Era para el ${fecha(r.llegada).toLowerCase()}, ${n}` }
  }
}
const resorte = { type: 'spring', stiffness: 440, damping: 30 }

/** Cómo se registra un cobro según lo que cubre (la persona solo elige monto y método). */
function conceptoDe(r, monto) {
  if (monto >= r.por_cobrar_centavos) return r.pagado_centavos === 0 ? 'total' : 'saldo'
  if (r.pagado_centavos === 0 && r.modalidad === 'anticipo' && monto === r.anticipo_centavos) return 'anticipo'
  return 'abono'
}

export default function DetalleReserva({ reservaId, accion, onCerrar, onCambio }) {
  // El contenido se queda mientras el panel sale: si no, se iría vacío.
  const [visible, setVisible] = useState(reservaId)
  if (reservaId && reservaId !== visible) setVisible(reservaId)
  return (
    <Sheet open={!!reservaId} onOpenChange={o => { if (!o) onCerrar() }}>
      <SheetPopup className={s.hoja} closeProps={{ 'aria-label': 'Cerrar' }}>
        {visible && <Contenido key={visible} reservaId={visible} accion={accion} onCambio={onCambio} />}
      </SheetPopup>
    </Sheet>
  )
}

function Contenido({ reservaId, accion, onCambio }) {
  const { sesion } = useSesion()
  const puede = p => sesion?.permisos?.includes(p)
  const detalle = usePedido(senal => reservasApi.detalle(reservaId, senal), [reservaId])
  const historial = usePedido(senal => reservasApi.historial(reservaId, senal), [reservaId])
  // null | { tipo: 'pago' | 'devolucion', monto?, salida? }
  const [formulario, setFormulario] = useState(accion === 'pago' || accion === 'salida' ? { tipo: 'pago', salida: accion === 'salida' } : null)
  const [aCancelar, setACancelar] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [sello, setSello] = useState(null) // se estampa "Pagado" al liquidar

  if (detalle.cargando) return <div className={s.cuerpo}><SkeletonCard height="120px" /><SkeletonCard height="220px" /></div>
  if (detalle.error) {
    return (
      <div className={s.cuerpo} role="alert">
        <p>{detalle.error.message}</p>
        <Button variant="outline" onClick={detalle.recargar}>Reintentar</Button>
      </div>
    )
  }
  const r = detalle.datos
  const reserva = r.tipo === 'reserva'
  const fuera = SITUACION[r.habitacion_situacion]
  const sinHabitacion = habitacionEliminada(r) // sin check-in ni check-out hasta restaurarla
  const hoy = hoyISO()
  // De Booking, Airbnb…: la plataforma es la dueña. Aquí solo llegada, salida o cancelar; nada de cobros.
  const deFuera = esDeFuera(r)
  const cobrable = reserva && !deFuera && COBRABLE.includes(r.estado) && r.por_cobrar_centavos > 0 && puede('pagos.registrar')

  const hacer = async (pedir, exito) => {
    setOcupado(true)
    try {
      await pedir()
      toast.success(exito)
      setFormulario(null)
      detalle.recargar(); historial.recargar(); onCambio?.()
    } catch (e) {
      toast.error(e.message)
      if (e.datos?.codigo === 'version') detalle.recargar()
    } finally {
      setOcupado(false)
    }
  }
  // Cobrar y, si se pidió, hacer el check-out con la versión NUEVA (cobrar la cambia).
  const cobrar = (datos, salida) => hacer(async () => {
    await reservasApi.pagar(r.id, datos)
    if (datos.monto_centavos >= r.por_cobrar_centavos) setSello(Date.now())
    if (salida) {
      const fresca = await reservasApi.detalle(r.id)
      await reservasApi.salida(r.id, fresca.version)
    }
  }, salida ? 'Pago y check-out registrados' : 'Pago registrado')

  const devuelve = reserva && !deFuera && r.pagado_centavos > 0 && puede('pagos.registrar')
  const acciones = [
    reserva && r.estado === 'confirmada' && r.llegada <= hoy && hoy < r.salida && puede('reservas.editar') && {
      Icono: SignInIcon, texto: 'Check-in', ayuda: sinHabitacion ? 'Habitación eliminada' : 'Registrar la llegada', principal: true, bloqueo: sinHabitacion,
      fn: () => hacer(() => reservasApi.llegada(r.id, r.version), 'Check-in registrado'),
    },
    r.estado === 'en_curso' && puede('reservas.editar') && r.por_cobrar_centavos === 0 && {
      Icono: SignOutIcon, texto: 'Check-out', ayuda: sinHabitacion ? 'Habitación eliminada' : 'Registrar la salida', principal: true, bloqueo: sinHabitacion,
      fn: () => hacer(() => reservasApi.salida(r.id, r.version), 'Check-out registrado'),
    },
    r.estado === 'en_curso' && puede('reservas.editar') && cobrable && {
      Icono: SignOutIcon, texto: 'Cobrar y hacer check-out', ayuda: sinHabitacion ? 'Habitación eliminada' : `Falta cobrar ${pesos(r.por_cobrar_centavos)}`, principal: true, bloqueo: sinHabitacion,
      fn: () => setFormulario({ tipo: 'pago', salida: true }),
    },
    cobrable && !devuelve && {
      Icono: CurrencyDollarIcon, texto: 'Cobrar', ayuda: `Pendiente: ${pesos(r.por_cobrar_centavos)}`,
      fn: () => setFormulario({ tipo: 'pago' }),
    },
    devuelve && !cobrable && {
      Icono: ArrowUUpLeftIcon, texto: 'Devolución', fn: () => setFormulario({ tipo: 'devolucion' }),
    },
    ['retenida', 'confirmada'].includes(r.estado) && puede('reservas.cancelar') && {
      Icono: ProhibitIcon, texto: r.tipo === 'bloqueo' ? 'Quitar bloqueo' : 'Cancelar', peligro: true, fn: () => setACancelar(true),
    },
  ].filter(Boolean)

  const cubre = coberturaDePagos(r)
  // Lo pendiente desde la primera noche hasta la elegida (inclusive).
  const hastaAqui = i => r.desglose.slice(0, i + 1).reduce((t, n) => t + n.monto_centavos - n.pagado_centavos, 0)
  const sit = situacionDe(r, hoy)

  return (
    <>
      {/* ── Qué pasa ahora, en grande, y la etapa (como un pedido en camino) ── */}
      <section className={`${s.seccion} ${s.cabeza}`}>
        <p className={s.antes}>{sit.antes}</p>
        <div className={`${s.titular} ${s[sit.tono]}`}>
          <span>{sit.titulo}</span>
          <motion.span key={r.estado} className={s.iconoEstado} initial={{ scale: 0.4, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ ...resorte, delay: 0.12 }}>
            <sit.Icono size={26} weight="fill" aria-hidden="true" />
          </motion.span>
        </div>
        <SheetDescription className={s.bajada}>
          {r.codigo}. {r.habitacion_nombre}{fuera ? ` (${fuera.texto.toLowerCase()})` : ''}
        </SheetDescription>
        {reserva && ETAPA[r.estado] && (
          <ol className={s.etapas} aria-label={`Etapa: ${ETAPAS[ETAPA[r.estado] - 1]}`}>
            {ETAPAS.map((e, k) => (
              <li key={e} className={k < ETAPA[r.estado] ? s.hecha : ''} aria-current={k === ETAPA[r.estado] - 1 ? 'step' : undefined}>
                <span className={s.riel}>
                  {k < ETAPA[r.estado] && <motion.span className={s.relleno} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.45, delay: 0.15 + k * 0.12, ease: [0.22, 1, 0.36, 1] }} />}
                </span>
                {e}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ── Quién y qué sigue ── */}
      <section className={s.seccion}>
        <div className={s.persona}>
          {reserva ? <Inicial nombre={r.huesped_nombre} tamano={48} /> : <span className={s.iconoBloqueo}><WrenchIcon size={22} weight="bold" aria-hidden="true" /></span>}
          <div className={s.personaTexto}>
            <SheetTitle className={s.nombre}>{reserva ? r.huesped_nombre : (r.notas || 'Bloqueo de mantenimiento')}</SheetTitle>
            <span className={s.personaDato}>
              {reserva ? `${r.adultos} adulto${r.adultos !== 1 ? 's' : ''}${r.ninos ? `, ${r.ninos} niño${r.ninos !== 1 ? 's' : ''}` : ''}` : 'Las noches no se venden'}
              {deFuera && <Badge variant="outline" className={s.fuente}>{FUENTES[r.fuente]}</Badge>}
            </span>
          </div>
        </div>

        <div className={s.tarjeta}>
          <AvisoHabitacionEliminada reserva={r} />
          {deFuera && (
            <p className={s.deFuera} role="note">
              Viene de {FUENTES[r.fuente]}. Los cambios y los cobros se hacen en esa plataforma; en el panel solo se registra su llegada y su salida, o se cancela.
            </p>
          )}
          {(acciones.length > 0 || (cobrable && devuelve)) ? (
            <div className={s.acciones} role="group" aria-label="Acciones de la reserva">
              {/* Cobrar y devolver son el mismo tema: una sola pieza con su menú. */}
              {cobrable && devuelve && (
                <SplitButton variant="outline" remember={false} menuLabel="Dinero" disabled={ocupado}
                  actions={[
                    { id: 'pago', label: 'Cobrar', description: `Pendiente: ${pesos(r.por_cobrar_centavos)}`, done: 'Cobrar' },
                    { id: 'devolucion', label: 'Devolución', description: `Pagado: ${pesos(r.pagado_centavos)}`, done: 'Cobrar' },
                  ]}
                  onAction={a => setFormulario({ tipo: a.id })} />
              )}
              {acciones.map(a => (
                <Button key={a.texto} variant={a.peligro ? 'destructive-outline' : a.principal ? 'default' : 'outline'} disabled={ocupado || a.bloqueo} onClick={a.fn}
                  className={`${s.accion} ${a.principal ? s.accionPrincipal : ''}`} title={a.ayuda ?? undefined}>
                  <a.Icono size={16} weight="bold" aria-hidden="true" />
                  <span>{a.texto}{a.ayuda && <small className={s.ayudaBoton}>{a.ayuda}</small>}</span>
                </Button>
              ))}
            </div>
          ) : !deFuera && <p className={s.nadaQueHacer}>No queda nada por hacer con esta reserva.</p>}
          {formulario && (
            <FormularioDinero
              key={`${formulario.tipo}-${formulario.monto ?? 'todo'}-${formulario.salida ? 's' : ''}`}
              reserva={r}
              tipo={formulario.tipo}
              salida={formulario.salida}
              monto={formulario.monto}
              maximo={formulario.tipo === 'pago' ? r.por_cobrar_centavos : r.pagado_centavos}
              ocupado={ocupado}
              onCancelar={() => setFormulario(null)}
              onEnviar={datos => formulario.tipo === 'pago'
                ? cobrar(datos, formulario.salida)
                : hacer(() => reservasApi.devolver(r.id, datos), 'Devolución registrada')}
            />
          )}
        </div>
      </section>

      {/* ── La estancia ── */}
      <section className={s.seccion} aria-labelledby="t-estancia">
        <h3 className={s.rotulo} id="t-estancia">Estancia</h3>
        <div className={s.renglon}><BedIcon size={18} aria-hidden="true" /><span>{r.habitacion_nombre}</span></div>
        <div className={s.renglon}><CalendarDotsIcon size={18} aria-hidden="true" /><span>{fecha(r.llegada)} → {fecha(r.salida)}</span></div>
        {reserva && r.huesped_correo && <div className={s.renglon}><EnvelopeSimpleIcon size={18} aria-hidden="true" /><span>{r.huesped_correo}</span></div>}
        {reserva && r.huesped_telefono && <div className={s.renglon}><PhoneIcon size={18} aria-hidden="true" /><span>{r.huesped_telefono}</span></div>}
        {reserva && r.notas && <p className={s.nota}>“{r.notas}”</p>}
        {r.motivo_cancelacion && <p className={s.nota}>Cancelada: “{r.motivo_cancelacion}”</p>}
      </section>

      {/* ── La cuenta, como la lista de un pedido: noche por noche ── */}
      {/* Cancelada o vencida ya no debe nada: la cuenta confundiría (los pagos, si hubo, siguen abajo). */}
      {reserva && !deFuera && r.desglose.length > 0 && !['cancelada', 'expirada'].includes(r.estado) && (
        <section className={s.seccion} aria-labelledby="t-cuenta">
          <div className={s.rotuloFila}>
            <h3 className={s.rotulo} id="t-cuenta">La cuenta</h3>
            <span>{r.noches} noche{r.noches !== 1 ? 's' : ''}</span>
          </div>
          <ol className={s.noches}>
            {r.desglose.map((n, i) => (
              <li key={n.fecha} className={s.noche}>
                <span className={`${s.ficha} ${s[`ficha_${n.estado}`]}`} aria-hidden="true"><MoonStarsIcon size={18} weight="duotone" /></span>
                <span className={s.nocheTexto}>
                  <span className={s.nocheFecha}>Noche del {fecha(n.fecha).toLowerCase()}{n.fecha === hoy && <em className={s.hoy}>Hoy</em>}</span>
                  <span className={s.nocheEstado}>
                    <Badge variant={INSIGNIA_NOCHE[n.estado]}>{NOCHE[n.estado]}{n.estado === 'parcial' ? ` (${pesos(n.pagado_centavos)})` : ''}</Badge>
                    {cobrable && n.estado !== 'pagada' && (
                      <button type="button" className={s.cobrarAqui} disabled={ocupado}
                        onClick={() => setFormulario({ tipo: 'pago', monto: hastaAqui(i) })}
                        aria-label={`Cobrar hasta la noche del ${fecha(n.fecha)}: ${pesos(hastaAqui(i))}`}>
                        Cobrar hasta aquí
                      </button>
                    )}
                  </span>
                </span>
                <span className={s.nocheMonto}>{pesos(n.monto_centavos)}</span>
              </li>
            ))}
          </ol>
          <div className={s.dinero} aria-label="Cobro">
            <div><span>Total</span><strong>{pesos(r.total_centavos)}</strong></div>
            <div><span>Pagado</span><strong>{pesos(r.pagado_centavos)}</strong></div>
            <div className={r.por_cobrar_centavos > 0 ? s.pendiente : s.alCorriente}>
              <span>Por cobrar</span><strong>{r.por_cobrar_centavos > 0 ? pesos(r.por_cobrar_centavos) : 'Todo pagado'}</strong>
            </div>
            <InkStamp label="Pagado" tone="violet" stampKey={sello} className={s.sello} />
          </div>
        </section>
      )}

      {reserva && r.pagos.length > 0 && (
        <section className={s.seccion} aria-labelledby="t-pagos">
          <h3 className={s.rotulo} id="t-pagos">Pagos</h3>
          <ul className={s.lista}>
            {r.pagos.map(p => (
              <li key={p.id} className={p.concepto === 'devolucion' ? s.salida : ''}>
                <span>{CONCEPTO[p.concepto]}, {p.metodo}{p.referencia ? ` (${p.referencia})` : ''}{p.motivo ? `: ${p.motivo}` : ''}</span>
                <strong>{p.concepto === 'devolucion' ? '−' : ''}{pesos(p.monto_centavos)}</strong>
                <small>{momento(p.creado)}{cubre[p.id] ? `. Cubre: ${cubre[p.id]}` : ''}</small>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={s.seccion} aria-labelledby="t-historial">
        <h3 className={s.rotulo} id="t-historial">Historial</h3>
        {historial.cargando ? <SkeletonCard height="80px" /> : (
          <ol className={s.linea}>
            {(historial.datos ?? []).map((e, i) => (
              <li key={i}>
                <span>{EVENTO[e.tipo] ?? e.tipo}{e.de_estado && e.de_estado !== e.a_estado ? ` (${ESTADO[e.de_estado]} → ${ESTADO[e.a_estado]})` : ''}</span>
                <small>{momento(e.momento)}</small>
              </li>
            ))}
          </ol>
        )}
      </section>

      <CancelarConMotivo
        abierto={aCancelar}
        reserva={r}
        bloqueo={r.tipo === 'bloqueo'}
        onCancelar={() => setACancelar(false)}
        onConfirmar={motivo => { setACancelar(false); hacer(() => reservasApi.cancelar(r.id, r.version, motivo), r.tipo === 'bloqueo' ? 'Bloqueo quitado' : 'Reserva cancelada') }}
      />
    </>
  )
}

/** Qué noches cubrió cada pago (lo pagado cubre las noches en orden). Con una
 *  devolución de por medio ya no se puede decir con certeza: no se muestra. */
function coberturaDePagos(r) {
  if (r.tipo !== 'reserva' || r.pagos.some(p => p.concepto === 'devolucion')) return {}
  const montos = r.desglose.map(n => n.monto_centavos)
  const resultado = {}
  let i = 0, lleno = 0
  for (const p of r.pagos) {
    let queda = p.monto_centavos
    const tocadas = []
    while (queda > 0 && i < montos.length) {
      const toma = Math.min(queda, montos[i] - lleno)
      queda -= toma; lleno += toma
      tocadas.push(fecha(r.desglose[i].fecha).toLowerCase() + (lleno < montos[i] ? ' (en parte)' : ''))
      if (lleno === montos[i]) { i++; lleno = 0 }
    }
    if (tocadas.length) resultado[p.id] = tocadas.join(', ')
  }
  return resultado
}

function FormularioDinero({ reserva, tipo, salida, monto, maximo, ocupado, onCancelar, onEnviar }) {
  const pago = tipo === 'pago'
  const inicial = Math.min(monto ?? maximo, maximo)
  const [f, setF] = useState({ metodo: 'efectivo', monto: (inicial / 100).toFixed(2), referencia: '', motivo: '' })
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }))
  const centavos = aCentavos(f.monto)
  // Check-out: hay que cubrir TODO lo pendiente (la API no deja salir debiendo).
  const corto = salida && centavos < maximo
  const enviar = e => {
    e.preventDefault()
    const base = { metodo: f.metodo, monto_centavos: centavos, referencia: f.referencia || null }
    onEnviar(pago ? { ...base, concepto: conceptoDe(reserva, centavos) } : { ...base, motivo: f.motivo })
  }
  return (
    <form className={s.formulario} onSubmit={enviar}>
      <h3 className={s.subtitulo}>{!pago ? 'Registrar devolución' : salida ? 'Cobrar lo pendiente y hacer check-out' : 'Registrar pago'}</h3>
      {pago && !salida && (
        <OpcionesCobro
          pendientes={reserva.desglose.filter(n => n.estado !== 'pagada').map(n => n.monto_centavos - n.pagado_centavos)}
          valor={centavos}
          onElegir={m => setF(x => ({ ...x, monto: (m / 100).toFixed(2) }))}
        />
      )}
      <div className={s.campo}>
        <MoneyInput label={pago && !salida ? 'Monto (o escribe el que deje el huésped)' : 'Monto'} currencies={MXN} currency="MXN" max={maximo / 100}
          value={f.monto === '' ? null : Number(f.monto)} onValueChange={v => setF(x => ({ ...x, monto: v == null ? '' : String(v) }))} />
        {pago && centavos > 0 && centavos <= maximo && (
          <span className={s.ayuda}>
            Se registra como {CONCEPTO[conceptoDe(reserva, centavos)].toLowerCase()}
            {centavos >= maximo ? ': con esto queda todo pagado.' : `: quedarán ${pesos(maximo - centavos)} por cobrar.`}
          </span>
        )}
        {corto && <span className={s.error}>Para hacer el check-out hay que cobrar todo lo pendiente ({pesos(maximo)}).</span>}
      </div>
      <div className={s.campo}>
        <span className="text-sm font-medium">Método</span>
        <Selector ariaLabel="Método" value={f.metodo} onChange={v => setF(x => ({ ...x, metodo: v }))} opciones={METODOS} />
      </div>
      {!pago && (
        <div className={s.campo}>
          <Label htmlFor="d-motivo">Motivo</Label>
          <Input id="d-motivo" required minLength={3} maxLength={300} value={f.motivo} onChange={set('motivo')} size="lg" placeholder="Ej. Cancelación con 48 h" />
        </div>
      )}
      {f.metodo !== 'efectivo' && (
        <div className={s.campo}>
          <Label htmlFor="d-ref">Referencia (folio, autorización)</Label>
          <Input id="d-ref" maxLength={100} value={f.referencia} onChange={set('referencia')} size="lg" />
        </div>
      )}
      <div className={s.botones}>
        <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
        <Button type="submit" disabled={ocupado || corto || centavos <= 0 || centavos > maximo}>
          {!pago ? 'Registrar devolución' : salida ? 'Cobrar y hacer check-out' : 'Registrar pago'}
        </Button>
      </div>
    </form>
  )
}

function CancelarConMotivo({ abierto, reserva: r, bloqueo, onCancelar, onConfirmar }) {
  const [motivo, setMotivo] = useState('')
  const rango = `${fecha(r.llegada)} → ${fecha(r.salida)}`
  if (bloqueo) {
    return (
      <ConfirmarRiesgo
        abierto={abierto}
        riesgo="medio"
        titulo="¿Quitar el bloqueo de mantenimiento?"
        consecuencias={[`${r.habitacion_nombre} queda libre para reservar del ${rango}.`]}
        deshacer="Puedes volver a bloquear esas fechas desde el calendario."
        accion="Quitar bloqueo"
        cancelar="Volver"
        onConfirmar={() => onConfirmar('')}
        onCancelar={onCancelar}
      />
    )
  }
  const deFuera = esDeFuera(r)
  const consecuencias = [
    `Las noches del ${rango} en ${r.habitacion_nombre} quedan libres para otras reservas.`,
    r.pagado_centavos > 0
      ? `Ya pagó ${pesos(r.pagado_centavos)}: si corresponde devolverlo, regístralo después en el detalle.`
      : 'No tiene pagos registrados.',
    ...(deFuera ? [`Viene de ${FUENTES[r.fuente]}: cancélala también allá. Aquí no vuelve a salir aunque la plataforma la siga mostrando.`] : []),
  ]
  return (
    <ConfirmarRiesgo
      abierto={abierto}
      riesgo="alto"
      titulo={`¿Cancelar la reserva de ${r.huesped_nombre}?`}
      consecuencias={consecuencias}
      accion="Cancelar reserva"
      cancelar="Volver"
      onConfirmar={() => onConfirmar(motivo.trim())}
      onCancelar={onCancelar}
    >
      <Input aria-label="Motivo de la cancelación" placeholder="Motivo (opcional), queda en el historial" maxLength={300}
        value={motivo} onChange={e => setMotivo(e.target.value)} size="lg" />
    </ConfirmarRiesgo>
  )
}
