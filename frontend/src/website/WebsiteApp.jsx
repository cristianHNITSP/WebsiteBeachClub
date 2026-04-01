import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ROOMS } from '../data/rooms'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import DetailPage from './pages/DetailPage'
import AccountPage from './pages/AccountPage'
import './website.css'

export default function WebsiteApp() {
  const [view, setView] = useState('home')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [overHero, setOverHero] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      setOverHero(window.scrollY < 80 && view === 'home')
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [view])

  useEffect(() => {
    setOverHero(view === 'home' && window.scrollY < 80)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [view])

  const handleNavigate = (newView) => {
    setView(newView)
  }

  const handleSelectRoom = (room) => {
    setSelectedRoom(room)
    setView('detail')
  }

  const handleToggleFav = (roomId) => {
    setFavorites(prev =>
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    )
  }

  const handleConfirm = (bookingData) => {
    alert(`Reserva confirmada!\n${bookingData.room.title}\n${bookingData.checkIn} → ${bookingData.checkOut}\nTotal: MXN $${bookingData.total.toLocaleString()}`)
    setView('account')
  }

  const showFooter = view !== 'detail'

  const pageVariants = {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } },
    exit:    { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } },
  }

  return (
    <div>
      <Navbar
        view={view}
        onNavigate={handleNavigate}
        overHero={overHero && view === 'home'}
      />

      <main>
        <AnimatePresence mode="wait">

          {view === 'home' && (
            <motion.div key="home" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <HomePage
                onNavigate={handleNavigate}
                onSelectRoom={handleSelectRoom}
                rooms={ROOMS}
                favorites={favorites}
                onToggleFav={handleToggleFav}
              />
            </motion.div>
          )}

          {view === 'search' && (
            <motion.div key="search" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <SearchPage
                onSelectRoom={handleSelectRoom}
                rooms={ROOMS}
                favorites={favorites}
                onToggleFav={handleToggleFav}
              />
            </motion.div>
          )}

          {view === 'detail' && (
            <motion.div key="detail" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <DetailPage
                room={selectedRoom}
                onGoBack={() => setView('search')}
                onConfirm={handleConfirm}
              />
            </motion.div>
          )}

          {view === 'account' && (
            <motion.div key="account" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <AccountPage
                bookings={[]}
                favoritesCount={favorites.length}
                onOpenDetail={(booking) => console.log('open booking', booking)}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {showFooter && <Footer onNavigate={handleNavigate} />}
    </div>
  )
}
