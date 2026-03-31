import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

function getInitialDark() {
  // 1) Override explícito del usuario
  const stored = localStorage.getItem('frida-theme')
  if (stored === 'dark')  return true
  if (stored === 'light') return false
  // 2) Preferencia del sistema operativo
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(getInitialDark)

  // Aplica la clase al <html> y sincroniza con localStorage
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (isDark === system) {
      // El usuario volvió a la preferencia del OS → no necesitamos guardar nada
      localStorage.removeItem('frida-theme')
    } else {
      localStorage.setItem('frida-theme', isDark ? 'dark' : 'light')
    }
  }, [isDark])

  // Escucha cambios del OS cuando el usuario no tiene override guardado
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      if (!localStorage.getItem('frida-theme')) {
        setIsDark(e.matches)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <ThemeContext.Provider value={{ isDark, toggleDark: () => setIsDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
