import AvisoHabitacionEliminada from '../components/AvisoHabitacionEliminada'
import { habitacionEliminada } from '@/lib/situacion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from '@/admin/toast'
import { CaretLeftIcon, CaretRightIcon, CurrencyDollarIcon, SignInIcon, SignOutIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/coss/button'
import { InkStamp } from '@/components/devl/ink-stamp'
import { Odometer } from '@/components/devl/odometer'
import { SkeletonCard } from '@/components/frida/Skeleton'
import { useParametros } from '@/hooks/useParametros'
import { usePedido } from '@/hooks/usePedido'
import { escucharEventos } from '@/lib/eventos'
import { useSesion } from '@/lib/sesion'
import { Florecita } from '@/components/marca/Wordmark'
import DetalleReserva from '../components/DetalleReserva'
import Inicial from '../components/Inicial'
import { pesos } from '../habitaciones'
import { florDeLugar, usePropiedadActual } from '../propiedadActual'
import { FUENTES, deFuera, hoyISO, reservasApi } from '../reservas'
import s from './HoyPage.module.css'

/*
 * Llegadas y salidas de HOY (fecha de Mérida): la pantalla de la recepción.
 * Todo a la vista, sin scroll para encontrarlo: quién llega (check-in), quién
 * está en casa (cobrar noche por noche) y quién sale (check-out; si debe algo,
 * "Cobrar y hacer check-out"). Cada fila abre el detalle con sus noches.
 * El detalle abierto va en la URL (?reserva=…&accion=pago|salida). Se actualiza
 * sola cuando alguien cambia una reserva (SSE).
 */

const corta = iso => new Date(`${iso}T12:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
const dinero = c => `$${(c / 100).toLocaleString('es-MX')}`
const mayuscula = t => t.charAt(0).toUpperCase() + t.slice(1)
const largo = iso => mayuscula(new Date(`${iso}T12:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }))

export default function HoyPage() {
  const hoy = hoyISO()
  const { propiedadId } = usePropiedadActual()
  const { sesion } = useSesion()
  const puede = p => sesion?.permisos?.includes(p)
  // Cada columna pide su página al servidor; su cursor va en la URL (Anterior / Siguiente).
  const [{ reserva, accion, llegan, casa, salen, vencidas }, set] = useParametros({ reserva: '', accion: '', llegan: '', casa: '', salen: '', vencidas: '' })
  const [version, setVersion] = useState(0)
  const recargar = useCallback(() => setVersion(v => v + 1), [])
  const cLlegan = useColumna('llegan', llegan, propiedadId, version)
  const cCasa = useColumna('en_casa', casa, propiedadId, version)
  const cSalen = useColumna('salen', salen, propiedadId, version)
  const cVencidas = useColumna('sin_llegada', vencidas, propiedadId, version, 12)
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
  // ¿Le falta pagar la primera noche? (aprox.: el total entre las noches; el detalle usa la noche exacta)
  const faltaPrimera = r => (r.fuente ?? 'motor') === 'motor' && r.tipo === 'reserva'
    && r.pagado_centavos < Math.ceil(r.total_centavos / Math.max(r.noches, 1))
  const rapido = async (r, pedir, exito) => {
    setOcupada(r.id)
    try { await pedir(); toast.success(exito, { description: `${r.huesped_nombre}, ${r.habitacion_nombre}` }); recargar() } catch (e) { toast.error(e.message) } finally { setOcupada(null) }
  }

  const lugarDe = id => sesion?.propiedades?.find(p => p.id === id)?.lugar.split(',')[0] ?? ''
  const editar = puede('reservas.editar')
  const cobrar = puede('pagos.registrar')

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Llegadas y salidas</h1>
          <p className={s.fecha}>{largo(hoy)}</p>
        </div>
      </div>

      {cVencidas.datos?.meta.total > 0 && (
        <details className={s.alerta}>
          <summary className={s.alertaResumen}>
            <WarningCircleIcon size={18} weight="fill" aria-hidden="true" />
            <span>{cVencidas.datos.meta.total === 1 ? 'Una reserva pasó' : `${cVencidas.datos.meta.total} reservas pasaron`} sin check-in. Revisa si no llegaron (cancelar) o si faltó registrarlas.</span>
            <span className={s.alertaAccion}>Revisar</span>
          </summary>
          <ul className={s.alertaLista}>
            {cVencidas.datos.items.map(r => (
              <li key={r.id}><button type="button" className={s.enlace} onClick={() => abrir(r)}>{r.huesped_nombre} ({corta(r.llegada)})</button></li>
            ))}
          </ul>
          <Pie meta={cVencidas.datos.meta} vistos={cVencidas.datos.items.length} etiqueta="reservas sin check-in" onIr={c => set({ vencidas: c })} />
        </details>
      )}

          <div className={s.columnas}>
            <Columna color="var(--flor-turquesa)" titulo="Llegan hoy" vacio="No hay más llegadas hoy." columna={cLlegan} onIr={c => set({ llegan: c })}>
              {r => (
                <Fila key={r.id} r={r} lugar={lugarDe(r.propiedad_id)} onAbrir={() => abrir(r)} vencido={r.llegada < hoy} detalle={r.llegada < hoy ? `Debía llegar el ${corta(r.llegada)}` : `${r.noches} noche${r.noches !== 1 ? 's' : ''}, sale el ${corta(r.salida)}`}>
                  {/* Al llegar se cobra al menos la primera noche (regla del hotel, 2026-11-15): si falta,
                      el botón abre el cobro; el detalle calcula la noche exacta y la API lo exige. */}
                  {editar && (faltaPrimera(r) ? (cobrar && (
                    <Button variant="outline" size="sm" disabled={habitacionEliminada(r)} onClick={() => abrir(r, 'llegada')}>
                      <SignInIcon size={16} weight="bold" aria-hidden="true" /> Cobrar y hacer check-in
                    </Button>
                  )) : (
                    <Button variant="outline" size="sm" disabled={ocupada === r.id || habitacionEliminada(r)}
                      onClick={() => rapido(r, () => reservasApi.llegada(r.id, r.version), 'Check-in registrado')}>
                      <SignInIcon size={16} weight="bold" aria-hidden="true" /> Check-in
                    </Button>
                  ))}
                  {cobrar && r.por_cobrar_centavos > 0 && !faltaPrimera(r) && (
                    <Button variant="ghost" size="sm" onClick={() => abrir(r, 'pago')}>
                      <CurrencyDollarIcon size={16} weight="bold" aria-hidden="true" /> Cobrar {dinero(r.por_cobrar_centavos)}
                    </Button>
                  )}
                </Fila>
              )}
            </Columna>

            <Columna color="var(--primary)" titulo="En casa" vacio="No hay huéspedes hospedados ahora. Los check-in de hoy aparecerán en esta columna." columna={cCasa} onIr={c => set({ casa: c })}>
              {r => (
                <Fila key={r.id} r={r} lugar={lugarDe(r.propiedad_id)} onAbrir={() => abrir(r)} detalle={`Sale el ${corta(r.salida)}`}>
                  {cobrar && r.por_cobrar_centavos > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => abrir(r, 'pago')}>
                      <CurrencyDollarIcon size={16} weight="bold" aria-hidden="true" /> Cobrar {dinero(r.por_cobrar_centavos)}
                    </Button>
                  )}
                </Fila>
              )}
            </Columna>

            <Columna color="var(--flor-naranja)" titulo="Salen hoy" vacio="No hay más salidas hoy." columna={cSalen} onIr={c => set({ salen: c })}>
              {r => (
                <Fila key={r.id} r={r} lugar={lugarDe(r.propiedad_id)} onAbrir={() => abrir(r)} vencido={r.salida < hoy} detalle={r.salida < hoy ? `Debía salir el ${corta(r.salida)}` : `Llegó el ${corta(r.llegada)}`}>
                  {editar && (r.por_cobrar_centavos === 0 ? (
                    <Button variant="outline" size="sm" disabled={ocupada === r.id || habitacionEliminada(r)}
                      onClick={() => rapido(r, () => reservasApi.salida(r.id, r.version), 'Check-out registrado')}>
                      <SignOutIcon size={16} weight="bold" aria-hidden="true" /> Check-out
                    </Button>
                  ) : cobrar && (
                    <Button variant="outline" size="sm" disabled={habitacionEliminada(r)} onClick={() => abrir(r, 'salida')}>
                      <SignOutIcon size={16} weight="bold" aria-hidden="true" /> Cobrar y hacer check-out
                    </Button>
                  ))}
                </Fila>
              )}
            </Columna>
          </div>

      <DetalleReserva
        reservaId={reserva || null}
        accion={accion || undefined}
        onCerrar={() => set({ reserva: '', accion: '' })}
        onCambio={recargar}
      />
    </div>
  )
}

const POR_PAGINA = 4

/** Una página de una columna, por cursor: sale del servidor, nunca toda la lista. */
function useColumna(columna, cursor, propiedad, version, limite = POR_PAGINA) {
  return usePedido(senal => reservasApi.recepcion({ columna, cursor, propiedad, limite }, senal), [columna, cursor, propiedad, version, limite])
}

/** Anterior y Siguiente con el total: el cursor de cada botón lo da el servidor. */
function Pie({ meta, vistos, etiqueta, onIr }) {
  return (
    <nav className={s.pie} aria-label={`Páginas de ${etiqueta}`}>
      <span>{vistos} de {meta.total}</span>
      <span className={s.pieBotones}>
        <Button variant="outline" size="sm" disabled={!meta.anterior} onClick={() => onIr(meta.anterior)}>
          <CaretLeftIcon size={14} weight="bold" aria-hidden="true" /> Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={!meta.siguiente} onClick={() => onIr(meta.siguiente)}>
          Siguiente <CaretRightIcon size={14} weight="bold" aria-hidden="true" />
        </Button>
      </span>
    </nav>
  )
}

/** Una columna de la recepción: pinta solo su página. */
function Columna({ color, titulo, vacio, columna, onIr, children }) {
  const d = columna.datos
  return (
    <section className={s.columna} aria-labelledby={`col-${titulo}`}>
      <h2 className={s.titulo} id={`col-${titulo}`}>
        <Florecita color={color} tamano={16} /> {titulo} <span className={s.cuenta}><Odometer value={d?.meta.total ?? 0} /></span>
      </h2>
      {columna.cargando ? <SkeletonCard height="220px" />
        : columna.error ? (
          <div className={s.vacio} role="alert">
            <WarningCircleIcon size={24} aria-hidden="true" /><p>{columna.error.message}</p>
            <Button variant="outline" size="sm" onClick={columna.recargar}>Reintentar</Button>
          </div>
        ) : d.items.length === 0 ? (
          <div className={s.nadie}><span data-mece=""><Florecita color="var(--corona-libre)" tamano={44} /></span>{vacio}</div>
        ) : (
          <>
            <ul className={`${s.lista} entra-escalonado`} aria-busy={columna.actualizando}>{d.items.map(children)}</ul>
            <Pie meta={d.meta} vistos={d.items.length} etiqueta={titulo} onIr={onIr} />
          </>
        )}
    </section>
  )
}

function Fila({ r, lugar, detalle, vencido, onAbrir, children }) {
  // Si esta fila debía y ya no: el sello "Pagado" cae sobre ella.
  const debia = useRef(r.por_cobrar_centavos)
  const [sello, setSello] = useState(0)
  useEffect(() => {
    if (debia.current > 0 && r.por_cobrar_centavos === 0) setSello(n => n + 1)
    debia.current = r.por_cobrar_centavos
  }, [r.por_cobrar_centavos])
  return (
    <li className={s.fila}>
      {sello > 0 && <span className={s.sello}><InkStamp label="Pagado" tone="violet" stampKey={sello} /></span>}
      <button type="button" className={s.quien} onClick={onAbrir} aria-label={`Ver la reserva de ${r.huesped_nombre}: noches y pagos`}>
        <Inicial nombre={r.huesped_nombre} />
        <span className={s.quienTexto}><strong>{r.huesped_nombre}</strong><span>{r.habitacion_nombre}</span></span>
        {lugar && <span className={s.chip}><Florecita color={florDeLugar(lugar)} tamano={11} />{lugar}</span>}
      </button>
      <div className={s.chips}>
        <AvisoHabitacionEliminada reserva={r} compacto />
        <span className={`${s.chip} ${vencido ? s.chipRojo : ''}`}>{detalle}</span>
        {deFuera(r)
          ? <span className={s.chip} title="El cobro se hace en la plataforma">{FUENTES[r.fuente]}, cobro en la plataforma</span>
          : (
            <span className={`${s.chip} ${r.por_cobrar_centavos > 0 ? s.chipDorado : s.chipVerde}`}>
              {r.por_cobrar_centavos > 0 ? `Debe ${pesos(r.por_cobrar_centavos)}` : 'Todo pagado'}
            </span>
          )}
      </div>
      {children && <div className={s.botones}>{children}</div>}
    </li>
  )
}
