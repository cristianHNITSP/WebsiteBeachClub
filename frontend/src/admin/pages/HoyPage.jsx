import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CurrencyDollarIcon, HouseLineIcon, SignInIcon, SignOutIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { SkeletonCard } from '@/components/frida/Skeleton'
import { useParametros } from '@/hooks/useParametros'
import { usePedido } from '@/hooks/usePedido'
import { escucharEventos } from '@/lib/eventos'
import { useSesion } from '@/lib/sesion'
import DetalleReserva from '../components/DetalleReserva'
import { pesos } from '../habitaciones'
import { usePropiedadActual } from '../propiedadActual'
import { reservasApi } from '../reservas'
import s from './HoyPage.module.css'

/*
 * Llegadas y salidas de HOY (fecha de Mérida): la pantalla de la recepción.
 * Todo a la vista, sin scroll para encontrarlo: quién llega (check-in), quién
 * está en casa (cobrar noche por noche) y quién sale (check-out; si debe algo,
 * "Cobrar y hacer check-out"). Cada fila abre el detalle con sus noches.
 * El detalle abierto va en la URL (?reserva=…&accion=pago|salida). Se actualiza
 * sola cuando alguien cambia una reserva (SSE).
 */

const hoyISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Merida' })
const menosDias = (iso, n) => { const d = new Date(`${iso}T12:00`); d.setDate(d.getDate() - n); return d.toLocaleDateString('sv-SE') }
const corta = iso => new Date(`${iso}T12:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
const mayuscula = t => t.charAt(0).toUpperCase() + t.slice(1)
const largo = iso => mayuscula(new Date(`${iso}T12:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }))

function agrupar(reservas, hoy) {
  const huespedes = reservas.filter(r => r.tipo === 'reserva')
  return {
    llegan: huespedes.filter(r => r.estado === 'confirmada' && r.llegada <= hoy && hoy < r.salida),
    enCasa: huespedes.filter(r => r.estado === 'en_curso' && r.salida > hoy),
    salen: huespedes.filter(r => r.estado === 'en_curso' && r.salida <= hoy),
    // Ya pasó su estancia y nunca se registró la llegada: o no vino, o se olvidó el check-in.
    sinLlegada: huespedes.filter(r => r.estado === 'confirmada' && r.salida <= hoy),
  }
}

export default function HoyPage() {
  const hoy = hoyISO()
  const { propiedadId } = usePropiedadActual()
  const { sesion } = useSesion()
  const puede = p => sesion?.permisos?.includes(p)
  const [{ reserva, accion }, set] = useParametros({ reserva: '', accion: '' })
  // Desde 60 días atrás: atrapa a quien sigue en casa con salida vencida.
  const pedido = usePedido(
    senal => reservasApi.listar({ propiedad: propiedadId, desde: menosDias(hoy, 60), hasta: menosDias(hoy, -1), estado: ['confirmada', 'en_curso'] }, senal),
    [propiedadId, hoy],
  )
  const recargar = pedido.recargar
  useEffect(() => {
    let espera = null
    const quitar = escucharEventos(m => {
      if (m.agregado !== 'reserva') return
      clearTimeout(espera)
      espera = setTimeout(recargar, 300)
    })
    return () => { clearTimeout(espera); quitar() }
  }, [recargar])
  const [ocupada, setOcupada] = useState(null)

  const abrir = (r, a = '') => set({ reserva: r.id, accion: a }, { historial: true })
  const rapido = async (r, pedir, exito) => {
    setOcupada(r.id)
    try { await pedir(); toast.success(exito, { description: `${r.huesped_nombre}, ${r.habitacion_nombre}` }); recargar() } catch (e) { toast.error(e.message) } finally { setOcupada(null) }
  }

  const g = pedido.datos ? agrupar(pedido.datos, hoy) : null
  const editar = puede('reservas.editar')
  const cobrar = puede('pagos.registrar')

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">Recepción</span>
          <h1 className="admin-page-title">Llegadas y <em>salidas</em></h1>
          <p className={s.fecha}>{largo(hoy)}</p>
        </div>
      </div>

      {pedido.cargando ? (
        <div className={s.columnas}>{[0, 1, 2].map(i => <SkeletonCard key={i} height="260px" />)}</div>
      ) : pedido.error ? (
        <div className={s.vacio} role="alert">
          <WarningCircleIcon size={28} aria-hidden="true" /><p>{pedido.error.message}</p>
          <Button variant="outline" className="h-11" onClick={recargar}>Reintentar</Button>
        </div>
      ) : (
        <>
          {g.sinLlegada.length > 0 && (
            <div className={s.alerta} role="status">
              <WarningCircleIcon size={18} weight="fill" aria-hidden="true" />
              <span>
                {g.sinLlegada.length === 1 ? 'Una reserva pasó' : `${g.sinLlegada.length} reservas pasaron`} sin check-in:{' '}
                {g.sinLlegada.map((r, i) => (
                  <span key={r.id}>{i > 0 && ', '}
                    <button type="button" className={s.enlace} onClick={() => abrir(r)}>{r.huesped_nombre} ({corta(r.llegada)})</button>
                  </span>
                ))}. Revisa si no llegaron (cancelar) o si faltó registrarlas.
              </span>
            </div>
          )}
          <div className={s.columnas}>
            <Columna Icono={SignInIcon} titulo="Llegan hoy" vacio="Nadie más llega hoy." lista={g.llegan}>
              {r => (
                <Fila key={r.id} r={r} onAbrir={() => abrir(r)} detalle={r.llegada < hoy ? `Debía llegar el ${corta(r.llegada)}` : `${r.noches} noche${r.noches !== 1 ? 's' : ''}, sale el ${corta(r.salida)}`}>
                  {editar && (
                    <Button className="h-11" disabled={ocupada === r.id}
                      onClick={() => rapido(r, () => reservasApi.llegada(r.id, r.version), 'Check-in registrado')}>
                      <SignInIcon size={16} weight="bold" aria-hidden="true" /> Check-in
                    </Button>
                  )}
                  {cobrar && r.por_cobrar_centavos > 0 && (
                    <Button variant="outline" className="h-11" onClick={() => abrir(r, 'pago')}>
                      <CurrencyDollarIcon size={16} weight="bold" aria-hidden="true" /> Cobrar
                    </Button>
                  )}
                </Fila>
              )}
            </Columna>

            <Columna Icono={HouseLineIcon} titulo="En casa" vacio="No hay huéspedes en casa." lista={g.enCasa}>
              {r => (
                <Fila key={r.id} r={r} onAbrir={() => abrir(r)} detalle={`Sale el ${corta(r.salida)}`}>
                  {cobrar && r.por_cobrar_centavos > 0 && (
                    <Button variant="outline" className="h-11" onClick={() => abrir(r, 'pago')}>
                      <CurrencyDollarIcon size={16} weight="bold" aria-hidden="true" /> Cobrar noches
                    </Button>
                  )}
                </Fila>
              )}
            </Columna>

            <Columna Icono={SignOutIcon} titulo="Salen hoy" vacio="Nadie más sale hoy." lista={g.salen}>
              {r => (
                <Fila key={r.id} r={r} onAbrir={() => abrir(r)} detalle={r.salida < hoy ? `Debía salir el ${corta(r.salida)}` : `Llegó el ${corta(r.llegada)}`}>
                  {editar && (r.por_cobrar_centavos === 0 ? (
                    <Button className="h-11" disabled={ocupada === r.id}
                      onClick={() => rapido(r, () => reservasApi.salida(r.id, r.version), 'Check-out registrado')}>
                      <SignOutIcon size={16} weight="bold" aria-hidden="true" /> Check-out
                    </Button>
                  ) : cobrar && (
                    <Button className="h-11" onClick={() => abrir(r, 'salida')}>
                      <SignOutIcon size={16} weight="bold" aria-hidden="true" /> Cobrar y hacer check-out
                    </Button>
                  ))}
                </Fila>
              )}
            </Columna>
          </div>
        </>
      )}

      <DetalleReserva
        reservaId={reserva || null}
        accion={accion || undefined}
        onCerrar={() => set({ reserva: '', accion: '' })}
        onCambio={recargar}
      />
    </div>
  )
}

function Columna({ Icono, titulo, vacio, lista, children }) {
  return (
    <section className={s.columna} aria-labelledby={`col-${titulo}`}>
      <h2 className={s.titulo} id={`col-${titulo}`}>
        <Icono size={20} weight="bold" aria-hidden="true" /> {titulo} <span className={s.cuenta}>{lista.length}</span>
      </h2>
      {lista.length === 0 ? <p className={s.nadie}>{vacio}</p> : <ul className={s.lista}>{lista.map(children)}</ul>}
    </section>
  )
}

function Fila({ r, detalle, onAbrir, children }) {
  return (
    <li className={s.fila}>
      <button type="button" className={s.quien} onClick={onAbrir} aria-label={`Ver la reserva de ${r.huesped_nombre}: noches y pagos`}>
        <strong>{r.huesped_nombre}</strong>
        <span>{r.habitacion_nombre}. {detalle}</span>
        <span className={r.por_cobrar_centavos > 0 ? s.debe : s.pagado}>
          {r.por_cobrar_centavos > 0 ? `Por cobrar ${pesos(r.por_cobrar_centavos)}` : 'Todo pagado'}
        </span>
      </button>
      {children && <div className={s.botones}>{children}</div>}
    </li>
  )
}
