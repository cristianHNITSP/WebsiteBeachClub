import { useState } from 'react'
import AdminLayout from './AdminLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RoomsPage from './pages/RoomsPage'
import UsersPage from './pages/UsersPage'
import CalendarPage from './pages/CalendarPage'
import ShopPage from './pages/ShopPage'
import './admin.css'

export default function AdminApp() {
  const [page, setPage] = useState('login')

  if (page === 'login') {
    return <LoginPage onLogin={() => setPage('dashboard')} />
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <DashboardPage />
      case 'rooms':
      case 'analytics':
        return <RoomsPage />
      case 'users':
        return <UsersPage />
      case 'calendar':
        return <CalendarPage />
      case 'shop':
      case 'revenue':
        return <ShopPage />
      case 'housekeeping':
        return (
          <div>
            <span className="admin-page-eyebrow">Housekeeping</span>
            <h1 className="admin-page-title">Gestión de<br /><em>Limpieza</em></h1>
            <p className="admin-page-sub">Módulo de housekeeping en construcción.</p>
          </div>
        )
      case 'marketing':
        return (
          <div>
            <span className="admin-page-eyebrow">Marketing</span>
            <h1 className="admin-page-title">Centro de<br /><em>Marketing</em></h1>
            <p className="admin-page-sub">Módulo de marketing en construcción.</p>
          </div>
        )
      default:
        return <DashboardPage />
    }
  }

  return (
    <AdminLayout page={page} onNavigate={setPage}>
      {renderPage()}
    </AdminLayout>
  )
}
