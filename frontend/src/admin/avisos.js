import { useEffect, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { escucharEventos } from '@/lib/eventos'

/*
 * Avisos del panel (fase 4): caché de /api/admin/avisos. Un solo almacén para la
 * campana, la insignia de la barra lateral y la página de Avisos. Se vuelve a
 * pedir cuando llega un evento en vivo (SSE); si el aviso nuevo lo causó otra
 * persona, además suena un toast. Leído y borrado van a la API (de cada quien).
 * Aviso: { id, tipo, titulo, texto, destino (ruta del panel), fecha, leido, propio }
 */

const MIN = 60 * 1000
const HORA = 60 * MIN
const DIA = 24 * HORA
const BASE = '/api/admin/avisos'

let estado = { avisos: [], cargado: false, error: null }
const oyentes = new Set()
const emitir = sig => { estado = sig; oyentes.forEach(o => o()) }
const suscribir = o => { oyentes.add(o); return () => oyentes.delete(o) }

let pidiendo = null
async function cargar({ avisar = false } = {}) {
  pidiendo ??= (async () => {
    try {
      const conocidos = new Set(estado.avisos.map(a => a.id))
      const lista = (await api(BASE)).map(a => ({ ...a, fecha: new Date(a.creado) }))
      if (avisar) {
        for (const a of lista.filter(x => !conocidos.has(x.id) && !x.propio && !x.leido).slice(0, 3)) {
          toast(a.titulo, { description: a.texto })
        }
      }
      emitir({ avisos: lista, cargado: true, error: null })
    } catch (error) {
      emitir({ ...estado, cargado: true, error })
    } finally {
      pidiendo = null
    }
  })()
  return pidiendo
}

// Varios eventos seguidos (p. ej. crear + cobrar) = una sola consulta.
let pendiente = null
const programar = () => { clearTimeout(pendiente); pendiente = setTimeout(() => cargar({ avisar: true }), 400) }

// Cambio optimista: se ve al instante; si la API falla, se vuelve a pedir.
const cambiar = (id, cambio) => emitir({ ...estado, avisos: estado.avisos.map(a => (a.id === id ? { ...a, ...cambio } : a)) })
// Un aviso que ya no existe (404) no es un error para la persona: la lista se
// vuelve a pedir y desaparece solo.
const intentar = pedir => pedir().catch(e => { if (e.estado !== 404) toast.error(e.message); cargar() })

export const acciones = {
  marcarLeido: (id, leido = true) => { cambiar(id, { leido }); intentar(() => api(`${BASE}/${id}/leido`, { metodo: 'POST', cuerpo: { leido } })) },
  marcarTodos: () => { emitir({ ...estado, avisos: estado.avisos.map(a => ({ ...a, leido: true })) }); intentar(() => api(`${BASE}/leer-todos`, { metodo: 'POST' })) },
  borrar: id => { cambiar(id, { borrado: true }); intentar(() => api(`${BASE}/${id}`, { metodo: 'DELETE' })) },
  restaurar: id => { cambiar(id, { borrado: false }); intentar(() => api(`${BASE}/${id}/restaurar`, { metodo: 'POST' })) },
}

// Día relativo para agrupar: Hoy, Ayer, Esta semana, Anteriores
export function grupoDe(fecha) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const d = new Date(fecha); d.setHours(0, 0, 0, 0)
  const dias = Math.round((hoy - d) / DIA)
  return dias <= 0 ? 'Hoy' : dias === 1 ? 'Ayer' : dias < 7 ? 'Esta semana' : 'Anteriores'
}

const rtf = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' })
export function haceCuanto(fecha) {
  const ms = Date.now() - fecha
  if (ms < HORA) return rtf.format(-Math.max(1, Math.round(ms / MIN)), 'minute')
  if (ms < DIA) return rtf.format(-Math.round(ms / HORA), 'hour')
  return rtf.format(-Math.round(ms / DIA), 'day')
}

/** Avisos visibles (sin borrados) con `leido`, el contador de no leídos y el estado de carga. */
export function useAvisos() {
  const e = useSyncExternalStore(suscribir, () => estado)
  useEffect(() => {
    if (!estado.cargado) cargar()
    return escucharEventos(programar)
  }, [])
  const lista = e.avisos.filter(a => !a.borrado)
  return { avisos: lista, sinLeer: lista.filter(a => !a.leido).length, cargando: !e.cargado, error: e.error, recargar: () => cargar(), ...acciones }
}
