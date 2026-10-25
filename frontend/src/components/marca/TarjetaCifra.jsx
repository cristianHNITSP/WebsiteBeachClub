import SpotlightCard from '@/components/bits/SpotlightCard'
import CountUp from '@/components/bits/CountUp'
import { SkeletonCard } from '@/components/frida/Skeleton'
import { useTheme } from '@/context/ThemeContext'
import s from './TarjetaCifra.module.css'

/**
 * Tarjeta de cifra del panel: SpotlightCard (luz del color de su flor) +
 * icono en su flor + CountUp. Sustituye a StatCard en las pantallas rehechas.
 *   Icono: componente de Phosphor · flor: morado | dorado | turquesa | …
 */
export default function TarjetaCifra({ Icono, flor = 'morado', label, value, prefijo = '', sufijo, sub, loading = false }) {
  const { reduceMotion } = useTheme()
  return (
    <SpotlightCard className={`${s.tarjeta} h-full`} spotlightColor={`color-mix(in srgb, var(--flor-${flor}) 18%, transparent)`}>
      {loading ? (
        <SkeletonCard height="96px" />
      ) : (
        <>
          <span className={s.icono} style={{ background: `var(--flor-${flor})`, color: `var(--flor-${flor}-fg)` }}>
            <Icono size={20} weight="fill" aria-hidden="true" />
          </span>
          {/* El número animado empieza en 0 y cuenta al entrar en vista: para los
              lectores de pantalla va oculto y se lee el valor real. */}
          <div className={s.valor} aria-hidden="true">
            {prefijo}
            {typeof value === 'number' && !reduceMotion ? <CountUp to={value} duration={1.4} separator="," /> : value}
            {sufijo && <span className={s.sufijo}>{sufijo}</span>}
          </div>
          <span className="sr-only">{`${prefijo}${typeof value === 'number' ? value.toLocaleString('es-MX') : value}${sufijo ?? ''}`}</span>
          <div className={`rotulo ${s.label}`}>{label}</div>
          {sub && <div className={s.sub}>{sub}</div>}
        </>
      )}
    </SpotlightCard>
  )
}
