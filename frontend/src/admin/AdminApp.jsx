import { useState } from 'react'
import AdminLayout from './AdminLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RoomsPage from './pages/RoomsPage'
import UsersPage from './pages/UsersPage'
import CalendarPage from './pages/CalendarPage'
import ShopPage from './pages/ShopPage'
import AdminAccountPage from './pages/AdminAccountPage'
import './admin.css'

export default function AdminApp() {
  const [page, setPage]         = useState('login')
  const [prevPage, setPrevPage] = useState('dashboard')

  const handleNavigate = (newPage) => {
    if (newPage === 'account') setPrevPage(page)
    setPage(newPage)
  }

  if (page === 'login') {
    return <LoginPage onLogin={() => setPage('dashboard')} />
  }

  if (page === 'account') {
    return (
      <AdminLayout page={page} onNavigate={handleNavigate}>
        <AdminAccountPage onBack={() => setPage(prevPage)} />
      </AdminLayout>
    )
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':    return <DashboardPage />
      case 'rooms':        return <RoomsPage />
      case 'users':        return <UsersPage />
      case 'calendar':     return <CalendarPage />
      case 'shop':         return <ShopPage />
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
      default: return <DashboardPage />
    }
  }

  return (
    <AdminLayout page={page} onNavigate={handleNavigate}>
      {renderPage()}
    </AdminLayout>
  )
}
