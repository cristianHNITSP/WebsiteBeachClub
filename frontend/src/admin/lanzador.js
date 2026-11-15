/** Abre el lanzador (Ctrl K) desde cualquier parte: lo escucha BarraSuperior. */
export const EVENTO_LANZADOR = 'frida:lanzador'
export const abrirLanzador = () => window.dispatchEvent(new Event(EVENTO_LANZADOR))
