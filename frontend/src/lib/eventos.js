import { api } from '@/lib/api'

/*
 * UNA conexión SSE (/api/eventos) para todo el panel (PLAN-BACKEND §10). Quien
 * quiera enterarse llama `escucharEventos(fn)`; la conexión se abre con el primer
 * oyente y se cierra con el último.
 *
 *  - El navegador reconecta solo (y manda Last-Event-ID): el servidor reenvía lo
 *    que faltó. El servidor corta cada 10 min a propósito (el token dura 15).
 *  - Si la reconexión falla del todo (sesión vencida), se pide /api/auth/yo, que
 *    renueva la sesión si se puede, y se abre otra conexión con ?desde=<último id>.
 *  - Cada evento: { id, tipo, agregado, agregado_id, propiedad_id, por }.
 */

const oyentes = new Set()
let fuente = null
let ultimoId = null
let espera = 1000
let temporizador = null

function conectar() {
  if (fuente || typeof EventSource === 'undefined' || !oyentes.size) return
  fuente = new EventSource(`/api/eventos${ultimoId ? `?desde=${ultimoId}` : ''}`)
  fuente.onmessage = e => {
    espera = 1000
    try {
      const m = JSON.parse(e.data)
      ultimoId = m.id
      oyentes.forEach(o => o(m))
    } catch { /* un mensaje roto no tumba la conexión */ }
  }
  fuente.onerror = () => {
    if (fuente?.readyState !== EventSource.CLOSED) return // reconectando por su cuenta
    fuente = null
    clearTimeout(temporizador)
    temporizador = setTimeout(async () => {
      try { await api('/api/auth/yo') } catch { return } // sin sesión: no se insiste
      conectar()
    }, espera)
    espera = Math.min(espera * 2, 30_000)
  }
}

function cerrar() {
  clearTimeout(temporizador)
  fuente?.close()
  fuente = null
}

/** Escucha los eventos del panel. Devuelve la función para dejar de escuchar. */
export function escucharEventos(fn) {
  oyentes.add(fn)
  conectar()
  return () => {
    oyentes.delete(fn)
    if (!oyentes.size) cerrar()
  }
}
