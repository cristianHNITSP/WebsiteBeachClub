import { useMemo } from 'react'
import { CurrencyDollarIcon, ReceiptIcon, ForkKnifeIcon, HandCoinsIcon } from '@phosphor-icons/react'
import RubberSegment from '@/components/bits/RubberSegment'
import TarjetaCifra from '@/components/marca/TarjetaCifra'
import { useParametros } from '@/hooks/useParametros'
import { Columnas, Barras } from '../components/Graficas'
import {
  useRestaurante, periodo, resumen, ventasPorDia, platillosVendidos, porCategoria, porHora, porMetodo,
  categoria, mxn, variacion,
} from '../restaurante'
import s from './Restaurante.module.css'

const PERIODOS = [{ value: '7', label: '7 días' }, { value: '30', label: '30 días' }]
const diaCorto = d => d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })
const comparado = (a, b, dias) => {
  const v = variacion(a, b)
  return v === null ? undefined : `${v >= 0 ? '+' : ''}${v}% vs. los ${dias} días anteriores`
}

export default function RestauranteEstadisticasPage() {
  const { tickets, menu } = useRestaurante()
  const [p, set] = useParametros({ dias: '7' })
  const dias = p.dias === '30' ? 30 : 7

  const e = useMemo(() => {
    const { actual, anterior } = periodo(tickets, dias)
    const vendidos = platillosVendidos(actual, menu)
    return {
      r: resumen(actual), prev: resumen(anterior),
      porDia: ventasPorDia(tickets, dias), top: vendidos.slice(0, 10),
      cats: porCategoria(actual, menu), horas: porHora(actual), metodos: porMetodo(actual),
    }
  }, [tickets, menu, dias])

  const totalVentas = e.r.ventas || 1
  const hoyClave = new Date().toDateString()

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">Restaurante</span>
          <h1 className="admin-page-title">Estadísticas del <em>restaurante</em></h1>
          <div className={s.filtros} style={{ marginBottom: 0 }}>
            <RubberSegment items={PERIODOS} value={String(dias)} onChange={v => set({ dias: v }, { historial: true })} aria-label="Periodo"
              size="md" radius={999} trackColor="var(--muted)" thumbColor="var(--primary)" textColor="var(--muted-foreground)" activeTextColor="var(--primary-foreground)" />
          </div>
        </div>
      </div>

      <div className="inventory-grid">
        <TarjetaCifra Icono={CurrencyDollarIcon} flor="morado"   label="Ventas" prefijo="$" value={Math.round(e.r.ventas)} sub={comparado(e.r.ventas, e.prev.ventas, dias)} />
        <TarjetaCifra Icono={ReceiptIcon}        flor="turquesa" label="Tickets" value={e.r.tickets} sub={comparado(e.r.tickets, e.prev.tickets, dias)} />
        <TarjetaCifra Icono={ForkKnifeIcon}      flor="dorado"   label="Platillos vendidos" value={e.r.platillos} sub={comparado(e.r.platillos, e.prev.platillos, dias)} />
        <TarjetaCifra Icono={HandCoinsIcon}      flor="naranja"  label="Ticket promedio" prefijo="$" value={Math.round(e.r.promedio)} sub={comparado(e.r.promedio, e.prev.promedio, dias)} />
      </div>

      <div className={s.graficas}>
        <section className={`${s.panel} ${s.ancha}`}>
          <div className={s.panelCabeza}>
            <div>
              <h2 className={s.panelTitulo}>Ventas por día</h2>
              <p className={s.panelSub}>MXN, tickets pagados con propina. Pasa el cursor por una barra para ver el detalle.</p>
            </div>
          </div>
          <Columnas
            titulo="Ventas por día"
            alto={220}
            marcar={hoyClave}
            etiquetaCada={dias === 30 ? 3 : 1}
            datos={e.porDia.map(d => ({
              clave: d.fecha.toDateString(), etiqueta: dias === 30 ? d.fecha.getDate() : diaCorto(d.fecha), valor: d.ventas,
              pista: `${diaCorto(d.fecha)}: ${mxn(d.ventas)}, ${d.tickets} ticket${d.tickets !== 1 ? 's' : ''}`,
            }))}
          />
        </section>

        <section className={s.panel}>
          <div className={s.panelCabeza}>
            <div>
              <h2 className={s.panelTitulo}>Platillos más vendidos</h2>
              <p className={s.panelSub}>Piezas vendidas e ingreso de cada platillo.</p>
            </div>
          </div>
          {e.top.length ? (
            <Barras titulo="Platillos más vendidos" datos={e.top.map(v => {
              const c = categoria(v.categoria)
              return { clave: v.id, etiqueta: v.nombre, valor: v.cantidad, texto: `${v.cantidad} vendidos, ${mxn(v.ingresos)}`, Icono: c.Icono, flor: c.flor }
            })} />
          ) : <div className={s.vacio}>Sin ventas en el periodo.</div>}
        </section>

        <section className={s.panel}>
          <div className={s.panelCabeza}>
            <div>
              <h2 className={s.panelTitulo}>Ventas por categoría</h2>
              <p className={s.panelSub}>Ingreso por categoría de la carta y su parte del total.</p>
            </div>
          </div>
          <Barras titulo="Ventas por categoría" datos={e.cats.map(c => ({
            clave: c.value, etiqueta: c.label, valor: c.ingresos, texto: `${mxn(c.ingresos)}, ${Math.round((c.ingresos / totalVentas) * 100)}%`, Icono: c.Icono, flor: c.flor,
          }))} />
        </section>

        <section className={s.panel}>
          <div className={s.panelCabeza}>
            <div>
              <h2 className={s.panelTitulo}>Afluencia por hora</h2>
              <p className={s.panelSub}>Tickets abiertos en cada hora del día.</p>
            </div>
          </div>
          <Columnas
            titulo="Afluencia por hora"
            alto={180}
            etiquetaCada={2}
            datos={e.horas.map(h => ({ clave: h.hora, etiqueta: `${h.hora}h`, valor: h.tickets, pista: `${h.hora}:00 a ${h.hora + 1}:00: ${h.tickets} ticket${h.tickets !== 1 ? 's' : ''}, ${mxn(h.ventas)}` }))}
          />
        </section>

        <section className={s.panel}>
          <div className={s.panelCabeza}>
            <div>
              <h2 className={s.panelTitulo}>Forma de pago</h2>
              <p className={s.panelSub}>Ingreso por forma de pago.</p>
            </div>
          </div>
          <Barras titulo="Forma de pago" datos={e.metodos.map(m => ({
            clave: m.value, etiqueta: m.label, valor: m.ventas, texto: `${mxn(m.ventas)}, ${m.tickets} tickets`,
          }))} />
        </section>
      </div>
    </div>
  )
}
