import { useLayoutEffect } from 'react'

// Cuántos componentes montados la piden. AdminApp y LoginPage la usan a la
// vez: sin contar, al desmontarse el login quitaría la paleta al panel.
let usos = 0

/**
 * Activa la paleta floral (website/site.css) mientras el componente está
 * montado: pone `site` en <body>. En <body> y no en un div para que los
 * portales de Radix (Select, Popover, Sheet, Sonner) también la hereden.
 * Layout effect: se aplica antes de pintar, sin parpadeo de la paleta vieja.
 */
export function usePaletaSitio() {
  useLayoutEffect(() => {
    usos += 1
    document.body.classList.add('site')
    return () => {
      usos -= 1
      if (usos === 0) document.body.classList.remove('site')
    }
  }, [])
}
