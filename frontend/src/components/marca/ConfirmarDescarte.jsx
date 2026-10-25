import { WarningIcon } from '@phosphor-icons/react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * "¿Descartar cambios?" del panel. AlertDialog de shadcn: foco atrapado,
 * Esc para cancelar y la acción destructiva a la derecha.
 * Sustituye a los dos modales hechos a mano (SectionPanel y AdminApp).
 * `titulo`, `accion` y `cancelar` lo reutilizan para otras confirmaciones
 * destructivas (mandar a la papelera, borrar definitivamente).
 */
export default function ConfirmarDescarte({
  abierto, onConfirmar, onCancelar, texto,
  titulo = '¿Descartar cambios?', accion = 'Descartar y salir', cancelar = 'Seguir editando',
}) {
  return (
    <AlertDialog open={abierto} onOpenChange={o => { if (!o) onCancelar() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-[var(--secondary-container)] text-[var(--gold-dark)]">
            <WarningIcon weight="fill" />
          </AlertDialogMedia>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>
            {texto ?? 'Tienes cambios sin guardar. Si sales ahora, toda la información capturada se perderá.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelar}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirmar}>{accion}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
