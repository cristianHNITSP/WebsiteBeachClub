import { PlusIcon } from '@phosphor-icons/react'
import BotonDestacado from '@/components/marca/BotonDestacado'
import LineaTiempo from '../components/LineaTiempo'

/*
 * Calendario de reservaciones: la Línea de tiempo (decisión del usuario,
 * 2026-10-24: la vista "clásica" semanal se quitó; está en el historial de git).
 * Ahí se ven también las reservas de otras plataformas (Booking, Airbnb…).
 */
export default function CalendarPage({ onNavigate }) {
  return (
    <div>
      <div className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">Reservaciones</span>
          <h1 className="admin-page-title">Calendario de <em>reservaciones</em></h1>
        </div>
        <div className="admin-page-header-actions">
          <div className="admin-page-header-actions-row">
            <BotonDestacado onClick={() => onNavigate('nueva-reserva')}>
              <PlusIcon size={16} weight="bold" /> Nueva reserva
            </BotonDestacado>
          </div>
        </div>
      </div>
      <LineaTiempo />
    </div>
  )
}
