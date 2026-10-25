import { ArrowSquareOutIcon, ListIcon, UserIcon, UserCircleIcon, GearSixIcon, SignOutIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import RubberSegment from '@/components/bits/RubberSegment'
import BellToggle from '@/components/bits/BellToggle'
import Wordmark from '@/components/marca/Wordmark'
import BotonTema from '@/components/marca/BotonTema'
import Pista, { GrupoPistas } from '@/components/marca/Pista'
import { useAvisos } from '../avisos'
import { deshabilitada, permitida } from '../modulos'
import { PRODUCTO } from '@/lib/producto'
import { useSesion } from '@/lib/sesion'
import ConfirmarSalida from '@/components/marca/ConfirmarSalida'
import s from './TopNav.module.css'

const NAV_ITEMS = [
  { value: 'dashboard', label: 'Tablero' },
  { value: 'calendar',  label: 'Reservaciones' },
  { value: 'users',     label: 'Equipo' },
  { value: 'shop',      label: 'Boutique' },
]

export default function TopNav({ page, onNavigate, onToggleSidebar }) {
  const { sinLeer } = useAvisos()
  const { sesion } = useSesion()
  const enAvisos = page === 'notifications'
  // Si la página no está en esta barra (Avisos, Configuración…), RubberSegment
  // queda sin selección: nada resaltado y cualquier opción navega.

  return (
    <header className={s.topnav}>
      {/* Hamburguesa: solo en tablet/móvil (CSS) */}
      <Button variant="ghost" size="icon" className={s.hamburger} onClick={onToggleSidebar} aria-label="Alternar menú lateral">
        <ListIcon size={22} weight="bold" />
      </Button>

      {/* Logo */}
      <button className={s.logo} onClick={() => onNavigate('dashboard')} aria-label="Hoteles Frida, tablero">
        <Wordmark tamano={1.15} />
        <span className={`rotulo ${s.logoSub}`}>Admin</span>
      </button>

      {/* Navegación: RubberSegment (React Bits), pulgar elástico que se arrastra */}
      <nav className={s.desktopNav} aria-label="Navegación del panel">
        <RubberSegment
          items={NAV_ITEMS.map(i => ({ ...i, disabled: deshabilitada(i.value) || !permitida(i.value, sesion) }))}
          value={page}
          onChange={v => onNavigate(v)}
          aria-label="Secciones del panel"
          size="md"
          radius={999}
          trackColor="var(--muted)"
          thumbColor="var(--primary)"
          textColor="var(--muted-foreground)"
          activeTextColor="var(--primary-foreground)"
        />
      </nav>

      {/* Acciones: WarmTooltip en grupo (tras la primera, las vecinas abren al instante) */}
      <div className={s.actions}>
        <GrupoPistas>
          {PRODUCTO.websitePublica && (
          <Pista contenido="Ver sitio público">
            <Button variant="ghost" asChild className={s.verSitio}>
              <Link to="/">
                <ArrowSquareOutIcon size={16} weight="bold" />
                <span className={s.verSitioLabel}>Ver sitio</span>
              </Link>
            </Button>
          </Pista>
          )}

          <BotonTema />

          {/* BellToggle: suena y lleva a la sección de Avisos; queda "encendida"
              mientras se está en ella. El contador sale del almacén de avisos. */}
          <Pista contenido={sinLeer ? `${sinLeer} aviso${sinLeer !== 1 ? 's' : ''} sin leer` : 'Sin avisos nuevos'}>
            <span className={s.campana}>
              <BellToggle
                offLabel="Avisos"
                onLabel="Avisos"
                label={sinLeer ? `Avisos, ${sinLeer} sin leer` : 'Avisos'}
                size="sm"
                badge={false}
                pressed={enAvisos}
                onChange={() => { if (!enAvisos) onNavigate('notifications') }}
                color="var(--foreground)"
                background="var(--muted)"
                onColor="var(--primary-foreground)"
                onBackground="var(--primary)"
              />
              {/* Insignia propia, fuera del botón: la de BellToggle queda recortada
                  por el clip-path con el que el botón anima su ancho. */}
              <AnimatePresence initial={false}>
                {sinLeer > 0 && (
                  <motion.span
                    key={sinLeer}
                    className={s.insignia}
                    aria-hidden="true"
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                  >
                    {sinLeer > 9 ? '9+' : sinLeer}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </Pista>

          <MenuPerfil onNavigate={onNavigate} />
        </GrupoPistas>
      </div>
    </header>
  )
}

/* ── Avatar: menú de perfil. Cerrar sesión pregunta antes de salir. ── */
function MenuPerfil({ onNavigate }) {
  const { sesion } = useSesion()
  const [abierto, setAbierto] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const ir = destino => { setAbierto(false); onNavigate(destino) }
  return (
    <>
      <Popover open={abierto} onOpenChange={setAbierto}>
        <Pista contenido="Mi perfil">
          <PopoverTrigger asChild>
            <button className={s.avatar} aria-label="Menú de perfil">
              <UserIcon size={18} weight="bold" />
            </button>
          </PopoverTrigger>
        </Pista>
        <PopoverContent align="end" className="w-60 gap-0 p-2">
          <div className={s.menuCabeza}>
            <span className={s.menuNombre}>{sesion?.nombre}</span>
            <span className={s.menuCorreo}>{sesion?.correo}</span>
          </div>
          <button className={s.menuItem} onClick={() => ir('account')}><UserCircleIcon size={18} /> Mi cuenta</button>
          <button className={s.menuItem} onClick={() => ir('config')}><GearSixIcon size={18} /> Configuración</button>
          <button className={`${s.menuItem} ${s.menuSalir}`} onClick={() => { setAbierto(false); setConfirmar(true) }}>
            <SignOutIcon size={18} /> Cerrar sesión
          </button>
        </PopoverContent>
      </Popover>

      <ConfirmarSalida abierto={confirmar} onCambiar={setConfirmar} onSalir={() => onNavigate('login')} />
    </>
  )
}
