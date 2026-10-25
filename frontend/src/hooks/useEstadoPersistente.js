import { useEffect, useState } from 'react'

/**
 * useState que sobrevive a recargar: se guarda en localStorage como JSON.
 * Para preferencias y datos del visitante (favoritos, reservas canceladas),
 * no para lo que describe la pantalla: eso va en la URL (useParametros).
 */
export function useEstadoPersistente(clave, inicial) {
  const [valor, setValor] = useState(() => {
    try {
      const guardado = localStorage.getItem(clave)
      return guardado === null ? inicial : JSON.parse(guardado)
    } catch {
      return inicial // modo privado o dato corrupto: se empieza de cero
    }
  })
  useEffect(() => {
    try { localStorage.setItem(clave, JSON.stringify(valor)) } catch { /* sin almacenamiento disponible */ }
  }, [clave, valor])
  return [valor, setValor]
}
