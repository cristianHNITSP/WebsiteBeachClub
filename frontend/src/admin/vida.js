/*
 * La vida de los botones del panel, con un solo juego de escuchas: el relleno
 * nace (y se retira) por donde entra (o sale) el cursor, una onda al presionar
 * y una corona de gotitas al soltar. Los estilos están en admin.css.
 */
const BOTON = '[data-slot="button"], [data-slot="droplet-button"]'
const quieto = () => document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches

const marcarPunto = e => {
  const b = e.target.closest?.(BOTON)
  if (!b || b.contains(e.relatedTarget)) return
  const r = b.getBoundingClientRect()
  b.style.setProperty('--x', `${e.clientX - r.left}px`)
  b.style.setProperty('--y', `${e.clientY - r.top}px`)
}

const onda = e => {
  const b = e.target.closest?.('[data-slot="button"]')
  if (!b || b.disabled || quieto()) return
  const r = b.getBoundingClientRect()
  const d = Math.max(r.width, r.height) * 2.2
  const o = document.createElement('span')
  o.className = 'onda-boton'
  Object.assign(o.style, { width: `${d}px`, height: `${d}px`, left: `${e.clientX - r.left - d / 2}px`, top: `${e.clientY - r.top - d / 2}px` })
  b.append(o)
  setTimeout(() => o.remove(), 650)
}

const gotitas = e => {
  const b = e.target.closest?.('[data-slot="button"]')
  if (!b || !e.clientX || quieto()) return
  const { top } = b.getBoundingClientRect()
  for (let i = 0; i < 7; i++) {
    const g = document.createElement('span')
    const a = -Math.PI / 2 + (i - 3) * 0.42
    const d = 18 + Math.random() * 14
    g.className = 'gotita-boton'
    Object.assign(g.style, { left: `${e.clientX}px`, top: `${top}px` })
    document.body.append(g)
    g.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(.6)`, opacity: 1, offset: 0.6 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d * 1.2}px), calc(-50% + ${Math.sin(a) * d + 14}px)) scale(.2)`, opacity: 0 },
    ], { duration: 620, easing: 'cubic-bezier(.2, .8, .4, 1)' }).onfinish = () => g.remove()
  }
}

/** Instala las escuchas y devuelve cómo quitarlas (para un useEffect). */
export function instalarVida() {
  document.addEventListener('pointerover', marcarPunto)
  document.addEventListener('pointerout', marcarPunto)
  document.addEventListener('pointerdown', onda)
  document.addEventListener('click', gotitas)
  return () => {
    document.removeEventListener('pointerover', marcarPunto)
    document.removeEventListener('pointerout', marcarPunto)
    document.removeEventListener('pointerdown', onda)
    document.removeEventListener('click', gotitas)
  }
}
