/*
 * Avisos pasajeros del panel, con la baraja de devl (ToastDeck, montada en
 * AdminLayout). Misma forma de llamarlos que sonner: toast.success(titulo, { description }).
 */
let baraja = null
export const conectarToasts = b => { baraja = b }

const mostrar = tone => (title, opciones = {}) => baraja?.show({ tone, title, ...opciones })
export const toast = { success: mostrar('success'), error: mostrar('error'), info: mostrar('info') }
