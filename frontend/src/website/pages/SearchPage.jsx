import { useState } from 'react'
import { useParametros } from '@/hooks/useParametros'
import { animacionItem } from '@/lib/animacionListas'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeftIcon, ArrowRightIcon, MagnifyingGlassIcon, SlidersHorizontalIcon, SmileySadIcon } from '@phosphor-icons/react'
import { SUCURSALES } from '../../data/rooms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import SquishSwitch from '@/components/bits/SquishSwitch'
import RoomCard from '../components/RoomCard'
import Selector from '@/components/marca/Selector'
import s from './SearchPage.module.css'

const ITEMS_PER_PAGE = 4

const ROOM_TYPES = [
  { key: 'all',      label: 'Todos' },
  { key: 'suite',    label: 'Suites' },
  { key: 'cabaña',   label: 'Cabañas' },
  { key: 'villa',    label: 'Villas' },
  { key: 'familiar', label: 'Familiar' },
  { key: 'estudio',  label: 'Estudio' },
]

const PROPIEDADES = [{ key: 'all', label: 'Todas las propiedades' }, ...SUCURSALES.map(sc => ({ key: sc.key, label: sc.name }))]

// Pastillas de filtro: ToggleGroup de shadcn con el activo en primario.
function Pastillas({ opciones, valor, onCambio, etiqueta }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={valor}
      onValueChange={v => v && onCambio(v)}
      aria-label={etiqueta}
      className="flex-wrap justify-start"
    >
      {opciones.map(o => (
        <ToggleGroupItem key={o.key} value={o.key} className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export default function SearchPage({ onSelectRoom, rooms, favorites, onToggleFav }) {
  // Toda la configuración de la búsqueda vive en la URL: recargar, volver
  // atrás o compartir el enlace conserva filtros, orden y página.
  const [p, set] = useParametros({
    q: '', sucursal: 'all', tipo: 'all', precio: 5000, ofertas: false, orden: 'rating', pagina: 1,
    llegada: '', salida: '',
  })
  const { q: searchQuery, sucursal: selectedSucursal, tipo: roomTypeFilter, precio: priceMax, ofertas: soloOfertas, orden: sortBy } = p
  // Cambiar un filtro vuelve a la página 1.
  const filtrar = cambios => set({ ...cambios, pagina: 1 })
  const [filtersOpen, setFiltersOpen] = useState(false) // abrir el panel en móvil: estado de UI, no configuración

  const filtered = rooms.filter(r => {
    if (selectedSucursal !== 'all' && r.location !== selectedSucursal) return false
    if (r.price > priceMax) return false
    if (roomTypeFilter !== 'all' && r.roomType !== roomTypeFilter) return false
    if (soloOfertas && !r.hasDiscount) return false
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'rating')     return b.rating - a.rating
    if (sortBy === 'price_asc')  return a.price - b.price
    if (sortBy === 'price_desc') return b.price - a.price
    return 0
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE))
  const page = Math.min(Math.max(1, p.pagina), totalPages)
  const setPage = f => set({ pagina: typeof f === 'function' ? f(page) : f }, { historial: true })
  const paginated  = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleClear = () => filtrar({ sucursal: 'all', tipo: 'all', precio: 5000, ofertas: false, q: '' })

  return (
    <div className={s.wrapper}>
      <div className={s.inner}>
        <div className={s.layout}>

          {/* ── SIDEBAR FILTERS ── */}
          <aside className={s.filterSidebar}>
            {/* Mobile toggle: CSS lo muestra solo en ≤768px */}
            <Button
              variant="outline"
              className={s.filterToggle}
              onClick={() => setFiltersOpen(o => !o)}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontalIcon size={16} weight="bold" />
              {filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
              <span className={s.filterToggleCount}>{filtered.length} hab.</span>
            </Button>

            <div className={`${s.filters} ${filtersOpen ? '' : s.filtersHidden}`}>
              <div className="filters">
                <div className="filters__header">
                  <span className="filters__header-title">
                    <SlidersHorizontalIcon size={15} weight="bold" aria-hidden="true" />
                    Filtros
                  </span>
                  <span className="filters__header-count">{filtered.length} resultados</span>
                </div>
                <div className="filters__body">
                  <div className="filters__section">
                    <div className="filters__section-title">Propiedad</div>
                    <Pastillas opciones={PROPIEDADES} valor={selectedSucursal} etiqueta="Propiedad"
                      onCambio={v => filtrar({ sucursal: v })} />
                  </div>

                  <Separator className="my-4" />

                  <div className="filters__section">
                    <div className="filters__section-title">Tipo de alojamiento</div>
                    <Pastillas opciones={ROOM_TYPES} valor={roomTypeFilter} etiqueta="Tipo de alojamiento"
                      onCambio={v => filtrar({ tipo: v })} />
                  </div>

                  <Separator className="my-4" />

                  <div className="filters__section">
                    <div className="filters__section-title" id="precio-max">
                      Precio máximo: MXN ${priceMax.toLocaleString()}
                    </div>
                    <Slider
                      min={1000} max={5000} step={100}
                      value={[priceMax]}
                      onValueChange={([v]) => filtrar({ precio: v })}
                      aria-labelledby="precio-max"
                    />
                    <div className="filters__range-labels">
                      <span>$1,000</span>
                      <span>$5,000</span>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* SquishSwitch (React Bits): el pulgar se estira según la velocidad */}
                  <label className="filters__switch" htmlFor="solo-ofertas">
                    <span>
                      <span className="filters__switch-titulo">Solo ofertas</span>
                      <span className="filters__switch-sub">Habitaciones con descuento</span>
                    </span>
                    <SquishSwitch
                      id="solo-ofertas"
                      checked={soloOfertas}
                      onChange={v => filtrar({ ofertas: v })}
                      width={52}
                      height={30}
                      radius={15}
                      trackColor="var(--muted)"
                      trackOnColor="var(--primary)"
                      thumbColor="var(--card)"
                      thumbOnColor="var(--primary-foreground)"
                    />
                  </label>

                  <Separator className="my-4" />

                  <Button variant="ghost" className="w-full" onClick={handleClear}>
                    Limpiar todo
                  </Button>
                </div>
              </div>
            </div>
          </aside>

          {/* ── RESULTS ── */}
          <div className={s.results}>
            <form className="search-bar" role="search" onSubmit={e => e.preventDefault()}>
              <MagnifyingGlassIcon size={18} aria-hidden="true" />
              <Input
                type="search"
                aria-label="Buscar habitación"
                className="h-10 flex-1 min-w-40 border-0 bg-transparent shadow-none focus-visible:ring-0"
                placeholder="Buscar por nombre de habitación"
                value={searchQuery}
                onChange={e => filtrar({ q: e.target.value })}
              />
              <div className="flex items-center gap-2 ml-auto">
                <span className="results-count">{sorted.length} hab.</span>
                <div className="w-52">
                  <Selector
                    ariaLabel="Ordenar"
                    value={sortBy}
                    onChange={v => set({ orden: v })}
                    opciones={[
                      { value: 'rating', label: 'Mejor valorados' },
                      { value: 'price_asc', label: 'Precio: menor a mayor' },
                      { value: 'price_desc', label: 'Precio: mayor a menor' },
                    ]}
                  />
                </div>
              </div>
            </form>

            {paginated.length === 0 ? (
              <div className="empty-state" role="status" style={{ marginTop: '24px' }}>
                <span className="empty-state__icon"><SmileySadIcon size={30} /></span>
                <div className="empty-state__title">Sin resultados</div>
                <div className="empty-state__sub">Intenta ajustar los filtros para ver más opciones.</div>
                <Button variant="outline" className="mt-2" onClick={handleClear}>Limpiar filtros</Button>
              </div>
            ) : (
              <motion.ul layout className="results-list" style={{ listStyle: 'none' }}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {paginated.map(room => (
                    <motion.li key={room.id} {...animacionItem}>
                      <RoomCard
                        room={room}
                        onSelect={onSelectRoom}
                        isFav={favorites.includes(room.id)}
                        onToggleFav={onToggleFav}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}

            {totalPages > 1 && (
              <nav className="pagination" aria-label="Paginación de resultados">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage(n => n - 1)}>
                  <ArrowLeftIcon size={14} weight="bold" /> Anterior
                </Button>
                <span className="pagination__info">Página {page} de {totalPages}</span>
                <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(n => n + 1)}>
                  Siguiente <ArrowRightIcon size={14} weight="bold" />
                </Button>
              </nav>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
