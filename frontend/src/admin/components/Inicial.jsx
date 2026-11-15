// Cada persona con su inicial y un tono pálido estable (identidad, no dato).
const TONOS = ['--flor-morado', '--flor-turquesa', '--flor-naranja', '--flor-orquidea', '--flor-dorado', '--flor-hoja']
const tono = n => TONOS[[...(n ?? '')].reduce((t, c) => t + c.charCodeAt(0), 0) % TONOS.length]
const iniciales = n => (n ?? '').split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase()

export default function Inicial({ nombre, tamano = 32 }) {
  const c = `var(${tono(nombre)})`
  return (
    <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-full font-bold text-xs"
      style={{ width: tamano, height: tamano, fontSize: tamano >= 48 ? `${tamano * 0.36}px` : undefined, background: `color-mix(in srgb, ${c} 16%, transparent)`, color: `color-mix(in srgb, ${c} 70%, var(--foreground))` }}>
      {iniciales(nombre)}
    </span>
  )
}
