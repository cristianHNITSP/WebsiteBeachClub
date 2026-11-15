// Qué pasa hoy en cada habitación (la corona del Tablero y las tarjetas de Habitaciones).
export const ESTADOS_DIA = {
  ocupada: { color: 'var(--primary)', texto: 'Ocupada' },
  llega: { color: 'var(--flor-turquesa)', texto: 'Llega hoy' },
  sale: { color: 'var(--flor-naranja)', texto: 'Sale hoy' },
  mantenimiento: { color: 'var(--corona-gris)', texto: 'En mantenimiento' },
  libre: { color: 'var(--corona-libre)', texto: 'Libre' },
}

/** Qué pasa hoy en cada habitación: { [habitacionId]: { estado, reserva } }. */
export function estadoDelDia(habitaciones, reservas, hoy) {
  const dia = {}
  for (const h of habitaciones) dia[h.id] = { estado: h.estado === 'activa' ? 'libre' : 'mantenimiento', reserva: null }
  for (const r of reservas) {
    const d = dia[r.habitacion_id]
    if (!d) continue
    if (r.tipo === 'bloqueo') { if (r.llegada <= hoy && hoy < r.salida) dia[r.habitacion_id] = { estado: 'mantenimiento', reserva: r } }
    else if (r.estado === 'en_curso') dia[r.habitacion_id] = { estado: r.salida <= hoy ? 'sale' : 'ocupada', reserva: r }
    else if (r.estado === 'confirmada' && r.llegada <= hoy && hoy < r.salida && d.estado === 'libre') dia[r.habitacion_id] = { estado: 'llega', reserva: r }
  }
  return dia
}
