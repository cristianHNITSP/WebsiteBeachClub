import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'

const ThemeContext = createContext(null)

function getInitialDark() {
  const stored = localStorage.getItem('frida-theme')
  if (stored === 'dark')  return true
  if (stored === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getInitialFontSize() {
  return localStorage.getItem('frida-font-size') || 'normal'
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
  const [fontSize,      setFontSizeState] = useState(getInitialFontSize)
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

  /* ── Font size ── */
  useLayoutEffect(() => {
    const html = document.documentElement
    html.classList.remove('font-small', 'font-large')
    if (fontSize !== 'normal') html.classList.add(`font-${fontSize === 'pequeño' ? 'small' : 'large'}`)
    localStorage.setItem('frida-font-size', fontSize)
  }, [fontSize])

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
      fontSize,      setFontSize: setFontSizeState,
      highContrast,  setHighContrast: setHighContrastState,
      reduceMotion,  setReduceMotion: setReduceMotionState,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
