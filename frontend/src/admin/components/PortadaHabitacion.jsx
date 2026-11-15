import { useId } from 'react'

/*
 * Portada dibujada de una habitación sin foto (estilo article-cards de devl.dev):
 * el tinte es el de su propiedad y el dibujo depende del tipo: olas y sol para
 * villas y familiares, anillos para suites, olas y palapa para estudios y cabañas.
 */
export default function PortadaHabitacion({ tipo = '', color = 'var(--flor-morado)', grande = false }) {
  const alto = grande ? 320 : 140
  const id = useId()
  const ondas = [0, 1, 2, 3, 4, 5].map(i => (
    <path key={i} data-ola="" d={`M-20 ${40 + i * 26} Q 60 ${26 + i * 26} 140 ${40 + i * 26} T 300 ${40 + i * 26} T 460 ${40 + i * 26} T 620 ${40 + i * 26}`}
      fill="none" stroke={color} strokeWidth="1.4" opacity={0.25 + i * 0.08} />
  ))
  const sol = <circle data-sol="" cx="405" cy={alto * (grande ? 0.38 : 0.42)} r={grande ? 46 : 24} fill="var(--flor-dorado)" opacity="0.55" />
  const anillos = [1, 2, 3, 4, 5].map(i => <circle key={i} data-anillo="" cx="375" cy={alto / 2} r={i * (grande ? 34 : 18)} fill="none" stroke={color} strokeWidth="1.2" opacity={0.5 - i * 0.07} />)
  const b = grande ? 120 : 40, a = grande ? 230 : 110, w = grande ? 70 : 34, h = grande ? 60 : 30
  const palapa = <path d={`M${b} ${a} l${w} -${h} l${w} ${h} Z`} fill={color} opacity="0.5" />
  const arte = /villa|familiar/i.test(tipo) ? <>{sol}{ondas}</> : /suite/i.test(tipo) ? anillos : /estudio/i.test(tipo) ? <>{ondas}{palapa}</> : <>{sol}{palapa}{ondas}</>
  return (
    <svg aria-hidden="true" data-sin-esqueleto preserveAspectRatio="xMidYMid slice" viewBox={`0 0 520 ${alto}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <title id={id}>{tipo}</title>
      <rect width="100%" height="100%" fill={color} opacity="0.14" />
      {arte}
    </svg>
  )
}
