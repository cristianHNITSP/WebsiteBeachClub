import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { CaretLeftIcon, CaretRightIcon, CaretDownIcon, MagnifyingGlassIcon, PlusIcon, MinusIcon, WrenchIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import RubberSegment from '@/components/bits/RubberSegment'
import JellyRadio from '@/components/bits/JellyRadio'
import Selector from '@/components/marca/Selector'
import Pista, { GrupoPistas } from '@/components/marca/Pista'
import { useParametros } from '@/hooks/useParametros'
import Skeleton from '@/components/frida/Skeleton'
import { useTheme } from '@/context/ThemeContext'
import { aISO, deISO } from '@/lib/fechas'
import { ESTADOS, useReservas, conflicto, hoy, sumarDias, dias, habitacionesConocidas } from '../reservas'
import { useSesion } from '@/lib/sesion'
import { usePedido } from '@/hooks/usePedido'
import { escucharEventos } from '@/lib/eventos'
import { externasApi, nombreCanal } from '../externas'
import { usePropiedadActual } from '../propiedadActual'
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
  semana: { dias: 7,  celda: 136, antes: 1, etiqueta: 'Semana' },
  mes:    { dias: 30, celda: 46,  antes: 3, etiqueta: 'Mes' },
}
// Grupos de filas: los usa la vista y su esqueleto (mismas filas, misma altura).
const agruparHabitaciones = (habitaciones, propiedades, agrupar) => {
  if (agrupar === 'tipo') {
    const tipos = [...new Set(habitaciones.map(h => h.type))]
    return tipos.map(t => ({ clave: t, titulo: t, habitaciones: habitaciones.filter(h => h.type === t) }))
  }
  return propiedades
    .map(pr => ({ clave: pr.clave, titulo: `${pr.nombre}, ${pr.lugar.split(',')[0]}`, habitaciones: habitaciones.filter(h => h.propiedadId === pr.id) }))
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
const iniciales = n => n.split(' ').map(p => p[0]).slice(0, 2).join('')

export default function LineaTiempo() {
  const { reduceMotion } = useTheme()
  // ?reserva=<id>: el detalle abierto también vive en la URL (recargar lo conserva).
  const [p, set] = useParametros({ escala: 'semana', desde: '', agrupar: 'propiedad', estado: 'todos', q: '', reserva: '' })
  const esc = ESCALAS[p.escala] ?? ESCALAS.semana
  const inicio = deISO(p.desde) ?? sumarDias(hoy(), -esc.antes)
  const inicioISO = aISO(inicio)
  const ancho = esc.dias * esc.celda
  // Lo visible y un día de cada lado (las barras que entran o salen del borde).
  const { habitaciones, reservas, cargando, error, recargar, mover, crear } = useReservas({
    desde: sumarDias(inicio, -1), hasta: sumarDias(inicio, esc.dias + 1),
  })
  const { sesion } = useSesion()

  // Reservas de otras plataformas (iCal): barras de solo lectura en su habitación.
  const { propiedadId } = usePropiedadActual()
  const veExternas = Boolean(sesion?.permisos?.includes('externas.ver'))
  const ventana = { desde: aISO(sumarDias(inicio, -1)), hasta: aISO(sumarDias(inicio, esc.dias + 1)) }
  const externas = usePedido(
    senal => (veExternas ? externasApi.reservas({ ...ventana, propiedad: propiedadId }, senal) : null),
    [veExternas, ventana.desde, ventana.hasta, propiedadId],
  )
  const recargarExternas = externas.recargar
  useEffect(() => escucharEventos(m => { if (m.agregado === 'externas') recargarExternas() }), [recargarExternas])

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
    const izq = (dias(inicioISO, r.llegada) + 0.5) * esc.celda + 2
    const der = (dias(inicioISO, r.salida) + 0.5) * esc.celda - 2
    const a = Math.max(izq, 0), b = Math.min(der, ancho)
    return b <= a ? null : { left: a, width: b - a, cortaIzq: izq < 0, cortaDer: der > ancho }
  }

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

  const puedeMover = r => r.estado !== 'completada'
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
    const dxDias = Math.round((e.clientX - arrastre.x0) / esc.celda)
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
      if (soloEstirar(r) && dxDias) toast.info('Esta reserva ya está en curso', { description: 'Solo se puede cambiar de habitación o estirar su salida.' })
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
    const llegada = aISO(sumarDias(inicio, Math.floor(x / esc.celda)))
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
  const posHoy = (Date.now() - inicio.getTime()) / 86400000 * esc.celda
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

  return (
    <div className={s.contenedor}>
      {/* ── Barra de herramientas ── */}
      <div className={s.barra}>
        <div className={s.barraFila}>
          <RubberSegment
            items={Object.entries(ESCALAS).map(([value, e]) => ({ value, label: e.etiqueta }))}
            value={p.escala}
            onChange={v => set({ escala: v, desde: '' })}
            aria-label="Escala de tiempo"
            size="sm"
            radius={999}
            trackColor="var(--muted)"
            thumbColor="var(--primary)"
            textColor="var(--muted-foreground)"
            activeTextColor="var(--primary-foreground)"
          />
          <GrupoPistas>
            <div className={s.nav}>
              <Pista contenido="Anterior"><Button variant="outline" size="icon" onClick={() => navegar(-1)} aria-label="Periodo anterior"><CaretLeftIcon size={16} weight="bold" /></Button></Pista>
              <Pista contenido="Volver a hoy"><Button variant="outline" onClick={() => set({ desde: '' }, { historial: true })}>Hoy</Button></Pista>
              <Pista contenido="Siguiente"><Button variant="outline" size="icon" onClick={() => navegar(1)} aria-label="Periodo siguiente"><CaretRightIcon size={16} weight="bold" /></Button></Pista>
            </div>
          </GrupoPistas>
          <span className={s.rango}>{corto(inicio)} → {corto(sumarDias(inicio, esc.dias - 1))} {inicio.getFullYear()}</span>
          <div className={s.agrupar}>
            <Selector
              ariaLabel="Agrupar por"
              value={p.agrupar}
              onChange={v => set({ agrupar: v })}
              opciones={[{ value: 'propiedad', label: 'Por propiedad' }, { value: 'tipo', label: 'Por tipo' }]}
            />
          </div>
        </div>
        <div className={s.barraFila}>
          <JellyRadio
            items={FILTROS}
            value={p.estado}
            onChange={v => set({ estado: v })}
            ariaLabel="Filtrar por estado"
            size="sm"
            chipColor="var(--muted)"
            activeColor="var(--primary)"
            textColor="var(--muted-foreground)"
            activeTextColor="var(--primary-foreground)"
          />
          <div className={s.buscador}>
            <MagnifyingGlassIcon size={16} className={s.buscadorIcono} aria-hidden="true" />
            <Input type="search" aria-label="Buscar huésped" placeholder="Buscar huésped" value={p.q}
              onChange={e => set({ q: e.target.value })} className="h-9 pl-9" />
          </div>
        </div>
      </div>

      {/* ── Rejilla (scroll horizontal propio si no cabe) ── */}
      <div className={s.scroll}>
        <div className={s.rejilla} style={{ '--celda': `${esc.celda}px`, '--ancho': `${ancho}px` }}
          onPointerMove={moverPuntero} onPointerUp={soltar} onPointerCancel={() => setArrastre(null)}>

          {/* Cabecera de días */}
          <div className={s.cabecera}>
            <div className={`${s.columnaHab} ${s.cabeceraHab}`}><span className="rotulo">Habitación</span></div>
            <div className={s.dias}>
              {diasRango.map(d => {
                const iso = aISO(d)
                const finde = d.getDay() === 0 || d.getDay() === 6
                return (
                  <div key={iso} className={`${s.dia} ${iso === hoyISO ? s.diaHoy : ''} ${finde ? s.finde : ''}`}>
                    {(d.getDate() === 1 || iso === aISO(inicio)) && (
                      <span className={s.diaMes}>{d.toLocaleDateString('es-MX', { month: 'short' })}</span>
                    )}
                    <span className={s.diaNombre}>{d.toLocaleDateString('es-MX', { weekday: p.escala === 'mes' ? 'narrow' : 'short' })}</span>
                    <span className={s.diaNum}>{d.getDate()}</span>
                  </div>
                )
              })}
              {posHoy >= 0 && posHoy <= ancho && <span className={s.hoyCabeza} style={{ left: posHoy }} aria-hidden="true" />}
            </div>
          </div>

          {/* Grupos */}
          <AnimatePresence initial={false} mode="wait">
            <motion.div key={`${p.escala}-${inicioISO}-${p.agrupar}`}
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
                                  <motion.span className={s.ocupBarra} initial={false} animate={{ scaleY: pct }} transition={resorte}
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
                                  const dx = enArrastre && arrastre.modo === 'mover' && !soloEstirar(r) ? arrastre.dxDias * esc.celda : 0
                                  const extra = enArrastre && arrastre.modo === 'estirar' ? arrastre.dxDias * esc.celda : 0
                                  const noches = dias(r.llegada, r.salida)
                                  return (
                                    <motion.button
                                      key={r.id}
                                      className={`${s.reserva} ${s[`est-${r.estado}`]} ${geo.cortaIzq ? s.cortaIzq : ''} ${geo.cortaDer ? s.cortaDer : ''} ${enArrastre ? s.arrastrando : ''} ${coincide ? '' : s.atenuada} ${busca && coincide ? s.resaltada : ''}`}
                                      initial={false}
                                      animate={{ left: geo.left, width: Math.max(geo.width + extra, esc.celda * 0.5) }}
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
                                      aria-label={`${r.huesped}, ${hab.name}, ${corto(deISO(r.llegada))} a ${corto(deISO(r.salida))}, ${ESTADOS[r.estado]}. Flechas para mover, Shift más flechas para cambiar noches.`}
                                    >
                                      {r.estado !== 'bloqueo' && <span className={s.avatar} aria-hidden="true">{iniciales(r.huesped)}</span>}
                                      <span className={s.reservaTexto}>
                                        <span className={s.reservaNombre}>{r.huesped}</span>
                                        {geo.width > 110 && <span className={s.reservaSub}>{noches} noche{noches !== 1 ? 's' : ''}</span>}
                                      </span>
                                      {puedeMover(r) && (
                                        <span className={s.asa} aria-hidden="true" onPointerDown={e => empezar(e, r, 'estirar')} />
                                      )}
                                    </motion.button>
                                  )
                                })}
                                {(externas.datos ?? []).filter(x => x.habitacion_id === hab.id && x.estado === 'vigente').map(x => {
                                  const geo = geometria(x)
                                  if (!geo) return null
                                  const texto = `Reserva de ${nombreCanal(x.canal)}${x.titulo ? ` (${x.titulo})` : ''}: ${corto(deISO(x.llegada))} → ${corto(deISO(x.salida))}. Solo consulta.`
                                  return (
                                    <span key={x.id} className={`${s.externa} ${x.choca ? s.externaChoca : ''}`} role="img" aria-label={texto} title={texto}
                                      style={{ left: geo.left, width: Math.max(geo.width, esc.celda * 0.5) }} onClick={e => e.stopPropagation()}>
                                      <span className={s.reservaNombre}>{nombreCanal(x.canal)}</span>
                                      {geo.width > 110 && <span className={s.reservaSub}>{x.choca ? 'Choca con una propia' : 'Solo consulta'}</span>}
                                    </span>
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
      <Popover open={!!rDetalle} onOpenChange={o => { if (!o) setDetalle(null) }}>
        <PopoverAnchor virtualRef={ancla} />
        {rDetalle && (() => {
          const r = rDetalle, hab = habitacionDe(r.habitacionId), noches = dias(r.llegada, r.salida)
          return (
            <PopoverContent className="w-72" align="start" onCloseAutoFocus={e => { e.preventDefault(); ancla.current?.focus() }}
              onInteractOutside={e => { if (ancla.current?.contains(e.target)) e.preventDefault() }}>
              <div className={s.detalle}>
                <span className={`status-badge ${r.estado === 'confirmada' || r.estado === 'en-curso' ? 'status-badge--active' : 'status-badge--maintenance'}`}>{ESTADOS[r.estado]}</span>
                <div className={s.detalleNombre}>{r.huesped}</div>
                <div className={s.detalleDato}>{hab.name}, {hab.type}</div>
                <div className={s.detalleDato}>{corto(deISO(r.llegada))} → {corto(deISO(r.salida))}, {noches} noche{noches !== 1 ? 's' : ''}</div>
                {r.estado !== 'bloqueo' && (
                  <>
                    <div className={s.detalleTotal}>MXN ${(r.total / 100).toLocaleString('es-MX')}</div>
                    <div className={s.detalleDato}>
                      {r.codigo}. {r.porCobrar > 0 ? `Por cobrar: MXN $${(r.porCobrar / 100).toLocaleString('es-MX')}` : 'Pagada'}
                    </div>
                  </>
                )}
                <p className={s.detalleAyuda}>
                  {puedeMover(r) ? 'Arrástrala para moverla, estira su borde derecho para cambiar noches, o usa las flechas del teclado.' : 'Estancia completada: no se puede modificar.'}
                </p>
                <Button size="sm" onClick={() => { setDetalle(null); set({ reserva: r.id }, { historial: true }) }}>
                  Ver detalle, pagos y acciones
                </Button>
              </div>
            </PopoverContent>
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

      {/* ── Confirmar cambio ── */}
      <AlertDialog open={!!propuesta} onOpenChange={o => { if (!o) setPropuesta(null) }}>
        <AlertDialogContent>
          {propuesta && (() => {
            const { reserva: r, cambios } = propuesta
            const sig = { ...r, ...cambios }
            const hA = habitacionDe(r.habitacionId), hB = habitacionDe(sig.habitacionId)
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Aplicar el cambio a la reserva de {r.huesped}?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className={s.cambio}>
                      <div><span className="rotulo">Antes</span>{hA.name}, {corto(deISO(r.llegada))} → {corto(deISO(r.salida))} ({dias(r.llegada, r.salida)} noches)</div>
                      <div><span className="rotulo">Después</span>{hB.name}, {corto(deISO(sig.llegada))} → {corto(deISO(sig.salida))} ({dias(sig.llegada, sig.salida)} noches)</div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => {
                    const fallo = await mover(r, cambios)
                    if (fallo) toast.error('No se aplicó el cambio', { description: fallo.message })
                    else toast.success('Reserva actualizada', { description: `${r.huesped}, ${hB.name}.` })
                  }}>
                    Aplicar cambio
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            )
          })()}
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Nueva reserva rápida ── */}
      <Dialog open={!!nueva} onOpenChange={o => { if (!o) setNueva(null) }}>
        <DialogContent>
          {nueva && (
            <form onSubmit={async e => {
              e.preventDefault()
              const bloqueo = nueva.tipo === 'bloqueo'
              if ((!bloqueo && !nueva.huesped.trim()) || nuevaChoca) return
              const base = { tipo: nueva.tipo, habitacion_id: nueva.habitacionId, llegada: nueva.llegada, salida: nuevaSalida }
              const fallo = await crear(bloqueo
                ? { ...base, notas: nueva.huesped.trim() || 'Mantenimiento' }
                : { ...base, huesped_nombre: nueva.huesped.trim(), adultos: nueva.adultos })
              if (fallo) { toast.error('No se creó', { description: fallo.message }); return }
              toast.success(bloqueo ? 'Fechas bloqueadas' : 'Reserva creada', { description: `${nueva.huesped.trim() || 'Mantenimiento'}, ${habitacionDe(nueva.habitacionId).name}.` })
              setNueva(null)
            }}>
              <DialogHeader>
                <DialogTitle>{nueva.tipo === 'bloqueo' ? 'Bloquear fechas' : 'Nueva reserva'}</DialogTitle>
                <DialogDescription>{habitacionDe(nueva.habitacionId).name}, llegada el {corto(deISO(nueva.llegada))}.</DialogDescription>
              </DialogHeader>
              <div className={s.formulario}>
                <div className="grid gap-2">
                  <Label htmlFor="lt-huesped">{nueva.tipo === 'bloqueo' ? 'Motivo' : 'Huésped'}</Label>
                  <Input id="lt-huesped" autoFocus value={nueva.huesped} maxLength={120}
                    placeholder={nueva.tipo === 'bloqueo' ? 'Ej. Pintura, plomería' : 'Nombre completo'}
                    onChange={e => setNueva(n => ({ ...n, huesped: e.target.value }))} className="h-11" />
                </div>
                <div className={s.formFila}>
                  <div className="grid gap-2">
                    <span className="text-sm font-medium" id="lt-noches">Noches</span>
                    <div className={s.contador} role="group" aria-labelledby="lt-noches">
                      <Button type="button" variant="outline" size="icon" aria-label="Menos noches" disabled={nueva.noches <= 1}
                        onClick={() => setNueva(n => ({ ...n, noches: n.noches - 1 }))}><MinusIcon size={14} weight="bold" /></Button>
                      <span className={s.contadorValor} aria-live="polite">{nueva.noches}</span>
                      <Button type="button" variant="outline" size="icon" aria-label="Más noches" disabled={nueva.noches >= 30}
                        onClick={() => setNueva(n => ({ ...n, noches: n.noches + 1 }))}><PlusIcon size={14} weight="bold" /></Button>
                    </div>
                  </div>
                  {nueva.tipo === 'reserva' && (
                    <div className="grid gap-2">
                      <span className="text-sm font-medium" id="lt-personas">Personas</span>
                      <div className={s.contador} role="group" aria-labelledby="lt-personas">
                        <Button type="button" variant="outline" size="icon" aria-label="Menos personas" disabled={nueva.adultos <= 1}
                          onClick={() => setNueva(n => ({ ...n, adultos: n.adultos - 1 }))}><MinusIcon size={14} weight="bold" /></Button>
                        <span className={s.contadorValor} aria-live="polite">{nueva.adultos}</span>
                        <Button type="button" variant="outline" size="icon" aria-label="Más personas"
                          disabled={nueva.adultos >= (habitacionDe(nueva.habitacionId)?.capacidad ?? 1)}
                          onClick={() => setNueva(n => ({ ...n, adultos: n.adultos + 1 }))}><PlusIcon size={14} weight="bold" /></Button>
                      </div>
                    </div>
                  )}
                  <div className="grid gap-2 flex-1">
                    <span className="text-sm font-medium">Tipo</span>
                    <Selector ariaLabel="Tipo" value={nueva.tipo} onChange={v => setNueva(n => ({ ...n, tipo: v }))}
                      opciones={[{ value: 'reserva', label: 'Reserva' }, { value: 'bloqueo', label: 'Mantenimiento' }]} />
                  </div>
                </div>
                <p className={nuevaChoca ? s.formError : s.formAyuda} role={nuevaChoca ? 'alert' : undefined}>
                  {nuevaChoca
                    ? `Choca con ${nuevaChoca.estado === 'bloqueo' ? 'un bloqueo de mantenimiento' : `la reserva de ${nuevaChoca.huesped}`}. Reduce las noches o elige otro día.`
                    : `Salida el ${corto(deISO(nuevaSalida))}.`}
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNueva(null)}>Cancelar</Button>
                <Button type="submit" disabled={(nueva.tipo === 'reserva' && !nueva.huesped.trim()) || !!nuevaChoca}>
                  {nueva.tipo === 'bloqueo' ? 'Bloquear' : 'Crear reserva'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
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
  const ancho = esc.dias * esc.celda
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
          <div className={s.agrupar}><Skeleton height="44px" style={{ borderRadius: 16 }} /></div>
        </div>
        <div className={s.barraFila}>
          <Skeleton width="min(440px, 100%)" height="32px" style={pastilla} />
          <div className={s.buscador}><Skeleton height="36px" style={pastilla} /></div>
        </div>
      </div>

      <div className={s.scroll}>
        <div className={s.rejilla} style={{ '--celda': `${esc.celda}px`, '--ancho': `${ancho}px` }}>
          <div className={s.cabecera}>
            <div className={`${s.columnaHab} ${s.cabeceraHab}`}><Skeleton width="84px" height="11px" /></div>
            <div className={s.dias}>
              {celdas.map(i => (
                <div key={i} className={s.dia}>
                  <Skeleton width={esc.celda > 60 ? '34px' : '12px'} height="10px" />
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
                        width={`${Math.min(ancho * 0.45, esc.celda * (1.6 + (k % 3)))}px`}
                        height="42px"
                        style={{ ...pastilla, position: 'absolute', top: 9, left: `${((k * 29) % 55) / 100 * ancho + esc.celda * 0.5}px` }}
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

