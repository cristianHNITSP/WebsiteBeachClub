import { pesos } from '../habitaciones'
import s from './OpcionesCobro.module.css'

/*
 * Atajos para cobrar: lo pagado funciona como un saldo a favor que va cubriendo
 * las noches en orden (una noche a medio pagar se termina con el siguiente
 * pago). Aquí solo se elige CUÁNTO: las siguientes N noches sin pagar, todo de
 * una vez, un monto propio (el campo de monto) u otras opciones (`extras`,
 * p. ej. "Nada todavía" al reservar).
 *
 *   pendientes: lo que falta de cada noche sin pagar, en orden (centavos)
 *   valor:      el monto elegido ahora (centavos), para marcar el atajo activo
 */
const MAX_ATAJOS = 6

export default function OpcionesCobro({ pendientes, valor, onElegir, extras = [] }) {
  const total = pendientes.reduce((t, n) => t + n, 0)
  const noches = []
  let suma = 0
  for (let i = 0; i < Math.min(pendientes.length - 1, MAX_ATAJOS); i++) {
    suma += pendientes[i]
    noches.push({ etiqueta: `${i + 1} noche${i ? 's' : ''}`, monto: suma })
  }
  // Los extras primero ("Nada todavía"); sin repetir montos.
  const opciones = [...extras, ...noches, { etiqueta: 'Todo (liquidar)', monto: total }]
    .filter((o, i, lista) => (o.monto > 0 || extras.includes(o)) && lista.findLastIndex(x => x.monto === o.monto) === i)
  if (total <= 0) return null
  return (
    <div className={s.opciones} role="group" aria-label="Cuánto cobrar">
      {opciones.map(o => (
        <button key={o.etiqueta} type="button" className={`${s.opcion} ${valor === o.monto ? s.activa : ''}`}
          aria-pressed={valor === o.monto} onClick={() => onElegir(o.monto)}>
          <span>{o.etiqueta}</span>
          <strong>{pesos(o.monto)}</strong>
        </button>
      ))}
    </div>
  )
}
