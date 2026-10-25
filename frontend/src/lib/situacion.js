/*
 * Dónde está un registro con papelera (PLAN-BACKEND §19), para decirlo donde se
 * le nombre: una reserva cuya habitación se borró, una línea de la auditoría…
 * La API manda `situacion` en todo recurso con papelera.
 *   vigente               → normal
 *   en_papelera           → se puede restaurar
 *   eliminado_definitivo  → lápida: queda su nombre, ya no se restaura
 */
export const SITUACION = {
  en_papelera: { texto: 'En la papelera', detalle: 'Se puede restaurar desde la papelera.' },
  eliminado_definitivo: { texto: 'Eliminada definitivamente', detalle: 'Su historial se conserva, pero ya no se puede restaurar.' },
}

