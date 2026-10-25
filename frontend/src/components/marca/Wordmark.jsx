// Logotipo recreado del logo de Cabañas Frida: corona de flores + FRIDA.
// Vectorial y con tokens: se ve igual de nítido en claro, oscuro y sobre el
// hero (el PNG original trae fondo blanco y "CABAÑAS" en negro).

function Flor({ x, y, r, color }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 60, 120, 180, 240, 300].map(a => (
        <ellipse key={a} rx={r * 0.42} ry={r * 0.62} cy={-r * 0.5} fill={color} transform={`rotate(${a})`} />
      ))}
      <circle r={r * 0.3} fill="var(--flor-dorado)" />
    </g>
  )
}

function Hoja({ x, y, rot }) {
  return <ellipse cx={x} cy={y} rx="7" ry="3" fill="var(--flor-hoja)" transform={`rotate(${rot} ${x} ${y})`} />
}

/* `corona` en website.css: sobre fondo oscuro (hero o tema oscuro) se aclara
   y gana un halo; el morado y el verde hoja se perdían contra la noche. */
export function CoronaFlores({ className = '', style }) {
  return (
    <svg viewBox="0 0 120 44" className={`corona ${className}`} style={style} aria-hidden="true">
      <Hoja x={10} y={30} rot={-30} />
      <Hoja x={110} y={30} rot={30} />
      <Hoja x={44} y={10} rot={-60} />
      <Hoja x={80} y={8} rot={50} />
      <Hoja x={62} y={40} rot={0} />
      <Flor x={20} y={30} r={10} color="var(--flor-turquesa)" />
      <Flor x={38} y={25} r={11} color="var(--flor-orquidea)" />
      <Flor x={58} y={27} r={13} color="var(--flor-rojo)" />
      <Flor x={80} y={20} r={14} color="var(--flor-morado)" />
      <Flor x={100} y={28} r={11} color="var(--flor-naranja)" />
      <Flor x={60} y={9} r={7} color="var(--flor-naranja)" />
    </svg>
  )
}

/**
 * tono: 'normal' (fondo claro/oscuro del tema) | 'noche' (sobre el hero)
 * tamano: alto de la palabra FRIDA en rem
 */
export default function Wordmark({ tono = 'normal', tamano = 1.6, subtitulo }) {
  const sobreNoche = tono === 'noche'
  return (
    <span className={`inline-flex flex-col items-center leading-none select-none ${sobreNoche ? 'sobre-noche' : ''}`}>
      <CoronaFlores style={{ width: `${tamano * 2.6}rem`, height: 'auto', marginBottom: '-0.15rem' }} />
      <span className="inline-flex items-baseline gap-1.5">
        <span
          className="font-sans font-bold uppercase tracking-[0.2em]"
          style={{ fontSize: `max(0.62rem, ${tamano * 0.4}rem)`, color: sobreNoche ? 'var(--noche-fg-suave)' : 'var(--muted-foreground)' }}
        >
          Hoteles
        </span>
        <span
          className="font-display"
          style={{
            fontSize: `${tamano}rem`,
            letterSpacing: '0.04em',
            color: sobreNoche ? 'var(--noche-fg-suave)' : 'var(--primary)',
          }}
        >
          FRIDA
        </span>
      </span>
      {subtitulo && (
        <span
          className="rotulo mt-1"
          style={{ color: sobreNoche ? 'var(--noche-fg-suave)' : 'var(--muted-foreground)' }}
        >
          {subtitulo}
        </span>
      )}
    </span>
  )
}
