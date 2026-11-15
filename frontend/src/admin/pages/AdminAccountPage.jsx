import { ShieldCheckIcon, PersonArmsSpreadIcon, CaretRightIcon } from '@phosphor-icons/react'
import SectionPanel from '../components/SectionPanel'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { PourProgress } from '@/components/devl/pour-progress'
import { Florecita } from '@/components/marca/Wordmark'
import Inicial from '../components/Inicial'
import { useSesion } from '@/lib/sesion'
import s from './AdminAccountPage.module.css'

/*
 * Mi cuenta: quién soy en el panel, tal como lo dice la sesión (GET /api/auth/yo).
 * Nombre, correo, rol y propiedades los cambia un gerente en Personal; la
 * contraseña y las sesiones, uno mismo en Configuración → Seguridad.
 */

const ROL = { gerente: 'Gerente', recepcion: 'Recepción', restaurante: 'Restaurante' }
const hora = iso => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
const SESION_H = 12 // la sesión dura 12 h como máximo (lib/sesion.js)

/** La cuenta (la sesión): Mi cuenta y Configuración → Perfil. */
export function DatosCuenta() {
  const { sesion } = useSesion()
  if (!sesion) return null // RutaProtegida no monta el panel sin sesión
  const restantes = Math.max(0, Math.min(SESION_H * 60, (new Date(sesion.vence) - Date.now()) / 60000))
  const todas = sesion.todas_las_propiedades
  return (
    <div className={s.cuenta}>
      <section className={`${s.tarjeta} ${s.perfil}`} aria-label="Perfil">
        <Inicial nombre={sesion.nombre} tamano={72} />
        <div className={s.quien}>
          <h2 className={s.nombre}>{sesion.nombre}</h2>
          <p className={s.correo}>{sesion.correo}</p>
          <div className={s.chips}>
            <Badge variant="secondary">{ROL[sesion.rol] ?? sesion.rol}</Badge>
            <span className={s.usuario}>@{sesion.usuario}</span>
          </div>
        </div>
      </section>

      <section className={`${s.tarjeta} ${s.sesion}`} aria-label="Esta sesión">
        <PourProgress
          variant="round" size={88} value={restantes} max={SESION_H * 60} label="Tiempo que le queda a la sesión"
          formatValue={p => `${Math.round((p * SESION_H) / 10) / 10} h`}
        />
        <div>
          <h2 className={s.subtitulo}>Esta sesión</h2>
          <p className={s.texto}>Termina a las {hora(sesion.vence)} (dura {SESION_H} h como máximo)</p>
        </div>
      </section>

      <section className={`${s.tarjeta} ${s.propiedades}`} aria-label="Propiedades">
        <h2 className={s.subtitulo}>{sesion.propiedades.length === 1 ? 'Propiedad' : 'Propiedades'}</h2>
        {todas && <p className={s.texto}>Tienes acceso a todas.</p>}
        <ul className={s.lista}>
          {sesion.propiedades.map(p => (
            <li key={p.id} className={s.propiedad}><Florecita tamano={14} />{p.nombre}</li>
          ))}
        </ul>
      </section>

      <p className={s.nota}>Tu nombre, correo, rol y propiedades los cambia un gerente en Personal.</p>
    </div>
  )
}

function Atajo({ Icono, titulo, texto, onClick }) {
  return (
    <button type="button" className={s.atajo} onClick={onClick}>
      <span className={s.icono} aria-hidden="true"><Icono size={20} /></span>
      <span className={s.atajoTexto}><strong>{titulo}</strong><span>{texto}</span></span>
      <CaretRightIcon size={16} aria-hidden="true" className={s.flecha} />
    </button>
  )
}

export default function AdminAccountPage({ onBack }) {
  const { sesion } = useSesion()
  const navigate = useNavigate()
  if (!sesion) return null
  const ir = pestana => navigate(`/admin/configuracion?pestana=${pestana}`)
  return (
    <SectionPanel title="Mi cuenta" onBack={onBack}>
      {sesion.debe_cambiar_clave && (
        <p className={s.aviso} role="status">Estás usando una contraseña temporal. Cámbiala en Seguridad.</p>
      )}
      <DatosCuenta />
      <div className={s.atajos}>
        <Atajo Icono={ShieldCheckIcon} titulo="Contraseña y sesiones" texto="Cambia tu contraseña y cierra sesiones abiertas" onClick={() => ir('seguridad')} />
        <Atajo Icono={PersonArmsSpreadIcon} titulo="Accesibilidad" texto="Modo oscuro, contraste, movimiento y tamaño de texto" onClick={() => ir('accesibilidad')} />
      </div>
    </SectionPanel>
  )
}
