import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useSesion } from '@/lib/sesion'
import TopNav from './components/TopNav'
import SideNav from './components/SideNav'
import { Toaster } from '@/components/ui/sonner'
import s from './AdminLayout.module.css'
import './admin.css'


export default function AdminLayout({ children, page, navPage, onNavigate }) {
  const activeNav = navPage ?? page
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    setSidebarOpen(false)
  }, [page])

  return (
    <div className={s.layout}>
      <TopNav page={page} onNavigate={onNavigate} onToggleSidebar={() => setSidebarOpen(o => !o)} />
      <SideNav page={activeNav} onNavigate={onNavigate} isOpen={sidebarOpen} />

      {/* Overlay tap-to-close on mobile/tablet */}
      {sidebarOpen && (
        <div
          className={`${s.overlay} ${s.overlayActive}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className={s.main}>
        <div className={s.content}>
          <AvisoClaveTemporal />
          {/* Las páginas llegan ya envueltas (.pagina-admin, ver AdminApp): su
              entrada es CSS y se repite cada vez que una página viva vuelve a
              mostrarse. Un envoltorio con key={page} aquí las remontaría. */}
          {children}
        </div>
      </main>
      <Toaster position="top-center" closeButton />
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
