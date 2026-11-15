import { liquidTarget } from '@/components/devl/liquid-cursor'
import { Odometer } from '@/components/devl/odometer'
import { Florecita } from '@/components/marca/Wordmark'
import c from './Celda.module.css'

/** Una cifra tocable de la rejilla del Tablero y de Avisos: la gota del cursor toma su forma. */
export default function Celda({ color, etiqueta, valor, sufijo, nota, onClick, activa, children }) {
  return (
    <button type="button" className={c.celda} onClick={onClick} aria-pressed={activa} {...liquidTarget}>
      <span className={c.celdaEtiqueta}><Florecita color={color} tamano={13} />{etiqueta}</span>
      <span className={c.celdaValor}><Odometer value={valor} locale="es-MX" />{sufijo && <small>{sufijo}</small>}</span>
      <span className={c.celdaNota}>{nota}</span>
      {children}
    </button>
  )
}
