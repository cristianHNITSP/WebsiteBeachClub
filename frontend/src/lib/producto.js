/*
 * Qué partes del producto están encendidas. Hoy Hoteles Frida es SOLO el motor
 * de reservas interno (el panel): la website pública vivirá en Shopify o
 * WordPress y hablará con nuestra API (docs/PLAN-BACKEND.md).
 *
 * Apagado = oculto, NO borrado. El código sigue en el repo como respaldo:
 *   · websitePublica: src/website (inicio, búsqueda, detalle, Mi cuenta). Se carga
 *     aparte (lazy): apagada, el navegador nunca descarga ese archivo. Toda URL
 *     de la website manda al login.
 *   · huespedes: el rol `huesped` (cuenta de demo "ana", "Continuar con Google",
 *     Mi cuenta). Sus sesiones guardadas se ignoran.
 * Para reactivar: cambiar el `false` por `true`. Módulos del panel (Boutique,
 * Restaurante): aparte, en admin/modulos.js.
 */
export const PRODUCTO = {
  websitePublica: false,
  huespedes: false,
}
