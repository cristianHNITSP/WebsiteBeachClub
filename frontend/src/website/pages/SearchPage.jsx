import { useState } from 'react'
import { SUCURSALES } from '../../data/rooms'
import RoomCard from '../components/RoomCard'
import s from './SearchPage.module.css'

const ITEMS_PER_PAGE = 4

export default function SearchPage({ onSelectRoom, rooms, favorites, onToggleFav }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSucursal, setSelectedSucursal] = useState('all')
  const [priceMax, setPriceMax] = useState(5000)
  const [roomTypeFilter, setRoomTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('rating')
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const roomTypes = [
    { key: 'all',      label: 'Todos' },
    { key: 'suite',    label: 'Suites' },
    { key: 'cabaña',   label: 'Cabañas' },
    { key: 'villa',    label: 'Villas' },
    { key: 'familiar', label: 'Familiar' },
    { key: 'estudio',  label: 'Estudio' },
  ]

  const filtered = rooms.filter(r => {
    if (selectedSucursal !== 'all' && r.location !== selectedSucursal) return false
    if (r.price > priceMax) return false
    if (roomTypeFilter !== 'all' && r.roomType !== roomTypeFilter) return false
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
  const paginated  = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleClear = () => {
    setSelectedSucursal('all')
    setPriceMax(5000)
    setRoomTypeFilter('all')
    setPage(1)
  }

  return (
    <div className={s.wrapper}>
      <div className={s.inner}>
        <div className={s.layout}>

          {/* ── SIDEBAR FILTERS ── */}
          <aside className={s.filterSidebar}>
            {/* Mobile toggle — CSS shows this only on ≤768px */}
            <button
              className={s.filterToggle}
              onClick={() => setFiltersOpen(o => !o)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>tune</span>
              {filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
              <span className={s.filterToggleCount}>{filtered.length} hab.</span>
            </button>

            {/* Filters panel — collapsible on mobile, always visible on desktop via CSS */}
            <div className={`${s.filters} ${filtersOpen ? '' : s.filtersHidden}`}>
              <div className="filters">
                <div className="filters__header">
                  <span className="filters__header-title">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', marginRight: '6px' }}>tune</span>
                    Filtros
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: '600' }}>
                    {filtered.length} resultados
                  </span>
                </div>
                <div className="filters__body">
                  {/* Propiedad */}
                  <div className="filters__section">
                    <div className="filters__section-title">Propiedad</div>
                    {[{ key: 'all', label: 'Todas las propiedades' }, ...SUCURSALES.map(sc => ({ key: sc.key, label: sc.name }))].map(opt => (
                      <button
                        key={opt.key}
                        className={`filter-chip${selectedSucursal === opt.key ? ' filter-chip--active' : ''}`}
                        onClick={() => { setSelectedSucursal(opt.key); setPage(1) }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="filters__divider" />

                  {/* Tipo */}
                  <div className="filters__section">
                    <div className="filters__section-title">Tipo de alojamiento</div>
                    {roomTypes.map(rt => (
                      <button
                        key={rt.key}
                        className={`filter-chip${roomTypeFilter === rt.key ? ' filter-chip--active' : ''}`}
                        onClick={() => { setRoomTypeFilter(rt.key); setPage(1) }}
                      >
                        {rt.label}
                      </button>
                    ))}
                  </div>

                  <div className="filters__divider" />

                  {/* Precio */}
                  <div className="filters__section">
                    <div className="filters__section-title">
                      Precio máximo: MXN ${priceMax.toLocaleString()}
                    </div>
                    <input
                      type="range"
                      className="filter-range"
                      min="1000" max="5000" step="100"
                      value={priceMax}
                      onChange={e => { setPriceMax(Number(e.target.value)); setPage(1) }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--outline)' }}>$1,000</span>
                      <span style={{ fontSize: '10px', color: 'var(--outline)' }}>$5,000</span>
                    </div>
                  </div>

                  <div className="filters__divider" />

                  <button className="filters__clear-btn" onClick={handleClear}>
                    Limpiar todo
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* ── RESULTS ── */}
          <div className={s.results}>
            {/* Search bar */}
            <form className="search-bar" role="search" onSubmit={e => e.preventDefault()}>
              <span className="material-symbols-outlined" style={{ color: 'var(--outline)', fontSize: '18px' }}>search</span>
              <input
                type="text"
                className="search-input"
                placeholder="Buscar por nombre de habitación..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                <span className="results-count">{sorted.length} hab.</span>
                <select
                  className="sort-select"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="rating">Mejor valorados</option>
                  <option value="price_asc">Precio: menor a mayor</option>
                  <option value="price_desc">Precio: mayor a menor</option>
                </select>
              </div>
            </form>

            {/* Results list */}
            {paginated.length === 0 ? (
              <div className="empty-state" role="status" style={{ marginTop: '40px' }}>
                <span className="empty-state__icon material-symbols-outlined">search_off</span>
                <div className="empty-state__title">Sin resultados</div>
                <div className="empty-state__sub">Intenta ajustar los filtros para ver más opciones.</div>
              </div>
            ) : (
              <ul className="results-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {paginated.map(room => (
                  <li key={room.id}>
                    <RoomCard
                      room={room}
                      onSelect={onSelectRoom}
                      isFav={favorites.includes(room.id)}
                      onToggleFav={onToggleFav}
                    />
                  </li>
                ))}
              </ul>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="pagination" aria-label="Paginación de resultados">
                <button className="pagination__btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  ← Anterior
                </button>
                <span className="pagination__info">Página {page} de {totalPages}</span>
                <button className="pagination__btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  Siguiente →
                </button>
              </nav>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
