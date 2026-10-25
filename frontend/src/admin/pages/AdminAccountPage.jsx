import { ArrowLeftIcon, BuildingsIcon, ClockIcon, EnvelopeSimpleIcon, IdentificationBadgeIcon, ShieldCheckIcon, PersonArmsSpreadIcon } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useSesion } from '@/lib/sesion'
import s from './AdminAccountPage.module.css'

/*
 * Mi cuenta: quién soy en el panel, tal como lo dice la sesión (GET /api/auth/yo).
 * Nombre, correo, rol y propiedades los cambia un gerente en Personal; la
 * contraseña y las sesiones, uno mismo en Configuración → Seguridad.
 */

const ROL = { gerente: 'Gerente', recepcion: 'Recepción', restaurante: 'Restaurante' }
const iniciales = nombre => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')
const hora = iso => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

/** Los datos de la cuenta (la sesión): Mi cuenta y Configuración → Perfil. */
export function DatosCuenta() {
  const { sesion } = useSesion()
  if (!sesion) return null // RutaProtegida no monta el panel sin sesión
  const datos = [
    { Icono: IdentificationBadgeIcon, label: 'Usuario', value: sesion.usuario },
    { Icono: EnvelopeSimpleIcon, label: 'Correo', value: sesion.correo },
    { Icono: ShieldCheckIcon, label: 'Rol', value: ROL[sesion.rol] ?? sesion.rol },
    {
      Icono: BuildingsIcon,
      label: sesion.propiedades.length === 1 ? 'Propiedad' : 'Propiedades',
      value: sesion.todas_las_propiedades ? 'Todas' : sesion.propiedades.map(p => p.nombre).join(', '),
    },
    { Icono: ClockIcon, label: 'Esta sesión', value: `Termina a las ${hora(sesion.vence)} (12 h como máximo)` },
  ]
  return (
    <>
      <dl className={s.datos}>
        {datos.map(({ Icono, label, value }) => (
          <div key={label} className={s.dato}>
            <Icono size={22} weight="duotone" className={s.icono} aria-hidden="true" />
            <dt className={s.etiqueta}>{label}</dt>
            <dd className={s.valor}>{value}</dd>
          </div>
        ))}
      </dl>
      <p className={s.nota}>Tu nombre, correo, rol y propiedades los cambia un gerente en Personal.</p>
    </>
  )
}

export default function AdminAccountPage({ onBack }) {
  const { sesion } = useSesion()
  const navigate = useNavigate()
  if (!sesion) return null
  const ir = pestana => navigate(`/admin/configuracion?pestana=${pestana}`)
  return (
    <div className={s.pagina}>
      <Button variant="ghost" onClick={onBack} className="h-11 w-fit"><ArrowLeftIcon size={18} /> Regresar</Button>
      <div className={s.perfil}>
        <span className={s.avatar} aria-hidden="true">{iniciales(sesion.nombre)}</span>
        <div>
          <span className="admin-page-eyebrow">Mi cuenta</span>
          <h1 className="admin-page-title">{sesion.nombre}</h1>
        </div>
      </div>
      {sesion.debe_cambiar_clave && (
        <p className={s.aviso} role="status">Estás usando una contraseña temporal. Cámbiala en Seguridad.</p>
      )}
      <DatosCuenta />
      <div className={s.acciones}>
        <Button variant="outline" className="h-11" onClick={() => ir('seguridad')}><ShieldCheckIcon size={18} /> Contraseña y sesiones</Button>
        <Button variant="outline" className="h-11" onClick={() => ir('accesibilidad')}><PersonArmsSpreadIcon size={18} /> Accesibilidad</Button>
      </div>
    </div>
  )
}
