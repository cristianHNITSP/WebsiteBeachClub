import { useId, useState } from 'react'
import { LayoutGroup, motion } from 'motion/react'
import {
  BedDoubleIcon, BellIcon, CalendarDaysIcon, CheckIcon, ChevronDownIcon, DoorOpenIcon, FingerprintIcon, GlobeIcon,
  LayoutGridIcon, LogOutIcon, PanelLeftIcon, SettingsIcon, StoreIcon, UserRoundIcon, UsersIcon, UtensilsCrossedIcon, XIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/coss/avatar'
import { Button } from '@/components/coss/button'
import { Kbd } from '@/components/coss/kbd'
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/components/coss/menu'
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/coss/tooltip'
import { cn } from '@/lib/utils'
import { useSesion } from '@/lib/sesion'
import ConfirmarSalida from '@/components/marca/ConfirmarSalida'
import { claseVivo as vivo, marcarIconos } from '@/components/marca/iconosVivos'
import Wordmark, { CoronaFlores, Florecita } from '@/components/marca/Wordmark'
import { useAvisos } from '../avisos'
import { deshabilitada, permitida } from '../modulos'
import { TODAS, elegirPropiedad, florDeLugar, usePropiedadActual } from '../propiedadActual'

/*
 * Barra lateral del panel: la única navegación. Estructura y clases del
 * `inset-shell` de devl.dev (components/devl/inset-shell.jsx, instalado tal
 * cual: sus partes no se exportan, por eso se arma aquí con las mismas piezas
 * de coss). Ficha activa que se desliza (layoutId), globos al plegarse.
 */

const GRUPOS = [
  { titulo: 'Recepción', items: [
    { key: 'dashboard', label: 'Tablero', Icono: LayoutGridIcon },
    { key: 'hoy', label: 'Llegadas y salidas', Icono: DoorOpenIcon },
    { key: 'calendar', label: 'Reservaciones', Icono: CalendarDaysIcon },
    { key: 'notifications', label: 'Avisos', Icono: BellIcon, cuenta: 'avisos' },
  ] },
  { titulo: 'Operación', items: [
    { key: 'rooms', label: 'Habitaciones', Icono: BedDoubleIcon },
    { key: 'users', label: 'Personal', Icono: UsersIcon },
    { key: 'externas', label: 'Otras plataformas', Icono: GlobeIcon },
    { key: 'auditoria', label: 'Auditoría', Icono: FingerprintIcon },
  ] },
  { titulo: 'Próximamente', items: [
    { key: 'restaurante', label: 'Restaurante', Icono: UtensilsCrossedIcon },
    { key: 'shop', label: 'Tienda', Icono: StoreIcon },
  ] },
]

const florDe = o => florDeLugar(`${o?.label} ${o?.tag}`)
const iniciales = n => (n ?? '').split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase()
const resorte = { type: 'spring', stiffness: 520, damping: 40 }
const fila = 'group/row relative flex h-8 w-full cursor-pointer items-center gap-2.5 overflow-hidden rounded-lg px-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Con la barra plegada, el nombre sale en un globo a la derecha. */
function Fila({ plegada, label, tip, children }) {
  return (
    <Tooltip disabled={!plegada}>
      <TooltipTrigger render={children({ 'aria-label': plegada ? label : undefined })} />
      <TooltipPopup side="right" sideOffset={10}>{tip ?? label}</TooltipPopup>
    </Tooltip>
  )
}

/** Flor, nombre y lugar: lo mismo en la ficha y en cada fila de su menú. */
function FichaPropiedad({ opcion, todas, flor, oculto, nombre }) {
  return (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent"><Florecita color={flor} tamano={20} /></span>
      {!oculto && (
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium leading-tight">{nombre ?? (todas ? 'Todas las propiedades' : opcion?.label)}</span>
          <span className="truncate text-muted-foreground text-xs leading-tight">{opcion?.tag}</span>
        </span>
      )}
    </>
  )
}

function Etiqueta({ plegada, children, className }) {
  return (
    <span aria-hidden={plegada || undefined}
      className={cn('min-w-0 truncate transition-[opacity,translate] duration-200', plegada && 'pointer-events-none -translate-x-1 opacity-0', className)}>
      {children}
    </span>
  )
}

export default function BarraLateral({ page, onNavigate, plegada = false, onPlegar, onCerrar }) {
  const { sesion } = useSesion()
  const { sinLeer } = useAvisos()
  const { valor: propiedad, opciones } = usePropiedadActual()
  const [salir, setSalir] = useState(false)
  const pastilla = useId()
  const actual = opciones.find(o => o.value === propiedad)

  return (
    <LayoutGroup id={pastilla}>
      <div className="relative isolate flex h-full min-h-0 flex-col whitespace-nowrap">
        {/* Ramillete de la marca, muy suave, detrás del pie */}
        <span data-mece="" className="pointer-events-none absolute -bottom-6 -left-10 -z-10 block w-52 rotate-[-14deg] opacity-[0.1]"><CoronaFlores /></span>

        {/* ── Logotipo: el Wordmark de la marca, con su ADMIN ── */}
        <div className={cn('flex h-16 shrink-0 items-end gap-2 px-3 pb-2', plegada && 'justify-center px-0')}>
          <button type="button" aria-label="Reservas Frida, tablero" onClick={() => onNavigate('dashboard')} className="cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {plegada ? <CoronaFlores className="w-10" /> : <Wordmark tamano={1.15} />}
          </button>
          {!plegada && <span className="mb-0.5 rounded-full bg-accent px-2 py-0.5 font-semibold text-[0.65rem] text-accent-foreground tracking-wider">ADMIN</span>}
          {onCerrar && <Button aria-label="Cerrar menú" className="ms-auto" onClick={onCerrar} size="icon-sm" variant="ghost"><XIcon /></Button>}
        </div>

        {/* ── Propiedad: ficha y menú son la misma pieza (mismo ancho, mismas filas) ── */}
        <div className="px-2 pb-2">
          <Menu>
            <MenuTrigger aria-label={`Propiedad: ${actual?.label ?? 'Todas'}`}
              className={cn(vivo, 'group/prop flex h-12 w-full min-w-0 cursor-pointer items-center gap-2.5 overflow-hidden rounded-2xl bg-background px-2 text-left shadow-xs/5 outline-none ring-1 ring-border transition-[box-shadow] hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-ring data-popup-open:ring-primary/50', plegada && 'justify-center px-0')}>
              <FichaPropiedad opcion={actual} todas={propiedad === TODAS} flor={propiedad === TODAS ? 'var(--flor-morado)' : florDe(actual)} oculto={plegada} />
              {!plegada && <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-data-popup-open/prop:rotate-180" />}
            </MenuTrigger>
            {/* Abierta: el menú mide lo mismo que la ficha. Plegada: sale a la derecha de la barra,
                con ancho propio, en vez de caer encima del contenido. */}
            <MenuPopup side={plegada ? 'right' : 'bottom'} align="start" sideOffset={plegada ? 12 : 6}
              className={cn('rounded-2xl', plegada ? 'w-64' : 'w-(--anchor-width)')}>
              {opciones.map(o => (
                <MenuItem key={o.value} role="menuitemradio" aria-checked={o.value === propiedad} onClick={() => elegirPropiedad(o.value)}
                  className="flex h-12 items-center gap-2.5 rounded-xl px-1.5 py-0">
                  <FichaPropiedad opcion={o} nombre={o.label} flor={o.value === TODAS ? 'var(--flor-morado)' : florDe(o)} />
                  {o.value === propiedad && <CheckIcon className="size-4 shrink-0 text-primary" />}
                </MenuItem>
              ))}
            </MenuPopup>
          </Menu>
        </div>

        {/* ── Navegación ── */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 [scrollbar-width:thin]">
          {GRUPOS.map(g => {
            const items = g.items.filter(i => permitida(i.key, sesion))
            if (!items.length) return null
            return (
              <nav key={g.titulo} aria-label={g.titulo} className="mb-4 flex flex-col gap-0.5">
                <div className="relative flex h-7 items-center px-3">
                  <span className={cn('font-medium text-muted-foreground text-xs transition-opacity', plegada && 'opacity-0')}>{g.titulo}</span>
                  {plegada && <span className="absolute left-4 h-px w-6 bg-border" />}
                </div>
                {items.map(i => {
                  const apagada = deshabilitada(i.key)
                  const on = page === i.key
                  const cuenta = i.cuenta === 'avisos' ? sinLeer : undefined
                  return (
                    <Fila key={i.key} plegada={plegada} label={i.label} tip={apagada ? `${i.label}: pronto` : undefined}>
                      {a => (
                        <button {...a} type="button" aria-current={on ? 'page' : undefined} aria-disabled={apagada || undefined}
                          onClick={() => { if (!apagada) onNavigate(i.key) }}
                          className={cn(fila, !apagada && vivo, on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground', apagada && 'cursor-not-allowed opacity-45 hover:text-muted-foreground')}>
                          {on && <motion.span layoutId="lateral-activa" transition={resorte} className="absolute inset-0 rounded-lg bg-background shadow-xs/5 ring-1 ring-border dark:bg-accent dark:ring-0" />}
                          {!on && !apagada && <span className="absolute inset-0 rounded-lg transition-colors group-hover/row:bg-accent" />}
                          <span className="relative flex">{marcarIconos(<i.Icono className={cn('size-4 shrink-0', on && 'text-primary')} />)}</span>
                          <Etiqueta plegada={plegada} className="relative font-medium">{i.label}</Etiqueta>
                          {apagada && <span className={cn('relative ms-auto text-xs transition-opacity', plegada && 'opacity-0')}>Pronto</span>}
                          {cuenta > 0 && (
                            <span className={cn('relative ms-auto rounded-full bg-info/12 px-1.5 font-medium text-info-foreground text-xs tabular-nums transition-opacity', plegada && 'opacity-0')}>{cuenta}</span>
                          )}
                          {plegada && cuenta > 0 && <span className="absolute top-1.5 left-7 size-1.5 rounded-full bg-info ring-2 ring-sidebar" />}
                        </button>
                      )}
                    </Fila>
                  )
                })}
              </nav>
            )
          })}
        </div>

        {/* ── Pie: plegar y la cuenta ── */}
        <div className="flex flex-col gap-0.5 p-2">
          {onPlegar && (
            <Fila plegada={plegada} label={plegada ? 'Desplegar' : 'Plegar'} tip={<span>{plegada ? 'Desplegar' : 'Plegar'} <Kbd className="ms-1">[</Kbd></span>}>
              {a => (
                <button {...a} type="button" onClick={onPlegar} className={cn(fila, vivo, 'text-muted-foreground hover:text-foreground')}>
                  <span className="absolute inset-0 rounded-lg transition-colors group-hover/row:bg-accent" />
                  <span className="relative flex">{marcarIconos(<PanelLeftIcon className="size-4 shrink-0" />)}</span>
                  <Etiqueta plegada={plegada} className="relative">Plegar barra</Etiqueta>
                  <Kbd className={cn('relative ms-auto transition-opacity', plegada && 'opacity-0')}>[</Kbd>
                </button>
              )}
            </Fila>
          )}
          <Menu>
            <MenuTrigger aria-label={`Tu cuenta: ${sesion?.nombre ?? ''}`}
              className="mt-1 flex h-12 w-full cursor-pointer items-center gap-2.5 overflow-hidden rounded-xl px-1.5 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-accent">
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="bg-primary/16 text-[11px] text-primary">{iniciales(sesion?.nombre)}</AvatarFallback>
              </Avatar>
              <span className={cn('flex min-w-0 flex-1 flex-col transition-opacity duration-200', plegada && 'opacity-0')}>
                <span className="truncate font-medium leading-tight">{sesion?.nombre}</span>
                <span className="truncate text-muted-foreground text-xs leading-tight">{sesion?.correo}</span>
              </span>
            </MenuTrigger>
            <MenuPopup align="start" side="top" className="w-56">
              <MenuItem onClick={() => onNavigate('account')}><UserRoundIcon />Mi cuenta</MenuItem>
              <MenuItem onClick={() => onNavigate('config')}><SettingsIcon />Configuración</MenuItem>
              <MenuSeparator />
              <MenuItem variant="destructive" onClick={() => setSalir(true)}><LogOutIcon />Cerrar sesión</MenuItem>
            </MenuPopup>
          </Menu>
        </div>
      </div>
      <ConfirmarSalida abierto={salir} onCambiar={setSalir} onSalir={() => onNavigate('login')} />
    </LayoutGroup>
  )
}
