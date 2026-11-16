import { useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ShieldAlertIcon, ShieldIcon, TriangleAlertIcon, Undo2Icon } from 'lucide-react'
import {
  AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle,
} from '@/components/coss/alert-dialog'
import { Badge } from '@/components/coss/badge'
import { Button } from '@/components/coss/button'
import { Kbd } from '@/components/coss/kbd'
import { cn } from '@/lib/utils'

/*
 * Confirmación de una acción con consecuencias (lenguaje de `go-no-go` de devl.dev, sin su cuenta
 * regresiva: a una persona no se le niega sola una acción). Regla del panel (2026-11-15):
 *  - riesgo bajo (se deshace al instante, p. ej. quitar una foto): NO se pregunta; se hace y el
 *    aviso ofrece "Deshacer". Este componente no se usa ahí.
 *  - riesgo "medio": cambia algo importante pero tiene vuelta. Botón normal.
 *  - riesgo "alto": no tiene vuelta. Botón rojo, "No se puede deshacer" a la vista y el foco
 *    empieza en Cancelar (Enter no confirma por accidente).
 * S confirma y N cancela (no mientras se escribe en un campo, p. ej. el motivo). Esc también cancela.
 *
 * Props: titulo, accion (verbo del botón: "Cancelar reserva"), cancelar, riesgo,
 * consecuencias (frases de lo que va a pasar), cambio ({ antes, despues }: cómo queda),
 * deshacer (cómo se revierte; sin él y con riesgo alto se dice que no se puede), texto (párrafo
 * suelto), children (un campo extra, como el motivo).
 */

const RIESGOS = {
  medio: { etiqueta: 'Riesgo medio', variante: 'warning', Icono: ShieldIcon, tono: 'bg-warning/12 text-warning-foreground' },
  alto: { etiqueta: 'Riesgo alto', variante: 'error', Icono: ShieldAlertIcon, tono: 'bg-destructive/12 text-destructive-foreground' },
}
const escribiendo = el => el?.closest?.('input, textarea, select, [contenteditable="true"]')

export default function ConfirmarRiesgo({
  abierto, onConfirmar, onCancelar, titulo, accion, cancelar = 'Cancelar', riesgo = 'medio',
  consecuencias = [], cambio, deshacer, texto, children,
}) {
  const r = RIESGOS[riesgo] ?? RIESGOS.medio
  const alto = riesgo === 'alto'
  const reduce = useReducedMotion()
  const cancelarRef = useRef(null)
  const confirmar = () => { onConfirmar(); onCancelar?.() }

  const teclas = e => {
    if (e.metaKey || e.ctrlKey || e.altKey || escribiendo(e.target)) return
    const k = e.key.toLowerCase()
    if (k === 's') { e.preventDefault(); confirmar() }
    else if (k === 'n') { e.preventDefault(); onCancelar() }
  }

  return (
    <AlertDialog open={abierto} onOpenChange={o => { if (!o) onCancelar() }}>
      <AlertDialogPopup onKeyDown={teclas} initialFocus={alto ? cancelarRef : undefined}>
        <AlertDialogHeader className="text-start">
          <div className="flex items-start gap-3">
            <motion.span
              aria-hidden="true"
              className={cn('grid size-10 shrink-0 place-items-center rounded-full', r.tono)}
              initial={reduce ? false : { scale: 0.6, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22, delay: 0.05 }}
            >
              <r.Icono className="size-5" />
            </motion.span>
            <div className="min-w-0 flex-1">
              <AlertDialogTitle>{titulo}</AlertDialogTitle>
              <Badge className="mt-1.5" size="sm" variant={r.variante}><r.Icono />{r.etiqueta}</Badge>
            </div>
          </div>

          <AlertDialogDescription render={<div />} className="grid gap-3 text-sm">
            {texto && <p>{texto}</p>}

            {cambio && (
              <div className="overflow-hidden rounded-lg border tabular-nums" aria-label="Cómo queda">
                <p className="flex gap-2 bg-destructive/8 px-3 py-2 text-destructive-foreground">
                  <span aria-hidden="true" className="select-none font-semibold">−</span>
                  <span><span className="sr-only">Antes: </span>{cambio.antes}</span>
                </p>
                <p className="flex gap-2 bg-success/8 px-3 py-2 text-success-foreground">
                  <span aria-hidden="true" className="select-none font-semibold">+</span>
                  <span><span className="sr-only">Después: </span>{cambio.despues}</span>
                </p>
              </div>
            )}

            {consecuencias.length > 0 && (
              <div>
                <p className="mb-1.5 font-medium text-foreground">Qué va a pasar</p>
                <ul className="grid gap-1.5">
                  {consecuencias.map(c => (
                    <li key={c} className="flex gap-2">
                      <span aria-hidden="true" className={cn('mt-[0.45rem] size-1.5 shrink-0 rounded-full', alto ? 'bg-destructive' : 'bg-warning')} />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}


            {deshacer ? (
              <p className="flex items-start gap-2 text-muted-foreground">
                <Undo2Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span><span className="font-medium text-foreground">Se puede deshacer.</span> {deshacer}</span>
              </p>
            ) : alto && (
              <p className="flex items-start gap-2 font-medium text-destructive-foreground">
                <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                No se puede deshacer.
              </p>
            )}

            {children}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="sm:items-center">
          <p className="mr-auto whitespace-nowrap text-muted-foreground text-xs max-sm:hidden">S confirma, N cancela</p>
          <AlertDialogClose ref={cancelarRef} render={<Button variant="outline" />}>
            {cancelar} <Kbd className="max-sm:hidden">N</Kbd>
          </AlertDialogClose>
          {/* En oscuro el rojo de coss es claro: el texto blanco no pasa AA (≈2.8:1). Tinta oscura (≈7:1). */}
          <Button variant={alto ? 'destructive' : 'default'} onClick={confirmar} className={alto ? 'dark:text-background' : undefined}>
            {accion} <Kbd className="bg-current/20 text-current max-sm:hidden">S</Kbd>
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
