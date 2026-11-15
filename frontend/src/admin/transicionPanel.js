/*
 * Paneles que nacen del elemento que los abrió y regresan a él (como la previa).
 * View Transitions: el navegador fotografía la pantalla, se cambia y se anima
 * con clip-path la foto nueva (abrir) o la vieja (volver). La página de atrás
 * sigue a la vista mientras tanto, aunque ya esté oculta en el DOM. Sin soporte
 * o con reducir movimiento, cambia al instante. Estilos en admin.css (vt-*).
 *
 * El cambio de ruta de React Router va en startTransition y flushSync no lo
 * alcanza: la foto nueva se toma cuando AdminApp avisa que ya se pintó.
 */
const CURVA = 'cubic-bezier(.22, 1, .36, 1)'
let origen = null
let listo = null
let enCurso = false
let conservarScroll = false

const quieto = () => document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches
const recorte = (r, radio) => {
  const { clientWidth: w, clientHeight: h } = document.documentElement
  return `inset(${r.top}px ${w - r.right}px ${h - r.bottom}px ${r.left}px round ${radio})`
}
const PANTALLA = 'inset(0px 0px 0px 0px round 0px)'

/** AdminApp lo llama en cada cambio de URL ya pintado. */
export const avisarCambio = () => { listo?.(); listo = null }
/** AdminLayout pregunta antes de subir al inicio: al volver, el scroll ya se restauró. */
export const tomarConservarScroll = () => { const v = conservarScroll; conservarScroll = false; return v }

function correr(clase, cambiar, despues, animar) {
  if (!document.startViewTransition || quieto() || enCurso) { cambiar(); despues?.(); return }
  const raiz = document.documentElement
  enCurso = true
  raiz.classList.add('vt-panel', clase)
  const t = document.startViewTransition(() => new Promise(resolver => {
    listo = resolver
    cambiar()
    setTimeout(resolver, 500) // por si la URL no cambia
  }).then(despues))
  t.ready.then(animar).catch(() => {})
  t.finished.finally(() => { enCurso = false; raiz.classList.remove('vt-panel', clase) })
}

/** Abre un panel: crece desde `el` hasta llenar la pantalla. */
export function expandirDesde(el, cambiar) {
  if (!el?.isConnected) { origen = null; cambiar(); return }
  const rect = el.getBoundingClientRect()
  const radio = getComputedStyle(el).borderTopLeftRadius
  origen = { el, rect, radio, scroll: window.scrollY }
  correr('vt-expande', cambiar, null, () => {
    document.documentElement.animate({ clipPath: [recorte(rect, radio), PANTALLA] },
      { duration: 520, easing: CURVA, fill: 'forwards', pseudoElement: '::view-transition-new(root)' })
  })
}

/** Cierra el panel: se recoge hasta el elemento de donde salió. `buscar` lo halla si se volvió a montar. */
export function recogerHacia(cambiar, buscar) {
  const o = origen
  origen = null
  if (!o) { cambiar(); return }
  let destino = o.rect
  correr('vt-recoge', cambiar, () => {
    conservarScroll = true
    window.scrollTo({ top: o.scroll, left: 0, behavior: 'instant' })
    const el = buscar?.() ?? o.el
    const r = el?.isConnected ? el.getBoundingClientRect() : null
    if (r?.width) destino = r
  }, () => {
    document.documentElement.animate({ clipPath: [PANTALLA, recorte(destino, o.radio)], opacity: [1, 1, 0] },
      { duration: 520, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards', pseudoElement: '::view-transition-old(root)' })
  })
}
