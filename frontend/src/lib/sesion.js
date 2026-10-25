import { useSyncExternalStore } from 'react'
import { api, siSePierdeLaSesion } from './api'

/*
 * Sesión del panel, contra la API (docs/PLAN-BACKEND.md §11). La sesión vive
 * en cookies HttpOnly que pone y quita el backend: el JS no ve ningún token.
 * Aquí solo se guarda QUIÉN es (lo que devuelve /api/auth/yo) para pintar.
 *
 * Un solo login (/entrar): el rol decide a dónde llega cada quien. Dura 12 h
 * desde que se inicia (absoluto); "Mantener la sesión iniciada" solo decide si
 * sobrevive a cerrar el navegador.
 */
export const ROLES_PERSONAL = ['gerente', 'recepcion', 'restaurante']
export const esPersonal = sesion => ROLES_PERSONAL.includes(sesion?.rol)

// Estado: 'verificando' hasta que la API responde quién es; entonces lista.
// Ninguna pantalla protegida se monta antes (ver RutaProtegida).
let instantanea = { verificando: true, sesion: null }
const oyentes = new Set()
let vencimiento = null

const fijar = sesion => {
  instantanea = { verificando: false, sesion }
  // A las 12 h la API ya no la renueva; aquí se adelanta para no esperar a un 401.
  clearTimeout(vencimiento)
  if (sesion?.vence) vencimiento = setTimeout(() => fijar(null), Math.max(0, new Date(sesion.vence) - Date.now()))
  oyentes.forEach(o => o())
}

// Si la API deja de reconocer la sesión (revocada, vencida), las guardias
// mandan al login con ?volver= a la misma pantalla.
siSePierdeLaSesion(() => { if (instantanea.sesion) fijar(null) })

async function verificar() {
  try {
    fijar(await api('/api/auth/yo'))
  } catch {
    fijar(null)
  }
}
if (typeof window !== 'undefined') verificar()

/** Vuelve a pedir la sesión a la API (p. ej. tras cambiar la contraseña temporal). */
export const refrescarSesion = () => verificar()

/** { verificando, sesion }: sesion es null sin sesión o mientras se verifica. */
export function useSesion() {
  return useSyncExternalStore(o => { oyentes.add(o); return () => oyentes.delete(o) }, () => instantanea)
}

/** Entra con usuario o correo. Lanza ErrorApi (401 credenciales, 429 bloqueo…). */
export async function iniciarSesion(identificador, clave, recordar) {
  const sesion = await api('/api/auth/entrar', { metodo: 'POST', cuerpo: { identificador, clave, recordar } })
  fijar(sesion)
  return sesion
}

/** Cierra la sesión en el servidor (y aquí aunque el servidor no responda). */
export async function cerrarSesion() {
  try {
    await api('/api/auth/salir', { metodo: 'POST' })
  } catch { /* ya no había sesión o no hay red: igual se olvida aquí */ }
  fijar(null)
}

/**
 * A dónde va alguien al entrar. `volver` es la pantalla que pidió (solo rutas
 * internas: nunca "//otro-sitio"). Un huésped nunca aterriza en el panel.
 */
export function destinoTrasEntrar(sesion, volver) {
  const interna = typeof volver === 'string' && volver.startsWith('/') && !volver.startsWith('//')
  const inicio = esPersonal(sesion) ? '/admin' : '/mi-cuenta'
  if (!interna || volver.startsWith('/entrar')) return inicio
  if (volver.startsWith('/admin') && !esPersonal(sesion)) return '/mi-cuenta'
  return volver
}

/**
 * Cerrar sesión SIEMPRE pasa por /salir (componente Salir en App.jsx): ahí no
 * hay ninguna pantalla protegida montada, así que su guardia no se adelanta a
 * redirigir al login. `a` = a dónde ir después (ruta interna).
 */
export const rutaSalir = (a = '/') => `/salir?a=${encodeURIComponent(a)}`

/** Enlace al login que, al entrar, regresa a la pantalla actual. */
export const rutaEntrar = ({ pathname, search }) => `/entrar?volver=${encodeURIComponent(pathname + search)}`
