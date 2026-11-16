/*
 * Cómo se lee cada evento de la auditoría: su frase en español y cuánto importa.
 *   alerta     → puede ser un error o un intento de entrar: se revisa.
 *   importante → no tiene vuelta atrás, mueve dinero o cambia quién entra.
 *   normal     → el trabajo del día.
 *   rutina     → lo que el sistema anota solo (sesiones, sellos, lecturas): se agrupa.
 * Una acción que no esté aquí se muestra con su código y cuenta como normal.
 */
const EVENTOS = {
  'sesion.fallo': ['Intentó entrar con una clave equivocada', 'alerta'],
  'sesion.bloqueada': ['Cuenta bloqueada por intentos fallidos', 'alerta'],
  'sesion.reuso_detectado': ['Se reusó una sesión ya cerrada', 'alerta'],
  'permiso.denegado': ['Intentó algo sin permiso', 'alerta'],
  'usuario.cambiar_clave_fallo': ['Falló al cambiar su contraseña', 'alerta'],

  'reserva.cancelar': ['Canceló una reserva', 'importante'],
  'reserva.devolucion': ['Registró una devolución', 'importante'],
  'cobro.cambiar': ['Cambió un cobro', 'importante'],
  'habitacion.borrar_definitivo': ['Borró una habitación para siempre', 'importante'],
  'foto.borrar_definitivo': ['Borró una foto para siempre', 'importante'],
  'foto.archivos_borrados': ['Se borraron los archivos de fotos', 'importante'],
  'tarifa.crear': ['Creó una tarifa', 'importante'],
  'tarifa.eliminar': ['Eliminó una tarifa', 'importante'],
  'usuario.alta': ['Dio de alta a una persona', 'importante'],
  'propiedad.alta': ['Dio de alta una propiedad', 'importante'],
  'propiedad.editar': ['Cambió el nombre o el lugar de una propiedad', 'importante'],
  'usuario.baja': ['Dio de baja a una persona', 'importante'],
  'usuario.reactivar': ['Reactivó a una persona', 'importante'],
  'usuario.editar': ['Cambió los permisos o datos de una persona', 'importante'],
  'usuario.restablecer_clave': ['Restableció una contraseña', 'importante'],
  'usuario.cambiar_clave': ['Cambió su contraseña', 'importante'],
  'sitio.crear': ['Conectó un sitio web', 'importante'],
  'sitio.revocar': ['Desconectó un sitio web', 'importante'],
  'sitio.rotar_claves': ['Cambió las claves de un sitio web', 'importante'],
  'bot.ajustes': ['Cambió los ajustes del bot', 'importante'],
  'auditoria.exportar': ['Exportó la auditoría', 'importante'],
  'desarrollo.sembrar_pagos': ['Sembró pagos de prueba', 'importante'],
  'desarrollo.sembrar_reservas': ['Sembró reservas de prueba', 'importante'],

  'reserva.crear': ['Creó una reserva', 'normal'],
  'reserva.pago': ['Registró un pago', 'normal'],
  'reserva.mover': ['Movió una reserva', 'normal'],
  'reserva.llegada': ['Hizo el check-in', 'normal'],
  'reserva.salida': ['Hizo el check-out', 'normal'],
  'habitacion.crear': ['Creó una habitación', 'normal'],
  'habitacion.editar': ['Editó una habitación', 'normal'],
  'habitacion.eliminar': ['Mandó una habitación a la papelera', 'normal'],
  'habitacion.restaurar': ['Restauró una habitación', 'normal'],
  'foto.subir': ['Subió una foto', 'normal'],
  'foto.ordenar': ['Reordenó las fotos', 'normal'],
  'foto.eliminar': ['Mandó una foto a la papelera', 'normal'],
  'foto.restaurar': ['Restauró una foto', 'normal'],
  'externas.importar_csv': ['Importó reservas de Booking', 'normal'],
  'calendario_externo.crear': ['Conectó un calendario de otra plataforma', 'normal'],
  'auditoria.verificar': ['Verificó la cadena', 'normal'],
  'cli.fichas_iniciales': ['Cargó las fichas del hotel', 'normal'],

  'sesion.iniciar': ['Inició sesión', 'rutina'],
  'sesion.renovar': ['Renovó su sesión', 'rutina'],
  'sesion.cerrar': ['Cerró sesión', 'rutina'],
  'auditoria.sello': ['Selló la cadena', 'rutina'],
  'auditoria.consultar': ['Consultó la auditoría', 'rutina'],
  'reserva.cierre': ['Cerró una reserva terminada', 'rutina'],
  'reserva.expirar': ['Venció una reserva sin confirmar', 'rutina'],
  'fichas.leer': ['Revisó las fichas en las plataformas', 'rutina'],
  'externas.leer_ical': ['Leyó un calendario de otra plataforma', 'rutina'],
  'metricas.recalcular': ['Recalculó las métricas', 'rutina'],
}

const FALLO = {
  no_existe: 'Intentó entrar con una cuenta que no existe',
  desactivado: 'Intentó entrar con una cuenta dada de baja',
  clave: 'Intentó entrar con una clave equivocada',
}

/** { frase, nivel } de un evento (o de una acción suelta). */
export const leerEvento = ev => {
  const accion = typeof ev === 'string' ? ev : ev.accion
  const [frase, nivel] = EVENTOS[accion] ?? [accion, 'normal']
  const motivo = accion === 'sesion.fallo' && FALLO[ev?.despues?.motivo]
  return { frase: motivo || frase, nivel }
}

/** Quién lo hizo. Sin persona es el sistema, salvo un intento de entrar: ahí es quien escribió. */
export function quienDe(e, nombre) {
  if (e.usuario_id) return { texto: nombre(e.usuario_id), tipo: 'persona' }
  const escrito = e.despues?.identificador
  if (escrito) return { texto: `Alguien sin sesión, como «${escrito}»`, tipo: 'desconocido' }
  return { texto: 'Sistema', tipo: 'sistema' }
}

/** Lo de rutina seguido se junta en un solo renglón: [{ rutina: [e…] } | { e }]. */
export function agrupar(filas) {
  const salida = []
  for (const e of filas) {
    const ultimo = salida.at(-1)
    const rutina = leerEvento(e).nivel === 'rutina'
    if (rutina && ultimo?.rutina) ultimo.rutina.push(e)
    else salida.push(rutina ? { rutina: [e] } : { e })
  }
  // Uno solo de rutina no se agrupa: se ve tal cual, apagado.
  return salida.map(g => (g.rutina?.length === 1 ? { e: g.rutina[0] } : g))
}

/** Los eventos de un mismo día, en el orden en que llegan: [{ dia, filas }]. */
export function porDia(filas) {
  const dias = []
  for (const e of filas) {
    const dia = new Date(e.momento).toLocaleDateString('sv-SE')
    if (dias.at(-1)?.dia !== dia) dias.push({ dia, filas: [] })
    dias.at(-1).filas.push(e)
  }
  return dias
}

const DIA = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
/** "Hoy", "Ayer" o "jueves 12 de octubre". */
export function nombreDia(dia) {
  const hoy = new Date().toLocaleDateString('sv-SE')
  const ayer = new Date(Date.now() - 864e5).toLocaleDateString('sv-SE')
  if (dia === hoy) return 'Hoy'
  if (dia === ayer) return 'Ayer'
  const t = DIA.format(new Date(`${dia}T12:00:00`))
  return t[0].toUpperCase() + t.slice(1)
}

export const hora = iso => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

/** "Firefox 156 en Linux" a partir del agente completo. */
export function navegadorCorto(agente) {
  if (!agente) return null
  const nav = [['Edg/', 'Edge'], ['OPR/', 'Opera'], ['Firefox/', 'Firefox'], ['HeadlessChrome/', 'Chrome sin ventana'], ['Chrome/', 'Chrome'], ['Version/', 'Safari']]
    .map(([marca, nombre]) => { const m = agente.match(new RegExp(`${marca.replace('/', '\\/')}(\\d+)`)); return m && `${nombre} ${m[1]}` })
    .find(Boolean)
  const so = [['iPhone', 'iPhone'], ['iPad', 'iPad'], ['Android', 'Android'], ['Windows', 'Windows'], ['Mac OS', 'macOS'], ['Linux', 'Linux']]
    .find(([t]) => agente.includes(t))?.[1]
  if (!nav) return agente.length > 40 ? null : agente // "tarea", "cli"…: tal cual
  return so ? `${nav} en ${so}` : nav
}

/** Los nombres de rutina de un grupo, sin repetir: "inicios de sesión y sellos de la cadena". */
const PLURAL = {
  'sesion.iniciar': 'inicios de sesión', 'sesion.renovar': 'sesiones renovadas', 'sesion.cerrar': 'cierres de sesión',
  'auditoria.sello': 'sellos de la cadena', 'auditoria.consultar': 'consultas a la auditoría', 'reserva.cierre': 'reservas cerradas',
  'reserva.expirar': 'reservas vencidas', 'fichas.leer': 'revisiones de fichas', 'externas.leer_ical': 'calendarios leídos',
  'metricas.recalcular': 'métricas recalculadas',
}
export function resumenRutina(eventos) {
  const nombres = [...new Set(eventos.map(e => PLURAL[e.accion] ?? e.accion))]
  return nombres.length <= 2 ? nombres.join(' y ') : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`
}
