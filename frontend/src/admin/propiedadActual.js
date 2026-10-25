import { useSyncExternalStore } from 'react'
import { useSesion } from '@/lib/sesion'

/*
 * El selector de propiedad del panel (SideNav), compartido por todas las
 * páginas (PLAN-BACKEND §11.1). Las opciones salen de la sesión: quien tiene
 * acceso a las dos ve también "Todas"; quien tiene una, solo esa. Se recuerda
 * por navegador (localStorage, comodidad de cada persona). La API vuelve a
 * comprobar el acceso: esto solo elige qué pedir.
 */

const CLAVE = 'frida-propiedad'
export const TODAS = 'todas'

const leer = () => { try { return localStorage.getItem(CLAVE) } catch { return null } }
let elegida = leer()
const oyentes = new Set()
const suscribir = o => { oyentes.add(o); return () => oyentes.delete(o) }

export function elegirPropiedad(valor) {
  elegida = valor
  try { localStorage.setItem(CLAVE, valor) } catch { /* sin almacenamiento */ }
  oyentes.forEach(o => o())
}

/** { valor, opciones, propiedadId }: `propiedadId` es lo que se manda a la API (null = todas). */
export function usePropiedadActual() {
  const guardada = useSyncExternalStore(suscribir, () => elegida)
  const { sesion } = useSesion()
  const propias = sesion?.propiedades ?? []
  const opciones = [
    ...(propias.length > 1 ? [{ value: TODAS, label: 'Todas', tag: `${propias.length} propiedades` }] : []),
    ...propias.map(p => ({ value: p.id, label: p.nombre, tag: p.lugar.split(',')[0] })),
  ]
  // Lo guardado puede ser de otra cuenta o de una propiedad que ya no tiene: se ignora.
  const valor = opciones.some(o => o.value === guardada) ? guardada : (opciones[0]?.value ?? TODAS)
  return { valor, opciones, propiedadId: valor === TODAS ? null : valor }
}
