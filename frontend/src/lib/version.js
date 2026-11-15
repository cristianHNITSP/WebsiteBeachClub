/* global __VERSION__ */
import { useSyncExternalStore } from 'react'

/*
 * ¿Hay una versión nueva del panel? Cada compilación lleva su versión (`__VERSION__`, ver
 * vite.config.js) y publica la misma en /version.json (Nginx no la guarda en caché). Si la
 * publicada ya es otra, esta pestaña quedó vieja: AdminLayout ofrece actualizar. Se revisa
 * al volver a la pestaña, cada 10 minutos y cuando el servidor vuelve de una caída.
 * `fetch` directo: es un archivo estático, no la API.
 */

export const VERSION = typeof __VERSION__ === 'undefined' ? 'desarrollo' : __VERSION__
const CADA_MS = 10 * 60 * 1000
let nueva = false
const oyentes = new Set()

export async function revisarVersion() {
  if (import.meta.env.DEV || nueva) return // en desarrollo no hay /version.json
  try {
    const r = await fetch('/version.json', { cache: 'no-store' })
    const { version } = await r.json()
    if (version && version !== VERSION) {
      nueva = true
      oyentes.forEach(fn => fn())
    }
  } catch { /* sin respuesta: se intenta en la siguiente vuelta */ }
}

/** Empieza a vigilar. Devuelve la función para dejar de hacerlo. */
export function vigilarVersion() {
  const alVolver = () => { if (document.visibilityState === 'visible') revisarVersion() }
  document.addEventListener('visibilitychange', alVolver)
  const intervalo = setInterval(revisarVersion, CADA_MS)
  return () => { document.removeEventListener('visibilitychange', alVolver); clearInterval(intervalo) }
}

const suscribir = fn => { oyentes.add(fn); return () => oyentes.delete(fn) }
export const useVersionNueva = () => useSyncExternalStore(suscribir, () => nueva)
