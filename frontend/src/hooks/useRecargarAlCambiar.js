import { useEffect, useRef } from 'react'
import { escucharEventos } from '@/lib/eventos'

/**
 * Vuelve a pedir lo que muestra una pantalla cuando el servidor avisa (SSE) que cambió algo de
 * ese `agregado` ("habitacion", "externas"…). Las páginas del panel se guardan vivas al salir
 * (<Activity>) y mientras están ocultas no escuchan: por eso, al volver a mostrarse, se pide de nuevo.
 */
export function useRecargarAlCambiar(agregado, recargar) {
  const ref = useRef(recargar)
  ref.current = recargar
  const primera = useRef(true)
  useEffect(() => {
    if (primera.current) primera.current = false
    else ref.current() // se volvió a mostrar: pudo cambiar algo mientras estaba oculta
    return escucharEventos(m => { if (m.agregado === agregado) ref.current() })
  }, [agregado])
}
