import { Activity, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import DashboardPage from './pages/DashboardPage'
import RoomsPage from './pages/RoomsPage'
import UsersPage from './pages/UsersPage'
import CalendarPage from './pages/CalendarPage'
import ShopPage from './pages/ShopPage'
import SalesPage from './pages/SalesPage'
import AvisosPage from './pages/AvisosPage'
import RestaurantePosPage from './pages/RestaurantePosPage'
import RestauranteTicketsPage from './pages/RestauranteTicketsPage'
import RestauranteMenuPage from './pages/RestauranteMenuPage'
import RestauranteEstadisticasPage from './pages/RestauranteEstadisticasPage'
import AdminAccountPage from './pages/AdminAccountPage'
import NuevaReservaPage from './pages/NuevaReservaPage'
import HabitacionFormPage from './pages/HabitacionFormPage'
import GestionFotosPage from './pages/GestionFotosPage'
import AuditoriaPage from './pages/AuditoriaPage'
import ExternasPage from './pages/ExternasPage'
import HoyPage from './pages/HoyPage'
import PersonaFormPage from './pages/PersonaFormPage'
import ConfigPage from './pages/ConfigPage'
import { deshabilitada, permitida } from './modulos'
import { avisarCambio, expandirDesde, recogerHacia } from './transicionPanel'
import { useSesion, esPersonal, rutaEntrar, rutaSalir } from '@/lib/sesion'
import { PantallaVerificando } from '@/components/marca/RutaProtegida'
import { usePaletaSitio } from '@/hooks/usePaletaSitio'
import ConfirmarDescarte from '@/components/marca/ConfirmarDescarte'
import NoEncontrada from '@/components/marca/NoEncontrada'
import './admin.css'

/*
 * Páginas vivas: las últimas que se visitaron siguen montadas, ocultas con
 * <Activity> (conservan estado y DOM, pero sin efectos ni escuchas: solo
 * memoria), hasta VIDA_MS después de salir de ellas y como mucho MAX_VIVAS.
 * Volver es instantáneo y sin esqueleto. Los formularios (FULL_PAGES) no se
 * guardan: siempre abren limpios (lo descartado no debe reaparecer).
 */
const VIDA_MS = 5 * 60 * 1000
const MAX_VIVAS = 4

/* Páginas que reemplazan el contenido completo */
// Orden de la barra lateral: bajar en la lista entra desde abajo, subir desde arriba.
const ORDEN = ['dashboard', 'hoy', 'calendar', 'notifications', 'rooms', 'users', 'externas', 'auditoria', 'config', 'account']
const FULL_PAGES = ['account', 'nueva-reserva', 'nueva-habitacion', 'editar-habitacion', 'gestionar-fotos', 'config', 'nueva-persona', 'editar-persona']

/* ── Guardia de navegación: AlertDialog de shadcn (ConfirmarDescarte) ── */
function NavGuardModal({ onConfirm, onCancel }) {
  return (
    <ConfirmarDescarte
      abierto
      texto="Tienes cambios sin guardar. Si cambias de sección ahora, toda la información capturada se perderá."
      onConfirmar={onConfirm}
      onCancelar={onCancel}
    />
  )
}

/*
 * Pantalla del panel en la URL, con nombres en español: recargar deja al
 * usuario donde estaba. Los ids internos (`rooms`, `calendar`…) no cambian;
 * solo se traducen en la frontera con la URL.
 *   /admin/tablero · /admin/habitaciones · /admin/editar-habitacion/3 …
 */
const SLUG = {
  dashboard: 'tablero', rooms: 'habitaciones', users: 'usuarios', calendar: 'calendario',
  shop: 'tienda', sales: 'ventas', housekeeping: 'limpieza', marketing: 'marketing',
  account: 'mi-cuenta', config: 'configuracion', notifications: 'avisos',
  restaurante: 'restaurante', 'restaurante-tickets': 'restaurante-tickets',
  'restaurante-menu': 'restaurante-menu', 'restaurante-estadisticas': 'restaurante-estadisticas',
  auditoria: 'auditoria', externas: 'otras-plataformas', hoy: 'llegadas-y-salidas',
  'nueva-reserva': 'nueva-reserva', 'nueva-habitacion': 'nueva-habitacion',
  'editar-habitacion': 'editar-habitacion', 'gestionar-fotos': 'gestionar-fotos',
  'nueva-persona': 'nueva-persona', 'editar-persona': 'editar-persona',
}
const PAGINA = Object.fromEntries(Object.entries(SLUG).map(([id, slug]) => [slug, id]))
// A dónde vuelve cada página completa si se llegó por URL (sin historial interno).
const REGRESO = {
  'editar-habitacion': 'rooms', 'gestionar-fotos': 'rooms', 'nueva-habitacion': 'rooms',
  'nueva-persona': 'users', 'editar-persona': 'users',
  'nueva-reserva': 'calendar', account: 'dashboard', config: 'dashboard',
}
// Páginas cuya URL lleva un id (/admin/editar-habitacion/<id>); sin él, vuelven a su lista.
const CON_ID = ['editar-habitacion', 'gestionar-fotos', 'editar-persona']

// /admin/<lo que no existe> es un 404 (no un salto silencioso al tablero).
export default function AdminApp() {
  const { '*': resto = '' } = useParams()
  const slug = resto.split('/')[0]
  if (slug && !PAGINA[slug]) return <NoEncontrada a="/admin/tablero" texto="Ir al tablero" />
  return <PanelAdmin />
}

function PanelAdmin() {
  usePaletaSitio() // mismo sistema visual que la website (paleta floral)
  // `panel` en <body> (como `site`): los portales de Radix también la heredan.
  // Una sola familia y esquinas chicas, sin tocar la website ni el login.
  useLayoutEffect(() => {
    document.body.classList.add('panel')
    return () => document.body.classList.remove('panel')
  }, [])
  const navigate = useNavigate()
  const { '*': resto = '' } = useParams()
  const [slug, idTexto] = resto.split('/')

  const location = useLocation()
  useLayoutEffect(avisarCambio, [location])
  // Lo último que se tocó: de ahí nace el panel que se abra.
  const tocado = useRef(null)
  useEffect(() => {
    const anotar = e => { tocado.current = e.target.closest?.('button, a, [role="button"], [role="menuitem"]') ?? null }
    document.addEventListener('click', anotar, true)
    return () => document.removeEventListener('click', anotar, true)
  }, [])
  const { verificando, sesion } = useSesion()
  const [prevPage, setPrevPage]   = useState(null)
  const [isDirty, setIsDirty]     = useState(false)
  const [pendingNav, setPendingNav] = useState(null)
  const [showNavGuard, setShowNavGuard] = useState(false)
  const [vivas, setVivas] = useState([])           // [{ page, salio }]

  // Página y habitación salen de la URL. La habitación la pide cada página a la
  // API (si ya no existe, la página lo dice); sin id, a la lista.
  let page = PAGINA[slug] ?? 'dashboard'
  if (CON_ID.includes(page) && !idTexto) page = REGRESO[page]
  if (deshabilitada(page)) page = 'dashboard' // módulo apagado (admin/modulos.js): la URL se corrige sola
  if (sesion && !permitida(page, sesion)) page = 'dashboard' // sin el permiso de esa página
  const backPage    = prevPage ?? REGRESO[page] ?? 'dashboard'
  const actualViva  = FULL_PAGES.includes(page) ? null : page

  // Al salir de una página, pasa a "viva" con la hora de salida. EN EL MISMO
  // render (no en un efecto): si no, ese render ya no la incluiría, React la
  // desmontaría y volvería a montarla limpia (con esqueleto) un instante después.
  const [ultima, setUltima] = useState(actualViva)
  if (ultima !== actualViva) {
    setUltima(actualViva)
    if (ultima) setVivas(v => [{ page: ultima, salio: Date.now() }, ...v.filter(x => x.page !== ultima && x.page !== actualViva)].slice(0, MAX_VIVAS))
  }
  // Dirección de la entrada, calculada en el mismo render que el cambio de página:
  // entre secciones según el orden de la barra; al volver de un panel, la lista ya
  // está en su lugar (el panel se recoge encima de ella).
  const [paginaAntes, setPaginaAntes] = useState(page)
  const [dir, setDir] = useState('abajo')
  if (paginaAntes !== page) {
    setPaginaAntes(page)
    if (FULL_PAGES.includes(paginaAntes)) setDir('vuelta')
    else setDir(ORDEN.indexOf(page) >= ORDEN.indexOf(paginaAntes) ? 'abajo' : 'arriba')
  }

  // Las que pasan VIDA_MS fuera se liberan (se desmontan).
  useEffect(() => {
    if (!vivas.length) return
    const t = setInterval(() => setVivas(v => {
      const quedan = v.filter(x => Date.now() - x.salio < VIDA_MS)
      return quedan.length === v.length ? v : quedan
    }), 30_000)
    return () => clearInterval(t)
  }, [vivas.length])

  // URL sin página válida (o /admin a secas) con sesión → al tablero.
  const urlCanonica = `/admin/${SLUG[page]}${CON_ID.includes(page) ? `/${idTexto}` : ''}`
  useEffect(() => {
    if (esPersonal(sesion) && resto !== urlCanonica.slice('/admin/'.length)) navigate(urlCanonica, { replace: true })
  }, [sesion, resto, urlCanonica, navigate])

  const doNavigate = (newPage, conRoom, consulta) => {
    setIsDirty(false)
    if (newPage === 'login') {            // "Cerrar sesión"
      setPrevPage(null)
      navigate(rutaSalir('/entrar'), { replace: true })
      return
    }
    const ir = () => {
      if (FULL_PAGES.includes(newPage) && newPage !== page) setPrevPage(page)
      else if (!FULL_PAGES.includes(newPage)) setPrevPage(null)
      navigate(`/admin/${SLUG[newPage] ?? SLUG.dashboard}${conRoom ? `/${conRoom.id}` : ''}${consulta ? `?${consulta}` : ''}`)
    }
    // El panel sale del elemento que lo abrió y, al volver, regresa a él.
    if (FULL_PAGES.includes(newPage) && !FULL_PAGES.includes(page)) expandirDesde(tocado.current, ir)
    else if (FULL_PAGES.includes(page) && newPage === backPage) recogerHacia(ir)
    else ir()
  }

  const handleNavigate = (newPage, conRoom, consulta) => {
    if (deshabilitada(newPage) || !permitida(newPage, sesion)) return
    /* Si estamos en un formulario con datos y el destino es otra sección → guardia */
    if (FULL_PAGES.includes(page) && isDirty && newPage !== page) {
      setPendingNav({ page: newPage, room: conRoom, consulta })
      setShowNavGuard(true)
      return
    }
    doNavigate(newPage, conRoom, consulta)
  }

  const confirmNavGuard = () => {
    setShowNavGuard(false)
    doNavigate(pendingNav.page, pendingNav.room, pendingNav.consulta)
    setPendingNav(null)
  }

  const cancelNavGuard = () => {
    setShowNavGuard(false)
    setPendingNav(null)
  }

  const handleEditRoom = (r) => handleNavigate('editar-habitacion', r)
  const handleGestionarFotos = (r) => handleNavigate('gestionar-fotos', r)

  // Login único (/entrar): sin sesión se va a entrar y se vuelve aquí después;
  // un huésped no tiene panel, va a su cuenta.
  // (misma lógica que RutaProtegida, aquí dentro para usar la paleta del panel)
  if (verificando) return <PantallaVerificando />
  if (!sesion) return <Navigate to={rutaEntrar(location)} replace />
  if (!esPersonal(sesion)) return <Navigate to="/mi-cuenta" replace />

  const volver = () => doNavigate(backPage)

  const renderPage = (pg = page) => {
    switch (pg) {
      case 'account':      return <AdminAccountPage onBack={volver} />
      case 'config':       return <ConfigPage onBack={volver} onDirtyChange={setIsDirty} />
      case 'nueva-reserva': return <NuevaReservaPage onBack={volver} onDirtyChange={setIsDirty} />
      case 'nueva-habitacion': return <HabitacionFormPage onBack={volver} onDirtyChange={setIsDirty} />
      case 'editar-habitacion': return <HabitacionFormPage key={idTexto} habitacionId={idTexto} onBack={volver} onDirtyChange={setIsDirty} />
      case 'gestionar-fotos': return <GestionFotosPage habitacionId={idTexto} onBack={volver} onDirtyChange={setIsDirty} />
      case 'dashboard':    return <DashboardPage onNavigate={handleNavigate} />
      case 'rooms':        return <RoomsPage onNavigate={handleNavigate} onEditRoom={handleEditRoom} onGestionarFotos={handleGestionarFotos} />
      case 'users':        return <UsersPage onNavigate={handleNavigate} />
      case 'nueva-persona': return <PersonaFormPage onBack={volver} onDirtyChange={setIsDirty} />
      case 'editar-persona': return <PersonaFormPage key={idTexto} personaId={idTexto} onBack={volver} onDirtyChange={setIsDirty} />
      case 'calendar':     return <CalendarPage onNavigate={handleNavigate} />
      case 'shop':         return <ShopPage />
      case 'sales':        return <SalesPage />
      case 'notifications': return <AvisosPage onNavigate={handleNavigate} />
      case 'auditoria':    return <AuditoriaPage />
      case 'externas':     return <ExternasPage />
      case 'hoy':          return <HoyPage />
      case 'restaurante':  return <RestaurantePosPage />
      case 'restaurante-tickets': return <RestauranteTicketsPage />
      case 'restaurante-menu': return <RestauranteMenuPage />
      case 'restaurante-estadisticas': return <RestauranteEstadisticasPage />
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

  // UN solo árbol para todas las páginas: si cada página completa devolviera su
  // propio AdminLayout, React lo desmontaría al entrar o salir de ellas y las
  // animaciones de la navegación arrancarían desde posiciones viejas.
  return (
    <>
      <AdminLayout page={page} navPage={FULL_PAGES.includes(page) ? backPage : undefined} onNavigate={handleNavigate}>
        {/* Paneles completos: nacen de su botón y regresan a él (transicionPanel.js) */}
        {!actualViva && <div key={`form-${page}`} className="pagina-panel">{renderPage()}</div>}
        {/* Orden estable (por nombre): mostrar u ocultar no mueve nodos del DOM */}
        {[...new Set([...vivas.map(x => x.page), actualViva].filter(Boolean))].sort().map(pg => (
          <Activity key={pg} mode={pg === actualViva ? 'visible' : 'hidden'}>
            <div className="pagina-admin" data-dir={dir}>{renderPage(pg)}</div>
          </Activity>
        ))}
      </AdminLayout>
      {showNavGuard && <NavGuardModal onConfirm={confirmNavGuard} onCancel={cancelNavGuard} />}
    </>
  )
}
