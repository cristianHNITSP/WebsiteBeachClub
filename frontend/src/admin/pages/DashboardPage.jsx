import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from '@/admin/toast'
import {
  BedIcon, DownloadSimpleIcon, TrendUpIcon, TrendDownIcon, ArrowRightIcon,
  CurrencyDollarIcon, ReceiptIcon, ForkKnifeIcon, HandCoinsIcon, WarningCircleIcon, BellIcon, CalendarDotsIcon,
} from '@phosphor-icons/react'
import { SkeletonCard } from '@/components/frida/Skeleton'
import { Button } from '@/components/coss/button'
import { LiquidCursor, liquidTarget } from '@/components/devl/liquid-cursor'
import { GrowthChart } from '@/components/devl/growth-chart'
import { LiquidSlider } from '@/components/devl/liquid-slider'
import { MetricCard } from '@/components/devl/metric-card'
import { PourProgress } from '@/components/devl/pour-progress'
import { Odometer } from '@/components/devl/odometer'
import TarjetaCifra from '@/components/marca/TarjetaCifra'
import { CoronaFlores, Florecita } from '@/components/marca/Wordmark'
import { api } from '@/lib/api'
import { usePedido } from '@/hooks/usePedido'
import { useParametros } from '@/hooks/useParametros'
import { escucharEventos } from '@/lib/eventos'
import { useSesion } from '@/lib/sesion'
import { Columnas, Barras } from '../components/Graficas'
import Celda from '../components/Celda'
import c from '../components/Celda.module.css'
import Corona from '../components/Corona'
import Inicial from '../components/Inicial'
import FormasDePago from '../components/FormasDePago'
import { MODULOS } from '../modulos'
import { useAvisos, haceCuanto } from '../avisos'
import { habitacionesApi } from '../habitaciones'
import { florDeLugar, usePropiedadActual } from '../propiedadActual'
import { agruparHoy, hoyISO, menosDias, reservasApi } from '../reservas'
import { useRestaurante, periodo, resumen, ventasPorDia, platillosVendidos, categoria, mxn } from '../restaurante'
import s from './DashboardPage.module.css'

/*
 * Tablero (fase 5). Todo sale de /api/admin/metricas/tablero, que lee las
 * métricas precalculadas (nunca la tabla de reservas): responde en milisegundos
 * aunque haya un millón de reservas. Se vuelve a pedir cuando llega un evento en
 * vivo. Lo que no se sabe (ocupación sin habitaciones) se dice "Sin dato".
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const etiquetaMes = m => MESES[Number(m.slice(5, 7)) - 1]
const pesos = c => `$${Math.round(c / 100).toLocaleString('es-MX')}`
const ICONO_AVISO = { reserva: CalendarDotsIcon, pago: CurrencyDollarIcon, operacion: BedIcon, sistema: BellIcon }

/** "+12% vs. …" o "Sin dato para comparar". Aquí subir es bueno (ocupación,
 *  tarifa, ingresos): verde si sube, rojo si baja, gris si no cambia. */
function Tendencia({ ahora, antes, texto }) {
  if (ahora == null || antes == null || antes === 0) return <div className="metric-card__trend">Sin dato para comparar</div>
  const cambio = Math.round(((ahora - antes) / antes) * 100)
  const Icono = cambio >= 0 ? TrendUpIcon : TrendDownIcon
  const tono = cambio > 0 ? 'metric-card__trend--bien' : cambio < 0 ? 'metric-card__trend--mal' : ''
  return <div className={`metric-card__trend ${tono}`}><Icono size={14} weight="bold" aria-hidden="true" /> {cambio > 0 ? '+' : ''}{cambio}% {texto}</div>
}

const entrada = i => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.06 * i },
})

/* ── Restaurante: lo de hoy y la última semana (sale del almacén del restaurante) ── */
function SeccionRestaurante({ onNavigate, loading }) {
  const { tickets, menu } = useRestaurante()
  const hoy = resumen(periodo(tickets, 1).actual)
  const semana = periodo(tickets, 7).actual
  const top = platillosVendidos(semana, menu).slice(0, 5)
  const dia = d => d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })
  return (
    <div className={`inventory-section ${s.restSeccion}`}>
      <div className={s.invCabecera}>
        <div>
          <span className="admin-page-eyebrow">Restaurante</span>
          <h2 className="admin-section-title" style={{ marginBottom: 0 }}>Ventas del restaurante</h2>
        </div>
        <Button variant="outline" onClick={() => onNavigate('restaurante-estadisticas')}>Ver estadísticas <ArrowRightIcon size={14} weight="bold" /></Button>
      </div>
      <div className="inventory-grid">
        {[
          { Icono: CurrencyDollarIcon, flor: 'morado',   label: 'Ventas hoy', prefijo: '$', value: Math.round(hoy.ventas) },
          { Icono: ReceiptIcon,        flor: 'turquesa', label: 'Tickets hoy', value: hoy.tickets },
          { Icono: ForkKnifeIcon,      flor: 'dorado',   label: 'Platillos vendidos hoy', value: hoy.platillos },
          { Icono: HandCoinsIcon,      flor: 'naranja',  label: 'Ticket promedio hoy', prefijo: '$', value: Math.round(hoy.promedio) },
        ].map((item, i) => (
          <motion.div key={item.label} {...entrada(i)}><TarjetaCifra {...item} loading={loading} /></motion.div>
        ))}
      </div>
      <div className={s.restGraficas}>
        <div className={s.restPanel}>
          <div className="chart-title">Ventas de los últimos 7 días</div>
          <Columnas titulo="Ventas de los últimos 7 días" alto={180} marcar={new Date().toDateString()}
            datos={ventasPorDia(tickets, 7).map(d => ({ clave: d.fecha.toDateString(), etiqueta: dia(d.fecha), valor: d.ventas, pista: `${dia(d.fecha)}: ${mxn(d.ventas)}, ${d.tickets} tickets` }))} />
        </div>
        <div className={s.restPanel}>
          <div className="chart-title">Platillos más vendidos, 7 días</div>
          <Barras titulo="Platillos más vendidos, 7 días" datos={top.map(v => {
            const c = categoria(v.categoria)
            return { clave: v.id, etiqueta: v.nombre, valor: v.cantidad, texto: `${v.cantidad} vendidos`, Icono: c.Icono, flor: c.flor }
          })} />
        </div>
      </div>
    </div>
  )
}

/** Una celda de las cifras de hoy: punto del color de su flor en la corona. */
const PORCENTAJE = { style: 'percent', maximumFractionDigits: 0 }

const DashboardPage = ({ onNavigate }) => {
  const { propiedadId } = usePropiedadActual()
  const { sesion } = useSesion()
  const navigate = useNavigate()
  const [{ meses, dias }, setParam] = useParametros({ meses: '6', dias: '7' }) // cuánto se ve en las gráficas
  const fechaHoy = hoyISO()
  const pedido = usePedido(senal => api(`/api/admin/metricas/tablero${propiedadId ? `?propiedad=${propiedadId}` : ''}`, { senal }), [propiedadId])
  const habs = usePedido(senal => habitacionesApi.listar({ propiedad: propiedadId, por_pagina: 100 }, senal), [propiedadId])
  const reservas = usePedido(
    senal => reservasApi.listar({ propiedad: propiedadId, desde: menosDias(fechaHoy, 60), hasta: menosDias(fechaHoy, -1), estado: ['confirmada', 'en_curso'] }, senal),
    [propiedadId, fechaHoy],
  )
  const { avisos } = useAvisos()
  // En vivo: cualquier cambio de reservas vuelve a pedir el tablero y la corona.
  const { recargar } = pedido
  const { recargar: recargarReservas } = reservas
  useEffect(() => {
    let espera = null
    const quitar = escucharEventos(m => { if (m.agregado === 'reserva') { clearTimeout(espera); espera = setTimeout(() => { recargar(); recargarReservas() }, 2500) } })
    return () => { clearTimeout(espera); quitar() }
  }, [recargar, recargarReservas])

  const d = pedido.datos
  const loading = pedido.cargando
  const fecha = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const hoyTexto = fecha.charAt(0).toUpperCase() + fecha.slice(1) // "Miércoles, 4 de noviembre de 2026"
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  const exportar = () => {
    if (!d) return
    const filas = [
      ['mes', 'noches_vendidas', 'ocupacion_%', 'ingreso_mxn', 'adr_mxn', 'revpar_mxn', 'canceladas'],
      ...d.meses.map(m => [m.mes, m.noches_vendidas, m.ocupacion ?? '', m.ingreso_centavos / 100, (m.adr_centavos ?? 0) / 100, (m.revpar_centavos ?? 0) / 100, m.canceladas]),
    ]
    const url = URL.createObjectURL(new Blob([filas.map(f => f.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }))
    Object.assign(document.createElement('a'), { href: url, download: `tablero-${d.fecha}.csv` }).click()
    URL.revokeObjectURL(url)
    toast.success('Resumen exportado', { description: 'Los últimos 12 meses, en CSV.' })
  }

  if (pedido.error) {
    return (
      <div className={s.vacio} role="alert">
        <WarningCircleIcon size={28} aria-hidden="true" />
        <p>{pedido.error.message}</p>
        <Button variant="outline" onClick={pedido.recargar}>Reintentar</Button>
      </div>
    )
  }

  const hoy = d?.hoy
  const lista = reservas.datos ?? []
  const g = agruparHoy(lista, fechaHoy)
  const conSaldo = g.llegan.filter(r => r.por_cobrar_centavos > 0)
  const saldoHoy = conSaldo.filter(r => r.llegada === fechaHoy).length // la nota de "Llegan hoy": sin las vencidas
  const habitaciones = habs.datos?.items ?? []
  const fuera = habitaciones.filter(h => h.estado !== 'activa').map(h => h.nombre.split(' ').slice(1).join(' ') || h.nombre)
  const propiedades = sesion?.propiedades ?? []
  const propiedadDe = id => propiedades.find(p => p.id === id)
  const nombrePropiedad = id => { const p = propiedadDe(id); return p ? p.lugar.split(',')[0] : '' }
  const habitacionDe = id => habitaciones.find(h => h.id === id)
  const actividad = avisos.slice(0, 5).map(a => ({ ...a, Icono: ICONO_AVISO[a.tipo] ?? BellIcon }))
  const ingresos = d?.meses.slice(-Number(meses)) ?? []
  const proximos = d?.proximos.slice(0, Number(dias)) ?? []
  const totalIngresos = ingresos.reduce((t, m) => t + m.ingreso_centavos, 0)
  const conDato = proximos.filter(p => p.ocupacion != null)
  const promedio = conDato.length ? Math.round(conDato.reduce((t, p) => t + p.ocupacion, 0) / conDato.length) : null
  const anteriores = d?.meses.slice(0, -1).map(m => m.ingreso_centavos) ?? []
  const esRecord = Boolean(d) && anteriores.some(v => v > 0) && d.meses.at(-1).ingreso_centavos > Math.max(...anteriores)
  const llegaTexto = n => (n === 1 ? 'llega 1' : `llegan ${n}`)
  const saleTexto = n => (n === 1 ? 'sale 1' : `salen ${n}`)

  return (
    <div>
      {/* ── Cabecera ── */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{d ? `${saludo}. Hoy ${llegaTexto(hoy.llegadas)} y ${saleTexto(hoy.salidas)}` : saludo}</h1>
          <p className="admin-date">{hoyTexto}</p>
        </div>
        <div className="admin-page-header-actions-row">
          <Button variant="outline" className="rounded-full" disabled={!d} onClick={exportar}>
            <DownloadSimpleIcon size={16} weight="bold" /> Exportar
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => onNavigate('hoy')}>
            Ir a recepción <ArrowRightIcon size={14} weight="bold" />
          </Button>
        </div>
      </div>

      {/* ── La corona de hoy ── */}
      {/* Cursor líquido en toda la tarjeta: la gota toma la forma de lo presionable (liquidTarget) */}
      <LiquidCursor className={s.hoyCaja} role="region" aria-label="La corona de hoy">
        <div className={s.hoy}>
        <span data-mece="" className={s.ramilleteA}><CoronaFlores /></span>
        <span data-mece="" className={s.ramilleteB}><CoronaFlores /></span>
        <div>
          {habs.cargando || reservas.cargando ? <SkeletonCard height="280px" />
            : <Corona habitaciones={habitaciones} reservas={lista} hoy={fechaHoy} nombrePropiedad={nombrePropiedad} />}
        </div>
        {loading ? <SkeletonCard height="280px" /> : (
          <div className={c.cifras}>
            <Celda color="var(--primary)" etiqueta="Ocupadas" valor={hoy.ocupadas} sufijo={`/${hoy.habitaciones}`}
              nota={hoy.ocupacion != null ? `${hoy.ocupacion}% de ocupación` : 'Sin dato'} onClick={() => onNavigate('calendar')}>
              {hoy.ocupacion != null && <span className={s.vaso}><PourProgress className="!text-primary" value={hoy.ocupacion} size={46} label="Ocupación de hoy" showValue={false} /></span>}
            </Celda>
            <Celda color="var(--flor-turquesa)" etiqueta="Llegan hoy" valor={hoy.llegadas}
              nota={saldoHoy ? `${saldoHoy} con saldo` : 'Sin saldos'} onClick={() => onNavigate('hoy')} />
            <Celda color="var(--flor-naranja)" etiqueta="Salen hoy" valor={hoy.salidas}
              nota={g.salen.some(r => r.por_cobrar_centavos > 0) ? 'Con saldo por cobrar' : 'Todo pagado'} onClick={() => onNavigate('hoy')} />
            <Celda color="var(--corona-gris)" etiqueta="Mantenimiento" valor={hoy.en_mantenimiento}
              nota={fuera.length ? fuera.join(', ') : 'Todas en servicio'} onClick={() => onNavigate('rooms')} />
            <div className={c.celdaAncha}>
              <div>
                <span className={c.celdaEtiqueta}>Por cobrar en reservas confirmadas</span>
                <span className={c.celdaValor}>$<Odometer value={Math.round(hoy.por_cobrar_centavos / 100)} locale="es-MX" /></span>
              </div>
              <Button {...liquidTarget} variant="outline" size="sm" className="rounded-full" onClick={() => onNavigate('hoy')}>Ver <ArrowRightIcon size={13} weight="bold" /></Button>
            </div>
          </div>
        )}
        </div>
      </LiquidCursor>

      {/* ── Mes récord: solo si este mes ya supera a todos los anteriores ── */}
      {esRecord && (
        <div className={s.record}>
          <GrowthChart title="Mes récord" loop={false} format={v => `$${Math.round(v).toLocaleString('es-MX')}`}
            data={d.meses.slice(-6).map(m => ({ label: etiquetaMes(m.mes), value: m.ingreso_centavos / 100 }))} />
        </div>
      )}

      {/* ── Este mes ── */}
      {d && (
        <div className="inventory-grid" aria-label="Este mes">
          <TarjetaCifra label="Tarifa promedio (ADR) del mes" prefijo={d.mes.adr_centavos != null ? '$' : ''} value={d.mes.adr_centavos != null ? Math.round(d.mes.adr_centavos / 100) : 'Sin dato'}
            sub={<Tendencia ahora={d.mes.adr_centavos} antes={d.mes_anterior.adr_centavos} texto="vs. el mismo tramo del mes anterior" />} />
          <TarjetaCifra label="Ingresos reservados del mes" prefijo="$" value={Math.round(d.mes.ingreso_centavos / 100)}
            sub={<Tendencia ahora={d.mes.ingreso_centavos} antes={d.mes_anterior.ingreso_centavos} texto="vs. el mismo tramo del mes anterior" />} />
          <TarjetaCifra label="RevPAR del mes" prefijo={d.mes.revpar_centavos != null ? '$' : ''} value={d.mes.revpar_centavos != null ? Math.round(d.mes.revpar_centavos / 100) : 'Sin dato'} sub={`${d.mes.noches_vendidas} noches vendidas este mes`} />
          <TarjetaCifra label="Ocupación vs. últimos 7 días" value={hoy.ocupacion ?? 'Sin dato'} sufijo={hoy.ocupacion != null ? '%' : ''}
            sub={<Tendencia ahora={hoy.ocupacion} antes={d.ultimos_7_dias.ocupacion} texto="vs. promedio de 7 días" />} />
        </div>
      )}

      {/* ── Gráficas (MetricCard de devl): línea que se recorre; el deslizador elige el tramo ── */}
      <div className={s.dos}>
        <section className={s.grafica}>
          {loading ? <SkeletonCard height="280px" /> : (
            <MetricCard className="max-w-none" key={`m${meses}`} title="Ingresos reservados" series={[{ name: 'Ingresos', color: 'var(--primary)' }]} locale="es-MX"
              format={{ style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }}
              ranges={[{ id: 'r', label: `${meses} meses`, caption: `Últimos ${meses} meses, ${pesos(totalIngresos)} en total`,
                points: ingresos.map(m => ({ label: `${etiquetaMes(m.mes)} ${m.mes.slice(2, 4)}`, values: [m.ingreso_centavos / 100] })) }]} />
          )}
          <LiquidSlider className={s.rango} label="Meses" min={3} max={12} defaultValue={Number(meses)}
            onValueChange={v => setParam({ meses: String(v) })} formatValue={v => `${v} meses`} />
        </section>
        <section className={s.grafica}>
          {loading ? <SkeletonCard height="280px" /> : (
            <MetricCard className="max-w-none" key={`d${dias}`} title="Ocupación de los próximos días" series={[{ name: 'Ocupación', color: 'var(--flor-turquesa)' }]} locale="es-MX"
              format={PORCENTAJE} axisFormat={PORCENTAJE} maxValue={1}
              ranges={[{ id: 'r', label: `${dias} días`, caption: promedio != null ? `${promedio}% en promedio, próximos ${dias} días` : `Próximos ${dias} días`,
                points: proximos.map(x => ({ label: new Date(`${x.dia}T12:00`).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }), values: [(x.ocupacion ?? 0) / 100] })) }]} />
          )}
          <LiquidSlider className={s.rango} label="Días" min={3} max={14} defaultValue={Number(dias)}
            onValueChange={v => setParam({ dias: String(v) })} formatValue={v => `${v} días`} />
        </section>
      </div>

      {/* ── Quién llega con saldo y la actividad ── */}
      <div className={s.dos}>
        <section className={s.tarjeta}>
          <div className={s.tarjetaCabeza}>
            <h2 className={s.titulo}>Llegan hoy con saldo</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('hoy')}>Ver todas</Button>
          </div>
          {conSaldo.length === 0 ? <p className={s.sinActividad}>Nadie llega hoy con saldo pendiente.</p> : (
            <ul className={s.lista}>
              {conSaldo.slice(0, 4).map(r => {
                const h = habitacionDe(r.habitacion_id)
                const lugar = h ? nombrePropiedad(h.propiedad_id) : ''
                return (
                  <li key={r.id}>
                    <Inicial nombre={r.huesped_nombre} />
                    <span className={s.listaTexto}><b>{r.huesped_nombre}</b><span>{r.habitacion_nombre}</span></span>
                    {lugar && <span className={s.chip}><Florecita color={florDeLugar(lugar)} tamano={11} />{lugar}</span>}
                    <b className={s.monto}>{pesos(r.por_cobrar_centavos)}</b>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate(`/admin/llegadas-y-salidas?reserva=${r.id}&accion=pago`)}>Cobrar</Button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        <section className={s.tarjeta}>
          <div className={s.tarjetaCabeza}>
            <h2 className={s.titulo}>Actividad reciente</h2>
            {avisos.length > 0 && <Button variant="ghost" size="sm" onClick={() => onNavigate('notifications')}>Ver todos</Button>}
          </div>
          {actividad.length === 0 ? <p className={s.sinActividad}>Aún no hay actividad.</p> : (
            <ul className={s.lista}>
              {actividad.map(item => (
                <li key={item.id}>
                  <span className={s.iconoAviso}><item.Icono size={16} aria-hidden="true" /></span>
                  <span className={s.listaTexto}><b>{item.titulo}</b><span>{item.texto}</span></span>
                  <span className={s.tiempo}>{haceCuanto(item.fecha)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Cómo pagan los huéspedes ── */}
      <FormasDePago />

      {MODULOS.restaurante && <SeccionRestaurante onNavigate={onNavigate} loading={loading} />}
    </div>
  )
}

export default DashboardPage
