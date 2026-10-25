import { useState } from 'react'
import { toast } from 'sonner'
import { SignInIcon, SignOutIcon, CurrencyDollarIcon, ArrowUUpLeftIcon, ProhibitIcon } from '@phosphor-icons/react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SkeletonCard } from '@/components/frida/Skeleton'
import Selector from '@/components/marca/Selector'
import ConfirmarDescarte from '@/components/marca/ConfirmarDescarte'
import OpcionesCobro from './OpcionesCobro'
import { usePedido } from '@/hooks/usePedido'
import { useSesion } from '@/lib/sesion'
import { SITUACION } from '@/lib/situacion'
import { pesos } from '../habitaciones'
import { reservasApi } from '../reservas'
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
const INSIGNIA_NOCHE = { pagada: 'default', parcial: 'secondary', pendiente: 'destructive' }
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

/** Cómo se registra un cobro según lo que cubre (la persona solo elige monto y método). */
function conceptoDe(r, monto) {
  if (monto >= r.por_cobrar_centavos) return r.pagado_centavos === 0 ? 'total' : 'saldo'
  if (r.pagado_centavos === 0 && r.modalidad === 'anticipo' && monto === r.anticipo_centavos) return 'anticipo'
  return 'abono'
}

export default function DetalleReserva({ reservaId, accion, onCerrar, onCambio }) {
  return (
    <Sheet open={!!reservaId} onOpenChange={o => { if (!o) onCerrar() }}>
      <SheetContent className={s.hoja}>
        {reservaId && <Contenido key={reservaId} reservaId={reservaId} accion={accion} onCambio={onCambio} />}
      </SheetContent>
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
  const hoy = hoyISO()
  const cobrable = reserva && COBRABLE.includes(r.estado) && r.por_cobrar_centavos > 0 && puede('pagos.registrar')

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
    if (salida) {
      const fresca = await reservasApi.detalle(r.id)
      await reservasApi.salida(r.id, fresca.version)
    }
  }, salida ? 'Pago y check-out registrados' : 'Pago registrado')

  const acciones = [
    reserva && r.estado === 'confirmada' && r.llegada <= hoy && hoy < r.salida && puede('reservas.editar') && {
      Icono: SignInIcon, texto: 'Check-in', ayuda: 'Registrar la llegada', principal: true,
      fn: () => hacer(() => reservasApi.llegada(r.id, r.version), 'Check-in registrado'),
    },
    r.estado === 'en_curso' && puede('reservas.editar') && r.por_cobrar_centavos === 0 && {
      Icono: SignOutIcon, texto: 'Check-out', ayuda: 'Registrar la salida', principal: true,
      fn: () => hacer(() => reservasApi.salida(r.id, r.version), 'Check-out registrado'),
    },
    r.estado === 'en_curso' && puede('reservas.editar') && cobrable && {
      Icono: SignOutIcon, texto: 'Cobrar y hacer check-out', ayuda: `Falta cobrar ${pesos(r.por_cobrar_centavos)}`, principal: true,
      fn: () => setFormulario({ tipo: 'pago', salida: true }),
    },
    cobrable && {
      Icono: CurrencyDollarIcon, texto: 'Cobrar', ayuda: `Pendiente: ${pesos(r.por_cobrar_centavos)}`,
      fn: () => setFormulario({ tipo: 'pago' }),
    },
    reserva && r.pagado_centavos > 0 && puede('pagos.registrar') && {
      Icono: ArrowUUpLeftIcon, texto: 'Devolución', fn: () => setFormulario({ tipo: 'devolucion' }),
    },
    ['retenida', 'confirmada'].includes(r.estado) && puede('reservas.cancelar') && {
      Icono: ProhibitIcon, texto: r.tipo === 'bloqueo' ? 'Quitar bloqueo' : 'Cancelar', peligro: true, fn: () => setACancelar(true),
    },
  ].filter(Boolean)

  const cubre = coberturaDePagos(r)
  // Lo pendiente desde la primera noche hasta la elegida (inclusive).
  const hastaAqui = i => r.desglose.slice(0, i + 1).reduce((t, n) => t + n.monto_centavos - n.pagado_centavos, 0)

  return (
    <>
      <SheetHeader className={s.cabecera}>
        <span className={`${s.estado} ${s[`estado_${r.estado}`] ?? ''}`}>{r.tipo === 'bloqueo' ? 'Mantenimiento' : ESTADO[r.estado]}</span>
        <SheetTitle className={s.titulo}>{reserva ? r.huesped_nombre : (r.notas || 'Bloqueo de mantenimiento')}</SheetTitle>
        <SheetDescription>
          {r.codigo}. {r.habitacion_nombre}{fuera ? ` (${fuera.texto.toLowerCase()})` : ''}, {fecha(r.llegada)} → {fecha(r.salida)} ({r.noches} noche{r.noches !== 1 ? 's' : ''})
        </SheetDescription>
      </SheetHeader>

      <div className={s.cuerpo}>
        {/* ── Lo que se hace: arriba, sin scroll ── */}
        {acciones.length > 0 && (
          <div className={s.acciones} role="group" aria-label="Acciones de la reserva">
            {acciones.map(a => (
              <Button key={a.texto} variant={a.peligro ? 'destructive' : a.principal ? 'default' : 'outline'} disabled={ocupado} onClick={a.fn}
                className={s.accion} title={a.ayuda ?? undefined}>
                <a.Icono size={16} weight="bold" aria-hidden="true" />
                <span>{a.texto}{a.ayuda && <small className={s.ayudaBoton}>{a.ayuda}</small>}</span>
              </Button>
            ))}
          </div>
        )}

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

        {reserva && (
          <section className={s.dinero} aria-label="Cobro">
            <div><span>Total</span><strong>{pesos(r.total_centavos)}</strong></div>
            <div><span>Pagado</span><strong>{pesos(r.pagado_centavos)}</strong></div>
            <div className={r.por_cobrar_centavos > 0 ? s.pendiente : s.alCorriente}>
              <span>Por cobrar</span><strong>{r.por_cobrar_centavos > 0 ? pesos(r.por_cobrar_centavos) : 'Todo pagado'}</strong>
            </div>
          </section>
        )}

        {/* ── Noche por noche: cuál está pagada y cobrar hasta una ── */}
        {reserva && r.desglose.length > 0 && (
          <section aria-labelledby="t-noches">
            <h3 className={s.subtitulo} id="t-noches">Noches</h3>
            <ol className={s.noches}>
              {r.desglose.map((n, i) => (
                <li key={n.fecha} className={`${s.noche} ${n.fecha === hoy ? s.esHoy : ''}`}>
                  <span className={s.nocheFecha}>
                    {fecha(n.fecha)}{n.fecha === hoy && <em className={s.hoy}>Hoy</em>}
                  </span>
                  <span className={s.nocheMonto}>{pesos(n.monto_centavos)}</span>
                  <span className={s.nocheEstado}>
                    <Badge variant={INSIGNIA_NOCHE[n.estado]}>{NOCHE[n.estado]}{n.estado === 'parcial' ? ` (${pesos(n.pagado_centavos)})` : ''}</Badge>
                  </span>
                  {cobrable && n.estado !== 'pagada' ? (
                    <Button type="button" variant="outline" size="sm" className="h-11" disabled={ocupado}
                      onClick={() => setFormulario({ tipo: 'pago', monto: hastaAqui(i) })}
                      aria-label={`Cobrar hasta la noche del ${fecha(n.fecha)}: ${pesos(hastaAqui(i))}`}>
                      Cobrar hasta aquí
                    </Button>
                  ) : <span />}
                </li>
              ))}
            </ol>
          </section>
        )}

        <dl className={s.datos}>
          {reserva && <div><dt>Personas</dt><dd>{r.adultos} adulto{r.adultos !== 1 ? 's' : ''}{r.ninos ? `, ${r.ninos} niño${r.ninos !== 1 ? 's' : ''}` : ''}</dd></div>}
          {reserva && (r.huesped_correo || r.huesped_telefono) && (
            <div><dt>Contacto</dt><dd>{[r.huesped_correo, r.huesped_telefono].filter(Boolean).join(', ')}</dd></div>
          )}
          {reserva && r.notas && <div><dt>Notas</dt><dd>{r.notas}</dd></div>}
          {r.motivo_cancelacion && <div><dt>Motivo de cancelación</dt><dd>{r.motivo_cancelacion}</dd></div>}
        </dl>

        {reserva && r.pagos.length > 0 && (
          <section aria-labelledby="t-pagos">
            <h3 className={s.subtitulo} id="t-pagos">Pagos</h3>
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

        <section aria-labelledby="t-historial">
          <h3 className={s.subtitulo} id="t-historial">Historial</h3>
          {historial.cargando ? <SkeletonCard height="80px" /> : (
            <ol className={s.lista}>
              {(historial.datos ?? []).map((e, i) => (
                <li key={i}>
                  <span>{EVENTO[e.tipo] ?? e.tipo}{e.de_estado && e.de_estado !== e.a_estado ? ` (${ESTADO[e.de_estado]} → ${ESTADO[e.a_estado]})` : ''}</span>
                  <small>{momento(e.momento)}</small>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <CancelarConMotivo
        abierto={aCancelar}
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
        <Label htmlFor="d-monto">{pago && !salida ? 'Monto (o escribe el que deje el huésped)' : 'Monto'} (MXN, hasta {pesos(maximo)})</Label>
        <Input id="d-monto" type="number" required min="0.01" step="0.01" max={maximo / 100} value={f.monto} onChange={set('monto')} className="h-11" />
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
          <Input id="d-motivo" required minLength={3} maxLength={300} value={f.motivo} onChange={set('motivo')} className="h-11" placeholder="Ej. Cancelación con 48 h" />
        </div>
      )}
      {f.metodo !== 'efectivo' && (
        <div className={s.campo}>
          <Label htmlFor="d-ref">Referencia (folio, autorización)</Label>
          <Input id="d-ref" maxLength={100} value={f.referencia} onChange={set('referencia')} className="h-11" />
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

function CancelarConMotivo({ abierto, bloqueo, onCancelar, onConfirmar }) {
  const [motivo, setMotivo] = useState('')
  if (bloqueo) {
    return (
      <ConfirmarDescarte abierto={abierto} titulo="¿Quitar el bloqueo?" texto="Las noches quedan libres para reservar." accion="Quitar bloqueo" cancelar="Volver"
        onConfirmar={() => onConfirmar('')} onCancelar={onCancelar} />
    )
  }
  return (
    <ConfirmarDescarte
      abierto={abierto}
      titulo="¿Cancelar la reserva?"
      texto={(
        <span className={s.campo}>
          Las noches quedan libres. Si hubo pagos, registra después la devolución que corresponda.
          <Input aria-label="Motivo de la cancelación" placeholder="Motivo (opcional)" maxLength={300} value={motivo} onChange={e => setMotivo(e.target.value)} className="h-11" />
        </span>
      )}
      accion="Cancelar reserva"
      cancelar="Volver"
      onConfirmar={() => onConfirmar(motivo.trim())}
      onCancelar={onCancelar}
    />
  )
}
