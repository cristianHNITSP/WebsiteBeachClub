/*
 * EL único lugar que habla con el backend (docs/BACKEND-COMO-TRABAJAMOS.md §3.1).
 * Nadie llama a `fetch` suelto.
 *
 *  - Cookies HttpOnly de sesión (las pone y quita la API; el JS no las ve).
 *  - CSRF de doble envío: en todo lo que modifica, la cabecera X-CSRF-TOKEN
 *    lleva el valor de la cookie legible que dejó la API.
 *  - Un 401 renueva la sesión UNA vez y reintenta. Si varias peticiones fallan
 *    a la vez, comparten la MISMA renovación (si cada una renovara, rotarían el
 *    token una sobre otra y la API lo tomaría por un robo).
 *  - Tope de tiempo en toda petición: ninguna se queda "cargando" para siempre.
 *  - El mensaje de error del backend ya viene escrito para la persona.
 */

const TOPE_AUTH_MS = 12_000
const TOPE_MS = 30_000
const TOPE_SUBIDA_MS = 120_000 // una foto de 15 MB con mala señal
const RENOVAR = '/api/auth/renovar'

export class ErrorApi extends Error {
  constructor(mensaje, estado, datos) {
    super(mensaje)
    this.estado = estado
    this.datos = datos
  }
}

const leerCookie = nombre =>
  document.cookie.split('; ').find(c => c.startsWith(`${nombre}=`))?.slice(nombre.length + 1) ?? null

let alPerderSesion = () => {}
/** La sesión registra aquí qué hacer si la API ya no la reconoce. */
export const siSePierdeLaSesion = fn => { alPerderSesion = fn }

async function pedir(ruta, { metodo = 'GET', cuerpo, idempotencia, senal } = {}) {
  const cabeceras = { Accept: 'application/json' }
  // FormData (subir fotos): sin Content-Type, lo pone el navegador con su boundary.
  const archivo = cuerpo instanceof FormData
  if (cuerpo !== undefined && !archivo) cabeceras['Content-Type'] = 'application/json'
  if (metodo !== 'GET') {
    const csrf = leerCookie(ruta === RENOVAR ? 'frida_csrf_renovacion' : 'frida_csrf')
    if (csrf) cabeceras['X-CSRF-TOKEN'] = csrf
  }
  if (idempotencia) cabeceras['Idempotency-Key'] = idempotencia
  const tope = AbortSignal.timeout(ruta.startsWith('/api/auth/') ? TOPE_AUTH_MS : archivo ? TOPE_SUBIDA_MS : TOPE_MS)
  try {
    return await fetch(ruta, {
      method: metodo,
      headers: cabeceras,
      credentials: 'same-origin',
      body: cuerpo === undefined ? undefined : archivo ? cuerpo : JSON.stringify(cuerpo),
      signal: senal ? AbortSignal.any([senal, tope]) : tope,
    })
  } catch (e) {
    if (e.name === 'TimeoutError') throw new ErrorApi('El servidor tardó demasiado. Intenta de nuevo.', 0, null)
    if (e.name === 'AbortError') throw e
    throw new ErrorApi('No hay conexión con el servidor. Revisa tu internet.', 0, null)
  }
}

let renovacionEnVuelo = null
/** Renueva la sesión; las peticiones que fallen a la vez esperan esta misma. */
function renovarUnaVez() {
  renovacionEnVuelo ??= (async () => {
    try {
      const r = await pedir(RENOVAR, { metodo: 'POST' })
      // 409 = otra pestaña renovó hace un instante: sus cookies nuevas ya están aquí.
      return r.ok || r.status === 409
    } catch {
      return false
    } finally {
      setTimeout(() => { renovacionEnVuelo = null }, 0)
    }
  })()
  return renovacionEnVuelo
}

async function leer(r) {
  if (r.status === 204) return null
  return r.json().catch(() => null)
}

export async function api(ruta, opciones = {}) {
  let r = await pedir(ruta, opciones)
  if (r.status === 401 && !ruta.startsWith('/api/auth/entrar') && ruta !== RENOVAR) {
    if (await renovarUnaVez()) r = await pedir(ruta, opciones)
    if (r.status === 401) alPerderSesion()
  }
  // crudo: la respuesta tal cual (descargas), ya con la sesión renovada si hizo falta.
  if (opciones.crudo && r.ok) return r
  const datos = await leer(r)
  if (!r.ok) throw new ErrorApi(datos?.error ?? 'No se pudo completar', r.status, datos)
  return datos
}
