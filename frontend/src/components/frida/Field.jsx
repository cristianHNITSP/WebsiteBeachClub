import { Children, isValidElement } from 'react'
import { Input as InputCoss } from '@/components/coss/input'
import { Textarea as TextareaCoss } from '@/components/coss/textarea'
import { Select as SelectCoss, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/coss/select'

/* Campos de los formularios del panel: las piezas de coss con la forma de siempre. */
export function Field({ label, style, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...style }}>
      {label && <label className="font-medium text-sm">{label}</label>}
      {children}
    </div>
  )
}

export function Input(props) {
  return <InputCoss size="lg" {...props} />
}

/** Recibe <option> y un onChange(e) como un select nativo; la opción vacía es el texto de relleno. */
export function Select({ value, onChange, children, disabled, required, 'aria-label': ariaLabel }) {
  const opciones = Children.toArray(children).filter(isValidElement).map(o => ({
    value: String(o.props.value), label: Children.toArray(o.props.children).join(''), disabled: o.props.disabled,
  }))
  const relleno = opciones.find(o => o.value === '')?.label
  const items = opciones.filter(o => o.value !== '')
  return (
    <SelectCoss value={value === '' ? null : String(value)} onValueChange={v => onChange({ target: { value: v ?? '' } })}
      items={items} disabled={disabled} required={required}>
      <SelectTrigger size="lg" aria-label={ariaLabel}><SelectValue placeholder={relleno} /></SelectTrigger>
      <SelectPopup>
        {items.map(o => <SelectItem key={o.value} value={o.value} disabled={o.disabled}>{o.label}</SelectItem>)}
      </SelectPopup>
    </SelectCoss>
  )
}

export function Textarea(props) {
  return <TextareaCoss {...props} />
}
