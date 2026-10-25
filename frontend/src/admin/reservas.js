import { useCallback, useEffect } from 'react'
import { api } from '@/lib/api'
import { aISO, deISO } from '@/lib/fechas'
import { usePedido } from '@/hooks/usePedido'
import { escucharEventos } from '@/lib/eventos'
import { useSesion } from '@/lib/sesion'
import { habitacionesApi } from './habitaciones'
import { usePropiedadActual } from './propiedadActual'

/*
 * Reservas del panel contra la API (/api/admin/reservas, fase 3c del backend).
 * La Línea de tiempo y el punto de venta las ven con la forma de siempre:
 *   { id, habitacionId, huesped, llegada: 'AAAA-MM-DD', salida, estado, version, total, codigo }
 *   estado: confirmada | pendiente | en-curso | completada | bloqueo
 * Las noches van de `llegada` (incluida) a `salida` (excluida). Los montos los
 * calcula SIEMPRE el servidor; aquí solo se pintan.
 */

const BASE = '/api/admin/reservas'

export const ESTADOS = {
  confirmada:  'Confirmada',
  pendiente:   'Pendiente',
  'en-curso':  'En curso',
  completada:  'Completada',
  bloqueo:     'Mantenimiento',
}
// API → panel. `retenida` (la aparta la website mientras paga) se ve como pendiente.
const A_PANEL = { retenida: 'pendiente', confirmada: 'confirmada', en_curso: 'en-curso', completada: 'completada' }
// Las que ocupan o ya ocuparon la habitación (las canceladas y vencidas no se pintan).
const EN_LINEA = ['retenida', 'confirmada', 'en_curso', 'completada']

export const alPanel = r => ({
  id: r.id,
  codigo: r.codigo,
  habitacionId: r.habitacion_id,
  huesped: r.tipo === 'bloqueo' ? (r.notas || 'Mantenimiento') : r.huesped_nombre,
  llegada: r.llegada,
  salida: r.salida,
  estado: r.tipo === 'bloqueo' ? 'bloqueo' : A_PANEL[r.estado],
  version: r.version,
  total: r.total_centavos,
  porCobrar: r.por_cobrar_centavos,
})

const consulta = params => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach(x => q.append(k, x))
    else if (v !== undefined && v !== null && v !== '') q.set(k, v)
  }
  return `?${q}`
}

export const reservasApi = {
  listar: (params, senal) => api(`${BASE}${consulta(params)}`, { senal }),
  cotizar: (params, senal) => api(`${BASE}/cotizar${consulta(params)}`, { senal }),
  crear: datos => api(BASE, { metodo: 'POST', cuerpo: datos }),
  mover: (id, datos) => api(`${BASE}/${id}/fechas`, { metodo: 'PUT', cuerpo: datos }),
  detalle: (id, senal) => api(`${BASE}/${id}`, { senal }),
  historial: (id, senal) => api(`${BASE}/${id}/historial`, { senal }),
  llegada: (id, version) => api(`${BASE}/${id}/llegada`, { metodo: 'POST', cuerpo: { version } }),
  salida: (id, version) => api(`${BASE}/${id}/salida`, { metodo: 'POST', cuerpo: { version } }),
  cancelar: (id, version, motivo) => api(`${BASE}/${id}/cancelar`, { metodo: 'POST', cuerpo: { version, motivo } }),
  pagar: (id, datos) => api(`${BASE}/${id}/pagos`, { metodo: 'POST', cuerpo: datos }),
  devolver: (id, datos) => api(`${BASE}/${id}/devoluciones`, { metodo: 'POST', cuerpo: datos }),
}

export const hoy = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
export const sumarDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export const dias = (a, b) => Math.round((deISO(b) - deISO(a)) / 86400000)

/** ¿Choca con otra reserva (o bloqueo) de esa habitación? Para avisar ANTES de
 *  pedir; la última palabra es de la base (restricción `sin_choque`). */
export function conflicto(lista, { id, habitacionId, llegada, salida }) {
  const a = deISO(llegada), b = deISO(salida)
  return lista.find(x => x.id !== id && x.estado !== 'completada' && x.habitacionId === habitacionId && deISO(x.llegada) < b && a < deISO(x.salida)) ?? null
}

// La última lista de habitaciones vista: el esqueleto la usa para tener las
// mismas filas que la vista cuando vuelve a cargar.
let ultimasHabitaciones = null
export const habitacionesConocidas = () => ultimasHabitaciones

/**
 * Habitaciones y reservas de la propiedad elegida en la SideNav, en la ventana
 * [desde, hasta). `mover` y `crear` van a la API y, al terminar, vuelven a pedir
 * la lista (lo que se ve es siempre lo guardado). Devuelven el error de la API
 * (con su mensaje ya escrito para la persona) o null.
 */
export function useReservas({ desde, hasta }) {
  const { propiedadId } = usePropiedadActual()
  const { sesion } = useSesion()
  const claveDe = id => sesion?.propiedades?.find(p => p.id === id)?.clave

  const habs = usePedido(
    // ponytail: hasta 100 habitaciones por propiedad (el tope de la API); más, paginar aquí.
    senal => habitacionesApi.listar({ propiedad: propiedadId, por_pagina: 100 }, senal),
    [propiedadId],
  )
  const lista = usePedido(
    senal => reservasApi.listar({ propiedad: propiedadId, desde: aISO(desde), hasta: aISO(hasta), estado: EN_LINEA }, senal),
    [propiedadId, aISO(desde), aISO(hasta)],
  )

  const habitaciones = habs.datos?.items.map(h => ({
    id: h.id,
    name: h.nombre,
    type: h.tipo,
    status: h.estado === 'activa' ? 'active' : 'maintenance',
    propiedad: claveDe(h.propiedad_id),
    propiedadId: h.propiedad_id,
    capacidad: h.capacidad,
    rate: h.tarifa_centavos / 100,
  })) ?? []
  useEffect(() => { if (habs.datos) ultimasHabitaciones = habitaciones })

  const recargar = lista.recargar
  // En vivo (SSE): si alguien crea, mueve o cobra una reserva, la lista se vuelve
  // a pedir (con un respiro, por si llegan varios eventos juntos).
  useEffect(() => {
    let pendiente = null
    const quitar = escucharEventos(m => {
      if (m.agregado !== 'reserva') return
      clearTimeout(pendiente)
      pendiente = setTimeout(recargar, 300)
    })
    return () => { clearTimeout(pendiente); quitar() }
  }, [recargar])
  const intentar = useCallback(async pedir => {
    try { await pedir(); return null } catch (e) { return e } finally { recargar() }
  }, [recargar])

  const mover = (r, cambios) => intentar(() => reservasApi.mover(r.id, {
    habitacion_id: cambios.habitacionId ?? r.habitacionId,
    llegada: cambios.llegada ?? r.llegada,
    salida: cambios.salida ?? r.salida,
    version: r.version,
  }))
  const crear = datos => intentar(() => reservasApi.crear(datos))

  return {
    habitaciones,
    reservas: (lista.datos ?? []).map(alPanel),
    cargando: habs.cargando || lista.cargando,
    error: habs.error ?? lista.error,
    recargar: () => { habs.recargar(); lista.recargar() },
    mover,
    crear,
  }
}
