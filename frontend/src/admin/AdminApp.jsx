import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import AdminLayout from './AdminLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RoomsPage from './pages/RoomsPage'
import UsersPage from './pages/UsersPage'
import CalendarPage from './pages/CalendarPage'
import ShopPage from './pages/ShopPage'
import SalesPage from './pages/SalesPage'
import AdminAccountPage from './pages/AdminAccountPage'
import NuevaReservaPage from './pages/NuevaReservaPage'
import NuevaHabitacionPage from './pages/NuevaHabitacionPage'
import EditarHabitacionPage from './pages/EditarHabitacionPage'
import GestionFotosPage from './pages/GestionFotosPage'
import ConfigPage from './pages/ConfigPage'
import './admin.css'

/* Páginas que reemplazan el contenido completo */
const FULL_PAGES = ['account', 'nueva-reserva', 'nueva-habitacion', 'editar-habitacion', 'gestionar-fotos', 'config']

/* ── Nav-guard modal ── */
function NavGuardModal({ onConfirm, onCancel }) {
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        }}
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--outline-var)',
            borderRadius: 'var(--radius-xl)',
            padding: '32px', width: '100%', maxWidth: '400px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{
            width: '46px', height: '46px', borderRadius: '50%',
            background: 'rgba(217,119,6,0.12)',
            display: 'grid', placeItems: 'center', marginBottom: '18px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#d97706' }}>
              warning
            </span>
          </div>
          <div style={{
            fontFamily: 'var(--font-headline)', fontSize: '1.15rem',
            color: 'var(--on-surface)', marginBottom: '8px',
          }}>
            ¿Descartar cambios?
          </div>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '13px',
            color: 'var(--on-surface-var)', lineHeight: 1.65, marginBottom: '24px',
          }}>
            Tienes cambios sin guardar. Si cambias de sección ahora, toda la información capturada se perderá.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              style={{
                padding: '9px 18px', borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--outline-var)', background: 'transparent',
                color: 'var(--on-surface)', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container-low)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Seguir editando
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: '9px 18px', borderRadius: 'var(--radius-md)',
                border: 'none', background: 'rgba(186,26,26,0.88)',
                color: '#fff', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Descartar y salir
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

export default function AdminApp() {
  const [page, setPage]           = useState('login')
  const [prevPage, setPrevPage]   = useState('dashboard')
  const [isDirty, setIsDirty]     = useState(false)
  const [pendingNav, setPendingNav] = useState(null)
  const [showNavGuard, setShowNavGuard] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [photosRoom,  setPhotosRoom]  = useState(null)

  const doNavigate = (newPage) => {
    setIsDirty(false)
    if (FULL_PAGES.includes(newPage) && newPage !== page) setPrevPage(page)
    setPage(newPage)
  }

  const handleNavigate = (newPage) => {
    /* Si estamos en un formulario con datos y el destino es otra sección → guardia */
    if (FULL_PAGES.includes(page) && isDirty && newPage !== page) {
      setPendingNav(newPage)
      setShowNavGuard(true)
      return
    }
    doNavigate(newPage)
  }

  const confirmNavGuard = () => {
    setShowNavGuard(false)
    doNavigate(pendingNav)
    setPendingNav(null)
  }

  const cancelNavGuard = () => {
    setShowNavGuard(false)
    setPendingNav(null)
  }

  const handleEditRoom = (room) => {
    setEditingRoom(room)
    handleNavigate('editar-habitacion')
  }

  const handleGestionarFotos = (room) => {
    setPhotosRoom(room)
    handleNavigate('gestionar-fotos')
  }

  if (page === 'login') {
    return <LoginPage onLogin={() => setPage('dashboard')} />
  }

  if (page === 'account') {
    return (
      <AdminLayout page={page} navPage={prevPage} onNavigate={handleNavigate}>
        <AdminAccountPage onBack={() => doNavigate(prevPage)} />
      </AdminLayout>
    )
  }

  if (page === 'config') {
    return (
      <>
        <AdminLayout page={page} navPage={prevPage} onNavigate={handleNavigate}>
          <ConfigPage onBack={() => doNavigate(prevPage)} onDirtyChange={setIsDirty} />
        </AdminLayout>
        {showNavGuard && (
          <NavGuardModal onConfirm={confirmNavGuard} onCancel={cancelNavGuard} />
        )}
      </>
    )
  }

  if (page === 'nueva-reserva') {
    return (
      <>
        <AdminLayout page={page} navPage={prevPage} onNavigate={handleNavigate}>
          <NuevaReservaPage
            onBack={() => doNavigate(prevPage)}
            onDirtyChange={setIsDirty}
          />
        </AdminLayout>
        {showNavGuard && (
          <NavGuardModal onConfirm={confirmNavGuard} onCancel={cancelNavGuard} />
        )}
      </>
    )
  }

  if (page === 'nueva-habitacion') {
    return (
      <>
        <AdminLayout page={page} navPage={prevPage} onNavigate={handleNavigate}>
          <NuevaHabitacionPage
            onBack={() => doNavigate(prevPage)}
            onDirtyChange={setIsDirty}
          />
        </AdminLayout>
        {showNavGuard && (
          <NavGuardModal onConfirm={confirmNavGuard} onCancel={cancelNavGuard} />
        )}
      </>
    )
  }

  if (page === 'editar-habitacion') {
    return (
      <>
        <AdminLayout page={page} navPage={prevPage} onNavigate={handleNavigate}>
          <EditarHabitacionPage
            room={editingRoom}
            onBack={() => doNavigate(prevPage)}
            onDirtyChange={setIsDirty}
          />
        </AdminLayout>
        {showNavGuard && (
          <NavGuardModal onConfirm={confirmNavGuard} onCancel={cancelNavGuard} />
        )}
      </>
    )
  }

  if (page === 'gestionar-fotos') {
    return (
      <>
        <AdminLayout page={page} navPage={prevPage} onNavigate={handleNavigate}>
          <GestionFotosPage
            room={photosRoom}
            onBack={() => doNavigate(prevPage)}
            onDirtyChange={setIsDirty}
          />
        </AdminLayout>
        {showNavGuard && (
          <NavGuardModal onConfirm={confirmNavGuard} onCancel={cancelNavGuard} />
        )}
      </>
    )
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':    return <DashboardPage onNavigate={handleNavigate} />
      case 'rooms':        return <RoomsPage onNavigate={handleNavigate} onEditRoom={handleEditRoom} onGestionarFotos={handleGestionarFotos} />
      case 'users':        return <UsersPage />
      case 'calendar':     return <CalendarPage onNavigate={handleNavigate} />
      case 'shop':         return <ShopPage />
      case 'sales':        return <SalesPage />
      case 'housekeeping': return (
        <div>
          <span className="admin-page-eyebrow">Operaciones</span>
          <h1 className="admin-page-title">Gestión de<br /><em>Limpieza</em></h1>
          <p className="admin-page-sub">Módulo de limpieza en construcción.</p>
        </div>
      )
      case 'marketing': return (
        <div>
          <span className="admin-page-eyebrow">Promoción</span>
          <h1 className="admin-page-title">Centro de<br /><em>Marketing</em></h1>
          <p className="admin-page-sub">Módulo de marketing en construcción.</p>
        </div>
      )
      default: return <DashboardPage onNavigate={handleNavigate} />
    }
  }

  return (
    <AdminLayout page={page} onNavigate={handleNavigate}>
      {renderPage()}
    </AdminLayout>
  )
}
