import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  SquaresFourIcon, CalendarDotsIcon, BedIcon, UsersThreeIcon, StorefrontIcon, ReceiptIcon,
  GearSixIcon, DoorOpenIcon, FingerprintIcon, GlobeHemisphereWestIcon, UserIcon, BellIcon, SignOutIcon, CashRegisterIcon, TicketIcon, BookOpenTextIcon, ChartBarIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import Selector from '@/components/marca/Selector'
import { CoronaFlores } from '@/components/marca/Wordmark'
import { useTheme } from '@/context/ThemeContext'
import { useAvisos } from '../avisos'
import { deshabilitada, permitida } from '../modulos'
import { usePropiedadActual, elegirPropiedad } from '../propiedadActual'
import { useSesion } from '@/lib/sesion'
import Pista from '@/components/marca/Pista'
import ConfirmarSalida from '@/components/marca/ConfirmarSalida'
import s from './SideNav.module.css'

/* ── Grupos de navegación (mismos que antes) ── */
const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { key: 'dashboard', label: 'Tablero',       Icono: SquaresFourIcon,  badge: null },
      { key: 'hoy',       label: 'Llegadas y salidas', Icono: DoorOpenIcon, badge: null },
      { key: 'calendar',  label: 'Reservaciones', Icono: CalendarDotsIcon, badge: null },
      { key: 'notifications', label: 'Avisos',    Icono: BellIcon,         badge: 'avisos' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { key: 'rooms', label: 'Habitaciones', Icono: BedIcon,        badge: null },
      { key: 'users', label: 'Personal',     Icono: UsersThreeIcon, badge: null },
      { key: 'externas', label: 'Otras plataformas', Icono: GlobeHemisphereWestIcon, badge: null },
      { key: 'auditoria', label: 'Auditoría', Icono: FingerprintIcon, badge: null },
    ],
  },
  {
    label: 'Restaurante',
    items: [
      { key: 'restaurante',              label: 'Punto de venta', Icono: CashRegisterIcon, badge: null },
      { key: 'restaurante-tickets',      label: 'Tickets',        Icono: TicketIcon,       badge: null },
      { key: 'restaurante-menu',         label: 'Menú',           Icono: BookOpenTextIcon, badge: null },
      { key: 'restaurante-estadisticas', label: 'Estadísticas',   Icono: ChartBarIcon,     badge: null },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { key: 'shop',  label: 'Tienda', Icono: StorefrontIcon, badge: null },
      { key: 'sales', label: 'Ventas', Icono: ReceiptIcon,    badge: null },
    ],
  },
]

/* ── Un ítem: el fondo activo es UNO solo que se desliza (layoutId) ── */
function SideItem({ item, active, onClick, reduceMotion }) {
  // Módulo apagado (admin/modulos.js): visible en gris, sin navegar. aria-disabled
  // y no `disabled`, para que la pista siga apareciendo al pasar el cursor.
  if (deshabilitada(item.key)) {
    return (
      <Pista contenido="Módulo deshabilitado: hoy el panel es solo el motor de reservas" lado="right" className="w-full">
        <button type="button" className={`${s.navItem} ${s.navItemApagado}`} aria-disabled="true" onClick={e => e.preventDefault()}>
          <span className={s.navItemIcon}><item.Icono size={18} aria-hidden="true" /></span>
          <span className={s.navItemLabel}>{item.label}</span>
        </button>
      </Pista>
    )
  }
  return (
    <button onClick={onClick} className={`${s.navItem} ${active ? s.navItemActive : ''}`} aria-current={active ? 'page' : undefined}>
      {active && (
        <motion.span
          layoutId="sidenav-activo"
          className={s.activeBg}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
        />
      )}
      <span className={s.navItemIcon}>
        <item.Icono size={18} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
      </span>
      <span className={s.navItemLabel}>{item.label}</span>
      {item.badge != null && (
        <span className={`${s.badge} ${active ? s.badgeActive : ''}`}>{item.badge}</span>
      )}
    </button>
  )
}

export default function SideNav({ page, onNavigate, isOpen }) {
  const { reduceMotion } = useTheme()
  const { valor: propiedad, opciones: propiedades } = usePropiedadActual()
  const { sinLeer } = useAvisos()
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  const { sesion } = useSesion()

  return (
    /* layoutRoot + layoutScroll: el aside es fijo y tiene scroll propio. Sin esto,
       framer-motion mide el fondo activo en coordenadas de página y, si la página
       tenía scroll al navegar, lo anima desde donde estaba "antes" (fantasma). */
    <motion.aside layoutRoot layoutScroll className={`${s.sidenav} ${isOpen ? s.sidenavOpen : ''}`}>

      {/* ── Propiedad: GlideSelect (React Bits) ── */}
      <div className={s.propertySection}>
        <div className={s.propertyHead}>
          <CoronaFlores className={s.propertyCorona} />
          <span className="rotulo">Propiedad</span>
        </div>
        <Selector ariaLabel="Propiedad" value={propiedad} onChange={elegirPropiedad} opciones={propiedades} />
      </div>

      {/* ── Grupos ── */}
      <motion.nav layoutScroll className={s.nav} aria-label="Navegación lateral">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className={s.navGroup}>
            <p className={`rotulo ${s.groupLabel}`}>{group.label}</p>
            <ul className={s.navList}>
              {group.items.filter(item => permitida(item.key, sesion)).map(item => (
                <li key={item.key}>
                  <SideItem item={item.badge === 'avisos' ? { ...item, badge: sinLeer || null } : item} active={page === item.key} onClick={() => onNavigate(item.key)} reduceMotion={reduceMotion} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </motion.nav>

      {/* ── Pie: configuración, cerrar sesión (pregunta antes) y perfil ── */}
      <div className={s.profileSection}>
        <div className={s.quickActions}>
          <Button variant="outline" size="sm" className={s.quickBtn} onClick={() => onNavigate('config')}>
            <GearSixIcon size={15} weight="bold" /> Config.
          </Button>
          <Button variant="outline" size="sm" className={`${s.quickBtn} ${s.salir}`} onClick={() => setConfirmarSalida(true)}>
            <SignOutIcon size={15} weight="bold" /> Cerrar sesión
          </Button>
        </div>

        <button className={s.profileRow} onClick={() => onNavigate('config')}>
          <span className={s.avatar}><UserIcon size={17} weight="bold" /></span>
          <span className={s.profileInfo}>
            <span className={s.profileName}>{sesion?.nombre}</span>
            <span className={s.profileEmail}>{sesion?.correo}</span>
          </span>
          <span className={s.onlineDot} aria-label="En línea" />
        </button>
      </div>
      <ConfirmarSalida abierto={confirmarSalida} onCambiar={setConfirmarSalida} onSalir={() => onNavigate('login')} />
    </motion.aside>
  )
}
