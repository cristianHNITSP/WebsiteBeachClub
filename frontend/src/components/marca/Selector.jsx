import GlideSelect from '@/components/bits/GlideSelect'

/**
 * Desplegable de la website: GlideSelect (React Bits) con los tokens de la
 * paleta y el alto de los demás campos (44 px). Sustituye al Select de shadcn.
 * opciones: [{ value, label, tag?, disabled? }]  ·  onChange(value)
 * `disabled` en una opción: se ve atenuada (con su `tag`, p. ej. "Próximamente") y no se puede elegir.
 */
export default function Selector({ value, onChange, opciones, ariaLabel, placeholder = 'Elegir', className = '' }) {
  return (
    <GlideSelect
      options={opciones}
      value={value}
      onChange={v => onChange(v)}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      size="lg"
      radius={16}
      menuWidth="100%"
      surfaceColor="var(--card)"
      highlightColor="var(--accent)"
      textColor="var(--foreground)"
      accentColor="var(--primary)"
      className={`w-full ${className}`}
      triggerClassName="w-full justify-between px-4 shadow-[inset_0_0_0_1px_var(--input)] [font-size:var(--fs-sm)]"
    />
  )
}
