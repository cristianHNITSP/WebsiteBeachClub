import TopNav from './components/TopNav'
import SideNav from './components/SideNav'
import './admin.css'

export default function AdminLayout({ children, page, onNavigate }) {
  return (
    <div className="admin-layout">
      <TopNav page={page} onNavigate={onNavigate} />
      <SideNav page={page} onNavigate={onNavigate} />
      <main className="admin-main">
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  )
}
