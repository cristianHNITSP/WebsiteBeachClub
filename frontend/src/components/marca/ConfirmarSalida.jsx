import { LogOutIcon } from 'lucide-react'
import {
  AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle,
} from '@/components/coss/alert-dialog'
import { Button } from '@/components/coss/button'

/** "¿Deseas cerrar sesión?" (AlertDialog de coss): menú del avatar, pie de la SideNav y Mi cuenta. */
export default function ConfirmarSalida({ abierto, onCambiar, onSalir }) {
  return (
    <AlertDialog open={abierto} onOpenChange={onCambiar}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <div className="mb-1 grid size-10 place-items-center rounded-full bg-accent text-accent-foreground" aria-hidden="true">
            <LogOutIcon className="size-5" />
          </div>
          <AlertDialogTitle>¿Deseas cerrar sesión?</AlertDialogTitle>
          <AlertDialogDescription>Tendrás que volver a iniciar sesión para entrar.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>Seguir aquí</AlertDialogClose>
          <AlertDialogClose render={<Button variant="destructive" />} onClick={onSalir}>Cerrar sesión</AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
