import { TrashIcon } from '@phosphor-icons/react'
import { habitacionEliminada } from '@/lib/situacion'
import s from './AvisoHabitacionEliminada.module.css'

/*
 * La habitación de una reserva se eliminó (papelera) y la reserva sigue abierta. Regla del usuario
 * (2026-11-05): la reserva NO se cancela; no se puede registrar llegada ni salida a menos que la
 * habitación se restaure de la papelera; al pasar la noche de su último día la reserva se cierra
 * sola (y la habitación, si estaba en la papelera, se elimina sola).
 *   en_papelera           → se puede restaurar
 *   eliminado_definitivo  → ya no; la reserva se cerrará sola al terminar su estancia
 */
const TEXTO = {
  en_papelera: 'No se puede registrar check-in ni check-out a menos que la habitación se restaure de la papelera. La reserva no se cancela: al pasar la noche de su último día se cierra sola.',
  eliminado_definitivo: 'La habitación se eliminó para siempre. La reserva no se canceló por eso: al pasar la noche de su último día se cierra sola.',
}

/** `compacto`: solo la etiqueta (filas de listas). Si no, la leyenda completa. */
export default function AvisoHabitacionEliminada({ reserva, compacto = false }) {
  if (!habitacionEliminada(reserva)) return null
  if (compacto) {
    return <span className={s.etiqueta} title={TEXTO[reserva.habitacion_situacion]}><TrashIcon size={11} weight="bold" aria-hidden="true" />Habitación eliminada</span>
  }
  return (
    <p className={s.leyenda} role="status">
      <TrashIcon size={18} weight="bold" aria-hidden="true" />
      <span><strong>Habitación eliminada.</strong> {TEXTO[reserva.habitacion_situacion]}</span>
    </p>
  )
}
