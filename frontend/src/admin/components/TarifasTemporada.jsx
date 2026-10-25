import { useState } from 'react'
import { toast } from 'sonner'
import { TrashIcon, PlusIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SkeletonCard } from '@/components/frida/Skeleton'
import SelectorFechas from '@/components/marca/SelectorFechas'
import { aISO, rangoDeParams } from '@/lib/fechas'
import { usePedido } from '@/hooks/usePedido'
import { useSesion } from '@/lib/sesion'
import { api } from '@/lib/api'
import { pesos } from '../habitaciones'
import s from './TarifasTemporada.module.css'

/*
 * Temporadas de una habitación: cada noche dentro de una se cobra a su tarifa;
 * las demás, a la base. La API impide que dos se crucen. Cambiarlas afecta solo
 * a las reservas NUEVAS (cada reserva guarda su total).
 */
const fecha = iso => new Date(`${iso}T12:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
const VACIA = { nombre: '', desde: '', hasta: '', tarifa: '' }

export default function TarifasTemporada({ habitacionId, base }) {
  const URL = `/api/admin/habitaciones/${habitacionId}/tarifas`
  const { sesion } = useSesion()
  const edita = sesion?.permisos?.includes('habitaciones.editar')
  const quita = sesion?.permisos?.includes('habitaciones.eliminar')
  const pedido = usePedido(senal => api(URL, { senal }), [habitacionId])
  const [f, setF] = useState(VACIA)
  const [guardando, setGuardando] = useState(false)
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }))

  const agregar = async e => {
    e.preventDefault()
    setGuardando(true)
    try {
      await api(URL, { metodo: 'POST', cuerpo: { nombre: f.nombre, desde: f.desde, hasta: f.hasta, tarifa_centavos: Math.round(Number(f.tarifa) * 100) } })
      toast.success('Temporada agregada', { description: 'Aplica a las reservas nuevas.' })
      setF(VACIA)
      pedido.recargar()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setGuardando(false)
    }
  }
  const quitar = async t => {
    try {
      await api(`${URL}/${t.id}`, { metodo: 'DELETE' })
      pedido.recargar()
      toast.success(`«${t.nombre}» quitada`, {
        action: { label: 'Deshacer', onClick: () => api(`${URL}/${t.id}/restaurar`, { metodo: 'POST' }).then(pedido.recargar, e => toast.error(e.message)) },
      })
    } catch (err) { toast.error(err.message) }
  }

  return (
    <section className={s.caja} aria-labelledby="t-temporadas">
      <h2 className={s.titulo} id="t-temporadas">Tarifas de temporada</h2>
      <p className={s.ayuda}>Fuera de estas fechas se cobra la tarifa base ({pesos(base)} por noche). El fin es la primera noche que ya no lleva la tarifa.</p>
      {pedido.cargando ? <SkeletonCard height="80px" /> : pedido.error ? <p role="alert">{pedido.error.message}</p> : (
        pedido.datos.length === 0 ? <p className={s.ayuda}>Sin temporadas: todas las noches a la tarifa base.</p> : (
          <ul className={s.lista}>
            {pedido.datos.map(t => (
              <li key={t.id}>
                <div>
                  <strong>{t.nombre}</strong>
                  <span>{fecha(t.desde)} → {fecha(t.hasta)}</span>
                </div>
                <strong>{pesos(t.tarifa_centavos)}</strong>
                {quita && (
                  <Button type="button" variant="outline" size="icon" aria-label={`Quitar ${t.nombre}`} onClick={() => quitar(t)}>
                    <TrashIcon size={16} weight="bold" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )
      )}
      {edita && (
        <form className={s.formulario} onSubmit={agregar}>
          <div className={s.campo}><Label htmlFor="tt-nombre">Nombre</Label>
            <Input id="tt-nombre" required minLength={2} maxLength={80} placeholder="Semana Santa" value={f.nombre} onChange={set('nombre')} className="h-11" /></div>
          <div className={s.campo}><Label htmlFor="tt-periodo">Periodo (primera noche → fin)</Label>
            <SelectorFechas id="tt-periodo" ariaLabel="Periodo de la temporada" textos={{ vacio: 'Primera noche → Fin', sinFin: 'Fin' }}
              value={rangoDeParams(f.desde, f.hasta)} onChange={r => setF(x => ({ ...x, desde: aISO(r.from), hasta: aISO(r.to) }))} /></div>
          <div className={s.campo}><Label htmlFor="tt-tarifa">Por noche (MXN)</Label>
            <Input id="tt-tarifa" type="number" required min="1" step="0.01" value={f.tarifa} onChange={set('tarifa')} className="h-11" /></div>
          <Button type="submit" disabled={guardando || !f.desde || !f.hasta}><PlusIcon size={16} weight="bold" /> Agregar</Button>
        </form>
      )}
    </section>
  )
}
