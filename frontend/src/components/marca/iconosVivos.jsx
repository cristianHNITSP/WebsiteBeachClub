import { Children, Fragment, isValidElement } from 'react'
import s from './iconosVivos.module.css'

// Cada icono "vive" según lo que significa. Por nombre del icono de Phosphor;
// el que no está en la tabla late.
const ANIMACION = {
  ArrowRightIcon: 'avanzar', SignInIcon: 'avanzar', SignOutIcon: 'avanzar', CaretRightIcon: 'avanzar', ArrowSquareOutIcon: 'avanzar',
  ArrowLeftIcon: 'retroceder', CaretLeftIcon: 'retroceder',
  PlusIcon: 'girar', XIcon: 'girar', GearSixIcon: 'girar', ArrowClockwiseIcon: 'vuelta', ArrowsClockwiseIcon: 'vuelta',
  CashRegisterIcon: 'rebote', CurrencyDollarIcon: 'rebote', CoinsIcon: 'rebote', CalendarPlusIcon: 'rebote', HandCoinsIcon: 'rebote',
  DownloadSimpleIcon: 'bajar', UploadSimpleIcon: 'subir', ImageIcon: 'subir',
  BellIcon: 'campana', ProhibitIcon: 'sacudir', TrashIcon: 'sacudir', WarningCircleIcon: 'sacudir',
  PencilSimpleIcon: 'escribir', PencilIcon: 'escribir', CheckIcon: 'latido', MagnifyingGlassIcon: 'buscar',
  ChecksIcon: 'latido', CreditCardIcon: 'rebote', StarIcon: 'girar', CameraIcon: 'rebote', WrenchIcon: 'escribir', ArrowCounterClockwiseIcon: 'vuelta', ArrowUpRightIcon: 'subir',
  EnvelopeSimpleIcon: 'rebote', EnvelopeSimpleOpenIcon: 'rebote', CalendarDotsIcon: 'rebote', PaperPlaneTiltIcon: 'avanzar',
  // Lucide (se llaman sin "Icon"): los de la barra lateral y la barra superior
  SearchIcon: 'buscar', SettingsIcon: 'girar', LogOutIcon: 'avanzar', DoorOpenIcon: 'avanzar', CalendarDaysIcon: 'rebote',
  BedDoubleIcon: 'rebote', UsersIcon: 'latido', UserRoundIcon: 'latido', GlobeIcon: 'vuelta', FingerprintIcon: 'latido', LayoutGridIcon: 'latido',
  PanelLeftIcon: 'retroceder', ChevronsUpDownIcon: 'latido', MenuIcon: 'latido',
}
const nombre = c => { const n = c.type?.displayName ?? ''; return !n || n.endsWith('Icon') ? n : `${n}Icon` }
const esIcono = c => isValidElement(c) && typeof c.type !== 'string' && nombre(c).endsWith('Icon')

/** Clase que activa los iconos vivos al pasar o enfocar el botón que la lleva. */
export const claseVivo = s.vivo
/** Con `reposo`, el gesto también corre en reposo con pausas (la acción destacada). */
export const claseReposo = s.reposo

/** Aplana fragmentos (<>icono texto</>) y envuelve SOLO los iconos: el texto no se mueve.
 *  El spinner de carga ya gira: no se anima encima. */
export function marcarIconos(children) {
  return Children.toArray(children).flatMap(c =>
    isValidElement(c) && c.type === Fragment ? marcarIconos(c.props.children) : [c],
  ).map((c, i) => (esIcono(c)
    ? <span key={`icono-${i}`} className={`${s.icono} ${nombre(c).startsWith('Spinner') ? '' : s[ANIMACION[nombre(c)] ?? 'latido']}`}>{c}</span>
    : c))
}
