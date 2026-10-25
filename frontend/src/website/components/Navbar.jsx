import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { UserCircleIcon, ListIcon, ArrowRightIcon, SquaresFourIcon, SignOutIcon, SignInIcon, SuitcaseRollingIcon } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import ConfirmarSalida from '@/components/marca/ConfirmarSalida'
import BotonDestacado from '@/components/marca/BotonDestacado'
import BotonTema from '@/components/marca/BotonTema'
import Pista, { GrupoPistas } from '@/components/marca/Pista'
import Wordmark from '@/components/marca/Wordmark'
import { useTheme } from '@/context/ThemeContext'
import { useSesion, esPersonal, rutaSalir } from '@/lib/sesion'
import s from './Navbar.module.css'

// Enlaces reales (<a href>): clic medio, abrir en pestaña nueva y copiar enlace funcionan.
const LINKS = [
  { to: '/',              label: 'Inicio',       activo: l => l.pathname === '/' && l.hash !== '#sucursales' },
  { to: '/#sucursales',   label: 'Destinos',     activo: l => l.pathname === '/' && l.hash === '#sucursales' },
  { to: '/habitaciones',  label: 'Habitaciones', activo: l => l.pathname.startsWith('/habitaciones') },
  { to: '/mi-cuenta',     label: 'Mis reservas', activo: l => l.pathname === '/mi-cuenta' },
]

export default function Navbar({ overHero }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const { reduceMotion } = useTheme()
  const { verificando, sesion } = useSesion()
  const [menuCuenta, setMenuCuenta] = useState(false)
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  // Entrar desde la barra NO recuerda la página: el huésped llega a Mis
  // reservas y el personal al panel. (Volver a una pantalla solo pasa cuando
  // se intentó abrir una protegida: ver rutaEntrar en lib/sesion.js.)
  const salir = () => navigate(rutaSalir('/'), { replace: true })

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      {/* layoutRoot: la barra es fija; sin esto la raya del enlace activo
          "volaría" desde donde estaba la página con scroll. */}
      <motion.nav layoutRoot className={`${s.navbar} ${overHero ? s.sobreHero : s.solida}`}>
        {/* Logo */}
        <Link to="/" className={s.logo} aria-label="Hoteles Frida, inicio">
          <Wordmark tono={overHero ? 'noche' : 'normal'} tamano={1.35} />
        </Link>

        {/* Desktop nav links */}
        <ul className={s.desktopLinks}>
          {LINKS.map(link => (
            <li key={link.label}>
              <Link
                to={link.to}
                className={`${s.link} ${link.activo(location) ? s.linkActivo : ''}`}
                aria-current={link.activo(location) ? 'page' : undefined}
              >
                {link.label}
                {/* Raya bajo el enlace activo: se desliza de uno a otro */}
                {link.activo(location) && (
                  <motion.span
                    layoutId="nav-raya"
                    className={s.raya}
                    transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 36 }}
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className={s.actions}>
          <GrupoPistas>
          <BotonTema className={s.iconBtn} />

          <BotonDestacado className={s.reservarBtn} onClick={() => navigate('/habitaciones')}>
            Reservar <ArrowRightIcon size={16} weight="bold" />
          </BotonDestacado>

          {verificando ? (
            // Mientras se verifica: hueco del mismo tamaño (sin parpadeo entre
            // "Iniciar sesión" y el menú de la cuenta)
            <span className={s.huecoCuenta} aria-hidden="true" />
          ) : !sesion ? (
            <Pista contenido="Iniciar sesión">
              <Button variant="ghost" size="icon" className={s.iconBtn} asChild>
                <Link to="/entrar" aria-label="Iniciar sesión"><UserCircleIcon size={22} /></Link>
              </Button>
            </Pista>
          ) : (
            // Con sesión: menú de la cuenta (mismo patrón que el avatar del panel)
            <Popover open={menuCuenta} onOpenChange={setMenuCuenta}>
              <Pista contenido={sesion.nombre}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className={s.iconBtn} aria-label={`Menú de la cuenta de ${sesion.nombre}`}>
                    <UserCircleIcon size={22} weight="fill" />
                  </Button>
                </PopoverTrigger>
              </Pista>
              <PopoverContent align="end" className="w-60 gap-0 p-2">
                <div className={s.menuCabeza}>
                  <span className={s.menuNombre}>{sesion.nombre}</span>
                  <span className={s.menuCorreo}>{sesion.correo}</span>
                </div>
                <Link to="/mi-cuenta" className={s.menuItem} onClick={() => setMenuCuenta(false)}>
                  <SuitcaseRollingIcon size={18} /> Mis reservas
                </Link>
                {esPersonal(sesion) && (
                  <Link to="/admin" className={s.menuItem} onClick={() => setMenuCuenta(false)}>
                    <SquaresFourIcon size={18} /> Ir al panel
                  </Link>
                )}
                <button type="button" className={`${s.menuItem} ${s.menuSalir}`} onClick={() => { setMenuCuenta(false); setConfirmarSalida(true) }}>
                  <SignOutIcon size={18} /> Cerrar sesión
                </button>
              </PopoverContent>
            </Popover>
          )}
          </GrupoPistas>

          {/* Menú móvil: Sheet de shadcn (foco atrapado, Esc, overlay) */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={`${s.iconBtn} ${s.hamburger}`} aria-label="Abrir menú">
                <ListIcon size={24} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[82vw] max-w-sm">
              <SheetHeader>
                <SheetTitle className="sr-only">Menú</SheetTitle>
                <Wordmark tamano={1.5} />
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4">
                {LINKS.map(link => (
                  <Link
                    key={link.label}
                    to={link.to}
                    className={`${s.mobileItem} ${link.activo(location) ? s.mobileItemActive : ''}`}
                    aria-current={link.activo(location) ? 'page' : undefined}
                    onClick={closeMenu}
                  >
                    {link.label}
                  </Link>
                ))}
                {verificando ? null : sesion ? (
                  <>
                    {esPersonal(sesion) && (
                      <Link to="/admin" className={s.mobileItem} onClick={closeMenu}>Ir al panel</Link>
                    )}
                    <button type="button" className={`${s.mobileItem} ${s.menuSalir}`} onClick={() => { closeMenu(); setConfirmarSalida(true) }}>
                      Cerrar sesión ({sesion.nombre.split(' ')[0]})
                    </button>
                  </>
                ) : (
                  <Link to="/entrar" className={s.mobileItem} onClick={closeMenu}>
                    <SignInIcon size={18} className="mr-2 inline" /> Iniciar sesión
                  </Link>
                )}
                <BotonDestacado className="mt-4 w-full" tamano="lg" onClick={() => { closeMenu(); navigate('/habitaciones') }}>
                  Reservar ahora
                </BotonDestacado>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </motion.nav>
      <ConfirmarSalida abierto={confirmarSalida} onCambiar={setConfirmarSalida} onSalir={salir} />
    </>
  )
}
