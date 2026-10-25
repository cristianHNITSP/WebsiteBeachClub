import { api } from '@/lib/api'

/* Auditoría forense (PLAN-BACKEND §17.4). Solo con `auditoria.ver`. */
const BASE = '/api/admin/auditoria'
const consulta = params => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, v)
  return `?${q}`
}
export const auditoriaApi = {
  consultar: (params, senal) => api(`${BASE}${consulta(params)}`, { senal }),
  verificar: () => api(`${BASE}/verificar`),
}

/** Descarga el NDJSON. La huella SHA-256 viene en la cabecera y queda en la auditoría. */
export async function exportarAuditoria(params) {
  const r = await api(`${BASE}/exportar${consulta(params)}`, { crudo: true })
  const huella = r.headers.get('X-Contenido-Sha256')
  const url = URL.createObjectURL(await r.blob())
  const a = Object.assign(document.createElement('a'), { href: url, download: `auditoria-frida-${new Date().toLocaleDateString('sv-SE')}.ndjson` })
  a.click()
  URL.revokeObjectURL(url)
  return { huella, filas: Number(r.headers.get('X-Filas')) }
}
