import { useState } from 'react'
import { PencilSimpleIcon, PlusIcon } from '@phosphor-icons/react'
import { toast } from '@/admin/toast'
import { Button } from '@/components/coss/button'
import { Input } from '@/components/coss/input'
import { Label } from '@/components/coss/label'
import { SkeletonCard } from '@/components/frida/Skeleton'
import { Florecita } from '@/components/marca/Wordmark'
import { usePedido } from '@/hooks/usePedido'
import { api } from '@/lib/api'
import { refrescarSesion } from '@/lib/sesion'
import { florDeLugar } from '../propiedadActual'

/*
 * Propiedades (sucursales). Solo el dueño (`propiedades.gestionar`) las da de alta o las edita;
 * no se borran porque tienen habitaciones, reservas y personal. Tras cada cambio se vuelve a
 * leer la sesión: así el selector de propiedad de la barra lateral ya la muestra.
 * A un gerente se le asigna desde Personal.
 */
const BASE = '/api/admin/propiedades'

export default function PropiedadesConfig() {
  const lista = usePedido(senal => api(BASE, { senal }), [])
  const [editando, setEditando] = useState(null) // id, o 'nueva'

  const guardar = async (id, datos) => {
    try {
      await api(id === 'nueva' ? BASE : `${BASE}/${id}`, { metodo: id === 'nueva' ? 'POST' : 'PUT', cuerpo: datos })
      toast.success(id === 'nueva' ? 'Propiedad dada de alta' : 'Propiedad actualizada', {
        description: id === 'nueva' ? `${datos.nombre}. Ya puedes darle habitaciones y asignarla a un gerente.` : datos.nombre,
      })
      setEditando(null)
      lista.recargar()
      refrescarSesion()
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (lista.cargando) return <div className="grid gap-3">{[0, 1].map(i => <SkeletonCard key={i} height="64px" />)}</div>
  if (lista.error) return <p role="alert" className="text-destructive-foreground text-sm">{lista.error.message}</p>

  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-sm">Las sucursales del hotel. Cada habitación pertenece a una, y a cada gerente se le asignan desde Personal.</p>
      <ul className="grid gap-2">
        {lista.datos.map(p => (
          <li key={p.id} className="rounded-xl bg-card px-4 py-3 shadow-[inset_0_0_0_1px_var(--border)]">
            {editando === p.id
              ? <Formulario inicial={p} onGuardar={d => guardar(p.id, d)} onCancelar={() => setEditando(null)} />
              : (
                <div className="flex items-center gap-3">
                  <Florecita color={florDeLugar(p.lugar)} tamano={18} />
                  <span className="grid min-w-0 flex-1">
                    <b className="truncate font-semibold">{p.nombre}</b>
                    <span className="truncate text-muted-foreground text-sm">{p.lugar}</span>
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setEditando(p.id)}><PencilSimpleIcon size={15} /> Editar</Button>
                </div>
              )}
          </li>
        ))}
      </ul>
      {editando === 'nueva'
        ? <div className="rounded-xl bg-card px-4 py-3 shadow-[inset_0_0_0_1px_var(--border)]"><Formulario onGuardar={d => guardar('nueva', d)} onCancelar={() => setEditando(null)} /></div>
        : <Button variant="outline" className="justify-self-start" onClick={() => setEditando('nueva')}><PlusIcon size={16} weight="bold" /> Nueva propiedad</Button>}
    </div>
  )
}

function Formulario({ inicial, onGuardar, onCancelar }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [lugar, setLugar] = useState(inicial?.lugar ?? '')
  const [guardando, setGuardando] = useState(false)
  const listo = nombre.trim().length >= 2 && lugar.trim().length >= 2
  const enviar = async e => {
    e.preventDefault()
    setGuardando(true)
    await onGuardar({ nombre: nombre.trim(), lugar: lugar.trim() })
    setGuardando(false)
  }
  return (
    <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-1.5">
        <Label htmlFor="prop-nombre">Nombre</Label>
        <Input id="prop-nombre" autoFocus value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Casa Frida" maxLength={120} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="prop-lugar">Lugar</Label>
        <Input id="prop-lugar" value={lugar} onChange={e => setLugar(e.target.value)} placeholder="Chuburná, Yucatán" maxLength={120} />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={!listo || guardando}>{inicial ? 'Guardar' : 'Dar de alta'}</Button>
        <Button type="button" variant="ghost" onClick={onCancelar}>Cancelar</Button>
      </div>
    </form>
  )
}
