import { motion } from 'framer-motion'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/ThemeContext'
import Pista, { GrupoPistas } from './Pista'
import s from './Paginador.module.css'

// Páginas a mostrar: primera, última, la actual y sus vecinas; el resto "…".
function paginas(actual, total) {
  const set = new Set([1, total, actual - 1, actual, actual + 1].filter(n => n >= 1 && n <= total))
  const orden = [...set].sort((a, b) => a - b)
  const out = []
  orden.forEach((n, i) => {
    if (i && n - orden[i - 1] > 1) out.push(`hueco-${n}`)
    out.push(n)
  })
  return out
}

/**
 * Paginación del panel: anterior / números / siguiente. La marca de la página
 * activa se desliza entre números (layoutId). `pagina` empieza en 1.
 */
export default function Paginador({ pagina, total, onCambiar, id = 'paginador', etiqueta = 'Paginación' }) {
  const { reduceMotion } = useTheme()
  if (total <= 1) return null
  return (
    <GrupoPistas>
      <nav className={s.paginador} aria-label={etiqueta}>
        <Pista contenido="Página anterior" lado="top">
          <Button variant="outline" size="icon" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)} aria-label="Página anterior">
            <CaretLeftIcon size={16} weight="bold" />
          </Button>
        </Pista>

        <ol className={s.numeros}>
          {paginas(pagina, total).map(n =>
            typeof n === 'string' ? (
              <li key={n} className={s.hueco} aria-hidden="true">…</li>
            ) : (
              <li key={n}>
                <button
                  className={`${s.numero} ${n === pagina ? s.activo : ''}`}
                  onClick={() => onCambiar(n)}
                  aria-current={n === pagina ? 'page' : undefined}
                  aria-label={`Página ${n}`}
                >
                  {n === pagina && (
                    <motion.span
                      layoutId={`${id}-activa`}
                      className={s.marca}
                      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 32 }}
                    />
                  )}
                  <span className={s.texto}>{n}</span>
                </button>
              </li>
            ),
          )}
        </ol>

        <Pista contenido="Página siguiente" lado="top">
          <Button variant="outline" size="icon" disabled={pagina >= total} onClick={() => onCambiar(pagina + 1)} aria-label="Página siguiente">
            <CaretRightIcon size={16} weight="bold" />
          </Button>
        </Pista>
      </nav>
    </GrupoPistas>
  )
}
