import { useEffect, useState } from 'react'
import { Routes, Route, Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ROOMS } from '../data/rooms'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { usePaletaSitio } from '@/hooks/usePaletaSitio'
import { useEstadoPersistente } from '@/hooks/useEstadoPersistente'
import RutaProtegida from '@/components/marca/RutaProtegida'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import DetailPage from './pages/DetailPage'
import AccountPage from './pages/AccountPage'
import './website.css'

/*
 * Rutas de la website. La URL es la fuente de verdad de "en qué pantalla
 * estoy y con qué configuración" (filtros, pestaña, fechas…): recargar,
 * volver atrás o compartir el enlace deja todo igual.
 *
 *   /                      inicio (/#sucursales baja a los destinos)
 *   /habitaciones          búsqueda   ?sucursal&tipo&precio&ofertas&orden&pagina&q&llegada&salida
 *   /habitaciones/:id      detalle    ?llegada&salida&huespedes&extras&paso
 *   /mi-cuenta             cuenta     ?seccion=proximas|historial|favoritos|mensajes  (pide sesión)
 *   /entrar                login único (en App.jsx, fuera de este layout)
 */
const RUTAS = { inicio: '/', habitaciones: '/habitaciones', cuenta: '/mi-cuenta' }

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
}

function Pagina({ children }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  )
}

function NoEncontrada({ texto = 'Esta página no existe.' }) {
  return (
    <div className="section" style={{ paddingTop: 140 }}>
      <div className="section__container">
        <div className="empty-state" role="status">
          <div className="empty-state__title">No encontramos lo que buscas</div>
          <div className="empty-state__sub">{texto}</div>
          <Button asChild className="mt-2"><Link to={RUTAS.inicio}>Volver al inicio</Link></Button>
        </div>
      </div>
    </div>
  )
}

function DetalleRuta({ onConfirm }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const room = ROOMS.find(r => String(r.id) === id)
  if (!room) return <NoEncontrada texto="La habitación que buscas ya no está disponible." />
  // Volver: al historial si venimos de la búsqueda; si se abrió el enlace directo, a la búsqueda.
  const volver = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(RUTAS.habitaciones))
  return <DetailPage room={room} onGoBack={volver} onConfirm={onConfirm} />
}

export default function WebsiteApp() {
  usePaletaSitio()
  const location = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [favorites, setFavorites] = useEstadoPersistente('frida-favoritos', [])

  const enInicio = location.pathname === RUTAS.inicio
  const [overHero, setOverHero] = useState(enInicio)

  useEffect(() => {
    const handleScroll = () => setOverHero(enInicio && window.scrollY < 80)
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [enInicio])

  // Al cambiar de pantalla: arriba del todo, o al ancla si la URL trae #.
  useEffect(() => {
    if (location.hash) {
      const t = setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 450)
      return () => clearTimeout(t)
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [location.pathname, location.hash])

  // Compatibilidad con las páginas: 'home' | 'search' | 'account'
  const handleNavigate = (vista) => navigate({ home: RUTAS.inicio, search: RUTAS.habitaciones, account: RUTAS.cuenta }[vista] ?? RUTAS.inicio)

  // Del listado al detalle: las fechas elegidas viajan con el enlace.
  const handleSelectRoom = (room) => {
    const conFechas = new URLSearchParams()
    for (const k of ['llegada', 'salida']) if (params.get(k)) conFechas.set(k, params.get(k))
    const q = conFechas.toString()
    navigate(`${RUTAS.habitaciones}/${room.id}${q ? `?${q}` : ''}`)
  }

  const handleToggleFav = (roomId) => {
    setFavorites(prev =>
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    )
  }

  const handleConfirm = (bookingData) => {
    toast.success('Reserva confirmada', {
      description: `${bookingData.room.title}, ${bookingData.checkIn} → ${bookingData.checkOut}. Total: MXN $${bookingData.total.toLocaleString()}`,
    })
    navigate(RUTAS.cuenta)
  }

  const showFooter = !/^\/habitaciones\/[^/]+$/.test(location.pathname)

  return (
    <div>
      <Navbar overHero={overHero} />

      <main>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path={RUTAS.inicio} element={
              <Pagina>
                <HomePage
                  onNavigate={handleNavigate}
                  onSelectRoom={handleSelectRoom}
                  rooms={ROOMS}
                  favorites={favorites}
                  onToggleFav={handleToggleFav}
                />
              </Pagina>
            } />
            <Route path={RUTAS.habitaciones} element={
              <Pagina>
                <SearchPage
                  onSelectRoom={handleSelectRoom}
                  rooms={ROOMS}
                  favorites={favorites}
                  onToggleFav={handleToggleFav}
                />
              </Pagina>
            } />
            <Route path={`${RUTAS.habitaciones}/:id`} element={
              <Pagina><DetalleRuta onConfirm={handleConfirm} /></Pagina>
            } />
            <Route path={RUTAS.cuenta} element={<RutaProtegida>
              <Pagina>
                <AccountPage
                  favoritesCount={favorites.length}
                  onOpenDetail={(booking) => {
                    const room = ROOMS.find(r => r.title === booking.room)
                    if (room) navigate(`${RUTAS.habitaciones}/${room.id}`)
                  }}
                />
              </Pagina></RutaProtegida>
            } />
            <Route path="*" element={<Pagina><NoEncontrada /></Pagina>} />
          </Routes>
        </AnimatePresence>
      </main>

      {showFooter && <Footer />}
      <Toaster position="top-center" closeButton />
    </div>
  )
}
