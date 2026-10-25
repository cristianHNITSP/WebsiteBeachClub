import { flushSync } from 'react-dom'

// Una transición a la vez. Iniciar otra mientras corre la anterior la aborta:
// el navegador salta al estado final (el parpadeo) y luego arranca la nueva.
let enCurso = false

/**
 * Cambia claro/oscuro con un círculo que se expande desde donde se hizo clic.
 * Usa la View Transitions API nativa: el navegador fotografía la página, se
 * aplica el tema nuevo y se revela recortando la foto nueva con un círculo.
 * Sin soporte o con reducir movimiento, cambia al instante.
 *
 * `cambiar` debe actualizar el DOM de forma síncrona: por eso flushSync (el
 * ThemeContext pone la clase .dark en un useLayoutEffect).
 */
export function alternarTemaConCirculo(evento, cambiar, reducirMovimiento) {
  if (enCurso) return
  if (!document.startViewTransition || reducirMovimiento) {
    cambiar()
    return
  }

  const caja = evento?.currentTarget?.getBoundingClientRect?.()
  const x = caja ? caja.left + caja.width / 2 : window.innerWidth / 2
  const y = caja ? caja.top + caja.height / 2 : 0
  const radio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

  // El punto de origen va en variables CSS: site.css las usa para que la foto
  // nueva NAZCA oculta (círculo de radio 0). Sin eso, entre que el navegador
  // crea la foto y arranca la animación hay cuadros con el tema nuevo completo
  // a la vista: el "se pone negro, vuelve a blanco y luego se revela".
  const raiz = document.documentElement
  raiz.style.setProperty('--tema-x', `${x}px`)
  raiz.style.setProperty('--tema-y', `${y}px`)

  enCurso = true
  const transicion = document.startViewTransition(() => flushSync(cambiar))
  transicion.finished.finally(() => { enCurso = false })
  transicion.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
      // fill: 'forwards' → al terminar se queda abierto hasta que el navegador
      // retira la transición (si no, volvería un cuadro al círculo de 0).
      { duration: 700, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards', pseudoElement: '::view-transition-new(root)' },
    )
  })
}
