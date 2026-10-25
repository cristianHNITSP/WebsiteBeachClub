// Cabecera de sección de la website: misma estructura que SectionHeader
// (rótulo + franja + título + subtítulo), con la escala tipográfica de
// site.css. SectionHeader sigue siendo del admin.
export default function Encabezado({ eyebrow, title, subtitle, center = false, className = '' }) {
  return (
    <div className={`encabezado ${center ? 'encabezado--centro' : ''} ${className}`}>
      {eyebrow && <span className="rotulo encabezado__rotulo">{eyebrow}</span>}
      <div className="encabezado__fila">
        {!center && <span className="encabezado__franja" aria-hidden="true" />}
        <h2 className="encabezado__titulo">{title}</h2>
      </div>
      {subtitle && <p className="encabezado__sub">{subtitle}</p>}
    </div>
  )
}
