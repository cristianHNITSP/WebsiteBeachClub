import { useState } from 'react'
import { ImageIcon, ImageBrokenIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import s from './Imagen.module.css'

/*
 * Una imagen con sus tres estados, para que nunca quede un hueco vacío:
 *   - sin `src`: bloque gris "Imagen no anexada" (aún no se ha subido);
 *   - cargando (la foto, o `cargando` mientras aún no hay dirección): esqueleto
 *     con brillo (quieto con "reducir movimiento");
 *   - si falla: "Imagen no disponible" y un botón para intentarlo de nuevo.
 * Llena a su contenedor (que pone el tamaño). Se excluye del esqueleto global
 * (`data-sin-esqueleto`): aquí cada estado se pinta a propósito.
 */
export default function Imagen({ src, alt = '', className = '', compacta = false, ajuste = 'cover', cargando = false }) {
  // `cargando`: aún no hay ni dirección (la lista viene en camino, la foto se está subiendo).
  if (cargando) return <div className={`${s.caja} ${className}`} aria-busy="true"><div className={s.esqueleto} aria-hidden="true" /></div>
  if (!src) {
    return (
      <div className={`${s.caja} ${s.vacia} ${className}`} role="img" aria-label={alt ? `${alt}: imagen no anexada` : 'Imagen no anexada'}>
        <ImageIcon size={compacta ? 22 : 32} weight="duotone" aria-hidden="true" />
        {!compacta && <span className={s.texto}>Imagen no anexada</span>}
      </div>
    )
  }
  // key: si cambia la foto, su estado empieza de cero.
  return <Cargando key={src} src={src} alt={alt} className={className} compacta={compacta} ajuste={ajuste} />
}

function Cargando({ src, alt, className, compacta, ajuste }) {
  const [estado, setEstado] = useState('cargando') // cargando | lista | fallida
  const [intento, setIntento] = useState(0)

  return (
    <div className={`${s.caja} ${className}`} aria-busy={estado === 'cargando'}>
      {estado !== 'fallida' && (
        <img
          data-sin-esqueleto
          src={intento ? `${src}?intento=${intento}` : src}
          alt={alt}
          className={s.img}
          style={{ objectFit: ajuste, opacity: estado === 'lista' ? 1 : 0 }}
          onLoad={() => setEstado('lista')}
          onError={() => setEstado('fallida')}
          draggable={false}
        />
      )}
      {estado === 'cargando' && <div className={s.esqueleto} aria-hidden="true" />}
      {estado === 'fallida' && (
        <div className={`${s.vacia} ${s.capa}`} role="img" aria-label={alt ? `${alt}: imagen no disponible` : 'Imagen no disponible'}>
          <ImageBrokenIcon size={compacta ? 22 : 32} weight="duotone" aria-hidden="true" />
          {!compacta && <span className={s.texto}>Imagen no disponible</span>}
          <button
            type="button"
            className={s.reintentar}
            onClick={e => { e.stopPropagation(); setEstado('cargando'); setIntento(n => n + 1) }}
            aria-label="Intentar cargar la imagen de nuevo"
          >
            <ArrowClockwiseIcon size={14} weight="bold" aria-hidden="true" />
            {!compacta && 'Reintentar'}
          </button>
        </div>
      )}
    </div>
  )
}
