import { api } from '@/lib/api'

/*
 * Habitaciones del panel contra la API (/api/admin/habitaciones, fase 3a del
 * backend). Dinero en centavos hasta pintarlo; el id es un uuid.
 * Forma: { id, propiedad_id, nombre, tipo, capacidad, cama, tamano_m2,
 *          amenidades, descripcion, tarifa_centavos, estado, version, foto }
 */

const BASE = '/api/admin/habitaciones'

const consulta = params => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, v)
  const texto = q.toString()
  return texto ? `?${texto}` : ''
}

export const habitacionesApi = {
  listar: (params, senal) => api(`${BASE}${consulta(params)}`, { senal }),
  obtener: (id, senal) => api(`${BASE}/${encodeURIComponent(id)}`, { senal }),
  crear: datos => api(BASE, { metodo: 'POST', cuerpo: datos }),
  editar: (id, datos) => api(`${BASE}/${encodeURIComponent(id)}`, { metodo: 'PUT', cuerpo: datos }),
  aPapelera: (id, motivo) => api(`${BASE}/${encodeURIComponent(id)}${consulta({ motivo })}`, { metodo: 'DELETE' }),
  borrarDefinitivo: id => api(`${BASE}/${encodeURIComponent(id)}?definitivo=true`, { metodo: 'DELETE' }),
  restaurar: id => api(`${BASE}/${encodeURIComponent(id)}/restaurar`, { metodo: 'POST' }),
  fotos: (id, senal) => api(`${BASE}/${encodeURIComponent(id)}/fotos`, { senal }),
  subirFoto: (id, archivo) => {
    const datos = new FormData()
    datos.append('archivo', archivo)
    return api(`${BASE}/${encodeURIComponent(id)}/fotos`, { metodo: 'POST', cuerpo: datos })
  },
  ordenarFotos: (id, ids) => api(`${BASE}/${encodeURIComponent(id)}/fotos/orden`, { metodo: 'PUT', cuerpo: { ids } }),
  quitarFoto: (id, fotoId) => api(`${BASE}/${encodeURIComponent(id)}/fotos/${fotoId}`, { metodo: 'DELETE' }),
  restaurarFoto: (id, fotoId) => api(`${BASE}/${encodeURIComponent(id)}/fotos/${fotoId}/restaurar`, { metodo: 'POST' }),
  papelera: (cursor, senal) => api(`${BASE}/papelera${consulta({ cursor, limite: 50 })}`, { senal }),
}

export const ESTADOS_HABITACION = {
  activa: 'Disponible',
  mantenimiento: 'En mantenimiento',
  inactiva: 'Inactiva',
}

export const pesos = centavos => `MXN $${(centavos / 100).toLocaleString('es-MX', { maximumFractionDigits: 2 })}`
