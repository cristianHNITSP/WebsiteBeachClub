// Lee un token CSS ya resuelto, para lo que no entiende var(): WebGL, canvas.
// El hex de respaldo es el único admitido (por si el token no existe).
export function leerToken(nombre, respaldo) {
  if (typeof window === 'undefined') return respaldo
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || respaldo
}
