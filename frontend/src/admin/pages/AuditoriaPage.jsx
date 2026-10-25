import { useState } from 'react'
import { toast } from 'sonner'
import { ShieldCheckIcon, DownloadSimpleIcon, CaretDownIcon, WarningCircleIcon, FingerprintIcon, XIcon } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SkeletonCard } from '@/components/frida/Skeleton'
import Selector from '@/components/marca/Selector'
import SelectorFechas from '@/components/marca/SelectorFechas'
import { aISO, rangoDeParams } from '@/lib/fechas'
import { useParametros } from '@/hooks/useParametros'
import { usePedido } from '@/hooks/usePedido'
import { auditoriaApi, exportarAuditoria } from '../auditoria'
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
const SEGURIDAD = ['sesion.fallo', 'sesion.bloqueada', 'sesion.reuso_detectado', 'permiso.denegado', 'usuario.cambiar_clave_fallo']
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
  const [ocupado, setOcupado] = useState(false)

  const cargarMas = async () => {
    setOcupado(true)
    try {
      const r = await auditoriaApi.consultar({ ...filtros, limite: 50, cursor: siguiente })
      setMas({ clave, filas: [...extra.filas, ...r.items], siguiente: r.meta.siguiente })
    } catch (e) { toast.error(e.message) } finally { setOcupado(false) }
  }
  const verificar = async () => {
    setOcupado(true)
    try { setVerificacion(await auditoriaApi.verificar()) } catch (e) { toast.error(e.message) } finally { setOcupado(false) }
  }
  const exportar = async () => {
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
          <span className="admin-page-eyebrow">Seguridad</span>
          <h1 className="admin-page-title">Auditoría <em>forense</em></h1>
        </div>
        <div className="admin-page-header-actions">
          <div className="admin-page-header-actions-row">
            <Button variant="outline" disabled={ocupado} onClick={verificar}><ShieldCheckIcon size={16} weight="bold" /> Verificar la cadena</Button>
            <Button variant="outline" disabled={ocupado} onClick={exportar}><DownloadSimpleIcon size={16} weight="bold" /> Exportar</Button>
          </div>
        </div>
      </div>

      {verificacion && (
        <p className={`${s.verificacion} ${verificacion.integra ? s.integra : s.rota}`} role="status">
          {verificacion.integra
            ? `Cadena íntegra: ${verificacion.revisadas} eventos revisados. Último hash: ${verificacion.ultimo_hash}`
            : `Cadena ROTA en el evento ${verificacion.primera_rota}: algo se alteró o se borró. Último hash bueno: ${verificacion.ultimo_hash}`}
        </p>
      )}

      <div className={s.filtros}>
        <div className={s.campo}>
          <span className="text-sm font-medium">Tipo</span>
          <Selector ariaLabel="Tipo de evento" value={accion} onChange={v => set({ accion: v })} opciones={TIPOS} />
        </div>
        <div className={s.campo}><Label htmlFor="a-fechas">Fechas (del día → al día)</Label>
          <div className={s.fechas}>
            <SelectorFechas id="a-fechas" ariaLabel="Fechas de los eventos" permitirPasado noches={false}
              textos={{ vacio: 'Cualquier fecha', sinFin: 'Hoy' }}
              value={rangoDeParams(desde, hasta)} onChange={r => set({ desde: aISO(r.from), hasta: aISO(r.to) })} />
            {(desde || hasta) && (
              <Button type="button" variant="outline" size="icon" className="size-11 shrink-0" aria-label="Quitar el filtro de fechas"
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
          <ol className={s.lista}>
            {filas.map(e => <Evento key={e.secuencia} e={e} nombre={nombre} />)}
          </ol>
        )}
      {siguiente && !primera.cargando && (
        <div className={s.mas}><Button variant="outline" disabled={ocupado} onClick={cargarMas}>Cargar más antiguos</Button></div>
      )}
    </div>
  )
}

function Evento({ e, nombre }) {
  const [abierto, setAbierto] = useState(false)
  const alerta = SEGURIDAD.includes(e.accion)
  return (
    <li className={s.evento}>
      <button type="button" className={s.resumen} aria-expanded={abierto} onClick={() => setAbierto(a => !a)}>
        <span className={s.secuencia}>#{e.secuencia}</span>
        <span className={s.texto}>
          <strong>{e.accion}{alerta && <Badge variant="destructive" className={s.insignia}>Seguridad</Badge>}</strong>
          <span>{nombre(e.usuario_id)}{e.ip ? `, IP ${e.ip}` : ''}. {momento(e.momento)}</span>
        </span>
        <CaretDownIcon size={16} weight="bold" className={abierto ? s.girado : ''} aria-hidden="true" />
      </button>
      {abierto && (
        <dl className={s.detalle}>
          <div><dt>Entidad</dt><dd>{e.entidad}{e.entidad_id ? ` ${e.entidad_id}` : ''}</dd></div>
          <div><dt>Sesión</dt><dd>{e.sesion_id ?? 'Sin dato'}</dd></div>
          <div><dt>Solicitud</dt><dd>{e.solicitud_id ?? 'Sin dato'}</dd></div>
          <div><dt>Navegador</dt><dd>{e.agente ?? 'Sin dato'}</dd></div>
          {e.antes && <div><dt>Antes</dt><dd><pre>{JSON.stringify(e.antes, null, 2)}</pre></dd></div>}
          {e.despues && <div><dt>Después</dt><dd><pre>{JSON.stringify(e.despues, null, 2)}</pre></dd></div>}
          <div><dt>Hash</dt><dd className={s.hash}>{e.hash}</dd></div>
          <div><dt>Hash anterior</dt><dd className={s.hash}>{e.hash_anterior}</dd></div>
        </dl>
      )}
    </li>
  )
}
