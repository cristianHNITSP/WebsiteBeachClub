import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  BedIcon, SunIcon, DownloadSimpleIcon, TrendUpIcon, TrendDownIcon, SignOutIcon, SignInIcon, WrenchIcon, ArrowRightIcon,
  CurrencyDollarIcon, ReceiptIcon, ForkKnifeIcon, HandCoinsIcon, WarningCircleIcon, BellIcon, CalendarDotsIcon,
} from '@phosphor-icons/react'
import { SkeletonCard } from '@/components/frida/Skeleton'
import { Button } from '@/components/ui/button'
import SpotlightCard from '@/components/bits/SpotlightCard'
import CountUp from '@/components/bits/CountUp'
import AnimatedList from '@/components/bits/AnimatedList'
import { useTheme } from '@/context/ThemeContext'
import TarjetaCifra from '@/components/marca/TarjetaCifra'
import { api } from '@/lib/api'
import { usePedido } from '@/hooks/usePedido'
import { escucharEventos } from '@/lib/eventos'
import { Columnas, Barras } from '../components/Graficas'
import FormasDePago from '../components/FormasDePago'
import { MODULOS } from '../modulos'
import { useAvisos, haceCuanto } from '../avisos'
import { usePropiedadActual } from '../propiedadActual'
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
const FLOR_AVISO = { reserva: 'morado', pago: 'orquidea', operacion: 'turquesa', sistema: 'dorado' }

/* Cifra animada (CountUp) o quieta con reducir movimiento */
function Cifra({ valor, decimales = 0, reduceMotion }) {
  if (valor == null) return 'Sin dato'
  if (reduceMotion) return valor.toLocaleString('es-MX', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
  return <CountUp to={valor} duration={1.4} separator="," />
}

/** "+12% vs. …" o "Sin dato para comparar". */
function Tendencia({ ahora, antes, texto }) {
  if (ahora == null || antes == null || antes === 0) return <div className="metric-card__trend">Sin dato para comparar</div>
  const cambio = Math.round(((ahora - antes) / antes) * 100)
  const Icono = cambio >= 0 ? TrendUpIcon : TrendDownIcon
  return <div className="metric-card__trend"><Icono size={16} weight="bold" aria-hidden="true" /> {cambio >= 0 ? '+' : ''}{cambio}% {texto}</div>
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

const DashboardPage = ({ onNavigate }) => {
  const { reduceMotion } = useTheme()
  const { propiedadId } = usePropiedadActual()
  const pedido = usePedido(senal => api(`/api/admin/metricas/tablero${propiedadId ? `?propiedad=${propiedadId}` : ''}`, { senal }), [propiedadId])
  const { avisos } = useAvisos()
  // En vivo: cualquier cambio de reservas vuelve a pedir el tablero.
  const { recargar } = pedido
  useEffect(() => {
    let espera = null
    const quitar = escucharEventos(m => { if (m.agregado === 'reserva') { clearTimeout(espera); espera = setTimeout(recargar, 2500) } })
    return () => { clearTimeout(espera); quitar() }
  }, [recargar])

  const d = pedido.datos
  const loading = pedido.cargando
  const hoyTexto = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

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
  const INVENTARIO = d ? [
    { Icono: BedIcon,     flor: 'morado',   label: 'Ocupadas hoy',     value: hoy.ocupadas, sufijo: `/${hoy.habitaciones}`, sub: hoy.bloqueadas ? `${hoy.bloqueadas} bloqueadas por mantenimiento` : 'Sin bloqueos hoy' },
    { Icono: SignInIcon,  flor: 'turquesa', label: 'Llegadas hoy',     value: hoy.llegadas, sub: 'Reservas que empiezan hoy' },
    { Icono: SignOutIcon, flor: 'naranja',  label: 'Salidas hoy',      value: hoy.salidas,  sub: 'Reservas que terminan hoy' },
    { Icono: WrenchIcon,  flor: 'dorado',   label: 'En mantenimiento', value: hoy.en_mantenimiento, sub: 'Habitaciones fuera de servicio' },
    { Icono: HandCoinsIcon, flor: 'orquidea', label: 'Por cobrar', prefijo: '$', value: Math.round(hoy.por_cobrar_centavos / 100), sub: 'Reservas confirmadas y en curso' },
  ] : []
  const actividad = avisos.slice(0, 6).map(a => ({ ...a, Icono: ICONO_AVISO[a.tipo] ?? BellIcon, flor: FLOR_AVISO[a.tipo] ?? 'morado' }))

  return (
    <div>
      {/* ── Cabecera ── */}
      <div className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">Resumen operacional</span>
          <h1 className="admin-page-title">Tablero <em>principal</em></h1>
          {d && (
            <div className={s.chips}>
              <span className={`${s.chip} ${s.chipMarca}`}><BedIcon size={14} weight="bold" aria-hidden="true" /> {hoy.ocupadas}/{hoy.habitaciones} ocupadas</span>
              <span className={`${s.chip} ${s.chipSol}`}><SunIcon size={14} weight="bold" aria-hidden="true" /> {hoy.llegadas} llegada{hoy.llegadas !== 1 ? 's' : ''} hoy</span>
            </div>
          )}
        </div>
        <div className="admin-page-header-actions">
          <div className="admin-date" style={{ textTransform: 'capitalize' }}>{hoyTexto}</div>
          <div className="admin-page-header-actions-row">
            <Button variant="outline" disabled={!d} onClick={exportar}>
              <DownloadSimpleIcon size={16} weight="bold" /> Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* ── Hoy en la operación: lo primero que se ve (check-in, check-out, cobro) ── */}
      <div className={`inventory-section ${s.hoyArriba}`}>
        <div className={s.invCabecera}>
          <div>
            <span className="admin-page-eyebrow">Hoy</span>
            <h2 className="admin-section-title" style={{ marginBottom: 0 }}>Resumen operacional</h2>
          </div>
          <Button variant="outline" className="h-11" onClick={() => onNavigate('hoy')}>Llegadas y salidas <ArrowRightIcon size={14} weight="bold" /></Button>
        </div>
        <div className="inventory-grid">
          {(loading ? [0, 1, 2, 3, 4] : INVENTARIO).map((item, i) => (
            <motion.div key={item.label ?? i} {...entrada(i)}>
              {loading ? <SkeletonCard height="120px" /> : <TarjetaCifra {...item} />}
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Métricas ── */}
      <div className="metrics-grid">
        {loading ? (
          <><SkeletonCard height="180px" /><SkeletonCard height="180px" /><SkeletonCard height="180px" /></>
        ) : (
          <>
            <motion.div {...entrada(0)}>
              <SpotlightCard className="metric-card metric-card--light h-full" spotlightColor="color-mix(in srgb, var(--primary) 12%, transparent)">
                <div className="metric-card__label">Ocupación de hoy</div>
                <div>
                  <div className="metric-card__value"><Cifra valor={hoy.ocupacion} decimales={1} reduceMotion={reduceMotion} />{hoy.ocupacion != null && '%'}</div>
                  <Tendencia ahora={hoy.ocupacion} antes={d.ultimos_7_dias.ocupacion} texto="vs. promedio de los últimos 7 días" />
                </div>
                <div className={s.barra} role="img" aria-label={`Ocupación ${hoy.ocupacion ?? 0}%`}>
                  <motion.div className={s.barraRelleno} initial={{ scaleX: reduceMotion ? 1 : 0 }} animate={{ scaleX: 1 }}
                    transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }} style={{ width: `${hoy.ocupacion ?? 0}%` }} />
                </div>
                <div className={s.barraPie}>
                  <span>{hoy.habitaciones - hoy.ocupadas - hoy.bloqueadas} disponibles</span>
                  <span>{hoy.habitaciones} en total</span>
                </div>
              </SpotlightCard>
            </motion.div>

            <motion.div {...entrada(1)} className="metric-card metric-card--primary">
              <div className="metric-card__label">Tarifa promedio (ADR) del mes</div>
              <div>
                <div className="metric-card__value">{d.mes.adr_centavos != null && '$'}<Cifra valor={d.mes.adr_centavos != null ? Math.round(d.mes.adr_centavos / 100) : null} reduceMotion={reduceMotion} /></div>
                <Tendencia ahora={d.mes.adr_centavos} antes={d.mes_anterior.adr_centavos} texto="vs. el mismo tramo del mes anterior" />
                <div className="metric-card__sub">{d.mes.noches_vendidas} noches vendidas este mes</div>
              </div>
            </motion.div>

            <motion.div {...entrada(2)} className="metric-card metric-card--gold">
              <div className="metric-card__label">Ingresos reservados del mes</div>
              <div>
                <div className="metric-card__value">$<Cifra valor={Math.round(d.mes.ingreso_centavos / 100)} reduceMotion={reduceMotion} /></div>
                <Tendencia ahora={d.mes.ingreso_centavos} antes={d.mes_anterior.ingreso_centavos} texto="vs. el mismo tramo del mes anterior" />
                <div className="metric-card__sub">RevPAR {d.mes.revpar_centavos != null ? pesos(d.mes.revpar_centavos) : 'Sin dato'}</div>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* ── Gráficas + actividad ── */}
      <div className="dashboard-charts-row">
        <div className={s.graficas}>
          <div className="chart-area">
            <div className="chart-title">Ingresos reservados por mes</div>
            {loading ? <SkeletonCard height="200px" /> : (
              <Columnas titulo="Ingresos reservados por mes" alto={200} marcar={d.meses.at(-1)?.mes}
                datos={d.meses.map(m => ({ clave: m.mes, etiqueta: etiquetaMes(m.mes), valor: m.ingreso_centavos / 100,
                  pista: `${etiquetaMes(m.mes)} ${m.mes.slice(0, 4)}: ${pesos(m.ingreso_centavos)}, ocupación ${m.ocupacion ?? 'sin dato'}${m.ocupacion != null ? '%' : ''}` }))} />
            )}
          </div>
          <div className="chart-area">
            <div className="chart-title">Ocupación de los próximos 14 días</div>
            {loading ? <SkeletonCard height="160px" /> : (
              <Columnas titulo="Ocupación de los próximos 14 días" alto={160} marcar={d.proximos[0]?.dia}
                datos={d.proximos.map(p => {
                  const dia = new Date(`${p.dia}T12:00`)
                  const etiqueta = dia.toLocaleDateString('es-MX', { weekday: 'narrow', day: 'numeric' })
                  return { clave: p.dia, etiqueta, valor: p.ocupacion ?? 0, pista: `${dia.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })}: ${p.ocupacion ?? 'sin dato'}${p.ocupacion != null ? '%' : ''}, ${p.noches_vendidas} ocupadas` }
                })} />
            )}
          </div>
        </div>

        {/* Actividad: los avisos más recientes (los mismos de la campana) */}
        <div className="activity-feed">
          <div className="activity-feed__title">Actividad reciente</div>
          {actividad.length === 0 ? <p className={s.sinActividad}>Aún no hay actividad.</p> : (
            <AnimatedList
              items={actividad}
              showGradients={false}
              displayScrollbar={false}
              maxHeight={520}
              renderItem={item => (
                <div className="activity-item">
                  <div className={s.actIcono} style={{ background: `var(--flor-${item.flor})`, color: `var(--flor-${item.flor}-fg)` }}>
                    <item.Icono size={18} weight="fill" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="activity-title">{item.titulo}</div>
                    <div className="activity-sub">{item.texto}</div>
                    <div className="activity-time">{haceCuanto(item.fecha)}</div>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </div>

      {/* ── Cómo pagan los huéspedes ── */}
      <FormasDePago />

      {MODULOS.restaurante && <SeccionRestaurante onNavigate={onNavigate} loading={loading} />}
    </div>
  )
}

export default DashboardPage
