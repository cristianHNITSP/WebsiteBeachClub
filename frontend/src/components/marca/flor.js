/**
 * El centro de una flor del logotipo: dorado, salvo que el pétalo ya sea dorado (el centro se
 * perdía, 2026-11-15); entonces, el morado de la marca. Sirve para cualquier color de pétalo.
 */
export const centroDe = color => (/dorado|gold/.test(color ?? '') ? 'var(--flor-morado)' : 'var(--flor-dorado)')
