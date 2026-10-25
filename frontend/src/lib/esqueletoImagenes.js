/*
 * Esqueleto GLOBAL de imágenes: toda <img> muestra el brillo de carga (CSS en
 * index.css) hasta que dispara `load`, y si falla queda un bloque neutro en vez
 * del icono roto con el texto alternativo. No hay que envolver cada <img>.
 * `load`/`error` no burbujean, pero sí pasan por la fase de captura de document.
 * Excluir una imagen: atributo `data-sin-esqueleto` (p. ej. sobre fondo oscuro).
 */
const VACIA = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
const esImg = n => n instanceof HTMLImageElement

export function activarEsqueletoImagenes() {
  document.addEventListener('load', e => {
    if (esImg(e.target)) e.target.dataset.cargada = ''
  }, true)

  document.addEventListener('error', e => {
    const img = e.target
    if (!esImg(img) || img.src === VACIA) return
    img.dataset.fallida = ''
    img.removeAttribute('srcset')
    img.src = VACIA // sin icono roto ni texto alternativo encima del bloque
  }, true)

  // Si React cambia el src de una <img> ya cargada, vuelve el esqueleto.
  new MutationObserver(cambios => {
    for (const { target } of cambios) {
      if (!esImg(target) || target.src === VACIA) continue
      delete target.dataset.cargada
      delete target.dataset.fallida
    }
  }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['src'] })
}
