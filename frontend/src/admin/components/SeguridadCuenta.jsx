import { useState } from 'react'
import { toast } from 'sonner'
import { DesktopIcon, DeviceMobileIcon, XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SkeletonCard } from '@/components/frida/Skeleton'
import { usePedido } from '@/hooks/usePedido'
import { refrescarSesion, useSesion } from '@/lib/sesion'
import { cuentaApi } from '../personal'
import s from './SeguridadCuenta.module.css'

/*
 * Seguridad de la propia cuenta (fase 3e), todo contra la API:
 *  - cambiar la contraseña (pide la actual; cierra las demás sesiones);
 *  - las sesiones abiertas de verdad, y cerrar las que no sean esta.
 * (Antes había aquí un 2FA, alertas y sesiones de muestra que no existían.)
 */

const fecha = iso => new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const dispositivo = agente => {
  if (!agente) return { nombre: 'Navegador desconocido', movil: false }
  const movil = /iphone|android|mobile/i.test(agente)
  const nav = /edg/i.test(agente) ? 'Edge' : /chrome|crios/i.test(agente) ? 'Chrome' : /firefox|fxios/i.test(agente) ? 'Firefox' : /safari/i.test(agente) ? 'Safari' : 'Navegador'
  const so = /iphone|ipad/i.test(agente) ? 'iPhone' : /android/i.test(agente) ? 'Android' : /mac os/i.test(agente) ? 'macOS' : /windows/i.test(agente) ? 'Windows' : /linux/i.test(agente) ? 'Linux' : ''
  return { nombre: so ? `${nav} en ${so}` : nav, movil }
}

export default function SeguridadCuenta() {
  const { sesion } = useSesion()
  return (
    <div className={s.contenedor}>
      {sesion?.debe_cambiar_clave && (
        <p className={s.aviso} role="status">Estás usando una contraseña temporal. Cámbiala por una que solo tú conozcas.</p>
      )}
      <CambiarClave />
      <Sesiones />
    </div>
  )
}

function CambiarClave() {
  const [form, setForm] = useState({ actual: '', nueva: '', repetir: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const distintas = form.repetir && form.nueva !== form.repetir

  const guardar = async e => {
    e.preventDefault()
    if (distintas) return
    setGuardando(true)
    setError(null)
    try {
      await cuentaApi.cambiarClave(form.actual, form.nueva)
      setForm({ actual: '', nueva: '', repetir: '' })
      toast.success('Contraseña cambiada', { description: 'Cerramos tus otras sesiones por seguridad.' })
      refrescarSesion()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className={s.tarjeta} onSubmit={guardar}>
      <h2 className={s.titulo}>Cambiar contraseña</h2>
      <p className={s.ayuda}>Al menos 12 caracteres. Una frase larga es más segura que símbolos raros.</p>
      <div className={s.campo}>
        <Label htmlFor="c-actual">Contraseña actual</Label>
        <Input id="c-actual" type="password" required autoComplete="current-password" maxLength={256} value={form.actual} onChange={set('actual')} className="h-11" />
      </div>
      <div className={s.campo}>
        <Label htmlFor="c-nueva">Contraseña nueva</Label>
        <Input id="c-nueva" type="password" required minLength={12} autoComplete="new-password" maxLength={256} value={form.nueva} onChange={set('nueva')} className="h-11" />
      </div>
      <div className={s.campo}>
        <Label htmlFor="c-repetir">Repite la nueva</Label>
        <Input id="c-repetir" type="password" required autoComplete="new-password" maxLength={256} value={form.repetir} onChange={set('repetir')}
          aria-invalid={distintas || undefined} className="h-11" />
        {distintas && <span className={s.error}>No coincide con la nueva.</span>}
      </div>
      {error && <p className={s.error} role="alert">{error}</p>}
      <div><Button type="submit" disabled={guardando || distintas}>Cambiar contraseña</Button></div>
    </form>
  )
}

function Sesiones() {
  const pedido = usePedido(senal => cuentaApi.sesiones(senal), [])
  const cerrar = async (ids, texto) => {
    try {
      for (const id of ids) await cuentaApi.cerrarSesion(id)
      toast.success(texto)
    } catch (e) {
      toast.error(e.message)
    } finally {
      pedido.recargar()
    }
  }
  const otras = (pedido.datos ?? []).filter(x => !x.actual)

  return (
    <section className={s.tarjeta} aria-labelledby="t-sesiones">
      <div className={s.cabecera}>
        <h2 className={s.titulo} id="t-sesiones">Sesiones abiertas</h2>
        {otras.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => cerrar(otras.map(x => x.id), 'Se cerraron tus otras sesiones')}>Cerrar las demás</Button>
        )}
      </div>
      {pedido.cargando ? <SkeletonCard height="120px" /> : pedido.error ? (
        <p className={s.error} role="alert">{pedido.error.message}</p>
      ) : (
        <ul className={s.sesiones}>
          {pedido.datos.map(x => {
            const d = dispositivo(x.agente)
            const Icono = d.movil ? DeviceMobileIcon : DesktopIcon
            return (
              <li key={x.id} className={s.sesion}>
                <Icono size={22} aria-hidden="true" />
                <div className={s.sesionDatos}>
                  <strong>{d.nombre}{x.actual && <span className={s.actual}>Esta sesión</span>}</strong>
                  <span>IP {x.ip ?? 'Sin dato'}. Abierta el {fecha(x.creada)}; vence el {fecha(x.vence)}</span>
                </div>
                {!x.actual && (
                  <Button variant="outline" size="icon" aria-label={`Cerrar la sesión de ${d.nombre}`} onClick={() => cerrar([x.id], 'Sesión cerrada')}>
                    <XIcon size={16} weight="bold" />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
