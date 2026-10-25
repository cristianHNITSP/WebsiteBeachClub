import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * La configuración de una pantalla (filtros, orden, pestaña, fechas…) vive en
 * la URL: recargar, volver atrás o compartir el enlace deja todo igual.
 *
 * `defaults` define cada parámetro y su valor por omisión; ese valor NO se
 * escribe en la URL (queda limpia). Los números y booleanos se convierten.
 * `set({ clave: valor })` reemplaza la entrada del historial: cambiar un
 * filtro no debe llenar el botón "atrás" de pasos intermedios.
 */
export function useParametros(defaults) {
  const [params, setParams] = useSearchParams()

  const valores = {}
  for (const [clave, def] of Object.entries(defaults)) {
    const crudo = params.get(clave)
    if (crudo === null) valores[clave] = def
    else if (typeof def === 'number') valores[clave] = Number.isFinite(Number(crudo)) ? Number(crudo) : def
    else if (typeof def === 'boolean') valores[clave] = crudo === '1'
    else valores[clave] = crudo
  }

  const set = useCallback((cambios, { historial = false } = {}) => {
    setParams(prev => {
      const sig = new URLSearchParams(prev)
      for (const [clave, valor] of Object.entries(cambios)) {
        const def = defaults[clave]
        const texto = typeof valor === 'boolean' ? (valor ? '1' : '0') : String(valor ?? '')
        const textoDef = typeof def === 'boolean' ? (def ? '1' : '0') : String(def ?? '')
        if (valor === undefined || valor === null || texto === '' || texto === textoDef) sig.delete(clave)
        else sig.set(clave, texto)
      }
      return sig
    }, { replace: !historial })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setParams])

  return [valores, set]
}
