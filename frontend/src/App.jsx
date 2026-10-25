import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { ToastProvider } from './components/frida/Toast'
import AdminApp from './admin/AdminApp'
import LoginPage from './website/pages/LoginPage'
import { cerrarSesion } from './lib/sesion'
import { PRODUCTO } from './lib/producto'

// Website pública en su propio archivo (chunk): apagada, el navegador nunca la descarga.
const WebsiteApp = lazy(() => import('./website/WebsiteApp'))

// /salir?a=/ruta: cierra la sesión y sigue a `a` (solo rutas internas).
function Salir() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  useEffect(() => {
    const a = params.get('a') ?? '/'
    cerrarSesion().then(() => navigate(a.startsWith('/') && !a.startsWith('//') ? a : '/', { replace: true }))
  }, [navigate, params])
  return null
}

function AppRoutes() {
  const { reduceMotion } = useTheme()
  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <BrowserRouter>
        <Routes>
          <Route path="/entrar"  element={<LoginPage />} />   {/* login único: el rol decide a dónde llega */}
          <Route path="/salir"   element={<Salir />} />
          <Route path="/admin/*" element={<AdminApp />} />
          {/* Website pública apagada (lib/producto.js): toda URL suya va al login,
              que con sesión ya iniciada pasa directo al panel. */}
          <Route path="/*"       element={PRODUCTO.websitePublica ? <Suspense fallback={null}><WebsiteApp /></Suspense> : <Navigate to="/entrar" replace />} />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </ThemeProvider>
  )
}
