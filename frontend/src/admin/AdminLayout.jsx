import { AnimatePresence, motion } from 'framer-motion'
import TopNav from './components/TopNav'
import SideNav from './components/SideNav'
import './admin.css'

const pageVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } },
}

export default function AdminLayout({ children, page, navPage, onNavigate }) {
  const activeNav = navPage ?? page
  return (
    <div className="admin-layout">
      <TopNav page={activeNav} onNavigate={onNavigate} />
      <SideNav page={activeNav} onNavigate={onNavigate} />
      <main className="admin-main">
        <div className="admin-content">
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
