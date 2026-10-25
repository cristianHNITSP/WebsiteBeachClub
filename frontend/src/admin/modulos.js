/*
 * Módulos del panel que se pueden apagar SIN borrar su código. Hoy el producto
 * es solo el motor de reservas: Boutique (tienda + ventas) y Restaurante están
 * deshabilitados. Sus páginas, almacenes y datos siguen intactos; para
 * reactivar uno basta cambiar su `false` por `true`.
 * Deshabilitado = se ve en gris en la navegación, no se puede abrir y su URL
 * directa manda al tablero.
 */
export const MODULOS = {
  boutique: false,
  restaurante: false,
}

const MODULO_DE = {
  shop: 'boutique',
  sales: 'boutique',
  restaurante: 'restaurante',
  'restaurante-tickets': 'restaurante',
  'restaurante-menu': 'restaurante',
  'restaurante-estadisticas': 'restaurante',
}

/** ¿La página (id interno) pertenece a un módulo apagado? */
export const deshabilitada = pagina => Boolean(MODULO_DE[pagina]) && !MODULOS[MODULO_DE[pagina]]

// Permiso que pide cada página (el mismo que exige su API). Sin él, la página no
// sale en la navegación y su URL manda al tablero. La API responde 403 igual:
// esto solo evita ofrecer lo que no se puede usar.
const PERMISO_DE = {
  calendar: 'reservas.ver',
  hoy: 'reservas.ver',
  'nueva-reserva': 'reservas.crear',
  rooms: 'habitaciones.ver',
  'nueva-habitacion': 'habitaciones.editar',
  'editar-habitacion': 'habitaciones.editar',
  'gestionar-fotos': 'habitaciones.ver',
  users: 'usuarios.ver',
  'nueva-persona': 'usuarios.gestionar',
  'editar-persona': 'usuarios.gestionar',
  auditoria: 'auditoria.ver',
  externas: 'externas.ver',
}

/** ¿La sesión puede abrir esa página? */
export const permitida = (pagina, sesion) => !PERMISO_DE[pagina] || Boolean(sesion?.permisos?.includes(PERMISO_DE[pagina]))
