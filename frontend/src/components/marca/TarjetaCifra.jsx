import { Odometer } from '@/components/devl/odometer'
import { SkeletonCard } from '@/components/frida/Skeleton'
import { useTheme } from '@/context/ThemeContext'
import s from './TarjetaCifra.module.css'

/**
 * Una cifra del panel: etiqueta, valor y nota. Va dentro de `.inventory-grid`
 * (UNA tira dividida por líneas), sin icono en cuadro ni brillo: el número
 * es lo que se mira. Las props `Icono` y `flor` de antes se ignoran.
 */
export default function TarjetaCifra({ label, value, prefijo = '', sufijo, sub, loading = false }) {
  const { reduceMotion } = useTheme()
  return (
    <div className={s.tarjeta}>
      {loading ? (
        <SkeletonCard height="72px" />
      ) : (
        <>
          <div className={s.label}>{label}</div>
          {/* El número animado empieza en 0 y cuenta al entrar en vista: para los
              lectores de pantalla va oculto y se lee el valor real. */}
          <div className={s.valor} aria-hidden="true">
            {prefijo}
            {typeof value === 'number' && !reduceMotion ? <Odometer value={value} locale="es-MX" /> : value}
            {sufijo && <span className={s.sufijo}>{sufijo}</span>}
          </div>
          <span className="sr-only">{`${prefijo}${typeof value === 'number' ? value.toLocaleString('es-MX') : value}${sufijo ?? ''}`}</span>
          {sub && <div className={s.sub}>{sub}</div>}
        </>
      )}
    </div>
  )
}
