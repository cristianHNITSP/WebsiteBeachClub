import { useMemo } from 'react'
import { BellQuiet } from '@/components/devl/bell-quiet'
import { LiquidSegments } from '@/components/devl/liquid-segments'
import { useNavigate } from 'react-router-dom'
import { SkeletonCard } from '@/components/frida/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/admin/toast'
import {
  BellSlashIcon, CalendarDotsIcon, CreditCardIcon, WrenchIcon, StarIcon, GearSixIcon,
  EnvelopeSimpleIcon, EnvelopeSimpleOpenIcon, TrashIcon, ArrowRightIcon, ChecksIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/coss/button'
import { LiquidCursor } from '@/components/devl/liquid-cursor'
import { MetricCard } from '@/components/devl/metric-card'
import { claseVivo, marcarIconos } from '@/components/marca/iconosVivos'
import { CoronaFlores } from '@/components/marca/Wordmark'
import Paginador from '@/components/marca/Paginador'
import Pista, { GrupoPistas } from '@/admin/components/Pista'
import { useParametros } from '@/hooks/useParametros'
import { animacionItem } from '@/lib/animacionListas'
import { useAvisos, grupoDe, haceCuanto } from '../avisos'
import Celda from '../components/Celda'
import c from '../components/Celda.module.css'
import s from './AvisosPage.module.css'

const POR_PAGINA = 8
const ENTERO = { maximumFractionDigits: 0 }
const mismoDia = (a, b) => a.toDateString() === b.toDateString()

/** Cuántos avisos de cada tipo hubo en cada uno de los últimos 7 días. */
function deLaSemana(avisos) {
  const puntos = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 6 + i)
    const delDia = avisos.filter(a => mismoDia(a.fecha, d))
    return {
      label: d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
      values: ['reserva', 'pago', 'operacion'].map(t => delDia.filter(a => a.tipo === t).length),
    }
  })
  return { puntos, total: puntos.reduce((n, x) => n + x.values.reduce((m, v) => m + v, 0), 0) }
}

// Cada tipo con su flor del logo (identidad, no estado) y su icono.
const TIPO = {
  reserva:   { Icono: CalendarDotsIcon, flor: 'morado',   nombre: 'Reservas' },
  pago:      { Icono: CreditCardIcon,   flor: 'dorado',   nombre: 'Pagos' },
  operacion: { Icono: WrenchIcon,       flor: 'turquesa', nombre: 'Operación' },
  resena:    { Icono: StarIcon,         flor: 'orquidea', nombre: 'Reseñas' },
  sistema:   { Icono: GearSixIcon,      flor: 'naranja',  nombre: 'Sistema' },
}

const VISTAS = [
  { value: 'avisos', label: 'Avisos' },
  { value: 'resumen', label: 'Estadísticas' },
]

const FILTROS = [
  { value: 'todos',     label: 'Todos' },
  { value: 'sin-leer',  label: 'Sin leer' },
  { value: 'reserva',   label: 'Reservas' },
  { value: 'pago',      label: 'Pagos' },
  { value: 'operacion', label: 'Operación' },
  { value: 'sistema',   label: 'Sistema' },
]

export default function AvisosPage({ onNavigate }) {
  const { avisos, sinLeer, cargando, error, recargar, marcarLeido, marcarTodos, borrar, restaurar } = useAvisos()
  const navigate = useNavigate()
  // Filtro y página en la URL (?filtro=pago&pagina=2): recargar conserva la vista.
  const [p, set] = useParametros({ filtro: 'todos', pagina: 1, vista: 'avisos' })

  const filtrados = useMemo(() => avisos.filter(a =>
    p.filtro === 'todos' ? true : p.filtro === 'sin-leer' ? !a.leido : a.tipo === p.filtro,
  ), [avisos, p.filtro])

  const total = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const pagina = Math.min(Math.max(1, p.pagina), total)
  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const cuenta = tipo => avisos.filter(a => a.tipo === tipo).length
  const semana = useMemo(() => deLaSemana(avisos), [avisos])
  const deHoy = tipo => {
    const n = avisos.filter(a => a.tipo === tipo && mismoDia(a.fecha, new Date())).length
    return n ? `${n} de hoy` : 'Ninguno hoy'
  }
  // Tocar una cifra de las estadísticas lleva a la lista con ese filtro (la del filtro activo lo quita).
  const filtrar = f => set({ filtro: p.filtro === f ? 'todos' : f, pagina: 1, vista: 'avisos' })

  const quitar = aviso => {
    borrar(aviso.id)
    toast('Aviso eliminado', {
      description: aviso.titulo,
      action: { label: 'Deshacer', onClick: () => restaurar(aviso.id) },
    })
  }

  const abrir = aviso => {
    marcarLeido(aviso.id)
    // El destino es una ruta del panel (p. ej. la reserva abierta en la Línea de tiempo).
    if (aviso.destino.startsWith('/')) navigate(aviso.destino)
    else onNavigate(aviso.destino)
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Tus <em>avisos</em></h1>
          <p className="admin-page-sub">
            {sinLeer > 0 ? `Tienes ${sinLeer} aviso${sinLeer !== 1 ? 's' : ''} sin leer.` : 'Estás al día. No hay avisos sin leer.'}
          </p>
        </div>
        <div className="admin-page-header-actions">
          <div className="admin-page-header-actions-row">
            <Button
              variant="outline"
              disabled={sinLeer === 0}
              onClick={() => { marcarTodos(); toast.success('Todo marcado como leído') }}
            >
              <ChecksIcon size={16} weight="bold" /> Marcar todo como leído
            </Button>
          </div>
        </div>
      </div>

      {/* Lo que importa es la lista; las estadísticas quedan a un toque, para quien quiera verlas. */}
      <LiquidSegments className={s.vistas} options={VISTAS} value={p.vista} onValueChange={v => set({ vista: v })} aria-label="Qué ver" size="default" />

      {p.vista === 'resumen' ? (
      <LiquidCursor className={s.resumen} role="region" aria-label="Resumen de avisos">
        <div className={s.resumenCaja}>
          <span data-mece="" className={s.ramillete}><CoronaFlores /></span>
          <MetricCard className="max-w-none border-0 bg-transparent shadow-none before:hidden" title="Avisos de la semana" locale="es-MX" showDelta={false}
            series={[{ name: 'Reservas', color: 'var(--primary)' }, { name: 'Pagos', color: 'var(--flor-dorado)' }, { name: 'Operación', color: 'var(--flor-turquesa)' }]}
            format={ENTERO} axisFormat={ENTERO}
            ranges={[{ id: 's', label: '7 días', caption: `${semana.total} en los últimos 7 días`, points: semana.puntos }]} />
          <div className={c.cifras}>
            <Celda color="var(--flor-rojo)" etiqueta="Sin leer" valor={sinLeer} nota={`De ${avisos.length} en total`} activa={p.filtro === 'sin-leer'} onClick={() => filtrar('sin-leer')} />
            <Celda color="var(--primary)" etiqueta="Reservas" valor={cuenta('reserva')} nota={deHoy('reserva')} activa={p.filtro === 'reserva'} onClick={() => filtrar('reserva')} />
            <Celda color="var(--flor-dorado)" etiqueta="Pagos" valor={cuenta('pago')} nota={deHoy('pago')} activa={p.filtro === 'pago'} onClick={() => filtrar('pago')} />
            <Celda color="var(--flor-turquesa)" etiqueta="Operación" valor={cuenta('operacion')} nota={deHoy('operacion')} activa={p.filtro === 'operacion'} onClick={() => filtrar('operacion')} />
          </div>
        </div>
      </LiquidCursor>
      ) : (<>
      {/* Filtros: LiquidSegments (devl.dev). Cambiar de filtro vuelve a la página 1 */}
      <div className={s.filtros}>
        <LiquidSegments options={FILTROS} value={p.filtro} onValueChange={v => set({ filtro: v, pagina: 1 })} aria-label="Filtrar avisos" size="default" />
        <span className={s.resultado}>{filtrados.length} aviso{filtrados.length !== 1 ? 's' : ''}</span>
      </div>

      <div className={s.bandeja}>
        {cargando ? (
          <div className={s.lista} style={{ display: "grid", gap: 10 }}>{[0, 1, 2, 3].map(i => <SkeletonCard key={i} height="76px" />)}</div>
        ) : error ? (
          <div className={s.vacio} role="alert">
            <span className={s.vacioIcono}><BellSlashIcon size={30} /></span>
            <div className={s.vacioTitulo}>{error.message}</div>
            <Button variant="outline" size="sm" onClick={recargar}>Reintentar</Button>
          </div>
        ) : visibles.length === 0 ? (
          <div className={s.vacio} role="status">
            <BellQuiet hue="amber" title={p.filtro === 'sin-leer' ? 'No tienes avisos sin leer' : 'No hay avisos aquí'}
              description="Aquí aparecerán las reservas nuevas, los cambios, los pagos y las llegadas de tus propiedades." />
          </div>
        ) : (
          <GrupoPistas>
            <motion.ul layout className={s.lista}>
              <AnimatePresence mode="popLayout" initial={false}>
                {visibles.map((aviso, i) => {
                  const t = TIPO[aviso.tipo]
                  const grupo = grupoDe(aviso.fecha)
                  const nuevoGrupo = i === 0 || grupoDe(visibles[i - 1].fecha) !== grupo
                  return (
                    <motion.li key={aviso.id} {...animacionItem}>
                      {nuevoGrupo && <div className={`rotulo ${s.grupo}`}>{grupo}</div>}
                      <article className={`${s.aviso} ${claseVivo} ${aviso.leido ? '' : s.noLeido}`}>
                        <span className={s.icono} style={{ background: `var(--flor-${t.flor})`, color: `var(--flor-${t.flor}-fg)` }}>
                          {marcarIconos(<t.Icono size={19} weight="fill" aria-hidden="true" />)}
                        </span>
                        <div className={s.cuerpo}>
                          <div className={s.cabecera}>
                            <h2 className={s.titulo}>{aviso.titulo}</h2>
                            {!aviso.leido && <span className={s.punto} aria-label="Sin leer" />}
                          </div>
                          <p className={s.texto}>{aviso.texto}</p>
                          <div className={s.meta}>
                            <span className="rotulo">{t.nombre}</span>
                            <time dateTime={aviso.fecha.toISOString()}>{haceCuanto(aviso.fecha)}</time>
                          </div>
                        </div>
                        <div className={s.acciones}>
                          <Button variant="ghost" size="sm" onClick={() => abrir(aviso)}>
                            Ver <ArrowRightIcon size={14} weight="bold" />
                          </Button>
                          <Pista contenido={aviso.leido ? 'Marcar como no leído' : 'Marcar como leído'} lado="top">
                            <Button variant="ghost" size="icon" aria-label={aviso.leido ? 'Marcar como no leído' : 'Marcar como leído'}
                              onClick={() => marcarLeido(aviso.id, !aviso.leido)}>
                              {aviso.leido ? <EnvelopeSimpleIcon size={18} /> : <EnvelopeSimpleOpenIcon size={18} />}
                            </Button>
                          </Pista>
                          <Pista contenido="Eliminar" lado="top">
                            <Button variant="ghost" size="icon" aria-label="Eliminar aviso" className={s.borrar} onClick={() => quitar(aviso)}>
                              <TrashIcon size={18} />
                            </Button>
                          </Pista>
                        </div>
                      </article>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </motion.ul>
          </GrupoPistas>
        )}
      </div>

      <Paginador id="avisos" etiqueta="Páginas de avisos" pagina={pagina} total={total}
        onCambiar={n => set({ pagina: n }, { historial: true })} />
      </>)}
    </div>
  )
}
