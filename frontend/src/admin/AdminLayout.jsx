import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { KeyIcon } from '@phosphor-icons/react'
import { Button } from '@/components/coss/button'
import { useSesion } from '@/lib/sesion'
import { useEstadoPersistente } from '@/hooks/useEstadoPersistente'
import { useVersionNueva, vigilarVersion } from '@/lib/version'
import BarraLateral from './components/BarraLateral'
import BarraSuperior from './components/BarraSuperior'
import BotEnVivo from './components/BotEnVivo'
import { abrirLanzador } from './lanzador'
import { Toaster } from '@/components/ui/sonner' // solo para Restaurante y Tienda (apagados)
import { ToastDeck, useToastDeck } from '@/components/devl/toast-deck'
import { SkeletonSweep } from '@/components/devl/skeleton-sweep'
import { instalarVida } from './vida'
import { tomarConservarScroll } from './transicionPanel'
import { conectarToasts } from './toast'
import s from './AdminLayout.module.css'
import './admin.css'

const ancho = { type: 'spring', stiffness: 420, damping: 40 }
const cajonResorte = { type: 'spring', stiffness: 480, damping: 40 }

/*
 * Armazón "inset" (inset-shell de devl.dev): la barra lateral sobre el suelo y
 * el trabajo en una hoja con borde, todo centrado con un ancho máximo para que
 * al alejar no se estire de borde a borde. La barra se pliega (tecla [) y se
 * recuerda por persona; en pantallas chicas es un cajón.
 */
export default function AdminLayout({ children, page, navPage, onNavigate }) {
  const activeNav = navPage ?? page
  const [cajon, setCajon] = useState(false)
  const [plegada, setPlegada] = useEstadoPersistente('frida-lateral-plegada', false)
  const baraja = useToastDeck()
  const { show: mostrarAviso, dismiss: quitarAviso } = baraja

  useEffect(() => conectarToasts({ show: mostrarAviso }), [mostrarAviso])

  // Versión nueva publicada (lib/version.js): un aviso que se queda hasta que la persona actualiza.
  // No recarga sola: podría estar a media captura.
  const versionNueva = useVersionNueva()
  useEffect(vigilarVersion, [])
  useEffect(() => {
    if (!versionNueva) return
    mostrarAviso({
      id: 'version', tone: 'info', duration: Infinity,
      title: 'Hay una versión nueva del panel',
      description: 'Guarda lo que estés haciendo y actualiza para usarla.',
      action: { label: 'Actualizar', onClick: () => window.location.reload() },
    })
  }, [versionNueva, mostrarAviso])
  useEffect(instalarVida, [])

  // Sin red no llegan los avisos en vivo ni se guarda nada: que se note.
  useEffect(() => {
    const caida = () => mostrarAviso({ id: 'sin-red', tone: 'error', duration: Infinity, title: 'Sin conexión', description: 'Lo que hagas no se guardará hasta que vuelva.' })
    const vuelta = () => quitarAviso('sin-red')
    window.addEventListener('offline', caida)
    window.addEventListener('online', vuelta)
    return () => { window.removeEventListener('offline', caida); window.removeEventListener('online', vuelta) }
  }, [mostrarAviso, quitarAviso])

  useEffect(() => {
    if (!tomarConservarScroll()) window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    setCajon(false)
  }, [page])

  // Con el cajón móvil abierto la página de atrás no se desplaza (ni por rueda ni por arrastre).
  useEffect(() => {
    if (!cajon) return
    const { documentElement: raiz, body } = document
    const antes = [raiz.style.overflow, body.style.overflow]
    raiz.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => { raiz.style.overflow = antes[0]; body.style.overflow = antes[1] }
  }, [cajon])

  useEffect(() => {
    const tecla = e => {
      const escribiendo = e.target.closest?.('input, textarea, select, [contenteditable="true"]')
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !e.target.closest?.('[data-lanzador]')) { e.preventDefault(); abrirLanzador() }
      else if (e.key === '[' && !escribiendo && !e.ctrlKey && !e.metaKey) setPlegada(p => !p)
      else if (e.key === 'Escape') setCajon(false)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [setPlegada])

  const lateral = { page: activeNav, onNavigate }

  return (
    <div className={s.layout} style={{ '--ancho-lateral': plegada ? '64px' : '256px' }}>
      <div className={s.armazon}>
        <motion.aside className={s.lateral} aria-label="Barra lateral" initial={false} animate={{ width: plegada ? 56 : 248 }} transition={ancho}>
          <BarraLateral {...lateral} plegada={plegada} onPlegar={() => setPlegada(p => !p)} />
        </motion.aside>

        <AnimatePresence>
          {cajon && (
            <>
              <motion.div className={s.velo} aria-hidden="true" onClick={() => setCajon(false)}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
              <motion.div className={s.cajon} role="dialog" aria-modal="true" aria-label="Navegación"
                initial={{ x: '-110%' }} animate={{ x: 0 }} exit={{ x: '-110%' }} transition={cajonResorte}>
                <BarraLateral {...lateral} onCerrar={() => setCajon(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className={s.columna}>
          <main className={s.hoja}>
            <BarraSuperior page={page} onNavigate={onNavigate} onMenu={() => setCajon(true)} />
            <div className={s.content}>
              <AvisoClaveTemporal />
              {/* Las páginas llegan ya envueltas (.pagina-admin, ver AdminApp): su
                  entrada es CSS y se repite cada vez que una página viva vuelve a
                  mostrarse. Un envoltorio con key={page} aquí las remontaría. */}
              <SkeletonSweep role={undefined} aria-busy={undefined} aria-label={undefined}>{children}</SkeletonSweep>
            </div>
          </main>
        </div>
      </div>
      <BotEnVivo />
      <Toaster position="top-center" closeButton />
      <ToastDeck deck={baraja} className="!fixed !bottom-5 !left-auto !right-5 z-[70] w-[min(22rem,calc(100vw-2.5rem))]" />
    </div>
  )
}

/** Contraseña puesta por un gerente: se le pide a la persona cambiarla (fase 3e). */
function AvisoClaveTemporal() {
  const { sesion } = useSesion()
  const navigate = useNavigate()
  if (!sesion?.debe_cambiar_clave) return null
  return (
    <div className={s.avisoClave} role="status">
      <KeyIcon size={20} weight="bold" aria-hidden="true" />
      <span>Entraste con una contraseña temporal. Cámbiala por una que solo tú conozcas.</span>
      <Button size="sm" onClick={() => navigate('/admin/configuracion?pestana=seguridad')}>Cambiar ahora</Button>
    </div>
  )
}
