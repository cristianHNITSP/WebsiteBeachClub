/*
 * Ref para el posicionador de un globo (popover, tooltip) de coss/Base UI.
 * El posicionador anima top/left para deslizarse entre anclas, pero al abrir
 * nace en (0,0) y en Firefox su sitio llega un cuadro después: se veía volar
 * desde la esquina. Solo anima cuando ya lleva un momento puesto (data-asentado).
 */
export function asentar(el) {
  if (!el || el.hasAttribute('data-asentado')) return
  setTimeout(() => el.isConnected && el.setAttribute('data-asentado', ''), 150)
}
