import { useCallback, useEffect, useState } from 'react'

/**
 * Pide datos a la API y pinta sus estados (BACKEND-COMO-TRABAJAMOS §3.2):
 * `cargando` (solo la primera vez, para el esqueleto), `error` (ErrorApi, con
 * el mensaje ya escrito para la persona) y `datos`.
 *
 * Al cambiar `deps` (otra página, otro filtro) conserva los datos anteriores
 * mientras llegan los nuevos (`actualizando`): sin parpadeo de esqueleto. Una
 * respuesta vieja que llega tarde se descarta (AbortController).
 * `pedir` recibe la señal de cancelación; si devuelve null no se pide nada.
 */
export function usePedido(pedir, deps) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: true, actualizando: false })
  const [vuelta, setVuelta] = useState(0)

  useEffect(() => {
    const control = new AbortController()
    setEstado(e => ({ ...e, error: null, actualizando: true }))
    Promise.resolve(pedir(control.signal))
      .then(datos => { if (!control.signal.aborted) setEstado({ datos, error: null, cargando: false, actualizando: false }) })
      .catch(error => {
        if (!control.signal.aborted && error.name !== 'AbortError') setEstado(e => ({ ...e, error, cargando: false, actualizando: false }))
      })
    return () => control.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, vuelta])

  const recargar = useCallback(() => setVuelta(v => v + 1), [])
  return { ...estado, recargar }
}
