import WarmTooltip, { WarmTooltipGroup } from '@/components/bits/WarmTooltip'

/**
 * Etiqueta flotante de la marca: WarmTooltip (React Bits) con los tokens.
 * Envolver varias en <GrupoPistas> hace que, tras la primera, las vecinas
 * abran al instante y el globo se deslice de un botón a otro.
 *
 * `className` va al envoltorio que WarmTooltip pone alrededor del hijo (p. ej.
 * `flex-1 h-full` si el hijo es un elemento de una fila flex).
 *
 * Aparece sin desenfoque (popBlur 0): el blur solo acompaña al globo cuando
 * viaja de lado entre botones, que es donde da sensación de velocidad.
 */
export default function Pista({ contenido, lado = 'bottom', atajo, className = '', children }) {
  return (
    <WarmTooltip
      content={contenido}
      shortcut={atajo}
      side={lado}
      surfaceColor="var(--foreground)"
      inkColor="var(--background)"
      size="sm"
      radius={10}
      popBlur={0}
      className={className}
    >
      {children}
    </WarmTooltip>
  )
}

export function GrupoPistas({ children }) {
  return <WarmTooltipGroup delay={350} warmWindow={400}>{children}</WarmTooltipGroup>
}
