import { motion } from 'framer-motion'
import Pista, { GrupoPistas } from '@/components/marca/Pista'
import { useTheme } from '@/context/ThemeContext'
import s from './Graficas.module.css'

/*
 * Gráficas del panel (HTML, sin librería). Una sola serie por gráfica, así que
 * un solo color (magnitud por largo/alto) y el título nombra la serie; el valor
 * sale en texto (Pista al pasar el cursor o enfocar, o etiqueta directa).
 */

/** Columnas: datos [{ clave, etiqueta, valor, pista }] · `marcar` resalta una clave (hoy): color + etiqueta "Hoy". */
export function Columnas({ datos, alto = 200, marcar, etiquetaCada = 1, titulo }) {
  const { reduceMotion } = useTheme()
  const max = Math.max(1, ...datos.map(d => d.valor))
  return (
    <figure className={s.figura} aria-label={titulo}>
      <GrupoPistas>
        <div className={s.columnas} style={{ height: alto }}>
          {datos.map((d, i) => (
            <Pista key={d.clave} contenido={d.pista} lado="top" className="flex-1 h-full">
              <div className={s.columna} tabIndex={0} aria-label={d.pista}>
                <motion.div
                  className={`${s.barra} ${d.clave === marcar ? s.marcada : ''}`}
                  style={{ height: `${Math.max(d.valor ? 2 : 0, (d.valor / max) * 100)}%` }}
                  initial={{ scaleY: reduceMotion ? 1 : 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ type: 'spring', stiffness: 160, damping: 22, delay: Math.min(0.6, i * 0.025) }}
                />
              </div>
            </Pista>
          ))}
        </div>
      </GrupoPistas>
      <div className={s.eje}>
        {datos.map((d, i) => (
          <span key={d.clave} className={`${s.ejeEtiqueta} ${d.clave === marcar ? s.ejeHoy : ''}`}>
            {d.clave === marcar ? 'Hoy' : i % etiquetaCada === 0 && !(etiquetaCada > 1 && marcar != null && datos[i + 1]?.clave === marcar) ? d.etiqueta : ''}
          </span>
        ))}
      </div>
    </figure>
  )
}

/** Barras horizontales con etiqueta y valor directos: datos [{ clave, etiqueta, valor, texto, Icono?, flor? }] */
export function Barras({ datos, titulo }) {
  const { reduceMotion } = useTheme()
  const max = Math.max(1, ...datos.map(d => d.valor))
  return (
    <ol className={s.barras} aria-label={titulo}>
      {datos.map((d, i) => (
        <li key={d.clave} className={s.barrasFila}>
          <div className={s.barrasCabeza}>
            {d.Icono && (
              <span className={s.barrasIcono} style={{ background: `var(--flor-${d.flor})`, color: `var(--flor-${d.flor}-fg)` }}>
                <d.Icono size={13} weight="fill" aria-hidden="true" />
              </span>
            )}
            <span className={s.barrasEtiqueta}>{d.etiqueta}</span>
            <span className={s.barrasValor}>{d.texto}</span>
          </div>
          <div className={s.pistaBarra}>
            <motion.div
              className={s.relleno}
              style={{ width: `${(d.valor / max) * 100}%` }}
              initial={{ scaleX: reduceMotion ? 1 : 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: Math.min(0.5, i * 0.05) }}
            />
          </div>
        </li>
      ))}
    </ol>
  )
}
