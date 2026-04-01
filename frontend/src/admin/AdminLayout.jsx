import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TopNav from './components/TopNav'
import SideNav from './components/SideNav'
import s from './AdminLayout.module.css'
import './admin.css'

const pageVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } },
}

export default function AdminLayout({ children, page, navPage, onNavigate }) {
  const activeNav = navPage ?? page
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    setSidebarOpen(false)
  }, [page])

  return (
    <div className={s.layout}>
      <TopNav page={activeNav} onNavigate={onNavigate} onToggleSidebar={() => setSidebarOpen(o => !o)} />
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
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
