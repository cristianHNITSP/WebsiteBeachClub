// Noches entre llegada y salida de un rango { from, to } del Calendar.
export const nochesEntre = rango =>
  rango?.from && rango?.to ? Math.round((rango.to - rango.from) / 86400000) : 0

// Fecha ↔ "AAAA-MM-DD" en hora LOCAL (toISOString pasaría a UTC y en México
// correría el día al anterior a partir de las 6 PM).
export const aISO = d =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : ''

export const deISO = texto => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto || '')
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined
}

export const rangoDeParams = (llegada, salida) => ({ from: deISO(llegada), to: deISO(salida) })
