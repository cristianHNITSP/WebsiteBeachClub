import { useState, useEffect } from 'react'
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
    window.scrollTo(0, 0)
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

  return (
    <div>
      <Navbar
        view={view}
        onNavigate={handleNavigate}
        overHero={overHero && view === 'home'}
      />

      {view === 'home' && (
        <HomePage
          onNavigate={handleNavigate}
          onSelectRoom={handleSelectRoom}
          rooms={ROOMS}
          favorites={favorites}
          onToggleFav={handleToggleFav}
        />
      )}

      {view === 'search' && (
        <SearchPage
          onSelectRoom={handleSelectRoom}
          rooms={ROOMS}
          favorites={favorites}
          onToggleFav={handleToggleFav}
        />
      )}

      {view === 'detail' && (
        <DetailPage
          room={selectedRoom}
          onGoBack={() => setView('search')}
          onConfirm={handleConfirm}
        />
      )}

      {view === 'account' && (
        <AccountPage
          bookings={[]}
          favoritesCount={favorites.length}
          onOpenDetail={(booking) => console.log('open booking', booking)}
        />
      )}

      {showFooter && <Footer onNavigate={handleNavigate} />}
    </div>
  )
}
