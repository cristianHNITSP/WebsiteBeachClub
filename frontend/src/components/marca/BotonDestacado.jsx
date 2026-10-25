import { Children, Fragment, forwardRef, isValidElement } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import Magnet from '@/components/bits/Magnet'
import { useTheme } from '@/context/ThemeContext'
import s from './BotonDestacado.module.css'

// El relleno nace (y se retira) por donde entra (o sale) el cursor.
const marcarPunto = e => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`)
}

// Cada icono "vive" según lo que significa (en reposo, con pausas; más rápido
// al pasar el ratón). Por nombre del icono de Phosphor; el resto late.
const ANIMACION = {
  ArrowRightIcon: 'avanzar',
  SignInIcon: 'avanzar',
  PlusIcon: 'girar',
  CashRegisterIcon: 'rebote',
}
const nombre = c => c.type?.displayName ?? ''
const esIcono = c => isValidElement(c) && nombre(c).endsWith('Icon')

// Aplana fragmentos (<>icono texto</>) y envuelve SOLO los iconos. El spinner
// de carga ya gira: no se anima encima.
const marcarIconos = children => Children.toArray(children).flatMap(c =>
  isValidElement(c) && c.type === Fragment ? marcarIconos(c.props.children) : [c],
).map((c, i) => (esIcono(c)
  ? (
    <span key={`icono-${i}`} className={`${s.icono} ${nombre(c).startsWith('Spinner') ? '' : s[ANIMACION[nombre(c)] ?? 'latido']}`}>
      {c}
    </span>
  )
  : c))

/**
 * LA acción destacada de una pantalla (Reservar, Nueva reserva, Cobrar…).
 *   · Magnet (React Bits), contenido: como mucho 5 px hacia el cursor y solo
 *     cuando está muy cerca, para no chocar con lo de al lado.
 *   · Button (shadcn) plano; al pasar, un círculo orquídea se extiende desde el
 *     punto por el que entra el cursor.
 *   · Iconos vivos: la flecha empuja hacia adelante, el + gira, la caja
 *     rebota, el resto late; en reposo con pausas y más rápido al pasar.
 *   · Resorte al presionar.
 * Todo el movimiento se apaga con reducir movimiento o si está deshabilitado.
 * Llena el ancho de su contenedor si este lo estira (panel, menú móvil).
 */
const BotonDestacado = forwardRef(function BotonDestacado(
  { children, className = '', tamano = 'md', type = 'button', disabled, ...rest },
  ref,
) {
  const { reduceMotion } = useTheme()
  const quieto = reduceMotion || disabled
  return (
    <Magnet
      padding={28}
      magnetStrength={9}
      maxOffset={5}
      disabled={quieto}
      activeTransition="transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)"
      inactiveTransition="transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)"
      wrapperClassName={`${s.iman} ${className}`}
      innerClassName={s.imanInterior}
    >
      <motion.span
        className={s.resorte}
        whileTap={quieto ? undefined : { scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 520, damping: 18 }}
      >
        <Button
          ref={ref}
          type={type}
          disabled={disabled}
          className={`${s.boton} ${s[tamano] ?? s.md} ${reduceMotion ? s.sinMovimiento : ''}`}
          onPointerEnter={marcarPunto}
          onPointerLeave={marcarPunto}
          {...rest}
        >
          <span className={s.relleno} aria-hidden="true" />
          <span className={s.contenido}>{marcarIconos(children)}</span>
        </Button>
      </motion.span>
    </Magnet>
  )
})

export default BotonDestacado
