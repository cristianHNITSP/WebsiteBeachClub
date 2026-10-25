import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { MagnifyingGlassIcon, PlusIcon, BookOpenTextIcon, CheckCircleIcon, ProhibitIcon, TrophyIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import JellyRadio from '@/components/bits/JellyRadio'
import SquishSwitch from '@/components/bits/SquishSwitch'
import BotonDestacado from '@/components/marca/BotonDestacado'
import TarjetaCifra from '@/components/marca/TarjetaCifra'
import Selector from '@/components/marca/Selector'
import { useParametros } from '@/hooks/useParametros'
import { animacionItem } from '@/lib/animacionListas'
import { useRestaurante, CATEGORIAS, categoria, periodo, platillosVendidos, mxn } from '../restaurante'
import s from './Restaurante.module.css'

const FILTROS = [{ value: 'todas', label: 'Todo' }, ...CATEGORIAS.map(({ value, label }) => ({ value, label }))]
const NUEVO = { nombre: '', categoria: 'fuertes', precio: '', descripcion: '' }

export default function RestauranteMenuPage() {
  const { menu, tickets, alternarDisponible, agregarPlatillo } = useRestaurante()
  const [p, set] = useParametros({ cat: 'todas', q: '' })
  const [nuevo, setNuevo] = useState(null)

  const vendidos = useMemo(() => {
    const lista = platillosVendidos(periodo(tickets, 30).actual, menu)
    return Object.fromEntries(lista.map(v => [v.id, v.cantidad]))
  }, [tickets, menu])
  const estrella = menu.reduce((a, b) => ((vendidos[b.id] ?? 0) > (vendidos[a.id] ?? 0) ? b : a), menu[0])

  const q = p.q.trim().toLowerCase()
  const visibles = menu.filter(pl => (p.cat === 'todas' || pl.categoria === p.cat) && (!q || pl.nombre.toLowerCase().includes(q)))
  const secciones = CATEGORIAS.map(c => ({ ...c, platillos: visibles.filter(pl => pl.categoria === c.value) })).filter(c => c.platillos.length)

  const precio = Number(nuevo?.precio)
  const error = nuevo && (!nuevo.nombre.trim() ? 'Escribe el nombre del platillo.' : !(precio > 0) ? 'El precio debe ser mayor a cero.' : '')
  const guardar = () => {
    agregarPlatillo({ nombre: nuevo.nombre.trim(), categoria: nuevo.categoria, precio: Math.round(precio), descripcion: nuevo.descripcion.trim() })
    toast.success('Platillo agregado a la carta', { description: `${nuevo.nombre.trim()}, ${mxn(precio)}.` })
    setNuevo(null)
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">Restaurante</span>
          <h1 className="admin-page-title">Menú del <em>restaurante</em></h1>
          <p className="admin-page-sub">Lo agotado deja de poder venderse en el punto de venta. Vendidos: últimos 30 días.</p>
        </div>
        <div className="admin-page-header-actions">
          <div className="admin-page-header-actions-row">
            <BotonDestacado onClick={() => setNuevo(NUEVO)}><PlusIcon size={16} weight="bold" /> Nuevo platillo</BotonDestacado>
          </div>
        </div>
      </div>

      <div className="inventory-grid">
        <TarjetaCifra Icono={BookOpenTextIcon} flor="morado"   label="Platillos en carta" value={menu.length} />
        <TarjetaCifra Icono={CheckCircleIcon}  flor="turquesa" label="Disponibles" value={menu.filter(pl => pl.disponible).length} />
        <TarjetaCifra Icono={ProhibitIcon}     flor="naranja"  label="Agotados" value={menu.filter(pl => !pl.disponible).length} />
        <TarjetaCifra Icono={TrophyIcon}       flor="dorado"   label="Más vendido, 30 días" value={vendidos[estrella?.id] ?? 0} sub={estrella?.nombre} />
      </div>

      <div className={s.filtros}>
        <JellyRadio items={FILTROS} value={p.cat} onChange={v => set({ cat: v })} ariaLabel="Categoría" size="md"
          chipColor="var(--muted)" activeColor="var(--primary)" textColor="var(--muted-foreground)" activeTextColor="var(--primary-foreground)" />
        <div className={s.buscador}>
          <MagnifyingGlassIcon size={16} className={s.buscadorIcono} aria-hidden="true" />
          <Input value={p.q} onChange={e => set({ q: e.target.value })} placeholder="Buscar platillo" aria-label="Buscar platillo" className="pl-9" />
        </div>
        <span className={s.resultado}>{visibles.length} platillo{visibles.length !== 1 ? 's' : ''}</span>
      </div>

      {secciones.length === 0 && <div className={`${s.panel} ${s.vacio}`}><BookOpenTextIcon size={28} /> Ningún platillo coincide con la búsqueda.</div>}
      {secciones.map(c => (
        <section key={c.value} className={s.menuSeccion} aria-label={c.label}>
          <div className={s.menuSeccionTitulo}>
            <span className={s.icono} style={{ background: `var(--flor-${c.flor})`, color: `var(--flor-${c.flor}-fg)` }}><c.Icono size={18} weight="fill" aria-hidden="true" /></span>
            <h2 className="admin-section-title" style={{ marginBottom: 0 }}>{c.label}</h2>
          </div>
          <motion.ul layout className={s.menuGrid} style={{ listStyle: 'none' }}>
            <AnimatePresence mode="popLayout" initial={false}>
              {c.platillos.map(pl => (
                <motion.li key={pl.id} {...animacionItem}>
                  <article className={s.menuTarjeta} style={pl.disponible ? undefined : { opacity: 0.7 }}>
                    <div className={s.fila} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                      <strong className={s.platilloNombre}>{pl.nombre}</strong>
                      <span className={s.platilloPrecio} style={{ marginTop: 0 }}>{mxn(pl.precio)}</span>
                    </div>
                    {pl.descripcion && <p className={s.menuDesc}>{pl.descripcion}</p>}
                    <div className={s.menuPie}>
                      <span className={s.menuVendidos}>{vendidos[pl.id] ?? 0} vendidos</span>
                      <label className={s.switch} htmlFor={`disp-${pl.id}`}>
                        {pl.disponible ? 'Disponible' : 'Agotado'}
                        <SquishSwitch id={`disp-${pl.id}`} checked={pl.disponible} onChange={() => alternarDisponible(pl.id)}
                          width={46} height={26} radius={13} ariaLabel={`${pl.nombre} disponible`}
                          trackColor="var(--muted)" trackOnColor="var(--primary)" thumbColor="var(--card)" thumbOnColor="var(--primary-foreground)" />
                      </label>
                    </div>
                  </article>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </section>
      ))}

      <Dialog open={!!nuevo} onOpenChange={o => { if (!o) setNuevo(null) }}>
        <DialogContent>
          {nuevo && <>
            <DialogHeader>
              <DialogTitle>Nuevo platillo</DialogTitle>
              <DialogDescription>Queda disponible en el punto de venta al guardarlo.</DialogDescription>
            </DialogHeader>
            <form className={s.formulario} onSubmit={e => { e.preventDefault(); if (!error) guardar() }}>
              <div className={s.campo}>
                <Label htmlFor="pl-nombre">Nombre</Label>
                <Input id="pl-nombre" autoFocus value={nuevo.nombre} onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))} placeholder="Ej. Sopa de lima" />
              </div>
              <div className={s.fila} style={{ alignItems: 'flex-end', flexWrap: 'nowrap' }}>
                <div className={s.campo} style={{ flex: 1 }}>
                  <Label>Categoría</Label>
                  <Selector ariaLabel="Categoría" value={nuevo.categoria} onChange={v => setNuevo(n => ({ ...n, categoria: v }))}
                    opciones={CATEGORIAS.map(({ value, label }) => ({ value, label }))} />
                </div>
                <div className={s.campo} style={{ width: 130 }}>
                  <Label htmlFor="pl-precio">Precio (MXN)</Label>
                  <Input id="pl-precio" type="number" min="1" inputMode="numeric" value={nuevo.precio} onChange={e => setNuevo(n => ({ ...n, precio: e.target.value }))} placeholder="150" />
                </div>
              </div>
              <div className={s.campo}>
                <Label htmlFor="pl-desc">Descripción (opcional)</Label>
                <Input id="pl-desc" value={nuevo.descripcion} onChange={e => setNuevo(n => ({ ...n, descripcion: e.target.value }))} placeholder="Ingredientes o acompañantes" />
              </div>
              <span className={s.panelSub}>Se muestra con el icono de {categoria(nuevo.categoria).label.toLowerCase()}.</span>
              {error && (nuevo.nombre || nuevo.precio) && <span className={s.formError} role="alert">{error}</span>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNuevo(null)}>Cancelar</Button>
                <Button type="submit" disabled={!!error}>Guardar platillo</Button>
              </DialogFooter>
            </form>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
