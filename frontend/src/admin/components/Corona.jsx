import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { liquidTarget } from '@/components/devl/liquid-cursor'
import { useTheme } from '@/context/ThemeContext'
import { ESTADOS_DIA, estadoDelDia } from '../estadoDia'
import s from './Corona.module.css'

/*
 * La corona de hoy: cada habitación es una flor de la corona del logotipo, del
 * color de lo que pasa hoy en ella. Se toca (o se enfoca con el teclado) para
 * ver el detalle. El estado sale de las mismas reservas que Llegadas y salidas.
 */

const detalle = (estado, r) => {
  if (estado === 'mantenimiento') return r?.notas || 'Fuera de servicio'
  if (!r) return 'Sin huésped hoy'
  const debe = r.por_cobrar_centavos > 0 ? `, debe $${Math.round(r.por_cobrar_centavos / 100).toLocaleString('es-MX')}` : ''
  return `${r.huesped_nombre}${debe}`
}

const ANCHO = 520, CX = 260, CY = 290, R = 225

function Flor({ x, y, color, centro, etiqueta, pulsada, indice, quieta, onElegir }) {
  return (
    <motion.g {...liquidTarget} role="button" tabIndex={0} aria-pressed={pulsada} aria-label={etiqueta} className={s.flor}
      initial={quieta ? false : { scale: 0, rotate: -90, opacity: 0 }} animate={{ scale: pulsada ? 1.22 : 1, rotate: 0, opacity: 1 }}
      whileHover={quieta ? undefined : { scale: pulsada ? 1.22 : 1.15 }}
      transition={{ type: 'spring', stiffness: 420, damping: 18, delay: quieta ? 0 : 0.06 + indice * 0.05 }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      onClick={onElegir} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onElegir() } }}>
      {pulsada && <circle cx={x} cy={y} r="30" fill="none" stroke="var(--primary)" strokeWidth="2" strokeDasharray="3 4" />}
      {/* La flor del logotipo: seis pétalos ovalados */}
      <g transform={`translate(${x} ${y})`}>
        {[0, 60, 120, 180, 240, 300].map(a => (
          <ellipse key={a} rx="9" ry="13.5" cy="-11.5" fill={color} stroke="var(--card)" strokeWidth="1.5" transform={`rotate(${a})`} />
        ))}
        <circle r="7" fill={centro} stroke="var(--card)" strokeWidth="1.5" />
      </g>
    </motion.g>
  )
}

export default function Corona({ habitaciones, reservas, hoy, nombrePropiedad }) {
  const { reduceMotion } = useTheme()
  const [elegida, setElegida] = useState(null)
  const dia = useMemo(() => estadoDelDia(habitaciones, reservas, hoy), [habitaciones, reservas, hoy])
  const h = habitaciones.find(x => x.id === elegida)
  const n = habitaciones.length
  const dH = h ? dia[h.id] : null

  return (
    <div>
      <svg className={s.corona} viewBox={`0 0 ${ANCHO} 240`} role="group" aria-label={`Las ${n} habitaciones de hoy`}>
        <path d={`M${CX - R - 8} ${CY - 50} Q${CX} ${CY - R * 1.5} ${CX + R + 8} ${CY - 50}`} fill="none" stroke="var(--flor-hoja)" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
        {habitaciones.map((hab, i) => {
          const a = Math.PI * (0.92 - (n > 1 ? i * (0.84 / (n - 1)) : 0.42))
          const d = dia[hab.id]
          return (
            <Flor key={hab.id} indice={i} quieta={reduceMotion} pulsada={elegida === hab.id}
              x={CX + R * Math.cos(a)} y={CY - R * Math.sin(a) * 0.8}
              color={ESTADOS_DIA[d.estado].color} centro={d.estado === 'mantenimiento' ? 'var(--muted-foreground)' : 'var(--flor-dorado)'}
              etiqueta={`${hab.nombre}: ${ESTADOS_DIA[d.estado].texto}`}
              onElegir={() => setElegida(hab.id)} />
          )
        })}
      </svg>
      <div className={s.nota} aria-live="polite">
        {h ? (
          <>
            <b>{h.nombre}</b>
            <span>{nombrePropiedad?.(h.propiedad_id)}. {ESTADOS_DIA[dH.estado].texto}: {detalle(dH.estado, dH.reserva)}</span>
          </>
        ) : (
          <>
            <b>La corona de hoy</b>
            <span>Cada flor es una habitación. Tócala para ver qué pasa en ella</span>
          </>
        )}
      </div>
    </div>
  )
}
