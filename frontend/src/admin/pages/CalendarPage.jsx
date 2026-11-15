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
          <h1 className="admin-page-title">Calendario de <em>reservaciones</em></h1>
        </div>
      </div>
      {/* Una reserva nueva desde el calendario sigue en el formulario completo (pago y abono),
          con la habitación, las fechas y el huésped ya puestos en la URL. */}
      <LineaTiempo
        onNuevaReserva={datos => onNavigate('nueva-reserva', null, new URLSearchParams(datos).toString())}
        onNuevaHabitacion={() => onNavigate('nueva-habitacion')}
      />
    </div>
  )
}
