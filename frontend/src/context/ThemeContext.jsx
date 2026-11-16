import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'

const ThemeContext = createContext(null)

function getInitialDark() {
  const stored = localStorage.getItem('frida-theme')
  if (stored === 'dark')  return true
  if (stored === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Zoom de toda la app en %, a gusto de cada persona (sobre todo en el teléfono). Hereda el tamaño
// de texto de antes (pequeño 87.5 %, grande 115 %).
const ZOOM = { min: 70, max: 130, paso: 5 }
function getInitialZoom() {
  try {
    const z = Number(localStorage.getItem('frida-zoom'))
    if (z >= ZOOM.min && z <= ZOOM.max) return z
    const viejo = localStorage.getItem('frida-font-size')
    return viejo === 'pequeño' ? 85 : viejo === 'grande' ? 115 : 100
  } catch { return 100 }
}

function getInitialHighContrast() {
  return localStorage.getItem('frida-high-contrast') === 'true'
}

function getInitialReduceMotion() {
  const stored = localStorage.getItem('frida-reduce-motion')
  if (stored !== null) return stored === 'true'
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function ThemeProvider({ children }) {
  const [isDark,        setIsDark]        = useState(getInitialDark)
  const [zoom,          setZoomState]     = useState(getInitialZoom)
  const [highContrast,  setHighContrastState] = useState(getInitialHighContrast)
  const [reduceMotion,  setReduceMotionState] = useState(getInitialReduceMotion)

  /* ── Dark mode (layout effect → applied before first paint) ── */
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (isDark === system) {
      localStorage.removeItem('frida-theme')
    } else {
      localStorage.setItem('frida-theme', isDark ? 'dark' : 'light')
    }
  }, [isDark])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      if (!localStorage.getItem('frida-theme')) setIsDark(e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  /* ── Zoom (CSS zoom en <html>: escala también los px sueltos) ── */
  useLayoutEffect(() => {
    document.documentElement.style.zoom = zoom === 100 ? '' : String(zoom / 100)
    try {
      localStorage.removeItem('frida-font-size')
      if (zoom === 100) localStorage.removeItem('frida-zoom')
      else localStorage.setItem('frida-zoom', String(zoom))
    } catch { /* sin almacenamiento: vale para esta visita */ }
  }, [zoom])

  /* ── High contrast ── */
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast)
    localStorage.setItem('frida-high-contrast', String(highContrast))
  }, [highContrast])

  /* ── Reduce motion ── */
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion)
    localStorage.setItem('frida-reduce-motion', String(reduceMotion))
  }, [reduceMotion])

  return (
    <ThemeContext.Provider value={{
      isDark,        toggleDark: () => setIsDark(d => !d),
      zoom,          setZoom: z => setZoomState(Math.min(ZOOM.max, Math.max(ZOOM.min, Math.round(z / ZOOM.paso) * ZOOM.paso))),
      highContrast,  setHighContrast: setHighContrastState,
      reduceMotion,  setReduceMotion: setReduceMotionState,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
