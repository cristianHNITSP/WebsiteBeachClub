import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { MagnifyingGlassIcon, MinusIcon, PlusIcon, TrashIcon, CashRegisterIcon, ReceiptIcon, ForkKnifeIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import JellyRadio from '@/components/bits/JellyRadio'
import RubberSegment from '@/components/bits/RubberSegment'
import BotonDestacado from '@/components/marca/BotonDestacado'
import Selector from '@/components/marca/Selector'
import Pista, { GrupoPistas } from '@/components/marca/Pista'
import { useParametros } from '@/hooks/useParametros'
import { useEstadoPersistente } from '@/hooks/useEstadoPersistente'
import { animacionItem } from '@/lib/animacionListas'
import TicketVista from '../components/TicketVista'
import { useReservas, hoy, sumarDias } from '../reservas'
import { useRestaurante, CATEGORIAS, categoria, MESAS, METODOS, totales, mxn } from '../restaurante'
import s from './Restaurante.module.css'

const FILTROS = [{ value: 'todas', label: 'Todo' }, ...CATEGORIAS.map(({ value, label }) => ({ value, label }))]
const TIPOS_ORDEN = [{ value: 'mesa', label: 'Mesa' }, { value: 'habitacion', label: 'Habitación' }, { value: 'llevar', label: 'Llevar' }]
const PROPINAS = [{ value: '0', label: 'Sin' }, { value: '0.1', label: '10%' }, { value: '0.15', label: '15%' }]
const ORDEN_VACIA = { items: [], tipo: 'mesa', referencia: MESAS[0], propina: '0.1', metodo: 'tarjeta' }

const segmento = { size: 'md', radius: 999, trackColor: 'var(--muted)', thumbColor: 'var(--primary)', textColor: 'var(--muted-foreground)', activeTextColor: 'var(--primary-foreground)' }

export default function RestaurantePosPage() {
  const navigate = useNavigate()
  const { menu, cobrar } = useRestaurante()
  // Cargo a habitación: quien está hospedado hoy (de la API, como la Línea de tiempo).
  const { reservas, habitaciones } = useReservas({ desde: hoy(), hasta: sumarDias(hoy(), 1) })
  // Filtro de la carta en la URL; la orden en curso en localStorage (recargar no la pierde).
  const [p, set] = useParametros({ cat: 'todas', q: '' })
  const [orden, setOrden] = useEstadoPersistente('frida-pos-orden', ORDEN_VACIA)
  const [ticket, setTicket] = useState(null)

  // Cargo a habitación: solo habitaciones con huésped hospedado hoy.
  const hospedadas = useMemo(() => reservas
    .filter(r => r.estado === 'en-curso')
    .map(r => ({ value: habitaciones.find(h => h.id === r.habitacionId)?.name, tag: r.huesped }))
    .filter(o => o.value)
    .map(o => ({ ...o, label: o.value })), [reservas, habitaciones])

  const q = p.q.trim().toLowerCase()
  const carta = menu.filter(pl => (p.cat === 'todas' || pl.categoria === p.cat) && (!q || pl.nombre.toLowerCase().includes(q)))
  const t = totales(orden.items, Number(orden.propina))
  const piezas = orden.items.reduce((n, i) => n + i.cantidad, 0)

  const cambiarCantidad = (platillo, delta) => setOrden(o => {
    const ya = o.items.find(i => i.platilloId === platillo.id)
    const items = ya
      ? o.items.map(i => (i.platilloId === platillo.id ? { ...i, cantidad: i.cantidad + delta } : i)).filter(i => i.cantidad > 0)
      : [...o.items, { platilloId: platillo.id, nombre: platillo.nombre, precio: platillo.precio, cantidad: 1 }]
    return { ...o, items }
  })
  const quitar = platilloId => setOrden(o => ({ ...o, items: o.items.filter(i => i.platilloId !== platilloId) }))

  const cambiarTipo = tipo => setOrden(o => ({
    ...o,
    tipo,
    referencia: tipo === 'mesa' ? MESAS[0] : tipo === 'habitacion' ? (hospedadas[0]?.value ?? '') : 'Para llevar',
    metodo: tipo === 'habitacion' ? 'habitacion' : o.metodo === 'habitacion' ? 'tarjeta' : o.metodo,
    propina: tipo === 'llevar' ? '0' : o.propina,
  }))

  const metodos = Object.entries(METODOS)
    .filter(([v]) => (orden.tipo === 'habitacion' ? v === 'habitacion' : v !== 'habitacion'))
    .map(([value, label]) => ({ value, label }))

  const puedeCobrar = orden.items.length > 0 && orden.referencia
  const hacerCobro = () => {
    const nuevo = cobrar({ items: orden.items, tipo: orden.tipo, referencia: orden.referencia, metodo: orden.metodo, propinaPct: Number(orden.propina) })
    setTicket(nuevo)
    setOrden(o => ({ ...ORDEN_VACIA, tipo: o.tipo, referencia: o.referencia, metodo: o.metodo, propina: o.propina }))
    toast.success(`Ticket ${nuevo.id} cobrado`, { description: `${mxn(nuevo.total, 2)}, ${METODOS[nuevo.metodo].toLowerCase()}.` })
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">Restaurante</span>
          <h1 className="admin-page-title">Punto de <em>venta</em></h1>
          <p className="admin-page-sub">Toma la orden desde la carta y cóbrala: cada cobro genera su ticket.</p>
        </div>
        <div className="admin-page-header-actions">
          <div className="admin-page-header-actions-row">
            <Button variant="outline" onClick={() => navigate('/admin/restaurante-tickets')}>
              <ReceiptIcon size={16} weight="bold" /> Ver tickets
            </Button>
          </div>
        </div>
      </div>

      <div className={s.pos}>
        {/* ── Carta ── */}
        <section aria-label="Carta">
          <div className={s.filtros} style={{ marginTop: 0 }}>
            <JellyRadio items={FILTROS} value={p.cat} onChange={v => set({ cat: v })} ariaLabel="Categoría" size="md"
              chipColor="var(--muted)" activeColor="var(--primary)" textColor="var(--muted-foreground)" activeTextColor="var(--primary-foreground)" />
            <div className={s.buscador}>
              <MagnifyingGlassIcon size={16} className={s.buscadorIcono} aria-hidden="true" />
              <Input value={p.q} onChange={e => set({ q: e.target.value })} placeholder="Buscar platillo" aria-label="Buscar platillo" className="pl-9" />
            </div>
          </div>

          {carta.length === 0 ? (
            <div className={`${s.panel} ${s.vacio}`}><ForkKnifeIcon size={28} /> Ningún platillo coincide con la búsqueda.</div>
          ) : (
            <motion.ul layout className={s.carta} style={{ listStyle: 'none' }}>
              <AnimatePresence mode="popLayout" initial={false}>
                {carta.map(pl => {
                  const c = categoria(pl.categoria)
                  const enOrden = orden.items.find(i => i.platilloId === pl.id)?.cantidad
                  return (
                    <motion.li key={pl.id} {...animacionItem}>
                      <motion.button
                        className={s.platillo}
                        disabled={!pl.disponible}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => cambiarCantidad(pl, 1)}
                        aria-label={`Agregar ${pl.nombre}, ${mxn(pl.precio)}${enOrden ? `, ${enOrden} en la orden` : ''}`}
                      >
                        <span className={s.icono} style={{ background: `var(--flor-${c.flor})`, color: `var(--flor-${c.flor}-fg)` }}>
                          <c.Icono size={18} weight="fill" aria-hidden="true" />
                        </span>
                        <span className={s.platilloNombre}>{pl.nombre}</span>
                        {pl.disponible ? <span className={s.platilloPrecio}>{mxn(pl.precio)}</span> : <span className={s.agotado}>Agotado</span>}
                        <AnimatePresence>
                          {enOrden && (
                            <motion.span key={enOrden} className={s.enOrden} initial={{ scale: 0.4 }} animate={{ scale: 1 }} exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 600, damping: 20 }}>
                              {enOrden}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </motion.ul>
          )}
        </section>

        {/* ── Orden ── */}
        <aside className={`${s.panel} ${s.orden}`} aria-label="Orden en curso">
          <div className={s.panelCabeza} style={{ marginBottom: 0 }}>
            <div>
              <div className={s.panelTitulo}>Orden en curso</div>
              <div className={s.panelSub}>{piezas ? `${piezas} platillo${piezas !== 1 ? 's' : ''}` : 'Toca un platillo para agregarlo'}</div>
            </div>
            {orden.items.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setOrden(o => ({ ...o, items: [] }))}>Vaciar</Button>
            )}
          </div>

          <div className={s.campo}>
            <Label>Destino</Label>
            <RubberSegment items={TIPOS_ORDEN} value={orden.tipo} onChange={cambiarTipo} aria-label="Destino de la orden" {...segmento} />
          </div>
          {orden.tipo !== 'llevar' && (
            <div className={s.campo}>
              <Label>{orden.tipo === 'mesa' ? 'Mesa' : 'Habitación (huésped hospedado)'}</Label>
              {orden.tipo === 'habitacion' && hospedadas.length === 0
                ? <span className={s.panelSub}>No hay huéspedes hospedados hoy.</span>
                : <Selector ariaLabel={orden.tipo === 'mesa' ? 'Mesa' : 'Habitación'} value={orden.referencia}
                    onChange={v => setOrden(o => ({ ...o, referencia: v }))}
                    opciones={orden.tipo === 'mesa' ? MESAS.map(m => ({ value: m, label: m })) : hospedadas} />}
            </div>
          )}

          {orden.items.length > 0 && (
            <GrupoPistas>
              <motion.ul layout className={s.lineas}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {orden.items.map(it => (
                    <motion.li key={it.platilloId} {...animacionItem} className={s.linea}>
                      <span className={s.lineaNombre}>{it.nombre}<span className={s.lineaPrecio}>{mxn(it.precio)} c/u</span></span>
                      <span className={s.cantidad}>
                        <Button variant="ghost" size="icon" className="size-7" aria-label={`Uno menos de ${it.nombre}`} onClick={() => cambiarCantidad({ id: it.platilloId }, -1)}><MinusIcon size={13} weight="bold" /></Button>
                        <span className={s.cantidadValor} aria-live="polite">{it.cantidad}</span>
                        <Button variant="ghost" size="icon" className="size-7" aria-label={`Uno más de ${it.nombre}`} onClick={() => cambiarCantidad({ id: it.platilloId }, 1)}><PlusIcon size={13} weight="bold" /></Button>
                      </span>
                      <span className={s.lineaImporte}>{mxn(it.precio * it.cantidad)}</span>
                      <Pista contenido="Quitar" lado="left">
                        <Button variant="ghost" size="icon" className="size-7" aria-label={`Quitar ${it.nombre}`} onClick={() => quitar(it.platilloId)}><TrashIcon size={14} /></Button>
                      </Pista>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            </GrupoPistas>
          )}

          {orden.tipo !== 'llevar' && (
            <div className={s.campo}>
              <Label>Propina</Label>
              <RubberSegment items={PROPINAS} value={orden.propina} onChange={v => setOrden(o => ({ ...o, propina: v }))} aria-label="Propina" {...segmento} />
            </div>
          )}
          <div className={s.campo}>
            <Label>Forma de pago</Label>
            <JellyRadio items={metodos} value={orden.metodo} onChange={v => setOrden(o => ({ ...o, metodo: v }))} ariaLabel="Forma de pago" size="sm"
              chipColor="var(--muted)" activeColor="var(--primary)" textColor="var(--muted-foreground)" activeTextColor="var(--primary-foreground)" />
          </div>

          <div className={s.totales}>
            <div><span>Subtotal</span><span>{mxn(t.subtotal, 2)}</span></div>
            <div><span>IVA 16%</span><span>{mxn(t.iva, 2)}</span></div>
            {t.propina > 0 && <div><span>Propina</span><span>{mxn(t.propina, 2)}</span></div>}
            <div className={s.total}><span>Total</span><span>{mxn(t.total, 2)}</span></div>
          </div>

          <BotonDestacado tamano="lg" disabled={!puedeCobrar} onClick={hacerCobro}>
            <CashRegisterIcon size={18} weight="bold" /> Cobrar {mxn(t.total)}
          </BotonDestacado>
        </aside>
      </div>

      {/* Ticket del cobro: solo en pantalla */}
      <Dialog open={!!ticket} onOpenChange={o => { if (!o) setTicket(null) }}>
        <DialogContent>
          {ticket && <>
            <DialogHeader>
              <DialogTitle>Cobro registrado</DialogTitle>
              <DialogDescription>Ticket {ticket.id}. Queda guardado en la sección Tickets.</DialogDescription>
            </DialogHeader>
            <TicketVista ticket={ticket} />
            <DialogFooter>
              <Button variant="outline" onClick={() => navigate(`/admin/restaurante-tickets?ticket=${ticket.id}`)}>Ver en tickets</Button>
              <Button onClick={() => setTicket(null)}>Nueva orden</Button>
            </DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
