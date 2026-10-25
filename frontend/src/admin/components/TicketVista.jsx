import { CoronaFlores } from '@/components/marca/Wordmark'
import { METODOS, TIPOS, mxn } from '../restaurante'
import s from '../pages/Restaurante.module.css'

const fechaLarga = iso => new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })

/** El ticket tal como se muestra en pantalla (no se imprime). */
export default function TicketVista({ ticket: t }) {
  return (
    <article className={`${s.ticket} ${t.estado === 'cancelado' ? s.ticketCancelado : ''}`} aria-label={`Ticket ${t.id}`}>
      <header className={s.ticketCabeza}>
        <CoronaFlores className={s.ticketCorona} />
        <strong className={s.ticketMarca}>Restaurante Frida</strong>
        <span>Cabañas Frida, Chelem, Yucatán</span>
      </header>
      <dl className={s.ticketDatos}>
        <div><dt>Folio</dt><dd className={s.mono}>{t.id}</dd></div>
        <div><dt>Fecha</dt><dd>{fechaLarga(t.fecha)}</dd></div>
        <div><dt>{TIPOS[t.tipo]}</dt><dd>{t.referencia}</dd></div>
        <div><dt>Atendió</dt><dd>{t.mesero}</dd></div>
      </dl>
      <ul className={s.ticketLineas}>
        {t.items.map(it => (
          <li key={it.platilloId}>
            <span className={s.ticketCant}>{it.cantidad}×</span>
            <span className={s.ticketNombre}>{it.nombre}</span>
            <span>{mxn(it.precio * it.cantidad, 2)}</span>
          </li>
        ))}
      </ul>
      <dl className={s.ticketTotales}>
        <div><dt>Subtotal</dt><dd>{mxn(t.subtotal, 2)}</dd></div>
        <div><dt>IVA 16%</dt><dd>{mxn(t.iva, 2)}</dd></div>
        {t.propina > 0 && <div><dt>Propina</dt><dd>{mxn(t.propina, 2)}</dd></div>}
        <div className={s.ticketTotal}><dt>Total</dt><dd>{mxn(t.total, 2)}</dd></div>
      </dl>
      <footer className={s.ticketPie}>
        <span>Pago: {METODOS[t.metodo]}</span>
        {t.estado === 'cancelado' ? <strong className={s.ticketSello}>Cancelado</strong> : <span>¡Gracias por su visita!</span>}
      </footer>
    </article>
  )
}
