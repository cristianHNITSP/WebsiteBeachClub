import { SignOutIcon } from '@phosphor-icons/react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/** "¿Deseas cerrar sesión?": panel (menú del avatar y pie de la SideNav) y Mi cuenta. */
export default function ConfirmarSalida({ abierto, onCambiar, onSalir }) {
  return (
    <AlertDialog open={abierto} onOpenChange={onCambiar}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-[var(--accent)] text-[var(--accent-foreground)]">
            <SignOutIcon weight="bold" />
          </AlertDialogMedia>
          <AlertDialogTitle>¿Deseas cerrar sesión?</AlertDialogTitle>
          <AlertDialogDescription>Tendrás que volver a iniciar sesión para entrar.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Seguir aquí</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onSalir}>Cerrar sesión</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
