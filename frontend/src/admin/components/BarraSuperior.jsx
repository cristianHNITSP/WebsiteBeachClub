import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  BedDoubleIcon, BellIcon, CalendarDaysIcon, CalendarPlusIcon, DoorOpenIcon, FingerprintIcon, GlobeIcon,
  LayoutGridIcon, MenuIcon, PlusIcon, SettingsIcon, UserRoundIcon, UsersIcon,
} from 'lucide-react'
import { Button } from '@/components/coss/button'
import { DripBadge } from '@/components/devl/drip-badge'
import { DropletButton } from '@/components/devl/droplet-button'
import { Launcher } from '@/components/devl/launcher'
import { OverflowBreadcrumb } from '@/components/devl/overflow-breadcrumb'
import { MorphIcon } from '@/components/devl/morph-icons'
import { useTheme } from '@/context/ThemeContext'
import { alternarTemaConCirculo } from '@/lib/transicionTema'
import { useSesion } from '@/lib/sesion'
import { usePedido } from '@/hooks/usePedido'
import { habitacionesApi } from '../habitaciones'
import { usePropiedadActual } from '../propiedadActual'
import { useAvisos } from '../avisos'
import { permitida } from '../modulos'
import { EVENTO_LANZADOR } from '../lanzador'
import Globo from './GloboBuscar'

/*
 * Barra superior dentro de la hoja: migas, lanzador (Ctrl K), avisos, tema y
 * LA acción principal (Nueva reserva). La navegación vive en la barra lateral.
 * Piezas de devl.dev/coss instaladas tal cual (scripts/devl-add.sh).
 */

const NOMBRE = {
  dashboard: 'Tablero', hoy: 'Llegadas y salidas', calendar: 'Reservaciones', notifications: 'Avisos',
  rooms: 'Habitaciones', users: 'Personal', externas: 'Otras plataformas', auditoria: 'Auditoría',
  config: 'Configuración', account: 'Mi cuenta', 'nueva-reserva': 'Nueva reserva', 'nueva-habitacion': 'Nueva habitación',
  'editar-habitacion': 'Editar habitación', 'gestionar-fotos': 'Fotos', 'nueva-persona': 'Nueva persona', 'editar-persona': 'Editar persona',
}
// A qué sección pertenece una pantalla completa (para la miga del medio).
const PADRE = { 'nueva-habitacion': 'rooms', 'editar-habitacion': 'rooms', 'gestionar-fotos': 'rooms', 'nueva-persona': 'users', 'editar-persona': 'users', 'nueva-reserva': 'calendar' }

const IR = [
  ['dashboard', LayoutGridIcon], ['hoy', DoorOpenIcon], ['calendar', CalendarDaysIcon], ['notifications', BellIcon],
  ['rooms', BedDoubleIcon], ['users', UsersIcon], ['externas', GlobeIcon], ['auditoria', FingerprintIcon], ['config', SettingsIcon], ['account', UserRoundIcon],
]

export default function BarraSuperior({ page, onNavigate, onMenu }) {
  const { sesion } = useSesion()
  const { sinLeer } = useAvisos()
  const { isDark, toggleDark, reduceMotion } = useTheme()
  const padre = PADRE[page]
  // En pantalla ancha, el globo que crece desde su botón; en móvil, el lanzador de devl.
  const [globo, setGlobo] = useState(false)
  const [capa, setCapa] = useState(false)
  const caja = useRef(null)
  const abrir = () => (matchMedia('(min-width: 768px)').matches ? setGlobo(true) : setCapa(true))
  const cerrar = () => { setGlobo(false); setCapa(false) }
  useEffect(() => {
    window.addEventListener(EVENTO_LANZADOR, abrir)
    return () => window.removeEventListener(EVENTO_LANZADOR, abrir)
  }, [])
  // Esc cierra la capa aunque el foco no esté dentro, y antes que el Esc propio
  // del Launcher (que intentaría volver a su botón y rompía la animación).
  useEffect(() => {
    if (!capa) return
    const tecla = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setCapa(false) } }
    window.addEventListener('keydown', tecla, true)
    // Montado ya abierto, el Launcher no enfoca su campo (solo lo hace al abrirse con su botón).
    const foco = requestAnimationFrame(() => caja.current?.querySelector('input')?.focus())
    // La página de atrás no se mueve mientras está abierto
    const raiz = document.documentElement
    raiz.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', tecla, true); cancelAnimationFrame(foco); raiz.style.overflow = '' }
  }, [capa])
  const ir = destino => { cerrar(); onNavigate(destino) }

  // Las habitaciones de la propiedad elegida se piden solo al abrir el buscador.
  const navegar = useNavigate()
  const { propiedadId } = usePropiedadActual()
  const abierto = globo || capa
  const habs = usePedido(
    senal => (abierto && permitida('rooms', sesion) ? habitacionesApi.listar({ propiedad: propiedadId, por_pagina: 100 }, senal) : null),
    [abierto, propiedadId],
  )
  const deHabitaciones = (habs.datos?.items ?? []).map(h => ({
    id: `hab-${h.id}`, label: h.nombre, group: 'Habitaciones', icon: <BedDoubleIcon />, keywords: [h.tipo, 'habitación', 'cuarto'],
    onSelect: () => { cerrar(); navegar(`/admin/habitaciones?habitacion=${h.id}`) }, done: `Abriste ${h.nombre}`,
  }))

  const acciones = [
    ...IR.filter(([k]) => permitida(k, sesion)).map(([k, Icono]) => ({
      id: `ir-${k}`, label: NOMBRE[k], group: 'Ir a', icon: <Icono />, keywords: [k], onSelect: () => ir(k), done: `Abriste ${NOMBRE[k]}`,
    })),
    ...(permitida('nueva-reserva', sesion) ? [{ id: 'nueva-reserva', label: 'Nueva reserva', group: 'Acciones', icon: <CalendarPlusIcon />, shortcut: ['N'], onSelect: () => ir('nueva-reserva') }] : []),
    ...deHabitaciones,
    ...(permitida('nueva-habitacion', sesion) ? [{ id: 'nueva-habitacion', label: 'Nueva habitación', group: 'Acciones', icon: <PlusIcon />, onSelect: () => ir('nueva-habitacion') }] : []),
  ]

  const IconoPagina = IR.find(([k]) => k === page)?.[1]
  const migas = [
    { id: 'panel', label: 'Panel' },
    ...(padre ? [{ id: padre, label: NOMBRE[padre] }] : []),
    { id: page, label: NOMBRE[page] ?? 'Panel', icon: IconoPagina && <IconoPagina className="text-primary" /> },
  ]

  return (
    <header className="sticky top-0 z-30 flex h-13 shrink-0 items-center gap-2 rounded-t-2xl border-b bg-background px-3 sm:px-4">
      {onMenu && <Button aria-label="Abrir menú" className="lg:hidden" onClick={onMenu} size="icon-sm" variant="ghost"><MenuIcon /></Button>}
      <OverflowBreadcrumb className="flex-1" segments={migas} onNavigate={m => onNavigate(m.id === 'panel' ? 'dashboard' : m.id)} />

      <div className="flex shrink-0 items-center gap-1.5">
        <Globo abierto={globo} onCambiar={v => (v ? abrir() : setGlobo(false))} acciones={acciones} />
        <DripBadge count={sinLeer} tone="destructive">
          <Button aria-label={sinLeer ? `Avisos, ${sinLeer} sin leer` : 'Avisos'} onClick={() => onNavigate('notifications')} size="icon" variant="ghost"><BellIcon /></Button>
        </DripBadge>
        <Button aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'} onClick={e => alternarTemaConCirculo(e, toggleDark, reduceMotion)} size="icon" variant="ghost">
          <MorphIcon name="theme" morphed={isDark} className="size-5" />
        </Button>
        {permitida('nueva-reserva', sesion) && (
          <DropletButton onClick={() => onNavigate('nueva-reserva')}>
            <PlusIcon />
            <span className="max-sm:hidden">Nueva reserva</span>
          </DropletButton>
        )}
      </div>
      {createPortal(
        <AnimatePresence>
          {capa && (
            <motion.div key="capa" className="fixed inset-0 z-[60] flex items-start justify-center bg-black/24 px-4 pt-[12vh]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}
              onMouseDown={e => { if (e.target === e.currentTarget) setCapa(false) }}
              role="dialog" aria-modal="true" aria-label="Buscar o ir a">
              <motion.div ref={caja} className="w-full max-w-xl" initial={{ y: -8, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: -6, scale: 0.98, transition: { duration: 0.12 } }}
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}>
                {/* El Launcher de devl, montado ya abierto: el cierre lo maneja esta capa */}
                <Launcher defaultOpen actions={acciones} placeholder="Busca una pantalla o una acción" triggerLabel="Buscar o ir a…" recentLimit={3} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </header>
  )
}
