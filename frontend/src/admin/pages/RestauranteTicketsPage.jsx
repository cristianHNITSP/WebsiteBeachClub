import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  MagnifyingGlassIcon, ReceiptIcon, ReceiptXIcon, CurrencyDollarIcon, ForkKnifeIcon, CashRegisterIcon,
  ChairIcon, BedIcon, BagIcon, CheckCircleIcon, XCircleIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import JellyRadio from '@/components/bits/JellyRadio'
import RubberSegment from '@/components/bits/RubberSegment'
import HoldButton from '@/components/bits/HoldButton'
import TarjetaCifra from '@/components/marca/TarjetaCifra'
import Paginador from '@/components/marca/Paginador'
import { useParametros } from '@/hooks/useParametros'
import { animacionItem } from '@/lib/animacionListas'
import TicketVista from '../components/TicketVista'
import { useRestaurante, periodo, resumen, METODOS, mxn } from '../restaurante'
import s from './Restaurante.module.css'

const POR_PAGINA = 10
const PERIODOS = [{ value: '1', label: 'Hoy' }, { value: '7', label: '7 días' }, { value: '30', label: '30 días' }]
const ESTADOS = [{ value: 'todos', label: 'Todos' }, { value: 'pagado', label: 'Pagados' }, { value: 'cancelado', label: 'Cancelados' }]
const ICONO_TIPO = { mesa: ChairIcon, habitacion: BedIcon, llevar: BagIcon }

const hora = iso => new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function RestauranteTicketsPage() {
  const navigate = useNavigate()
  const { tickets, cancelarTicket } = useRestaurante()
  // Periodo, filtro, búsqueda, página y ticket abierto en la URL.
  const [p, set] = useParametros({ periodo: '1', estado: 'todos', q: '', pagina: 1, ticket: '' })
  const dias = Number(p.periodo) || 1

  const delPeriodo = useMemo(() => {
    const ini = new Date(); ini.setHours(0, 0, 0, 0); ini.setDate(ini.getDate() - (dias - 1))
    return tickets.filter(t => new Date(t.fecha) >= ini).reverse() // más reciente primero
  }, [tickets, dias])

  const q = p.q.trim().toLowerCase()
  const filtrados = delPeriodo.filter(t =>
    (p.estado === 'todos' || t.estado === p.estado) &&
    (!q || t.id.toLowerCase().includes(q) || t.referencia.toLowerCase().includes(q) || t.items.some(i => i.nombre.toLowerCase().includes(q))),
  )
  const total = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const pagina = Math.min(Math.max(1, p.pagina), total)
  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const r = resumen(periodo(tickets, dias).actual)
  const cancelados = delPeriodo.filter(t => t.estado === 'cancelado').length
  const abierto = tickets.find(t => t.id === p.ticket)

  const cancelar = t => {
    cancelarTicket(t.id)
    toast(`Ticket ${t.id} cancelado`, { description: `${mxn(t.total, 2)} ya no cuenta en ventas ni estadísticas.` })
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">Restaurante</span>
          <h1 className="admin-page-title">Tickets de <em>venta</em></h1>
          <div className={s.filtros} style={{ marginBottom: 0 }}>
            <RubberSegment items={PERIODOS} value={p.periodo} onChange={v => set({ periodo: v, pagina: 1 }, { historial: true })} aria-label="Periodo"
              size="md" radius={999} trackColor="var(--muted)" thumbColor="var(--primary)" textColor="var(--muted-foreground)" activeTextColor="var(--primary-foreground)" />
          </div>
        </div>
        <div className="admin-page-header-actions">
          <div className="admin-page-header-actions-row">
            <Button variant="outline" onClick={() => navigate('/admin/restaurante')}>
              <CashRegisterIcon size={16} weight="bold" /> Punto de venta
            </Button>
          </div>
        </div>
      </div>

      <div className="inventory-grid">
        <TarjetaCifra Icono={CurrencyDollarIcon} flor="morado"   label="Ventas" value={Math.round(r.ventas)} prefijo="$" sub="Pagados, con propina" />
        <TarjetaCifra Icono={ReceiptIcon}        flor="turquesa" label="Tickets pagados" value={r.tickets} sub={`Promedio ${mxn(r.promedio)} por ticket`} />
        <TarjetaCifra Icono={ForkKnifeIcon}      flor="dorado"   label="Platillos vendidos" value={r.platillos} />
        <TarjetaCifra Icono={ReceiptXIcon}       flor="naranja"  label="Cancelados" value={cancelados} />
      </div>

      <div className={s.filtros}>
        <JellyRadio items={ESTADOS} value={p.estado} onChange={v => set({ estado: v, pagina: 1 })} ariaLabel="Estado del ticket" size="md"
          chipColor="var(--muted)" activeColor="var(--primary)" textColor="var(--muted-foreground)" activeTextColor="var(--primary-foreground)" />
        <div className={s.buscador}>
          <MagnifyingGlassIcon size={16} className={s.buscadorIcono} aria-hidden="true" />
          <Input value={p.q} onChange={e => set({ q: e.target.value, pagina: 1 })} placeholder="Folio, mesa o platillo" aria-label="Buscar ticket" className="pl-9" />
        </div>
        <span className={s.resultado}>{filtrados.length} ticket{filtrados.length !== 1 ? 's' : ''}</span>
      </div>

      <div className={s.panel} style={{ padding: 8, minHeight: 420 }}>
        <div className={`${s.tablaFila} ${s.tablaCabeza}`} aria-hidden="true">
          <span>Folio</span><span className={s.enMovilOculta}>Destino</span><span className={`${s.ocultable} ${s.enMovilOculta}`}>Platillos</span>
          <span className={`${s.ocultable} ${s.enMovilOculta}`}>Pago</span><span className={`${s.importe} ${s.enMovilOculta}`}>Total</span><span style={{ justifySelf: 'end' }}>Estado</span>
        </div>
        {visibles.length === 0 ? (
          <div className={s.vacio} role="status"><ReceiptIcon size={28} /> No hay tickets con estos filtros.</div>
        ) : (
          <motion.ul layout className={s.tabla}>
            <AnimatePresence mode="popLayout" initial={false}>
              {visibles.map(t => {
                const Icono = ICONO_TIPO[t.tipo]
                const piezas = t.items.reduce((n, i) => n + i.cantidad, 0)
                return (
                  <motion.li key={t.id} {...animacionItem}>
                    <button className={s.tablaFila} onClick={() => set({ ticket: t.id }, { historial: true })} aria-label={`Ticket ${t.id}, ${mxn(t.total, 2)}, ${t.estado}`}>
                      <span><span className={s.folio}>{t.id}</span><span className={s.hora}>{hora(t.fecha)}</span></span>
                      <span className={`${s.destino} ${s.enMovilOculta}`}><Icono size={16} aria-hidden="true" /><span className={s.recorte} style={{ color: 'var(--foreground)' }}>{t.referencia}</span></span>
                      <span className={`${s.recorte} ${s.ocultable} ${s.enMovilOculta}`}>{piezas} platillo{piezas !== 1 ? 's' : ''}: {t.items.map(i => i.nombre).join(', ')}</span>
                      <span className={`${s.recorte} ${s.ocultable} ${s.enMovilOculta}`}>{METODOS[t.metodo]}</span>
                      <span className={`${s.importe} ${s.enMovilOculta}`}>{mxn(t.total, 2)}</span>
                      <span className={`${s.estado} ${s[t.estado]}`}>
                        {t.estado === 'pagado' ? <CheckCircleIcon size={13} weight="fill" aria-hidden="true" /> : <XCircleIcon size={13} weight="fill" aria-hidden="true" />}
                        {t.estado === 'pagado' ? 'Pagado' : 'Cancelado'}
                      </span>
                    </button>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>

      <Paginador id="tickets" etiqueta="Páginas de tickets" pagina={pagina} total={total} onCambiar={n => set({ pagina: n }, { historial: true })} />

      {/* Detalle: el ticket en pantalla; ?ticket= en la URL lo deja abierto al recargar */}
      <Sheet open={!!abierto} onOpenChange={o => { if (!o) set({ ticket: '' }) }}>
        <SheetContent side="right" className="w-[92vw] max-w-md">
          {abierto && <>
            <SheetHeader>
              <SheetTitle>Ticket {abierto.id}</SheetTitle>
              <SheetDescription>{abierto.estado === 'pagado' ? 'Cobrado' : 'Cancelado'} el {hora(abierto.fecha)}</SheetDescription>
            </SheetHeader>
            <div className={s.hoja}>
              <TicketVista ticket={abierto} />
              {abierto.estado === 'pagado' && (
                <HoldButton size="md" radius={999} holdTime={1100} doneLabel="Cancelado"
                  backgroundColor="var(--muted)" textColor="var(--foreground)" fillColor="var(--destructive)" fillTextColor="var(--destructive-foreground)"
                  className="w-full" onHold={() => cancelar(abierto)}>
                  Mantén para cancelar el ticket
                </HoldButton>
              )}
            </div>
          </>}
        </SheetContent>
      </Sheet>
    </div>
  )
}
