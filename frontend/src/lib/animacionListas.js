/**
 * Animación de los elementos de una lista que cambia (filtros, orden,
 * páginas, borrar). Se usa con <AnimatePresence mode="popLayout"> y el
 * contenedor en `position: relative` (popLayout saca a los que salen con
 * position:absolute respecto a él; sin ancla, se van fuera de pantalla).
 *
 *   · Salida CORTA (120 ms, sin resorte): con clics rápidos las salidas se
 *     encadenaban y se amontonaban hasta 17 filas "fantasma" encimadas.
 *   · Entrada y reacomodo (layout) con resorte firme: se asienta en ~300 ms.
 *
 * Uso: <motion.li key={id} {...animacionItem}>…</motion.li>
 */
export const animacionItem = {
  layout: true,
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.12, ease: 'easeOut' } },
  transition: { type: 'spring', stiffness: 420, damping: 36 },
}
