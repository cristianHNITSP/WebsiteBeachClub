import { api } from '@/lib/api'

/*
 * Otras plataformas y el bot (/api/admin/externas, fase 9). Solo consulta: lo de
 * Booking, Airbnb y demás no bloquea la venta propia; si choca, llega un aviso.
 */
const BASE = '/api/admin/externas'
const q = params => `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''))}`

export const externasApi = {
  reservas: (params, senal) => api(`${BASE}/reservas${q(params)}`, { senal }),
  calendarios: (params, senal) => api(`${BASE}/calendarios${q(params)}`, { senal }),
  crearCalendario: datos => api(`${BASE}/calendarios`, { metodo: 'POST', cuerpo: datos }),
  borrarCalendario: id => api(`${BASE}/calendarios/${id}`, { metodo: 'DELETE' }),
  leerCalendario: id => api(`${BASE}/calendarios/${id}/leer`, { metodo: 'POST' }),
  menciones: senal => api(`${BASE}/menciones`, { senal }),
  bot: senal => api(`${BASE}/bot`, { senal }),
  cambiarBot: datos => api(`${BASE}/bot`, { metodo: 'PUT', cuerpo: datos }),
  fichas: senal => api(`${BASE}/fichas`, { senal }),
  crearFicha: datos => api(`${BASE}/fichas`, { metodo: 'POST', cuerpo: datos }),
  borrarFicha: id => api(`${BASE}/fichas/${id}`, { metodo: 'DELETE' }),
  leerFicha: id => api(`${BASE}/fichas/${id}/leer`, { metodo: 'POST' }),
  leerFichas: () => api(`${BASE}/fichas/leer`, { metodo: 'POST' }),
  importarCuarto: (id, datos) => api(`${BASE}/fichas/${id}/importar`, { metodo: 'POST', cuerpo: datos }),
  buscarAhora: () => api(`${BASE}/bot/buscar`, { metodo: 'POST' }),
}

export const CANALES = [
  { value: 'booking', label: 'Booking.com' },
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'expedia', label: 'Expedia' },
  { value: 'vrbo', label: 'Vrbo' },
  { value: 'otro', label: 'Otra' },
]
export const nombreCanal = c => CANALES.find(x => x.value === c)?.label ?? c

/** Igual que `etiqueta_de_publicacion` del servidor: así se reconoce el calendario de cada publicación de una plataforma. */
export const etiquetaDePublicacion = c =>
  [c.nombre, [c.m2 && `${c.m2} m²`, c.camas, c.capacidad_maxima && `hasta ${c.capacidad_maxima} personas`].filter(Boolean).join(', ')]
    .filter(Boolean).join(', ').slice(0, 200)
