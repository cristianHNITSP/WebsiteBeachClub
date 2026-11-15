import { useMemo, useRef, useState } from 'react'
import { Popover as Base } from '@base-ui/react/popover'
import { SearchIcon } from 'lucide-react'
import { Kbd, KbdGroup } from '@/components/coss/kbd'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/coss/popover'
import { claseVivo, marcarIconos } from '@/components/marca/iconosVivos'
import { cn } from '@/lib/utils'

/*
 * El buscador de pantalla ancha: un globo que crece desde su botón (el de la
 * previa). Es modal: la página de atrás no se desplaza. En móvil sigue el
 * Launcher de devl (BarraSuperior). Cada acción: { id, label, group, icon, onSelect }.
 */
const plano = t => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export default function GloboBuscar({ abierto, onCambiar, acciones }) {
  const [texto, setTexto] = useState('')
  const [activa, setActiva] = useState(0)
  const lista = useRef(null)
  const filtradas = useMemo(() => {
    const q = plano(texto.trim())
    return q ? acciones.filter(a => plano(a.label).includes(q)) : acciones
  }, [acciones, texto])
  const grupos = [...new Set(filtradas.map(a => a.group))]

  const mover = paso => {
    const n = (activa + paso + filtradas.length) % filtradas.length
    setActiva(n)
    lista.current?.querySelector(`[data-indice="${n}"]`)?.scrollIntoView({ block: 'nearest' })
  }
  const tecla = e => {
    if (!filtradas.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); mover(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); mover(-1) }
    else if (e.key === 'Enter') { e.preventDefault(); filtradas[activa]?.onSelect() }
  }

  return (
    <Popover modal open={abierto} onOpenChange={onCambiar} onOpenChangeComplete={v => { if (!v) { setTexto(''); setActiva(0) } }}>
      <PopoverTrigger aria-label="Buscar o ir a"
        className={cn(claseVivo, 'flex h-9 w-64 cursor-pointer items-center gap-2 rounded-full bg-muted ps-3 pe-1.5 text-muted-foreground text-sm outline-none transition-shadow hover:shadow-[0_0_0_1px_var(--border)] focus-visible:ring-2 focus-visible:ring-ring max-md:w-9 max-md:justify-center max-md:px-0')}>
        {marcarIconos(<SearchIcon className="size-4 shrink-0" />)}
        <span className="flex-1 text-start max-md:hidden">Buscar o ir a…</span>
        <KbdGroup className="max-md:hidden"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></KbdGroup>
      </PopoverTrigger>
      <Base.Portal><Base.Backdrop className="fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" /></Base.Portal>
      <PopoverPopup align="end" sideOffset={8} aria-label="Buscar o ir a"
        className="w-[460px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl duration-[380ms] ease-[cubic-bezier(.34,1.4,.64,1)] data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:scale-[.3] [&_[data-slot=popover-viewport]]:p-0">
        <input autoFocus value={texto} onChange={e => { setTexto(e.target.value); setActiva(0) }} onKeyDown={tecla}
          aria-label="Buscar" placeholder="Busca una pantalla o una acción"
          className="h-12 w-full border-0 border-b bg-transparent px-4 text-[0.95rem] outline-none placeholder:text-muted-foreground" />
        <div ref={lista} className="max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain p-2">
          {!filtradas.length && <p className="px-2 py-6 text-center text-muted-foreground text-sm">Nada con «{texto}».</p>}
          {grupos.map(g => (
            <div key={g} role="group" aria-label={g} className="grid gap-0.5">
              <p className="px-2 pt-1.5 pb-0.5 text-muted-foreground text-xs">{g}</p>
              {filtradas.filter(a => a.group === g).map(a => {
                const i = filtradas.indexOf(a)
                return (
                  <button key={a.id} type="button" data-indice={i} onClick={a.onSelect} onPointerMove={() => setActiva(i)}
                    className={cn(claseVivo, 'flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 text-left text-sm outline-none [&_svg]:size-4 [&_svg]:text-muted-foreground', i === activa && 'bg-accent')}>
                    {marcarIconos(a.icon)}{a.label}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </PopoverPopup>
    </Popover>
  )
}
