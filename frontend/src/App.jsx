import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { ToastProvider } from './components/frida/Toast'
import WebsiteApp from './website/WebsiteApp'
import AdminApp from './admin/AdminApp'

function AppRoutes() {
  const { reduceMotion } = useTheme()
  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/*"       element={<WebsiteApp />} />
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
