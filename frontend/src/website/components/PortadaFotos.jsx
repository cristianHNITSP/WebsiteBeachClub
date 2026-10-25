import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/*
 * Fondo del hero: fotos reales de la costa (WebP en public/img/portada, créditos
 * en el pie de página). Cada escena acompaña a la palabra del rotador.
 *   · Entrada: la foto "abre" desde la línea del horizonte.
 *   · Cambio: fundido cruzado con un leve acercamiento.
 *   · Siempre: deriva lenta tipo panorámica (CSS, .portada__foto).
 * Con reducir movimiento: la primera foto, quieta.
 */
const ESCENAS = ['chelem', 'chuburna', 'muelle']

const srcSet = n => `/img/portada/${n}-1080.webp 1080w, /img/portada/${n}-1920.webp 1920w`

export default function PortadaFotos({ escena = 0, reduceMotion }) {
  // Las otras escenas se descargan en cuanto termina la primera: al rotar ya están.
  useEffect(() => {
    ESCENAS.slice(1).forEach(n => {
      const img = new Image()
      img.sizes = '100vw'
      img.srcset = srcSet(n)
    })
  }, [])

  const nombre = ESCENAS[escena % ESCENAS.length]
  const foto = (
    <img
      className="portada__foto"
      srcSet={srcSet(nombre)}
      sizes="100vw"
      src={`/img/portada/${nombre}-1920.webp`}
      alt=""
      data-sin-esqueleto
      fetchPriority={escena === 0 ? 'high' : undefined}
      decoding="async"
    />
  )

  if (reduceMotion) return <div className="portada" aria-hidden="true">{foto}</div>

  return (
    // La entrada ("abre" desde el horizonte) es CSS: framer no interpola este
    // clip-path porque el navegador lo reescribe abreviado (inset(46% 0%)).
    <div className="portada portada--entrada" aria-hidden="true">
      <AnimatePresence initial={false}>
        <motion.div
          key={nombre}
          className="portada__capa"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {foto}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
