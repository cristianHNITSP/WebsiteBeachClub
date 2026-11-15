import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from '@/admin/toast'
import { ShieldCheckIcon, ShieldWarningIcon, DownloadSimpleIcon, CaretDownIcon, WarningCircleIcon, WarningOctagonIcon, FingerprintIcon, XIcon, GearSixIcon, StackIcon, UserCircleDashedIcon } from '@phosphor-icons/react'
import { Badge } from '@/components/coss/badge'
import { Button } from '@/components/coss/button'
import { Label } from '@/components/coss/label'
import { SkeletonCard } from '@/components/frida/Skeleton'
import Selector from '@/admin/components/Selector'
import SelectorFechas from '@/components/marca/SelectorFechas'
import { aISO, rangoDeParams } from '@/lib/fechas'
import { useParametros } from '@/hooks/useParametros'
import { usePedido } from '@/hooks/usePedido'
import { auditoriaApi, exportarAuditoria } from '../auditoria'
import { StatusPill } from '@/components/status-pill'
import { CodeBlock } from '@/components/devl/code-block'
import { InkStamp, StampSurface } from '@/components/devl/ink-stamp'
import Inicial from '../components/Inicial'
import { leerEvento, quienDe, agrupar, porDia, nombreDia, hora, navegadorCorto, resumenRutina } from '../auditoriaEventos'
import { personalApi } from '../personal'
import s from './AuditoriaPage.module.css'

/*
 * Auditoría forense (PLAN-BACKEND §17.4), solo con `auditoria.ver`. Cada evento
 * con quién, cuándo, desde dónde, en qué solicitud, cómo estaba antes y después,
 * y su eslabón en la cadena de hashes. Mirar, verificar y exportar también
 * quedan auditados. Filtros en la URL; la lista se pide por cursor.
 */

const TIPOS = [
  { value: '', label: 'Todos los eventos' },
  { value: 'sesion.', label: 'Sesiones y accesos' },
  { value: 'permiso.', label: 'Permisos denegados' },
  { value: 'reserva.', label: 'Reservas' },
  { value: 'cobro.', label: 'Cobro' },
  { value: 'habitacion.', label: 'Habitaciones' },
  { value: 'tarifa.', label: 'Tarifas' },
  { value: 'foto.', label: 'Fotos' },
  { value: 'usuario.', label: 'Personal' },
  { value: 'auditoria.', label: 'La propia auditoría' },
]
const momento = iso => new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
const corto = v => (v ? String(v).slice(0, 8) : 'Sin dato')

export default function AuditoriaPage() {
  const [{ accion, desde, hasta }, set] = useParametros({ accion: '', desde: '', hasta: '' })
  const filtros = { accion, desde: desde ? `${desde}T00:00:00-06:00` : null, hasta: hasta ? `${hasta}T23:59:59-06:00` : null }
  const [mas, setMas] = useState({ clave: '', filas: [], siguiente: null }) // páginas extra (cursor)
  const clave = JSON.stringify(filtros)
  const primera = usePedido(senal => auditoriaApi.consultar({ ...filtros, limite: 50 }, senal), [clave])
  const personal = usePedido(senal => personalApi.listar({ por_pagina: 100 }, senal), [])
  const nombre = id => personal.datos?.items.find(p => p.id === id)?.nombre ?? (id ? `Usuario ${corto(id)}` : 'Sistema')

  const extra = mas.clave === clave ? mas : { filas: [], siguiente: null }
  const filas = [...(primera.datos?.items ?? []), ...extra.filas]
  const siguiente = extra.filas.length ? extra.siguiente : primera.datos?.meta.siguiente
  const [verificacion, setVerificacion] = useState(null)
  const [sellos, setSellos] = useState(0) // cada verificación vuelve a estampar el sello
  const [ocupado, setOcupado] = useState(false)

  const cargarMas = async () => {
    setOcupado(true)
    try {
      const r = await auditoriaApi.consultar({ ...filtros, limite: 50, cursor: siguiente })
      setMas({ clave, filas: [...extra.filas, ...r.items], siguiente: r.meta.siguiente })
    } catch (e) { toast.error(e.message) } finally { setOcupado(false) }
  }
  const [tarea, setTarea] = useState('') // qué se está haciendo, para el indicador
  const verificar = async () => {
    setTarea('verificar')
    setOcupado(true)
    try { setVerificacion(await auditoriaApi.verificar()); setSellos(n => n + 1) } catch (e) { toast.error(e.message) } finally { setOcupado(false) }
  }
  const exportar = async () => {
    setTarea('exportar')
    setOcupado(true)
    try {
      const { huella, filas: n } = await exportarAuditoria(filtros)
      toast.success(`${n} eventos exportados`, { description: `SHA-256 del archivo: ${huella}. Queda registrado en la auditoría.`, duration: 12000 })
    } catch (e) { toast.error(e.message) } finally { setOcupado(false) }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Auditoría <em>forense</em></h1>
        </div>
        <div className="admin-page-header-actions">
          <div className="admin-page-header-actions-row">
            {ocupado && tarea === 'verificar' && <StatusPill phases={['Recorriendo la cadena', 'Recalculando los hashes']} interval={1300} done={false} />}
            {ocupado && tarea === 'exportar' && <StatusPill phases={['Reuniendo los eventos', 'Calculando la huella del archivo']} interval={1300} done={false} />}
            <Button variant="outline" disabled={ocupado} onClick={verificar}><ShieldCheckIcon size={16} weight="bold" /> Verificar la cadena</Button>
            <Button variant="outline" disabled={ocupado} onClick={exportar}><DownloadSimpleIcon size={16} weight="bold" /> Exportar</Button>
          </div>
        </div>
      </div>

      {verificacion && (
        <StampSurface className={`${s.verificacion} ${verificacion.integra ? s.integra : s.rota}`}>
          {verificacion.integra ? <ShieldCheckIcon size={28} weight="duotone" aria-hidden="true" /> : <ShieldWarningIcon size={28} weight="duotone" aria-hidden="true" />}
          <div className={s.verificacionTexto}>
            <strong>{verificacion.integra ? 'La cadena está íntegra' : `La cadena se rompe en el evento #${verificacion.primera_rota}`}</strong>
            <span>{verificacion.integra
              ? `Se revisaron ${verificacion.revisadas.toLocaleString('es-MX')} eventos y ninguno se alteró ni se borró.`
              : 'Algo se alteró o se borró a partir de ese evento.'}</span>
            <code>{verificacion.integra ? 'Último hash' : 'Último hash bueno'}: {verificacion.ultimo_hash}</code>
          </div>
          <InkStamp className={s.sello} label={verificacion.integra ? 'Íntegra' : 'Rota'} tone={verificacion.integra ? 'emerald' : 'rose'} stampKey={sellos} />
        </StampSurface>
      )}

      <div className={s.filtros}>
        <div className={s.campo}>
          <span className="text-sm font-medium">Tipo</span>
          <Selector ariaLabel="Tipo de evento" value={accion} onChange={v => set({ accion: v })} opciones={TIPOS} />
        </div>
        <div className={s.campo}><Label htmlFor="a-fechas">Fechas (del día → al día)</Label>
          <div className={s.fechas}>
            <SelectorFechas id="a-fechas" className="rounded-lg" ariaLabel="Fechas de los eventos" permitirPasado noches={false}
              textos={{ vacio: 'Cualquier fecha', sinFin: 'Hoy' }}
              value={rangoDeParams(desde, hasta)} onChange={r => set({ desde: aISO(r.from), hasta: aISO(r.to) })} />
            {(desde || hasta) && (
              <Button type="button" variant="outline" size="icon" className="shrink-0" aria-label="Quitar el filtro de fechas"
                onClick={() => set({ desde: '', hasta: '' })}><XIcon size={16} /></Button>
            )}
          </div></div>
      </div>

      {primera.cargando ? <div className={s.lista}>{[0, 1, 2, 3].map(i => <SkeletonCard key={i} height="64px" />)}</div>
        : primera.error ? (
          <div className={s.vacio} role="alert"><WarningCircleIcon size={28} aria-hidden="true" /><p>{primera.error.message}</p>
            <Button variant="outline" size="sm" onClick={primera.recargar}>Reintentar</Button></div>
        ) : filas.length === 0 ? (
          <div className={s.vacio} role="status"><FingerprintIcon size={28} aria-hidden="true" /><p>No hay eventos con esos filtros.</p></div>
        ) : (
          <div className={s.dias}>
            {porDia(filas).map(({ dia, filas: delDia }) => (
              <section key={dia} aria-labelledby={`dia-${dia}`}>
                <h2 id={`dia-${dia}`} className={s.dia}>{nombreDia(dia)}<span>{delDia.length} {delDia.length === 1 ? 'evento' : 'eventos'}</span></h2>
                <ol className={s.lista}>
                  {agrupar(delDia).map(g => g.rutina
                    ? <GrupoRutina key={`r${g.rutina[0].secuencia}`} eventos={g.rutina} nombre={nombre} />
                    : <Evento key={g.e.secuencia} e={g.e} nombre={nombre} />)}
                </ol>
              </section>
            ))}
          </div>
        )}
      {siguiente && !primera.cargando && (
        <div className={s.mas}><Button variant="outline" disabled={ocupado} onClick={cargarMas}>Cargar más antiguos</Button></div>
      )}
    </div>
  )
}

const NIVEL = {
  alerta: { badge: 'error', texto: 'Revisar', Icono: WarningOctagonIcon },
  importante: { badge: 'warning', texto: 'Importante', Icono: null },
}
const desplegar = { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.22, ease: [0.2, 0, 0, 1] } }

/* Quién lo hizo: su inicial con su tono, el engrane si fue el sistema o una silueta punteada si nadie sabe quién. */
function Quien({ quien, chico }) {
  if (quien.tipo === 'persona') return <Inicial nombre={quien.texto} tamano={chico ? 24 : 32} />
  const Icono = quien.tipo === 'sistema' ? GearSixIcon : UserCircleDashedIcon
  return <span className={`${s.sistema} ${chico ? s.sistemaChico : ''}`} aria-hidden="true"><Icono size={chico ? 13 : 16} weight="bold" /></span>
}

function Evento({ e, nombre, dentroDeGrupo = false }) {
  const [abierto, setAbierto] = useState(false)
  const { frase, nivel } = leerEvento(e)
  const marca = NIVEL[nivel]
  const quien = quienDe(e, nombre)
  return (
    <li className={`${s.evento} ${s[nivel]}`}>
      <button type="button" className={s.resumen} aria-expanded={abierto} onClick={() => setAbierto(a => !a)}>
        <Quien quien={quien} chico={nivel === 'rutina' || dentroDeGrupo} />
        <span className={s.texto}>
          <span className={s.frase}>
            {frase}
            {marca && <Badge variant={marca.badge} className={s.insignia}>{marca.Icono && <marca.Icono weight="fill" />}{marca.texto}</Badge>}
          </span>
          <span className={s.meta}>{quien.texto}{e.ip ? `, desde ${e.ip}` : ''}</span>
        </span>
        <time className={s.hora} dateTime={e.momento} title={momento(e.momento)}>{hora(e.momento)}</time>
        <CaretDownIcon size={14} weight="bold" className={`${s.flecha} ${abierto ? s.girado : ''}`} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div {...desplegar} className={s.desplegable}>
            <div className={s.detalle}>
              <dl className={s.hechos}>
                <div><dt>Quién</dt><dd>{quien.texto}</dd></div>
                <div><dt>Cuándo</dt><dd>{momento(e.momento)}</dd></div>
                <div><dt>Desde</dt><dd>{e.ip ?? 'Sin dato'}</dd></div>
                <div><dt>Navegador</dt><dd title={e.agente ?? undefined}>{navegadorCorto(e.agente) ?? e.agente ?? 'Sin dato'}</dd></div>
                <div><dt>Sobre</dt><dd>{e.entidad}{e.entidad_id ? <span className={s.id}> {corto(e.entidad_id)}</span> : ''}</dd></div>
                <div><dt>Evento</dt><dd><code>{e.accion}</code> #{e.secuencia}</dd></div>
              </dl>
              <Cambio e={e} />
              <dl className={s.rastro} aria-label="Rastro para el peritaje">
                <div><dt>Sesión</dt><dd>{e.sesion_id ?? 'Sin dato'}</dd></div>
                <div><dt>Solicitud</dt><dd>{e.solicitud_id ?? 'Sin dato'}</dd></div>
                <div><dt>Hash</dt><dd>{e.hash}</dd></div>
                <div><dt>Hash anterior</dt><dd>{e.hash_anterior}</dd></div>
              </dl>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

/* Lo que el sistema anota solo, junto: un renglón que se abre si hace falta. */
function GrupoRutina({ eventos, nombre }) {
  const [abierto, setAbierto] = useState(false)
  const primero = eventos.at(-1), ultimo = eventos[0] // llegan del más nuevo al más viejo
  return (
    <li className={`${s.evento} ${s.grupo}`}>
      <button type="button" className={s.resumen} aria-expanded={abierto} onClick={() => setAbierto(a => !a)}>
        <span className={`${s.sistema} ${s.sistemaChico}`} aria-hidden="true"><StackIcon size={13} weight="bold" /></span>
        <span className={s.texto}>
          <span className={s.frase}>{eventos.length} eventos de rutina</span>
          <span className={s.meta}>{resumenRutina(eventos)}</span>
        </span>
        <span className={s.hora}>{hora(primero.momento)} → {hora(ultimo.momento)}</span>
        <CaretDownIcon size={14} weight="bold" className={`${s.flecha} ${abierto ? s.girado : ''}`} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {abierto && (
          <motion.ol {...desplegar} className={s.subLista}>
            {eventos.map(e => <Evento key={e.secuencia} e={e} nombre={nombre} dentroDeGrupo />)}
          </motion.ol>
        )}
      </AnimatePresence>
    </li>
  )
}

/* Cómo estaba y cómo quedó, en el bloque de código de devl. Con antes y después
   abre en "qué cambió" (las líneas + y − las calcula el propio bloque). */
const json = v => JSON.stringify(v, null, 2)
function Cambio({ e }) {
  if (!e.antes && !e.despues) return null
  const nombre = `${e.entidad}.json`
  const [titulo, archivo] = e.antes && e.despues
    ? ['Cambio', { name: nombre, language: 'json', code: json(e.despues), previous: json(e.antes) }]
    : e.despues
      ? ['Después', { name: nombre, language: 'json', code: json(e.despues) }]
      : ['Antes', { name: nombre, language: 'json', code: json(e.antes) }]
  return (
    <div>
      <dt>{titulo}</dt>
      <dd><CodeBlock files={[archivo]} defaultDiff maxLines={14} className="max-w-none" /></dd>
    </div>
  )
}
