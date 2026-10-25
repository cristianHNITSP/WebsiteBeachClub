import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import {
  UserPlusIcon, MagnifyingGlassIcon, PencilSimpleIcon, KeyIcon, UserMinusIcon, UserCheckIcon,
  CopyIcon, ArrowsClockwiseIcon, WarningCircleIcon, UsersThreeIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonCard } from '@/components/frida/Skeleton'
import JellyRadio from '@/components/bits/JellyRadio'
import BotonDestacado from '@/components/marca/BotonDestacado'
import ConfirmarDescarte from '@/components/marca/ConfirmarDescarte'
import Paginador from '@/components/marca/Paginador'
import Selector from '@/components/marca/Selector'
import Pista, { GrupoPistas } from '@/components/marca/Pista'
import { useParametros } from '@/hooks/useParametros'
import { usePedido } from '@/hooks/usePedido'
import { useSesion } from '@/lib/sesion'
import { animacionItem } from '@/lib/animacionListas'
import { personalApi, claveTemporal, opcionesDeRol, rolProximamente } from '../personal'
import s from './UsersPage.module.css'

/*
 * Personal del hotel (fase 3e). Todo contra la API: alta y edición en su propia
 * página (PersonaFormPage, nunca en un modal), alta con contraseña
 * temporal (la persona la cambia al entrar), edición de rol y propiedades
 * (cierra sus sesiones para que rija ya), baja y reactivación, y restablecer
 * contraseña. Filtros, búsqueda y página en la URL.
 */

const POR_PAGINA = 12
const ESTADOS = [
  { value: 'activos', label: 'Activos' },
  { value: 'bajas', label: 'Dados de baja' },
  { value: 'todos', label: 'Todos' },
]
const fecha = iso => (iso ? new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Nunca')
const iniciales = n => n.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase()

export default function UsersPage({ onNavigate }) {
  const { sesion } = useSesion()
  const gestiona = sesion?.permisos?.includes('usuarios.gestionar')
  const propiedades = sesion?.propiedades ?? []
  const nombreProp = id => propiedades.find(p => p.id === id)?.nombre ?? 'Propiedad'

  const [{ q, rol, estado, pagina }, set] = useParametros({ q: '', rol: 'todos', estado: 'activos', pagina: 1 })
  const [texto, setTexto] = useState(q)
  useEffect(() => {
    if (texto === q) return
    const t = setTimeout(() => set({ q: texto, pagina: 1 }), 300)
    return () => clearTimeout(t)
  }, [texto]) // eslint-disable-line react-hooks/exhaustive-deps

  const roles = usePedido(senal => personalApi.roles(senal), [])
  const lista = usePedido(
    senal => personalApi.listar({
      q, rol: rol === 'todos' ? null : rol, activo: estado === 'todos' ? null : estado === 'activos', pagina, por_pagina: POR_PAGINA,
    }, senal),
    [q, rol, estado, pagina],
  )
  const items = lista.datos?.items ?? []

  const [clave, setClave] = useState(null)       // { persona, valor } tras restablecer
  const [aRestablecer, setARestablecer] = useState(null)
  const [aBaja, setABaja] = useState(null)

  const opcionesRol = [{ value: 'todos', label: 'Todos los roles' }, ...opcionesDeRol(roles.datos ?? [])]

  const baja = async p => {
    setABaja(null)
    try {
      await personalApi.desactivar(p.id)
      toast.success(`${p.nombre} ya no tiene acceso`, { description: 'Se cerraron todas sus sesiones.' })
      lista.recargar()
    } catch (e) { toast.error(e.message) }
  }
  const reactivar = async p => {
    try {
      await personalApi.reactivar(p.id)
      toast.success(`${p.nombre} vuelve a tener acceso`)
      lista.recargar()
    } catch (e) { toast.error(e.message) }
  }
  const restablecer = async p => {
    setARestablecer(null)
    const valor = claveTemporal()
    try {
      await personalApi.restablecerClave(p.id, valor)
      setClave({ persona: p, valor })
      lista.recargar()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">Equipo</span>
          <h1 className="admin-page-title">Personal del <em>hotel</em></h1>
        </div>
        {gestiona && (
          <div className="admin-page-header-actions">
            <BotonDestacado onClick={() => onNavigate('nueva-persona')}>
              <UserPlusIcon size={16} weight="bold" /> Nueva persona
            </BotonDestacado>
          </div>
        )}
      </div>

      <ClaveMostrada clave={clave} onCerrar={() => setClave(null)} />

      {/* Roles: qué puede hacer cada uno (los permisos reales de la API) */}
      <section className={s.roles} aria-label="Roles">
        {(roles.datos ?? []).map(r => (
          <article key={r.clave} className={`${s.rol} ${rolProximamente(r.clave) ? s.rolProximamente : ''}`}>
            <h2 className={s.rolNombre}>{r.nombre}</h2>
            <p className={s.rolPermisos}>
              {rolProximamente(r.clave) ? 'Próximamente.' : r.permisos.length ? `${r.permisos.length} permisos: ${r.permisos.slice(0, 4).map(p => p.descripcion.toLowerCase()).join(', ')}${r.permisos.length > 4 ? '…' : '.'}` : 'Sin permisos (módulo apagado).'}
            </p>
          </article>
        ))}
        {roles.cargando && [0, 1, 2].map(i => <SkeletonCard key={i} height="96px" />)}
      </section>

      <div className={s.filtros}>
        <div className={s.buscador}>
          <MagnifyingGlassIcon size={17} className={s.buscadorIcono} aria-hidden="true" />
          <Input type="search" aria-label="Buscar persona" placeholder="Buscar por nombre, usuario o correo" maxLength={120}
            value={texto} onChange={e => setTexto(e.target.value)} className="h-10 pl-10" />
        </div>
        <div className={s.selectorRol}>
          <Selector ariaLabel="Rol" value={rol} onChange={v => set({ rol: v, pagina: 1 })} opciones={opcionesRol} />
        </div>
        <JellyRadio items={ESTADOS} value={estado} onChange={v => set({ estado: v, pagina: 1 })} ariaLabel="Estado"
          size="md" chipColor="var(--muted)" activeColor="var(--primary)" textColor="var(--muted-foreground)" activeTextColor="var(--primary-foreground)" />
      </div>

      {lista.cargando ? (
        <div className={s.lista}>{[0, 1, 2, 3].map(i => <SkeletonCard key={i} height="88px" />)}</div>
      ) : lista.error ? (
        <div className={s.vacio} role="alert">
          <WarningCircleIcon size={28} aria-hidden="true" />
          <p>{lista.error.message}</p>
          <Button variant="outline" size="sm" onClick={lista.recargar}>Reintentar</Button>
        </div>
      ) : items.length === 0 ? (
        <div className={s.vacio} role="status">
          <UsersThreeIcon size={28} aria-hidden="true" />
          <p>No hay personas con esos filtros.</p>
        </div>
      ) : (
        <GrupoPistas>
          <ul className={s.lista} aria-busy={lista.actualizando}>
            <AnimatePresence initial={false} mode="popLayout">
              {items.map(p => (
                <motion.li key={p.id} layout {...animacionItem} className={`${s.persona} ${p.activo ? '' : s.personaBaja}`}>
                  <span className={s.avatar} aria-hidden="true">{iniciales(p.nombre)}</span>
                  <div className={s.datos}>
                    <div className={s.nombre}>
                      {p.nombre}
                      {p.usuario === sesion?.usuario && <span className={s.etiqueta}>Tú</span>}
                      {!p.activo && <span className={`${s.etiqueta} ${s.etiquetaBaja}`}>Dado de baja</span>}
                      {p.activo && p.debe_cambiar_clave && <span className={`${s.etiqueta} ${s.etiquetaAviso}`}>Contraseña temporal</span>}
                    </div>
                    <div className={s.sub}>{p.usuario}, {p.correo}</div>
                    <div className={s.sub}>
                      {p.rol_nombre}. {p.todas_las_propiedades ? 'Todas las propiedades' : p.propiedades.length ? p.propiedades.map(nombreProp).join(', ') : 'Sin propiedades'}. Último acceso: {fecha(p.ultimo_acceso)}
                    </div>
                  </div>
                  {gestiona && (
                    <div className={s.acciones}>
                      <Pista contenido="Editar">
                        <Button variant="outline" size="icon" aria-label={`Editar a ${p.nombre}`} onClick={() => onNavigate('editar-persona', p)}><PencilSimpleIcon size={16} weight="bold" /></Button>
                      </Pista>
                      {p.activo && (
                        <Pista contenido="Contraseña temporal">
                          <Button variant="outline" size="icon" aria-label={`Restablecer la contraseña de ${p.nombre}`} onClick={() => setARestablecer(p)}><KeyIcon size={16} weight="bold" /></Button>
                        </Pista>
                      )}
                      {p.activo ? (
                        <Pista contenido="Dar de baja">
                          <Button variant="destructive" size="icon" aria-label={`Dar de baja a ${p.nombre}`} onClick={() => setABaja(p)}><UserMinusIcon size={16} weight="bold" /></Button>
                        </Pista>
                      ) : (
                        <Pista contenido="Reactivar">
                          <Button variant="outline" size="icon" aria-label={`Reactivar a ${p.nombre}`} onClick={() => reactivar(p)}><UserCheckIcon size={16} weight="bold" /></Button>
                        </Pista>
                      )}
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </GrupoPistas>
      )}

      <div className={s.paginas}>
        <Paginador pagina={pagina} total={lista.datos?.meta.paginas ?? 0} onCambiar={n => set({ pagina: n }, { historial: true })} etiqueta="Páginas del personal" />
      </div>

      <ConfirmarDescarte
        abierto={!!aBaja}
        titulo="¿Dar de baja?"
        texto={aBaja ? `${aBaja.nombre} deja de tener acceso al panel y se cierran sus sesiones al instante. Su historial se conserva y se puede reactivar.` : ''}
        accion="Dar de baja"
        cancelar="Cancelar"
        onConfirmar={() => baja(aBaja)}
        onCancelar={() => setABaja(null)}
      />
      <ConfirmarDescarte
        abierto={!!aRestablecer}
        titulo="¿Poner una contraseña temporal?"
        texto={aRestablecer ? `Se cierran las sesiones de ${aRestablecer.nombre} y tendrá que entrar con una contraseña nueva que verás una sola vez. Al entrar, se le pedirá cambiarla.` : ''}
        accion="Generar contraseña"
        cancelar="Cancelar"
        onConfirmar={() => restablecer(aRestablecer)}
        onCancelar={() => setARestablecer(null)}
      />
    </div>
  )
}

/** La contraseña temporal recién restablecida: arriba de la lista, UNA vez
 *  (no se guarda en ningún lado del panel). Sin modales: así es todo el panel. */
function ClaveMostrada({ clave, onCerrar }) {
  if (!clave) return null
  const copiar = async () => {
    try { await navigator.clipboard.writeText(clave.valor); toast.success('Contraseña copiada') } catch { toast.error('No se pudo copiar: cópiala a mano') }
  }
  return (
    <section className={s.panelClave} role="status" aria-labelledby="clave-titulo">
      <h2 className={s.panelTitulo} id="clave-titulo"><KeyIcon size={18} weight="bold" aria-hidden="true" /> Contraseña temporal de {clave.persona.nombre}</h2>
      <p className={s.ayuda}>
        Dásela en persona o por un medio seguro. Solo la verás ahora: al cerrar este aviso no se puede volver a mostrar. Al entrar, se le pedirá cambiarla.
        Usuario: <strong>{clave.persona.usuario}</strong>.
      </p>
      <div className={s.clave}>
        <code aria-label="Contraseña temporal">{clave.valor}</code>
        <Button type="button" variant="outline" className="h-11" onClick={copiar}><CopyIcon size={16} weight="bold" /> Copiar</Button>
        <Button type="button" className="h-11" onClick={onCerrar}><ArrowsClockwiseIcon size={16} weight="bold" /> Ya se la di</Button>
      </div>
    </section>
  )
}
