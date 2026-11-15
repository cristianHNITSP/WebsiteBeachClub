import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/coss/select'

/** Desplegable del panel (Select de coss). opciones: [{ value, label, tag?, disabled? }] · onChange(value) */
export default function Selector({ value, onChange, opciones, ariaLabel, placeholder = 'Elegir', className = '' }) {
  return (
    <Select value={value} onValueChange={onChange} items={opciones}>
      <SelectTrigger aria-label={ariaLabel} size="lg" className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectPopup>
        {opciones.map(o => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}{o.tag && <span className="ms-2 text-muted-foreground text-xs">{o.tag}</span>}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  )
}
