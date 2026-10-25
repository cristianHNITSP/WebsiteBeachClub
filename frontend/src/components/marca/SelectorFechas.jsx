import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { es } from 'react-day-picker/locale'
import { CalendarDotsIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { nochesEntre } from '@/lib/fechas'
import { useTheme } from '@/context/ThemeContext'

const corta = d => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })


// Dos meses a la vista en escritorio, uno en el teléfono.
function useMeses() {
  const consulta = '(min-width: 768px)'
  const [ancho, setAncho] = useState(() => window.matchMedia(consulta).matches)
  useEffect(() => {
    const mq = window.matchMedia(consulta)
    const alCambiar = e => setAncho(e.matches)
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])
  return ancho ? 2 : 1
}

/**
 * Rango de fechas con el Calendar de shadcn (react-day-picker) en un Popover.
 * Sustituye a los <input type="date"> nativos en TODA la app (website y panel).
 * value / onChange: { from?: Date, to?: Date }
 *   permitirPasado: días pasados elegibles (filtros, historial). Por omisión, no.
 *   textos:         { vacio, sinFin } (por omisión "Llegada → Salida" y "Salida").
 *   noches:         muestra la insignia de noches (por omisión, sí).
 *   ariaLabel:      nombre accesible del botón.
 */
// Mes que entra desde el lado de la flecha pulsada (navegación: se admite translate).
const deslizar = {
  entra: dir => ({ x: dir > 0 ? 36 : -36, opacity: 0 }),
  quieto: { x: 0, opacity: 1 },
  sale:  dir => ({ x: dir > 0 ? -36 : 36, opacity: 0 }),
}

export default function SelectorFechas({
  id, value, onChange, className = '', permitirPasado = false, noches: conNoches = true, ariaLabel,
  textos = { vacio: 'Llegada → Salida', sinFin: 'Salida' },
}) {
  const { reduceMotion } = useTheme()
  const [abierto, setAbierto] = useState(false)
  const meses = useMeses()
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const [mes, setMes] = useState(() => value?.from ?? hoy)
  const [dir, setDir] = useState(0)
  const cambiarMes = m => { setDir(m > mes ? 1 : -1); setMes(m) }
  const noches = nochesEntre(value)

  const texto = value?.from
    ? value.to
      ? `${corta(value.from)} → ${corta(value.to)}`
      : `${corta(value.from)} → ${textos.sinFin}`
    : textos.vacio

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          aria-label={ariaLabel ? `${ariaLabel}: ${texto}` : undefined}
          variant="outline"
          className={`h-11 w-full justify-start gap-2 border-0 bg-card px-4 font-normal shadow-[inset_0_0_0_1px_var(--input)] hover:bg-card [font-size:var(--fs-sm)] ${value?.from ? '' : 'text-muted-foreground'} ${className}`}
        >
          <CalendarDotsIcon size={18} className="text-primary" aria-hidden="true" />
          <span className="truncate">{texto}</span>
          {conNoches && noches > 0 && (
            <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
              {noches} noche{noches !== 1 ? 's' : ''}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        {/* Entrada con resorte; el anclado arriba baja unos px al aparecer */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 320 }}
          style={{ transformOrigin: 'top left' }}
        >
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={`${mes.getFullYear()}-${mes.getMonth()}`}
              custom={dir}
              variants={reduceMotion ? undefined : deslizar}
              initial="entra"
              animate="quieto"
              exit="sale"
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            >
              <Calendar
                mode="range"
                locale={es}
                numberOfMonths={meses}
                month={mes}
                onMonthChange={cambiarMes}
                selected={value}
                onSelect={rango => {
                  onChange(rango ?? {})
                  if (rango?.from && rango?.to && rango.to > rango.from) setTimeout(() => setAbierto(false), 350)
                }}
                disabled={permitirPasado ? undefined : { before: hoy }}
                excludeDisabled={!permitirPasado}
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </PopoverContent>
    </Popover>
  )
}
