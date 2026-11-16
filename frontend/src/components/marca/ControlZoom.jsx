import { useEffect, useState } from 'react'
import { MinusIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/coss/button'
import { LiquidSlider } from '@/components/devl/liquid-slider'
import { useTheme } from '@/context/ThemeContext'

/*
 * Zoom de toda la app (70 % a 130 %), a gusto de cada persona y recordado en este navegador.
 * Mientras se arrastra solo se mueve la barra: el zoom se aplica al soltar (si se aplicara en vivo,
 * la barra cambiaría de tamaño bajo el dedo). Los botones − y + lo aplican al instante.
 */
const MIN = 70
const MAX = 130
const PASO = 5

export default function ControlZoom() {
  const { zoom, setZoom } = useTheme()
  const [arrastre, setArrastre] = useState(null)
  const valor = arrastre ?? zoom
  useEffect(() => {
    if (arrastre === null) return
    const t = setTimeout(() => { setZoom(arrastre); setArrastre(null) }, 350)
    return () => clearTimeout(t)
  }, [arrastre, setZoom])

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" aria-label="Alejar" disabled={zoom <= MIN} onClick={() => setZoom(zoom - PASO)}><MinusIcon /></Button>
        <LiquidSlider className="flex-1" aria-label="Zoom" min={MIN} max={MAX} step={PASO} value={valor} onValueChange={setArrastre} formatValue={v => `${v} %`} />
        <Button variant="outline" size="icon-sm" aria-label="Acercar" disabled={zoom >= MAX} onClick={() => setZoom(zoom + PASO)}><PlusIcon /></Button>
      </div>
      <div className="flex items-center justify-between text-muted-foreground text-xs tabular-nums">
        <span aria-live="polite">{valor} %</span>
        {zoom !== 100 && <button type="button" className="cursor-pointer font-medium text-foreground underline-offset-2 hover:underline" onClick={() => setZoom(100)}>Volver a 100 %</button>}
      </div>
    </div>
  )
}
