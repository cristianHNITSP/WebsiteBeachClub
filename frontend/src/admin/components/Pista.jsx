import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from '@/components/coss/tooltip'
import { Kbd } from '@/components/coss/kbd'

/** Etiqueta flotante del panel (tooltip de coss). `className` va al envoltorio del hijo. */
export default function Pista({ contenido, lado = 'bottom', atajo, className = '', children }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={`inline-flex ${className}`} />}>{children}</TooltipTrigger>
      <TooltipPopup side={lado}>
        {contenido}{atajo && <Kbd className="ms-1.5">{atajo}</Kbd>}
      </TooltipPopup>
    </Tooltip>
  )
}

/** Tras la primera, las vecinas abren al instante. */
export function GrupoPistas({ children }) {
  return <TooltipProvider delay={350}>{children}</TooltipProvider>
}
