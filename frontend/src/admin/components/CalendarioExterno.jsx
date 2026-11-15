import { useMemo } from 'react'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { Button } from '@/components/coss/button'
import { SkeletonCard } from '@/components/frida/Skeleton'
import { useParametros } from '@/hooks/useParametros'
import { usePedido } from '@/hooks/usePedido'
import { useRecargarAlCambiar } from '@/hooks/useRecargarAlCambiar'
import { Florecita } from '@/components/marca/Wordmark'
import { useSesion } from '@/lib/sesion'
import { aISO, deISO } from '@/lib/fechas'
import { etiquetaDePublicacion, externasApi, nombreCanal } from '../externas'
import { hoy, sumarDias } from '../reservas'
import s from './CalendarioExterno.module.css'

/*
 * Calendario de OTRAS plataformas: lo ocupado que dicen Booking, Airbnb y compañía. Es aparte
 * de la Línea de tiempo (esa es solo de las reservas hechas dentro del motor): aquí nada se
 * mueve ni se crea, es solo consulta. Las filas son las habitaciones del panel; lo que una
 * plataforma no asigna a ninguna (CSV de Booking) va en "Sin habitación asignada".
 * La ventana va en la URL (?cal=AAAA-MM-DD).
 */

const DIAS = 28
const COLOR = { booking: 'morado', airbnb: 'rojo', expedia: 'dorado', vrbo: 'turquesa', otro: 'hoja' }
const corto = d => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

export default function CalendarioExterno({ propiedadId }) {
  const { sesion } = useSesion()
  const [{ cal }, set] = useParametros({ cal: '' })
  const inicio = deISO(cal) ?? sumarDias(hoy(), -2)
  const fin = sumarDias(inicio, DIAS)
  const reservas = usePedido(
    senal => externasApi.reservas({ desde: aISO(inicio), hasta: aISO(fin), propiedad: propiedadId }, senal),
    [aISO(inicio), propiedadId],
  )
  useRecargarAlCambiar('externas', reservas.recargar)
  const fichas = usePedido(senal => externasApi.fichas(senal), [])

  const dias = useMemo(() => Array.from({ length: DIAS }, (_, i) => sumarDias(inicio, i)), [cal]) // eslint-disable-line react-hooks/exhaustive-deps
  const hoyISO = aISO(hoy())
  const vigentes = (reservas.datos ?? []).filter(r => r.estado === 'vigente')
  const sinAsignar = vigentes.filter(r => !r.ficha_id)
  // Una sección por propiedad; las filas son lo que cada PLATAFORMA publica (con su nombre y formato),
  // no las habitaciones del motor: plataformas y motor van separados.
  const secciones = (sesion?.propiedades ?? [])
    .map(p => ({
      id: p.id, nombre: p.nombre,
      filas: (fichas.datos ?? []).filter(f => f.propiedad_id === p.id && f.canal !== 'otro').flatMap(f =>
        (f.cuartos ?? []).map((c, i) => ({
          id: `${f.id}-${i}`, nombre: `${nombreCanal(f.canal)}: ${c.nombre}`, detalle: etiquetaDePublicacion(c).slice(c.nombre.length + 2),
          items: vigentes.filter(r => r.ficha_id === f.id && r.publicacion === etiquetaDePublicacion(c)),
        }))),
    }))
    .filter(g => g.filas.length)
  if (sinAsignar.length) secciones.push({ id: 'sin', nombre: 'Sin calendario conectado', filas: [{ id: 'sin', nombre: 'Sin tipo de habitación', detalle: 'No se sabe a qué publicación pertenecen', items: sinAsignar }] })
  const ir = n => set({ cal: aISO(sumarDias(inicio, n)) })
  const posicion = r => {
    const l = Math.max(0, Math.round((deISO(r.llegada) - inicio) / 864e5))
    const sa = Math.min(DIAS, Math.round((deISO(r.salida) - inicio) / 864e5))
    return sa > l ? { gridColumn: `${l + 2} / ${sa + 2}` } : null
  }

  return (
    <section className={s.seccion} aria-label="Calendario de otras plataformas">
      <div className={s.cabecera}>
        <div>
          <h2 className={s.titulo}>Calendario de otras plataformas</h2>
          <p className={s.ayuda}>Lo que Booking, Airbnb y compañía tienen ocupado de lo que publican. Solo consulta y aparte del motor: las reservas del motor viven en la Línea de tiempo.</p>
        </div>
        <div className={s.controles} role="group" aria-label="Mover el calendario">
          <Button variant="outline" size="icon" aria-label="Semana anterior" onClick={() => ir(-7)}><CaretLeftIcon size={16} aria-hidden="true" /></Button>
          <Button variant="outline" size="lg" onClick={() => set({ cal: '' })}>Hoy</Button>
          <Button variant="outline" size="icon" aria-label="Semana siguiente" onClick={() => ir(7)}><CaretRightIcon size={16} aria-hidden="true" /></Button>
          <span className={s.rango}>{corto(inicio)} → {corto(sumarDias(fin, -1))}</span>
        </div>
      </div>

      {reservas.cargando || fichas.cargando ? <SkeletonCard height="220px" /> : reservas.error ? (
        <p className={s.error} role="alert">{reservas.error.message} <Button variant="outline" size="sm" onClick={reservas.recargar}>Reintentar</Button></p>
      ) : (
        <div className={s.marco}>
          <div className={s.rejilla} style={{ '--dias': DIAS }} role="table" aria-label="Ocupación por habitación">
            <div className={`${s.fila} ${s.encabezado}`} role="row">
              <span className={s.nombre} role="columnheader">Habitación</span>
              {dias.map(d => (
                <span key={aISO(d)} role="columnheader" className={`${s.dia} ${aISO(d) === hoyISO ? s.hoy : ''} ${[0, 6].includes(d.getDay()) ? s.finde : ''}`}>
                  <span className={s.diaNum}>{d.getDate()}</span>
                  <span className={s.diaMes}>{d.getDate() === 1 || d === dias[0] ? d.toLocaleDateString('es-MX', { month: 'short' }) : ''}</span>
                </span>
              ))}
            </div>
            {secciones.length === 0 && <p className={s.vacio}>No hay publicaciones. Agrega la ficha de una plataforma.</p>}
            {secciones.map(g => (
              <div key={g.id} role="rowgroup">
                <div className={s.propiedad}><Florecita tamano={14} />{g.nombre}</div>
                {g.filas.map(f => (
                  <div key={f.id} className={s.fila} role="row">
                    <span className={s.nombre} role="rowheader" title={`${f.nombre}${f.detalle ? `, ${f.detalle}` : ''}`}><span>{f.nombre}{f.detalle && <small className={s.detalleFila}>{f.detalle}</small>}</span></span>
                    {dias.map((d, i) => <span key={i} role="cell" aria-hidden="true" className={`${s.celda} ${aISO(d) === hoyISO ? s.hoy : ''} ${[0, 6].includes(d.getDay()) ? s.finde : ''}`} style={{ gridColumn: i + 2 }} />)}
                    {f.items.map(r => {
                      const pos = posicion(r)
                      if (!pos) return null
                      const flor = COLOR[r.canal] ?? 'hoja'
                      const texto = `Reserva de ${nombreCanal(r.canal)}${r.titulo ? ` (${r.titulo})` : ''}: ${corto(deISO(r.llegada))} → ${corto(deISO(r.salida))}${r.choca ? '. Choca con una reserva propia' : ''}`
                      return (
                        <span key={r.id} role="img" aria-label={texto} title={texto} className={`${s.barra} ${r.choca ? s.choca : ''}`}
                          style={{ ...pos, background: `var(--flor-${flor})`, color: `var(--flor-${flor}-fg)` }}>
                          {r.titulo ?? nombreCanal(r.canal)}
                        </span>
                      )
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      {!reservas.cargando && !reservas.error && vigentes.length === 0 && (
        <p className={s.ayuda} role="status">Ninguna plataforma tiene fechas ocupadas en este rango, o todavía no hay un calendario conectado a una publicación.</p>
      )}
    </section>
  )
}
