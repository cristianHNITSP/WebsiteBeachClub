import { api } from '@/lib/api'
import { MODULOS } from './modulos'

/*
 * Personal del hotel contra la API (/api/admin/personal, fase 3e).
 * Forma: { id, usuario, nombre, correo, rol, rol_nombre, activo, propiedades: [id],
 *          todas_las_propiedades, debe_cambiar_clave, ultimo_acceso, creado }
 */
const BASE = '/api/admin/personal'
const consulta = params => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, v)
  return `?${q}`
}

export const personalApi = {
  listar: (params, senal) => api(`${BASE}${consulta(params)}`, { senal }),
  roles: senal => api(`${BASE}/roles`, { senal }),
  obtener: (id, senal) => api(`${BASE}/${id}`, { senal }),
  crear: datos => api(BASE, { metodo: 'POST', cuerpo: datos }),
  editar: (id, datos) => api(`${BASE}/${id}`, { metodo: 'PUT', cuerpo: datos }),
  desactivar: id => api(`${BASE}/${id}/desactivar`, { metodo: 'POST' }),
  reactivar: id => api(`${BASE}/${id}/reactivar`, { metodo: 'POST' }),
  restablecerClave: (id, clave) => api(`${BASE}/${id}/clave`, { metodo: 'POST', cuerpo: { clave_temporal: clave } }),
}

export const cuentaApi = {
  cambiarClave: (actual, nueva) => api('/api/auth/clave', { metodo: 'POST', cuerpo: { actual, nueva } }),
  sesiones: senal => api('/api/auth/sesiones', { senal }),
  cerrarSesion: sid => api(`/api/auth/sesiones/${sid}`, { metodo: 'DELETE' }),
}

/** Una contraseña temporal fuerte y fácil de dictar (sin 0/O ni 1/l/I). */
export function claveTemporal() {
  const letras = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const azar = crypto.getRandomValues(new Uint32Array(16))
  const s = Array.from(azar, n => letras[n % letras.length]).join('')
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}`
}

/** Un rol cuyo módulo está apagado (admin/modulos.js) se ve "Próximamente" y no se
 *  puede asignar. Al encender el módulo, se habilita solo. */
export const rolProximamente = clave => clave === 'restaurante' && !MODULOS.restaurante

/** Opciones de rol para un Selector: los de módulo apagado, atenuados. */
export const opcionesDeRol = roles => roles.map(r => (
  rolProximamente(r.clave) ? { value: r.clave, label: r.nombre, tag: 'Próximamente', disabled: true } : { value: r.clave, label: r.nombre }
))
