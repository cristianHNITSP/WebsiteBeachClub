import { useSyncExternalStore } from 'react'
import { revisarVersion } from '@/lib/version'

/*
 * ¿Responde el servidor? Lo usa la pantalla "Reservas Frida se está actualizando"
 * (`components/marca/Actualizando.jsx`). Al desplegar, la API se reinicia unos segundos y
 * responde 502/503/504 o no responde: `api.js` avisa aquí y, en vez de errores sueltos en
 * cada pantalla, sale una sola pantalla que se revisa sola hasta que vuelve.
 *
 * Estados: bien → caido ⇄ revisando → volvio → bien.
 * Sin internet en este equipo no es una caída del servidor: de eso avisa AdminLayout.
 */

const CADA_MS = 5000
let estado = 'bien'
let desde = 0
let temporizador = null
const oyentes = new Set()

function poner(nuevo) {
  estado = nuevo
  oyentes.forEach(fn => fn())
}

/** El servidor no respondió. Idempotente: varias peticiones fallidas a la vez son una caída. */
export function avisarCaida() {
  if (estado === 'caido' || estado === 'revisando') return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  desde = Date.now()
  poner('caido')
  clearTimeout(temporizador)
  temporizador = setTimeout(revisar, CADA_MS)
}

/** Pregunta si ya volvió. `fetch` directo y no `api()`: /api/health es público y api() avisaría otra caída. */
export async function revisar() {
  if (estado !== 'caido') return
  clearTimeout(temporizador)
  poner('revisando')
  let vivo = false
  try {
    vivo = (await fetch('/api/health', { cache: 'no-store', signal: AbortSignal.timeout(4000) })).ok
  } catch { /* sigue caído */ }
  if (!vivo) {
    poner('caido')
    temporizador = setTimeout(revisar, CADA_MS)
    return
  }
  poner('volvio')
  revisarVersion() // casi siempre fue un despliegue: que avise si hay versión nueva
  temporizador = setTimeout(() => poner('bien'), 1600)
}

export const caidoDesde = () => desde

const suscribir = fn => { oyentes.add(fn); return () => oyentes.delete(fn) }
/** 'bien' | 'caido' | 'revisando' | 'volvio' */
export const useServicio = () => useSyncExternalStore(suscribir, () => estado)
