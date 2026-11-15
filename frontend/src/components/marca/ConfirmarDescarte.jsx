import {
  AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle,
} from '@/components/coss/alert-dialog'
import { Button } from '@/components/coss/button'

/**
 * "¿Descartar cambios?" del panel (AlertDialog de coss): foco atrapado, Esc para
 * cancelar y la acción destructiva a la derecha. `titulo`, `accion` y `cancelar`
 * lo reutilizan para otras confirmaciones destructivas (papelera, borrar, dar de baja).
 */
export default function ConfirmarDescarte({
  abierto, onConfirmar, onCancelar, texto,
  titulo = '¿Descartar cambios?', accion = 'Descartar y salir', cancelar = 'Seguir editando',
}) {
  return (
    <AlertDialog open={abierto} onOpenChange={o => { if (!o) onCancelar() }}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription render={<div />}>
            {texto ?? 'Tienes cambios sin guardar. Si sales ahora, toda la información capturada se perderá.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>{cancelar}</AlertDialogClose>
          <AlertDialogClose render={<Button variant="destructive" />} onClick={onConfirmar}>{accion}</AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
