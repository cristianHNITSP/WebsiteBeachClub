import { api } from '@/lib/api'

/*
 * Sitios web que reservan por la API pública v1 (/api/admin/sitios, fase 6).
 * Forma: { id, nombre, clave_publica, clave_secreta_pista, origenes: [..],
 *          webhook_url, propiedades: [id], revocado_en, creado }
 * Al crear o rotar llegan además `clave_secreta` y/o `secreto_webhooks`: se
 * muestran UNA vez y nunca se guardan en el navegador.
 */
const BASE = '/api/admin/sitios'

export const sitiosApi = {
  listar: senal => api(BASE, { senal }),
  crear: datos => api(BASE, { metodo: 'POST', cuerpo: datos }),
  editar: (id, datos) => api(`${BASE}/${id}`, { metodo: 'PUT', cuerpo: datos }),
  rotarClaves: id => api(`${BASE}/${id}/rotar-claves`, { metodo: 'POST' }),
  rotarWebhook: id => api(`${BASE}/${id}/rotar-webhook`, { metodo: 'POST' }),
  revocar: id => api(`${BASE}/${id}/revocar`, { metodo: 'POST' }),
  entregas: (id, senal) => api(`${BASE}/${id}/entregas`, { senal }),
  reintentar: (id, entregaId) => api(`${BASE}/${id}/entregas/${entregaId}/reintentar`, { metodo: 'POST' }),
}
