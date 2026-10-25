import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CopyIcon, FloppyDiskIcon, UserPlusIcon, UsersThreeIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SkeletonCard } from '@/components/frida/Skeleton'
import Selector from '@/components/marca/Selector'
import { usePedido } from '@/hooks/usePedido'
import { useSesion } from '@/lib/sesion'
import SectionPanel from '../components/SectionPanel'
import { claveTemporal, opcionesDeRol, personalApi } from '../personal'
import s from './PersonaFormPage.module.css'

/*
 * Alta y edición del personal, en página completa (como Habitaciones), nunca en
 * un modal: /admin/nueva-persona y /admin/editar-persona/<id>. Con cambios sin
 * guardar, salir pide confirmación (onDirtyChange + SectionPanel).
 * En el alta, la contraseña temporal la genera el panel y se muestra UNA vez
 * aquí mismo; al entrar, la persona tiene que cambiarla.
 */

export default function PersonaFormPage({ personaId, onBack, onDirtyChange }) {
  const nueva = !personaId
  const persona = usePedido(senal => (nueva ? null : personalApi.obtener(personaId, senal)), [personaId])
  const roles = usePedido(senal => personalApi.roles(senal), [])
  const [alta, setAlta] = useState(null) // { persona, clave } tras dar de alta

  if (alta) return <AltaLista alta={alta} onBack={onBack} onOtra={() => setAlta(null)} />
  if (persona.cargando || roles.cargando) {
    return (
      <SectionPanel eyebrow="Equipo" title={nueva ? 'Nueva persona' : 'Editar persona'} onBack={onBack}>
        <div className={s.columnas}><SkeletonCard height="300px" /><SkeletonCard height="300px" /></div>
      </SectionPanel>
    )
  }
  const error = persona.error ?? roles.error
  if (error) {
    return (
      <SectionPanel eyebrow="Equipo" title={nueva ? 'Nueva persona' : 'Editar persona'} onBack={onBack}>
        <div className={s.vacio} role="alert">
          <WarningCircleIcon size={28} aria-hidden="true" /><p>{error.message}</p>
          <Button variant="outline" className="h-11" onClick={() => { persona.recargar(); roles.recargar() }}>Reintentar</Button>
        </div>
      </SectionPanel>
    )
  }
  return (
    <Formulario
      key={persona.datos?.id ?? 'nueva'}
      persona={persona.datos}
      roles={roles.datos}
      onBack={onBack}
      onDirtyChange={onDirtyChange}
      onAlta={(p, clave) => { onDirtyChange?.(false); setAlta({ persona: p, clave }) }}
    />
  )
}

function Formulario({ persona, roles, onBack, onDirtyChange, onAlta }) {
  const nueva = !persona
  const { sesion } = useSesion()
  const propiedades = sesion?.propiedades ?? []
  const inicial = {
    usuario: '', nombre: persona?.nombre ?? '', correo: persona?.correo ?? '',
    rol: persona?.rol ?? 'recepcion', propiedades: persona?.propiedades ?? [],
  }
  const [form, setForm] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const rolElegido = roles.find(r => r.clave === form.rol)
  const todas = rolElegido?.permisos.some(p => p.clave === 'propiedades.todas')
  const dirty = JSON.stringify(form) !== JSON.stringify(inicial)
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const alternar = id => setForm(f => ({ ...f, propiedades: f.propiedades.includes(id) ? f.propiedades.filter(x => x !== id) : [...f.propiedades, id] }))

  const guardar = async e => {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    const base = { nombre: form.nombre, correo: form.correo, rol: form.rol, propiedades: todas ? [] : form.propiedades }
    try {
      if (nueva) {
        const clave = claveTemporal()
        const p = await personalApi.crear({ ...base, usuario: form.usuario, clave_temporal: clave })
        toast.success(`${p.nombre} dado de alta`)
        onAlta(p, clave)
      } else {
        await personalApi.editar(persona.id, base)
        toast.success('Cambios guardados', { description: 'Si cambiaste su rol o propiedades, se cerraron sus sesiones.' })
        onDirtyChange?.(false)
        onBack()
      }
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  const acciones = (
    <>
      <Button type="button" variant="outline" className="h-11" onClick={onBack}>Cancelar</Button>
      <Button type="submit" form="persona-form" className="h-11" disabled={guardando || !dirty || (!todas && form.propiedades.length === 0)}>
        {nueva ? <UserPlusIcon size={16} weight="bold" aria-hidden="true" /> : <FloppyDiskIcon size={16} weight="bold" aria-hidden="true" />}
        {nueva ? 'Dar de alta' : 'Guardar cambios'}
      </Button>
    </>
  )

  return (
    <SectionPanel
      eyebrow="Equipo"
      title={nueva ? <>Nueva <em>persona</em></> : <>Editar a <em>{persona.nombre}</em></>}
      subtitle={nueva
        ? 'Al darla de alta se le asigna una contraseña temporal que verás aquí; al entrar tendrá que cambiarla.'
        : `Usuario: ${persona.usuario}. Cambiar su rol o sus propiedades cierra sus sesiones para que rija al instante.`}
      onBack={onBack}
      dirty={dirty}
      actions={acciones}
    >
      <form id="persona-form" onSubmit={guardar} className={s.columnas}>
        <section className={s.tarjeta} aria-labelledby="p-datos">
          <h2 className={s.titulo} id="p-datos">Datos</h2>
          {nueva && (
            <div className={s.campo}>
              <Label htmlFor="p-usuario">Usuario (para entrar)</Label>
              <Input id="p-usuario" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{2,39}" autoComplete="off"
                placeholder="ana.pech" value={form.usuario} onChange={set('usuario')} className="h-11" />
              <span className={s.ayuda}>Letras, números, punto, guion o guion bajo. No se puede cambiar después.</span>
            </div>
          )}
          <div className={s.campo}>
            <Label htmlFor="p-nombre">Nombre completo</Label>
            <Input id="p-nombre" required minLength={2} maxLength={120} value={form.nombre} onChange={set('nombre')} className="h-11" />
          </div>
          <div className={s.campo}>
            <Label htmlFor="p-correo">Correo</Label>
            <Input id="p-correo" type="email" required maxLength={254} value={form.correo} onChange={set('correo')} className="h-11" />
          </div>
        </section>

        <section className={s.tarjeta} aria-labelledby="p-acceso">
          <h2 className={s.titulo} id="p-acceso">Acceso</h2>
          <div className={s.campo}>
            <span className="text-sm font-medium" id="p-rol">Rol</span>
            <Selector ariaLabel="Rol" value={form.rol} onChange={v => setForm(f => ({ ...f, rol: v }))}
              opciones={opcionesDeRol(roles)} />
            {rolElegido && (
              <span className={s.ayuda}>
                {rolElegido.permisos.length
                  ? `Puede: ${rolElegido.permisos.map(p => p.descripcion.toLowerCase()).join(', ')}.`
                  : 'Sin permisos (módulo apagado).'}
              </span>
            )}
          </div>
          <fieldset className={s.campo}>
            <legend className="text-sm font-medium">Propiedades</legend>
            {todas ? (
              <p className={s.ayuda}>Este rol ve todas las propiedades.</p>
            ) : (
              <>
                {propiedades.map(p => (
                  <label key={p.id} className={s.casilla}>
                    <input type="checkbox" checked={form.propiedades.includes(p.id)} onChange={() => alternar(p.id)} />
                    {p.nombre}, {p.lugar.split(',')[0]}
                  </label>
                ))}
                {form.propiedades.length === 0 && <span className={s.ayuda}>Elige al menos una.</span>}
              </>
            )}
          </fieldset>
        </section>
        {error && <p className={s.error} role="alert">{error}</p>}
      </form>
    </SectionPanel>
  )
}

/** Tras el alta: la contraseña temporal, aquí mismo y una sola vez. */
function AltaLista({ alta, onBack, onOtra }) {
  const copiar = async () => {
    try { await navigator.clipboard.writeText(alta.clave); toast.success('Contraseña copiada') } catch { toast.error('No se pudo copiar: cópiala a mano') }
  }
  return (
    <SectionPanel eyebrow="Equipo" title={<>{alta.persona.nombre} <em>ya tiene acceso</em></>} onBack={onBack}>
      <section className={s.tarjeta} aria-labelledby="p-clave">
        <h2 className={s.titulo} id="p-clave">Contraseña temporal</h2>
        <p className={s.ayuda}>
          Dásela en persona o por un medio seguro. Solo la verás ahora: al salir de esta pantalla no se puede volver a mostrar. Al entrar, se le pedirá cambiarla.
        </p>
        <div className={s.clave}>
          <code aria-label="Contraseña temporal">{alta.clave}</code>
          <Button type="button" variant="outline" className="h-11" onClick={copiar}><CopyIcon size={16} weight="bold" /> Copiar</Button>
        </div>
        <p className={s.ayuda}>Usuario: <strong>{alta.persona.usuario}</strong></p>
        <div className={s.botones}>
          <Button type="button" className="h-11" onClick={onBack}><UsersThreeIcon size={16} weight="bold" /> Ir al personal</Button>
          <Button type="button" variant="outline" className="h-11" onClick={onOtra}><UserPlusIcon size={16} weight="bold" /> Dar de alta a otra persona</Button>
        </div>
      </section>
    </SectionPanel>
  )
}
