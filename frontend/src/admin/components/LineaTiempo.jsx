import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { LiquidSegments } from '@/components/devl/liquid-segments'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/admin/toast'
import { CaretLeftIcon, CaretRightIcon, CaretDownIcon, MagnifyingGlassIcon, PlusIcon, MinusIcon, WrenchIcon } from '@phosphor-icons/react'
import { Badge } from '@/components/coss/badge'
import { Button } from '@/components/coss/button'
import { Input } from '@/components/coss/input'
import { Label } from '@/components/coss/label'
import { Popover, PopoverPopup } from '@/components/coss/popover'
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from '@/components/coss/sheet'
import { DropletButton } from '@/components/devl/droplet-button'
import ConfirmarRiesgo from '@/components/marca/ConfirmarRiesgo'
import { CoronaFlores, Florecita } from '@/components/marca/Wordmark'
import Pista, { GrupoPistas } from '@/admin/components/Pista'
import { useParametros } from '@/hooks/useParametros'
import Skeleton from '@/components/frida/Skeleton'
import { useTheme } from '@/context/ThemeContext'
import { aISO, deISO } from '@/lib/fechas'
import { fichaHabitacion } from '../habitaciones'
import { ESTADOS, FUENTES, deFuera, useReservas, conflicto, hoy, sumarDias, dias, habitacionesConocidas } from '../reservas'
import { useSesion } from '@/lib/sesion'
import { florDeLugar, usePropiedadActual } from '../propiedadActual'
import DetalleReserva from './DetalleReserva'
import s from './LineaTiempo.module.css'

/*
 * Línea de tiempo de reservas (estilo Gantt): habitaciones en filas, noches en
 * columnas. Escala día/semana/mes, grupos plegables con ocupación, arrastrar
 * para mover/estirar (con confirmación y detección de choques), teclado, y clic
 * en un hueco para crear. Toda la configuración vive en la URL.
 */

const ESCALAS = {
  dia:    { dias: 3,  celda: 232, antes: 0, etiqueta: 'Día' },
  semana: { dias: 7,  celda: 120, antes: 1, etiqueta: 'Semana' },
  mes:    { dias: 30, celda: 46,  antes: 3, etiqueta: 'Mes' },
}
// La celda crece hasta llenar el ancho disponible; `celda` de ESCALAS es su mínimo (debajo, scroll propio).
function useCelda(esc) {
  const [caja, setCaja] = useState(null)
  const [ancho, setAncho] = useState(0)
  useLayoutEffect(() => {
    if (!caja) return
    setAncho(caja.clientWidth)
    const o = new ResizeObserver(([e]) => setAncho(e.contentRect.width))
    o.observe(caja)
    return () => o.disconnect()
  }, [caja])
  const col = window.innerWidth <= 760 ? 150 : 220 // el --col de .rejilla
  return [setCaja, Math.max(esc.celda, Math.floor((ancho - col) / esc.dias))]
}

// Grupos de filas: los usa la vista y su esqueleto (mismas filas, misma altura).
const agruparHabitaciones = (habitaciones, propiedades, agrupar) => {
  if (agrupar === 'tipo') {
    const tipos = [...new Set(habitaciones.map(h => h.type))]
    return tipos.map(t => ({ clave: t, titulo: t, habitaciones: habitaciones.filter(h => h.type === t) }))
  }
  return propiedades
    .map(pr => ({ clave: pr.clave, titulo: pr.nombre, flor: florDeLugar(pr.lugar), habitaciones: habitaciones.filter(h => h.propiedadId === pr.id) }))
    .filter(g => g.habitaciones.length) // con el selector en una sola propiedad, la otra no se pinta
}

const FILTROS = [
  { value: 'todos',      label: 'Todas' },
  { value: 'confirmada', label: 'Confirmadas' },
  { value: 'pendiente',  label: 'Pendientes' },
  { value: 'en-curso',   label: 'En curso' },
  { value: 'bloqueo',    label: 'Mantenimiento' },
]
const corto = d => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

export default function LineaTiempo({ onNuevaReserva, onNuevaHabitacion }) {
  const { reduceMotion } = useTheme()
  // ?reserva=<id>: el detalle abierto también vive en la URL (recargar lo conserva).
  const [p, set] = useParametros({ escala: 'semana', desde: '', agrupar: 'propiedad', estado: 'todos', q: '', reserva: '' })
  const esc = ESCALAS[p.escala] ?? ESCALAS.semana
  const inicio = deISO(p.desde) ?? sumarDias(hoy(), -esc.antes)
  const inicioISO = aISO(inicio)
  const [cajaRef, celda] = useCelda(esc)
  const ancho = esc.dias * celda
  // Lo visible y un día de cada lado (las barras que entran o salen del borde).
  const { habitaciones, reservas, cargando, error, recargar, mover, crear } = useReservas({
    desde: sumarDias(inicio, -1), hasta: sumarDias(inicio, esc.dias + 1),
  })
  const { sesion } = useSesion()

  const [plegados, setPlegados] = useState([])
  const [detalle, setDetalle] = useState(null)       // id de la reserva abierta
  const [arrastre, setArrastre] = useState(null)     // { id, modo, x0, dxDias, destino, dy }
  const [propuesta, setPropuesta] = useState(null)   // { reserva, cambios }
  const [nueva, setNueva] = useState(null)           // { habitacionId, llegada, noches, huesped, tipo, adultos }
  const movido = useRef(false)
  const ancla = useRef(null)                          // barra de la que cuelga el detalle

  /* ── Grupos y filas visibles ── */
  const grupos = useMemo(() => agruparHabitaciones(habitaciones, sesion?.propiedades ?? [], p.agrupar), [habitaciones, sesion, p.agrupar])
  const filasVisibles = grupos.filter(g => !plegados.includes(g.clave)).flatMap(g => g.habitaciones)

  const diasRango = Array.from({ length: esc.dias }, (_, i) => sumarDias(inicio, i))
  const hoyISO = aISO(hoy())
  const busca = p.q.trim().toLowerCase()

  const visibles = reservas.filter(r => (p.estado === 'todos' || r.estado === p.estado))

  /* ── Geometría de una barra (mediodía → mediodía, recortada al rango) ── */
  const geometria = r => {
    const izq = (dias(inicioISO, r.llegada) + 0.5) * celda + 2
    const der = (dias(inicioISO, r.salida) + 0.5) * celda - 2
    const a = Math.max(izq, 0), b = Math.min(der, ancho)
    return b <= a ? null : { left: a, width: b - a, cortaIzq: izq < 0, cortaDer: der > ancho }
  }

  const enVista = reservas.filter(geometria)
  const filtros = FILTROS.map(f => ({ ...f, count: f.value === 'todos' ? enVista.length : enVista.filter(r => r.estado === f.value).length }))

  /* ── Proponer un cambio: valida y pide confirmación ── */
  const proponer = (r, cambios) => {
    const siguiente = { ...r, ...cambios }
    if (dias(siguiente.llegada, siguiente.salida) < 1) return
    const choca = conflicto(reservas, siguiente)
    if (choca) {
      toast.error('No se puede mover ahí', { description: `Choca con ${choca.estado === 'bloqueo' ? 'un bloqueo de mantenimiento' : `la reserva de ${choca.huesped}`} (${corto(deISO(choca.llegada))} → ${corto(deISO(choca.salida))}).` })
      return
    }
    setPropuesta({ reserva: r, cambios })
  }

  // Las de otras plataformas son de la plataforma: no se arrastran ni se estiran (solo llegada y salida, en el detalle).
  const puedeMover = r => r.estado !== 'completada' && !deFuera(r)
  const soloEstirar = r => r.estado === 'en-curso' // su llegada ya pasó

  /* ── Arrastre con puntero (mover o estirar) ── */
  const empezar = (e, r, modo) => {
    if (!puedeMover(r) || e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    movido.current = false
    setArrastre({ id: r.id, modo, x0: e.clientX, y0: e.clientY, dxDias: 0, destino: r.habitacionId, dy: 0 })
  }
  const moverPuntero = e => {
    if (!arrastre) return
    const dxDias = Math.round((e.clientX - arrastre.x0) / celda)
    let destino = arrastre.destino, dy = 0
    if (arrastre.modo === 'mover') {
      const fila = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.dataset?.habitacion)
      if (fila) {
        destino = fila.dataset.habitacion
        const origen = document.querySelector(`[data-habitacion="${reservas.find(x => x.id === arrastre.id).habitacionId}"]`)
        dy = fila.getBoundingClientRect().top - origen.getBoundingClientRect().top
      }
    }
    if (Math.abs(e.clientX - arrastre.x0) > 4 || Math.abs(e.clientY - arrastre.y0) > 4) movido.current = true
    setArrastre(a => ({ ...a, dxDias, destino, dy }))
  }
  const soltar = () => {
    if (!arrastre) return
    const r = reservas.find(x => x.id === arrastre.id)
    const { dxDias, destino, modo } = arrastre
    setArrastre(null)
    if (!movido.current) return
    if (modo === 'estirar') {
      if (dxDias) proponer(r, { salida: aISO(sumarDias(deISO(r.salida), dxDias)) })
    } else if (dxDias || destino !== r.habitacionId) {
      const d = soloEstirar(r) ? 0 : dxDias
      if (soloEstirar(r) && dxDias) toast.info('Reserva en curso', { description: 'Solo se puede cambiar de habitación o ampliar la fecha de salida.' })
      if (d || destino !== r.habitacionId) {
        proponer(r, { habitacionId: destino, llegada: aISO(sumarDias(deISO(r.llegada), d)), salida: aISO(sumarDias(deISO(r.salida), d)) })
      }
    }
  }

  /* ── Teclado: flechas mueven, Shift+flechas estiran, arriba/abajo cambian de habitación ── */
  const teclado = (e, r) => {
    if (!puedeMover(r)) return
    const idx = filasVisibles.findIndex(h => h.id === r.habitacionId)
    const pasos = { ArrowLeft: -1, ArrowRight: 1 }
    if (e.key in pasos) {
      e.preventDefault()
      if (e.shiftKey) proponer(r, { salida: aISO(sumarDias(deISO(r.salida), pasos[e.key])) })
      else if (!soloEstirar(r)) proponer(r, { llegada: aISO(sumarDias(deISO(r.llegada), pasos[e.key])), salida: aISO(sumarDias(deISO(r.salida), pasos[e.key])) })
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const destino = filasVisibles[idx + (e.key === 'ArrowUp' ? -1 : 1)]
      if (destino) proponer(r, { habitacionId: destino.id })
    }
  }

  /* ── Clic en hueco libre → nueva reserva ── */
  const clicHueco = (e, hab) => {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left
    const llegada = aISO(sumarDias(inicio, Math.floor(x / celda)))
    setNueva({ habitacionId: hab.id, llegada, noches: 2, huesped: '', tipo: 'reserva', adultos: Math.min(2, hab.capacidad) })
  }
  const nuevaSalida = nueva ? aISO(sumarDias(deISO(nueva.llegada), nueva.noches)) : ''
  const nuevaChoca = nueva ? conflicto(reservas, { id: '', habitacionId: nueva.habitacionId, llegada: nueva.llegada, salida: nuevaSalida }) : null

  /* ── Ocupación de un grupo en un día ── */
  const ocupacion = (g, d) => {
    const iso = aISO(d)
    const n = g.habitaciones.filter(h => reservas.some(r => r.habitacionId === h.id && r.llegada <= iso && iso < r.salida)).length
    return { n, total: g.habitaciones.length }
  }

  const navegar = pasos => set({ desde: aISO(sumarDias(inicio, pasos * esc.dias)) }, { historial: true })
  const posHoy = (Date.now() - inicio.getTime()) / 86400000 * celda
  const habitacionDe = id => habitaciones.find(h => h.id === id)
  const rDetalle = detalle ? reservas.find(x => x.id === detalle) : null
  const resorte = reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 34 }

  // Lo de siempre: esqueleto la primera vez, error con "Reintentar".
  if (cargando && !habitaciones.length) return <EsqueletoLineaTiempo />
  if (error && !habitaciones.length) {
    return (
      <div className={s.contenedor} role="alert">
        <p className={s.formError}>{error.message}</p>
        <Button variant="outline" onClick={recargar}>Reintentar</Button>
      </div>
    )
  }
  if (!cargando && !habitaciones.length) {
    return <SinHabitaciones sesion={sesion} onNuevaHabitacion={onNuevaHabitacion} />
  }

  return (
    <div className={s.contenedor}>
      {/* ── Barra de herramientas ── */}
      <div className={s.barra}>
        <div className={s.barraFila}>
          <LiquidSegments options={Object.entries(ESCALAS).map(([value, e]) => ({ value, label: e.etiqueta }))} value={p.escala} onValueChange={v => set({ escala: v, desde: '' })} aria-label="Escala de tiempo" size="sm" />
          <GrupoPistas>
            <div className={s.nav}>
              <Pista contenido="Anterior"><Button variant="outline" size="icon" onClick={() => navegar(-1)} aria-label="Periodo anterior"><CaretLeftIcon size={16} weight="bold" /></Button></Pista>
              <Pista contenido="Volver a hoy"><Button variant="outline" onClick={() => set({ desde: '' }, { historial: true })}>Hoy</Button></Pista>
              <Pista contenido="Siguiente"><Button variant="outline" size="icon" onClick={() => navegar(1)} aria-label="Periodo siguiente"><CaretRightIcon size={16} weight="bold" /></Button></Pista>
            </div>
          </GrupoPistas>
          <span className={s.rango}>{corto(inicio)} → {corto(sumarDias(inicio, esc.dias - 1))} {inicio.getFullYear()}</span>
          <div className={s.derecha}>
            <LiquidSegments options={[{ value: 'propiedad', label: 'Propiedad' }, { value: 'tipo', label: 'Tipo' }]} value={p.agrupar}
              onValueChange={v => set({ agrupar: v })} aria-label="Agrupar por" size="sm" />
            <div className={s.buscador}>
              <MagnifyingGlassIcon size={16} className={s.buscadorIcono} aria-hidden="true" />
              <Input type="search" aria-label="Buscar huésped" placeholder="Buscar huésped" value={p.q}
                onChange={e => set({ q: e.target.value })} className="h-9 ps-7" />
            </div>
          </div>
        </div>
        <LiquidSegments options={filtros} value={p.estado} onValueChange={v => set({ estado: v })} aria-label="Filtrar por estado" size="sm" />
      </div>

      {/* ── Rejilla (scroll horizontal propio si no cabe) ── */}
      <div className={s.scroll} ref={cajaRef}>
        <div className={s.rejilla} style={{ '--celda': `${celda}px`, '--ancho': `${ancho}px` }}
          onPointerMove={moverPuntero} onPointerUp={soltar} onPointerCancel={() => setArrastre(null)}>

          {/* Cabecera de días */}
          <div className={s.cabecera}>
            <div className={`${s.columnaHab} ${s.cabeceraHab}`}><span>Habitación</span></div>
            <div className={s.dias}>
              {diasRango.map(d => {
                const iso = aISO(d)
                const finde = d.getDay() === 0 || d.getDay() === 6
                return (
                  <div key={iso} className={`${s.dia} ${iso === hoyISO ? s.diaHoy : ''} ${finde ? s.finde : ''}`}>
                    {(d.getDate() === 1 || iso === aISO(inicio)) && (
                      <span className={p.escala === 'mes' ? s.diaMesAngosto : s.diaMes}>{d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')}</span>
                    )}
                    {!(p.escala === 'mes' && (d.getDate() === 1 || iso === aISO(inicio))) && (
                      <span className={s.diaNombre}>{d.toLocaleDateString('es-MX', { weekday: p.escala === 'mes' ? 'narrow' : 'short' }).replace('.', '')}</span>
                    )}
                    <span className={s.diaNum}>{d.getDate()}</span>
                  </div>
                )
              })}
              {posHoy >= 0 && posHoy <= ancho && <span className={s.hoyCabeza} style={{ left: posHoy }} aria-hidden="true" />}
            </div>
          </div>

          {/* Grupos */}
          <AnimatePresence initial={false} mode="wait">
            <motion.div key={p.agrupar}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: reduceMotion ? 0 : 0.25 }}>
              {grupos.map(g => {
                const plegado = plegados.includes(g.clave)
                return (
                  <section key={g.clave} className={s.grupo}>
                    <div className={s.grupoFila}>
                      <button className={`${s.columnaHab} ${s.grupoTitulo}`} aria-expanded={!plegado}
                        onClick={() => setPlegados(x => plegado ? x.filter(k => k !== g.clave) : [...x, g.clave])}>
                        <motion.span animate={{ rotate: plegado ? -90 : 0 }} transition={resorte} className={s.chevron}><CaretDownIcon size={14} weight="bold" /></motion.span>
                        {g.flor && <Florecita color={g.flor} tamano={16} />}
                        <span className={s.grupoNombre}>{g.titulo}</span>
                        <span className={s.grupoCuenta}>{g.habitaciones.length}</span>
                      </button>
                      {/* Ocupación por día del grupo */}
                      <GrupoPistas>
                        <div className={s.dias}>
                          {diasRango.map(d => {
                            const { n, total } = ocupacion(g, d)
                            const pct = total ? n / total : 0
                            return (
                              <Pista key={aISO(d)} lado="top" className={s.ocupCelda}
                                contenido={`${corto(d)}: ${n} de ${total} ocupadas (${Math.round(pct * 100)}%)`}>
                                <span className={s.ocupCaja} tabIndex={0} aria-label={`${corto(d)}: ${Math.round(pct * 100)}% ocupado`}>
                                  <motion.span className={s.ocupBarra} initial={false} animate={{ scaleX: pct }} transition={resorte}
                                    data-nivel={pct >= 0.85 ? 'alto' : pct >= 0.5 ? 'medio' : 'bajo'} />
                                </span>
                              </Pista>
                            )
                          })}
                        </div>
                      </GrupoPistas>
                    </div>

                    <AnimatePresence initial={false}>
                      {!plegado && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                          style={{ overflow: 'hidden' }}
                        >
                          {g.habitaciones.map(hab => (
                            <div key={hab.id} className={s.fila}>
                              <div className={s.columnaHab}>
                                <span className={s.habNombre}>{hab.name}</span>
                                <span className={s.habTipo}>
                                  {hab.type}
                                  {hab.status === 'maintenance' && <WrenchIcon size={12} weight="bold" aria-label="En mantenimiento" />}
                                </span>
                              </div>
                              {/* Pista de la fila: hueco clicable + barras */}
                              <div className={s.pista} data-habitacion={hab.id} onClick={e => clicHueco(e, hab)}
                                role="presentation" title="Clic en un hueco libre para crear una reserva">
                                {diasRango.map(d => (
                                  <span key={aISO(d)} className={`${s.celda} ${aISO(d) === hoyISO ? s.celdaHoy : ''} ${d.getDay() === 0 || d.getDay() === 6 ? s.finde : ''}`} />
                                ))}
                                {posHoy >= 0 && posHoy <= ancho && <span className={s.hoyLinea} style={{ left: posHoy }} aria-hidden="true" />}

                                {visibles.filter(r => r.habitacionId === hab.id).map(r => {
                                  const geo = geometria(r)
                                  if (!geo) return null
                                  const enArrastre = arrastre?.id === r.id
                                  const coincide = !busca || r.huesped.toLowerCase().includes(busca)
                                  const dx = enArrastre && arrastre.modo === 'mover' && !soloEstirar(r) ? arrastre.dxDias * celda : 0
                                  const extra = enArrastre && arrastre.modo === 'estirar' ? arrastre.dxDias * celda : 0
                                  const noches = dias(r.llegada, r.salida)
                                  return (
                                    <motion.button
                                      key={r.id}
                                      className={`${s.reserva} ${s[`est-${r.estado}`]} ${deFuera(r) ? s.deFuera : ''} ${geo.cortaIzq ? s.cortaIzq : ''} ${geo.cortaDer ? s.cortaDer : ''} ${enArrastre ? s.arrastrando : ''} ${coincide ? '' : s.atenuada} ${busca && coincide ? s.resaltada : ''}`}
                                      initial={false}
                                      animate={{ left: geo.left, width: Math.max(geo.width + extra, celda * 0.5) }}
                                      transition={enArrastre ? { duration: 0 } : resorte}
                                      style={{ transform: enArrastre ? `translate(${dx}px, ${arrastre.dy}px)` : undefined }}
                                      onPointerDown={e => empezar(e, r, 'mover')}
                                      onClick={e => {
                                        e.stopPropagation()
                                        if (movido.current) { movido.current = false; return }
                                        ancla.current = e.currentTarget
                                        setDetalle(d => (d === r.id ? null : r.id))
                                      }}
                                      aria-haspopup="dialog"
                                      aria-expanded={detalle === r.id}
                                      onKeyDown={e => teclado(e, r)}
                                      aria-label={`${r.huesped}, ${hab.name}, ${corto(deISO(r.llegada))} a ${corto(deISO(r.salida))}, ${ESTADOS[r.estado]}.${deFuera(r) ? ` Viene de ${FUENTES[r.fuente]}: solo se marca llegada y salida.` : ' Flechas para mover, Shift más flechas para cambiar noches.'}`}
                                    >
                                      <span className={s.reservaNombre}>{r.huesped}</span>
                                      {deFuera(r) && <span className={s.fuente}>{FUENTES[r.fuente]}</span>}
                                      {!deFuera(r) && geo.width > 150 && <span className={s.reservaSub}>{noches} noche{noches !== 1 ? 's' : ''}</span>}
                                      {puedeMover(r) && (
                                        <span className={s.asa} aria-hidden="true" onPointerDown={e => empezar(e, r, 'estirar')} />
                                      )}
                                    </motion.button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                )
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Detalle: UN Popover para todas las barras (uno por barra hacía lento el
           cambio de vista), anclado a la barra pulsada ── */}
      <Popover open={!!rDetalle} onOpenChange={(o, d) => {
        // Pulsar la misma barra lo cierra su propio clic, no el "clic afuera".
        if (!o && !(d.reason === 'outside-press' && ancla.current?.contains(d.event.target))) setDetalle(null)
      }}>
        {rDetalle && (() => {
          const r = rDetalle, hab = habitacionDe(r.habitacionId), noches = dias(r.llegada, r.salida)
          return (
            <PopoverPopup className="w-72" align="start" anchor={ancla} finalFocus={ancla}>
              <div className={s.detalle}>
                <span className={s.leyendaItem}><span className={`${s.muestra} ${s[`est-${r.estado}`]}`} />{ESTADOS[r.estado]}</span>
                {deFuera(r) && <Badge variant="outline" className="w-fit">{FUENTES[r.fuente]}</Badge>}
                <div className={s.detalleNombre}>{r.huesped}</div>
                <div className={s.detalleDato}>{hab.name}, {hab.type}</div>
                <div className={s.detalleDato}>{corto(deISO(r.llegada))} → {corto(deISO(r.salida))}, {noches} noche{noches !== 1 ? 's' : ''}</div>
                {r.estado !== 'bloqueo' && !deFuera(r) && (
                  <>
                    <div className={s.detalleTotal}>MXN ${(r.total / 100).toLocaleString('es-MX')}</div>
                    <div className={s.detalleDato}>
                      {r.codigo}. {r.porCobrar > 0 ? `Por cobrar: MXN $${(r.porCobrar / 100).toLocaleString('es-MX')}` : 'Pagada'}
                    </div>
                  </>
                )}
                <p className={s.detalleAyuda}>
                  {deFuera(r) ? `Viene de ${FUENTES[r.fuente]}. Los cambios y los cobros se hacen en esa plataforma; aquí solo se registra su llegada y su salida.` : puedeMover(r) ? 'Arrástrala para moverla, estira su borde derecho para cambiar noches, o usa las flechas del teclado.' : 'Estancia completada: no se puede modificar.'}
                </p>
                <Button size="sm" onClick={() => { setDetalle(null); set({ reserva: r.id }, { historial: true }) }}>
                  Ver detalle, pagos y acciones
                </Button>
              </div>
            </PopoverPopup>
          )
        })()}
      </Popover>

      <DetalleReserva reservaId={p.reserva || null} onCerrar={() => set({ reserva: '' })} onCambio={recargar} />

      {/* ── Leyenda ── */}
      <div className={s.leyenda}>
        {['confirmada', 'pendiente', 'en-curso', 'completada', 'bloqueo'].map(e => (
          <span key={e} className={s.leyendaItem}><span className={`${s.muestra} ${s[`est-${e}`]}`} />{ESTADOS[e]}</span>
        ))}
        <span className={s.leyendaAyuda}>Arrastra para mover. Estira el borde para cambiar noches. Clic en un hueco para crear.</span>
      </div>

      {/* ── Confirmar cambio: el antes y el después a la vista (ConfirmarRiesgo, riesgo medio) ── */}
      {(() => {
        if (!propuesta) return <ConfirmarRiesgo abierto={false} onConfirmar={() => {}} onCancelar={() => {}} />
        const { reserva: r, cambios } = propuesta
        const sig = { ...r, ...cambios }
        const hA = habitacionDe(r.habitacionId), hB = habitacionDe(sig.habitacionId)
        const nA = dias(r.llegada, r.salida), nB = dias(sig.llegada, sig.salida)
        const linea = (h, x, n) => `${h.name}, ${corto(deISO(x.llegada))} → ${corto(deISO(x.salida))} (${n} noche${n !== 1 ? 's' : ''})`
        return (
          <ConfirmarRiesgo
            abierto
            riesgo="medio"
            titulo={`¿Aplicar el cambio a la reserva de ${r.huesped}?`}
            cambio={{ antes: linea(hA, r, nA), despues: linea(hB, sig, nB) }}
            consecuencias={[
              ...(nA !== nB ? [`El total se ajusta en proporción: de ${nA} a ${nB} noche${nB !== 1 ? 's' : ''}, con la tarifa que se pactó.`] : []),
              ...(hA.id !== hB.id ? [`La habitación ${hA.name} queda libre esas noches.`] : []),
              'Quien tenga el panel abierto ve el cambio al momento.',
            ]}
            deshacer="Puedes volver a moverla o cambiar sus noches desde el calendario."
            accion="Aplicar cambio"
            onConfirmar={async () => {
              const fallo = await mover(r, cambios)
              if (fallo) toast.error('No se aplicó el cambio', { description: fallo.message })
              else toast.success('Reserva actualizada', { description: `${r.huesped}, ${hB.name}.` })
            }}
            onCancelar={() => setPropuesta(null)}
          />
        )
      })()}

      {/* ── Nueva reserva rápida: entra desde la derecha. Una reserva SIGUE en el formulario
          completo (forma de pago y abono), con todo lo de aquí ya puesto; el mantenimiento se
          bloquea aquí mismo. Arriba, el estado vivo (como el Delivery Tracker de devl): las fechas
          en grande, una frase que dice qué falta y los pasos que se van llenando. ── */}
      <Sheet open={!!nueva} onOpenChange={o => { if (!o) setNueva(null) }}>
        <SheetPopup closeProps={{ 'aria-label': 'Cerrar' }}>
          {nueva && (() => {
            const hab = habitacionDe(nueva.habitacionId)
            const bloqueo = nueva.tipo === 'bloqueo'
            const listo = bloqueo || nueva.huesped.trim().length >= 2
            const llenos = listo ? 2 : 1 // pasos completos: fechas y, con nombre, el huésped
            const fase = nuevaChoca
              ? `Choca con ${nuevaChoca.estado === 'bloqueo' ? 'un bloqueo de mantenimiento' : `la reserva de ${nuevaChoca.huesped}`}. Reduce las noches o elige otro día.`
              : bloqueo ? 'Esas noches quedan fuera de venta mientras dure el mantenimiento.'
                : listo ? 'En el siguiente paso registras la forma de pago y si el cliente dejó un abono.'
                  : 'Escribe el nombre del huésped para continuar.'
            const entra = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, filter: 'blur(2px)' }
            return (
              <form className={s.hojaForm} onSubmit={async e => {
                e.preventDefault()
                if (!listo || nuevaChoca) return
                if (!bloqueo) {
                  onNuevaReserva?.({
                    propiedad: hab.propiedadId, habitacion: hab.id, llegada: nueva.llegada, salida: nuevaSalida,
                    huesped: nueva.huesped.trim(), adultos: nueva.adultos,
                  })
                  setNueva(null)
                  return
                }
                const fallo = await crear({ tipo: 'bloqueo', habitacion_id: hab.id, llegada: nueva.llegada, salida: nuevaSalida, notas: nueva.huesped.trim() || 'Mantenimiento' })
                if (fallo) { toast.error('No se bloquearon las fechas', { description: fallo.message }); return }
                toast.success('Fechas bloqueadas', { description: `${nueva.huesped.trim() || 'Mantenimiento'}, ${hab.name}.` })
                setNueva(null)
              }}>
                <SheetHeader>
                  <SheetTitle>{bloqueo ? 'Bloquear fechas' : 'Nueva reserva'}</SheetTitle>
                  <SheetDescription>{hab.name}. {fichaHabitacion({ tipo: hab.type, cama: hab.cama, capacidad: hab.capacidad })}.</SheetDescription>
                </SheetHeader>
                <SheetPanel className={s.hojaCuerpo}>
                  <section className={s.hojaEstado} aria-live="polite">
                    <span className={s.hojaEtiqueta}>{bloqueo ? 'Fuera de venta' : 'Estancia'}</span>
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.span key={nuevaSalida} className={s.hojaCifra} initial={entra}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
                        {corto(deISO(nueva.llegada))} → {corto(deISO(nuevaSalida))}
                      </motion.span>
                    </AnimatePresence>
                    <span className={s.hojaSub}>
                      {nueva.noches} noche{nueva.noches !== 1 ? 's' : ''}{bloqueo ? '' : `, ${nueva.adultos} persona${nueva.adultos !== 1 ? 's' : ''}`}
                    </span>
                    <AnimatePresence initial={false} mode="popLayout">
                      <motion.p key={fase} className={nuevaChoca ? s.formError : s.formAyuda} role={nuevaChoca ? 'alert' : undefined}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                        {fase}
                      </motion.p>
                    </AnimatePresence>
                    {!bloqueo && (
                      <ol className={s.etapas} aria-label="Pasos de la reserva">
                        {['Fechas', 'Huésped', 'Pago y confirmación'].map((t, i) => (
                          <li key={t} className={s.etapa}>
                            <span className={s.etapaBarra}>
                              <motion.span className={s.etapaRelleno} initial={false} transition={resorte}
                                animate={{ scaleX: i < llenos ? 1 : i === llenos ? 0.35 : 0 }} />
                            </span>
                            <span aria-current={i === llenos ? 'step' : undefined} className={i <= llenos ? s.etapaActiva : s.etapaPendiente}>{t}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>

                  <section className={s.formulario}>
                    <LiquidSegments options={[{ value: 'reserva', label: 'Reserva' }, { value: 'bloqueo', label: 'Mantenimiento' }]} value={nueva.tipo}
                      onValueChange={v => setNueva(n => ({ ...n, tipo: v }))} aria-label="Tipo" size="sm" />
                    <div className="grid gap-2">
                      <Label htmlFor="lt-huesped">{bloqueo ? 'Motivo' : 'Huésped'}</Label>
                      <Input id="lt-huesped" autoFocus value={nueva.huesped} maxLength={120}
                        placeholder={bloqueo ? 'Ej. Pintura, plomería' : 'Nombre completo'}
                        onChange={e => setNueva(n => ({ ...n, huesped: e.target.value }))} size="lg" />
                    </div>
                  </section>

                  <section className={s.formFila}>
                    <div className="grid gap-2">
                      <span className="text-sm font-medium" id="lt-noches">Noches</span>
                      <div className={s.contador} role="group" aria-labelledby="lt-noches">
                        <Button type="button" variant="outline" size="icon" aria-label="Menos noches" disabled={nueva.noches <= 1}
                          onClick={() => setNueva(n => ({ ...n, noches: n.noches - 1 }))}><MinusIcon size={14} weight="bold" /></Button>
                        <span className={s.contadorValor}>{nueva.noches}</span>
                        <Button type="button" variant="outline" size="icon" aria-label="Más noches" disabled={nueva.noches >= 30}
                          onClick={() => setNueva(n => ({ ...n, noches: n.noches + 1 }))}><PlusIcon size={14} weight="bold" /></Button>
                      </div>
                    </div>
                    {!bloqueo && (
                      <div className="grid gap-2">
                        <span className="text-sm font-medium" id="lt-personas">Personas (hasta {hab.capacidad})</span>
                        <div className={s.contador} role="group" aria-labelledby="lt-personas">
                          <Button type="button" variant="outline" size="icon" aria-label="Menos personas" disabled={nueva.adultos <= 1}
                            onClick={() => setNueva(n => ({ ...n, adultos: n.adultos - 1 }))}><MinusIcon size={14} weight="bold" /></Button>
                          <span className={s.contadorValor}>{nueva.adultos}</span>
                          <Button type="button" variant="outline" size="icon" aria-label="Más personas" disabled={nueva.adultos >= hab.capacidad}
                            onClick={() => setNueva(n => ({ ...n, adultos: n.adultos + 1 }))}><PlusIcon size={14} weight="bold" /></Button>
                        </div>
                      </div>
                    )}
                  </section>
                </SheetPanel>
                <SheetFooter>
                  <Button type="button" variant="outline" onClick={() => setNueva(null)}>Cancelar</Button>
                  <DropletButton type="submit" disabled={!listo || !!nuevaChoca}>
                    {bloqueo ? 'Bloquear fechas' : 'Continuar al pago'}
                  </DropletButton>
                </SheetFooter>
              </form>
            )
          })()}
        </SheetPopup>
      </Sheet>
    </div>
  )
}

/** Sin habitaciones no hay filas: en vez de una rejilla en blanco, qué pasa y qué hacer. */
function SinHabitaciones({ sesion, onNuevaHabitacion }) {
  const { propiedadId } = usePropiedadActual()
  const propiedad = sesion?.propiedades?.find(p => p.id === propiedadId)
  const puede = sesion?.permisos?.includes('habitaciones.editar')
  return (
    <section className={s.vacio} role="status" aria-labelledby="lt-vacio">
      <CoronaFlores className={s.vacioCorona} />
      <h2 id="lt-vacio" className={s.vacioTitulo}>
        {propiedad ? `${propiedad.nombre} todavía no tiene habitaciones` : 'Todavía no hay habitaciones'}
      </h2>
      <p className={s.vacioTexto}>
        La línea de tiempo muestra una fila por habitación. Cuando estén dadas de alta, aquí verás sus
        reservas y podrás crear una nueva con un clic en el día.
      </p>
      {puede
        ? onNuevaHabitacion && (
          <DropletButton type="button" onClick={onNuevaHabitacion}>
            <PlusIcon size={16} weight="bold" aria-hidden="true" /> Agregar habitación
          </DropletButton>
        )
        : <p className={s.vacioTexto}>Pide a un gerente o al dueño que las dé de alta.</p>}
    </section>
  )
}

/*
 * Esqueleto con la silueta EXACTA de la vista: mismas clases del módulo, la
 * escala y el agrupamiento de la URL (mismas columnas, grupos y filas), así
 * que al terminar de cargar nada salta de lugar.
 */
const pastilla = { borderRadius: 'var(--radius-full)' }
// Sin habitaciones conocidas todavía (primera carga): una silueta genérica.
const SILUETA = [{ clave: 'a', habitaciones: [1, 2, 3, 4].map(id => ({ id })) }, { clave: 'b', habitaciones: [5, 6, 7].map(id => ({ id })) }]
export function EsqueletoLineaTiempo() {
  const [p] = useParametros({ escala: 'semana', agrupar: 'propiedad' })
  const { sesion } = useSesion()
  const conocidas = habitacionesConocidas()
  const esc = ESCALAS[p.escala] ?? ESCALAS.semana
  const [cajaRef, celda] = useCelda(esc)
  const ancho = esc.dias * celda
  const celdas = Array.from({ length: esc.dias }, (_, i) => i)
  let fila = 0
  return (
    <div className={s.contenedor} role="status" aria-label="Cargando la línea de tiempo">
      <div className={s.barra}>
        <div className={s.barraFila}>
          <Skeleton width="200px" height="32px" style={pastilla} />
          <div className={s.nav}>
            <Skeleton variant="circle" width="36px" height="36px" />
            <Skeleton width="58px" height="36px" style={pastilla} />
            <Skeleton variant="circle" width="36px" height="36px" />
          </div>
          <Skeleton width="170px" height="22px" />
          <div className={s.derecha}>
            <Skeleton width="150px" height="32px" style={pastilla} />
            <div className={s.buscador}><Skeleton height="36px" style={pastilla} /></div>
          </div>
        </div>
        <Skeleton width="min(480px, 100%)" height="32px" style={pastilla} />
      </div>

      <div className={s.scroll} ref={cajaRef}>
        <div className={s.rejilla} style={{ '--celda': `${celda}px`, '--ancho': `${ancho}px` }}>
          <div className={s.cabecera}>
            <div className={`${s.columnaHab} ${s.cabeceraHab}`}><Skeleton width="84px" height="11px" /></div>
            <div className={s.dias}>
              {celdas.map(i => (
                <div key={i} className={s.dia}>
                  <Skeleton width={celda > 60 ? '34px' : '12px'} height="10px" />
                  <Skeleton width="24px" height="20px" style={{ marginTop: 4 }} />
                </div>
              ))}
            </div>
          </div>
          {(conocidas ? agruparHabitaciones(conocidas, sesion?.propiedades ?? [], p.agrupar) : SILUETA).map(g => (
            <section key={g.clave} className={s.grupo}>
              <div className={s.grupoFila}>
                <div className={`${s.columnaHab} ${s.grupoTitulo}`} style={{ cursor: 'default' }}><Skeleton width="72%" height="14px" /></div>
                <div className={s.dias}>
                  {celdas.map(i => <span key={i} className={s.ocupCelda}><span className={s.ocupCaja} /></span>)}
                </div>
              </div>
              {g.habitaciones.map(h => {
                const k = fila++
                return (
                  <div key={h.id} className={s.fila}>
                    <div className={s.columnaHab}>
                      <Skeleton width={`${62 + ((k * 13) % 25)}%`} height="13px" />
                      <Skeleton width="38%" height="10px" style={{ marginTop: 6 }} />
                    </div>
                    <div className={s.pista} style={{ cursor: 'default' }}>
                      {celdas.map(i => <span key={i} className={s.celda} />)}
                      <Skeleton
                        width={`${Math.min(ancho * 0.45, celda * (1.6 + (k % 3)))}px`}
                        height="36px"
                        style={{ borderRadius: 8, position: 'absolute', top: 8, left: `${((k * 29) % 55) / 100 * ancho + celda * 0.5}px` }}
                      />
                    </div>
                  </div>
                )
              })}
            </section>
          ))}
        </div>
      </div>
      <Skeleton width="min(520px, 100%)" height="14px" />
    </div>
  )
}

