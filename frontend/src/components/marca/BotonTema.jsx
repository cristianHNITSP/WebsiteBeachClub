import { AnimatePresence, motion } from 'framer-motion'
import { MoonIcon, SunIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/ThemeContext'
import { alternarTemaConCirculo } from '@/lib/transicionTema'
import Pista from './Pista'

/** Claro/oscuro: círculo que crece desde el botón + icono que gira. */
export default function BotonTema({ className = '', lado = 'bottom' }) {
  const { isDark, toggleDark, reduceMotion } = useTheme()
  const texto = isDark ? 'Modo claro' : 'Modo oscuro'
  return (
    <Pista contenido={texto} lado={lado}>
      <Button
        variant="ghost"
        size="icon"
        className={className}
        onClick={e => alternarTemaConCirculo(e, toggleDark, reduceMotion)}
        aria-label={texto}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={isDark ? 'sol' : 'luna'}
            className="inline-flex"
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 14, stiffness: 220 }}
          >
            {isDark ? <SunIcon size={20} weight="bold" /> : <MoonIcon size={20} weight="bold" />}
          </motion.span>
        </AnimatePresence>
      </Button>
    </Pista>
  )
}
