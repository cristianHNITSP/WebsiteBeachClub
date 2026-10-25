import { CheckCircleIcon, CoinsIcon, DotsThreeIcon, SignInIcon, SignOutIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { SkeletonCard } from '@/components/frida/Skeleton'
import Selector from '@/components/marca/Selector'
import { useParametros } from '@/hooks/useParametros'
import { usePedido } from '@/hooks/usePedido'
import { api } from '@/lib/api'
import { Barras } from './Graficas'
import { usePropiedadActual } from '../propiedadActual'
import s from './FormasDePago.module.css'

/*
 * Cómo pagan los huéspedes (GET /api/admin/metricas/pagos): de las estancias que
 * TERMINARON en el periodo, cuántas pagaron de una vez, todo al llegar,
 * liquidaron al salir o abonaron mientras estaban. Una categoría por estancia
 * (la primera que cumpla, en este orden). Periodo en la URL (?pagos=90).
 */
const FORMAS = {
  de_una_vez: { etiqueta: 'De una vez', ayuda: 'Un solo pago cubrió toda la estancia', Icono: CheckCircleIcon, flor: 'turquesa' },
  al_llegar: { etiqueta: 'Todo al llegar', ayuda: 'Pagado a más tardar el día del check-in (en uno o varios pagos)', Icono: SignInIcon, flor: 'morado' },
  al_salir: { etiqueta: 'Liquidaron al salir', ayuda: 'La mitad o más, la última noche o el día del check-out', Icono: SignOutIcon, flor: 'naranja' },
  en_abonos: { etiqueta: 'En abonos', ayuda: 'Pagos en dos o más días mientras estaban hospedados', Icono: CoinsIcon, flor: 'dorado' },
  otra: { etiqueta: 'Otra', ayuda: 'Ninguna de las anteriores', Icono: DotsThreeIcon, flor: 'orquidea' },
}
const PERIODOS = [
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
  { value: '365', label: 'Último año' },
]

export default function FormasDePago() {
  const [{ pagos }, set] = useParametros({ pagos: '90' })
  const { propiedadId } = usePropiedadActual()
  const pedido = usePedido(senal => api(`/api/admin/metricas/pagos?dias=${pagos}${propiedadId ? `&propiedad=${propiedadId}` : ''}`, { senal }), [pagos, propiedadId])
  const d = pedido.datos
  return (
    <section className={s.seccion} aria-labelledby="formas-titulo">
      <div className={s.cabecera}>
        <div>
          <span className="admin-page-eyebrow">Cobro</span>
          <h2 className="admin-section-title" id="formas-titulo" style={{ marginBottom: 0 }}>Cómo pagan los huéspedes</h2>
          {d && <p className={s.ayuda}>{d.estancias} estancia{d.estancias !== 1 ? 's' : ''} terminada{d.estancias !== 1 ? 's' : ''}, {d.pagos_por_estancia} pagos por estancia en promedio.</p>}
        </div>
        <div className={s.periodo}><Selector ariaLabel="Periodo" value={pagos} onChange={v => set({ pagos: v })} opciones={PERIODOS} /></div>
      </div>
      {pedido.cargando ? <SkeletonCard height="220px" />
        : pedido.error ? (
          <div className={s.vacio} role="alert"><WarningCircleIcon size={24} aria-hidden="true" /><p>{pedido.error.message}</p>
            <Button variant="outline" className="h-11" onClick={pedido.recargar}>Reintentar</Button></div>
        ) : d.estancias === 0 ? (
          <p className={s.vacio} role="status">Aún no hay estancias terminadas en este periodo.</p>
        ) : (
          <>
            <Barras titulo="Estancias por forma de pago" datos={d.formas.filter(f => f.forma !== 'otra' || f.estancias).map(f => ({
              clave: f.forma, etiqueta: FORMAS[f.forma].etiqueta, valor: f.estancias,
              texto: `${f.estancias} (${f.porcentaje.toLocaleString('es-MX')}%)`, Icono: FORMAS[f.forma].Icono, flor: FORMAS[f.forma].flor,
            }))} />
            <dl className={s.definiciones}>
              {d.formas.filter(f => f.forma !== 'otra' || f.estancias).map(f => (
                <div key={f.forma}><dt>{FORMAS[f.forma].etiqueta}</dt><dd>{FORMAS[f.forma].ayuda}</dd></div>
              ))}
            </dl>
          </>
        )}
    </section>
  )
}
