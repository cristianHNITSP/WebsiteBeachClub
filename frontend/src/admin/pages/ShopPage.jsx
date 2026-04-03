import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SHOP_DATA, SHOP_CATEGORIES, SHOP_BRANCHES } from '../../data/admin'
import SectionPanel from '../components/SectionPanel'
import ConfirmButton from '../../components/frida/ConfirmButton'
import Skeleton from '../../components/frida/Skeleton'
import { Field, Input, Select } from '../../components/frida/Field'

const LOW_STOCK_THRESHOLD = 5
const PAGE_SIZE = 6

/* ── Predefined options for category form ── */
const CAT_ICONS = [
  'restaurant', 'palette', 'spa', 'redeem', 'local_mall',
  'diamond', 'coffee', 'forest', 'beach_access', 'wine_bar',
  'cake', 'photo_camera', 'checkroom', 'volunteer_activism', 'inventory_2',
]
const CAT_COLORS = [
  { label: 'Teal',    value: '#006971' },
  { label: 'Morado',  value: '#7e469a' },
  { label: 'Dorado',  value: '#f59e0b' },
  { label: 'Naranja', value: '#d97706' },
  { label: 'Rosa',    value: '#db2777' },
  { label: 'Verde',   value: '#16a34a' },
]
const EMPTY_CAT = { key: '', icon: 'local_mall', color: '#006971' }

/* ── Animation variants ── */
const panelVariants = {
  initial: (dir) => ({ opacity: 0, x: dir * 44 }),
  animate: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
  exit:    (dir) => ({ opacity: 0, x: dir * -30, transition: { duration: 0.18, ease: 'easeIn' } }),
}
const listVariants = {
  initial: { opacity: 0, y: -18 },
  animate: { opacity: 1, y: 0,  transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.16, ease: 'easeIn' } },
}
const catFormVariants = {
  initial: { opacity: 0, y: -14 },
  animate: { opacity: 1, y: 0,  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.14, ease: 'easeIn' } },
}

/* ══════════════════════════════════════════════
   ProductForm
   ══════════════════════════════════════════════ */
function ProductForm({ initial, categories, onSave, onBack }) {
  const [form, setForm] = useState({
    name:        initial.name        ?? '',
    price:       initial.price != null ? String(initial.price) : '',
    stock:       initial.stock != null ? String(initial.stock) : '',
    category:    initial.category    ?? (categories[0]?.key ?? ''),
    branch:      initial.branch      ?? SHOP_BRANCHES[0].id,
    description: initial.description ?? '',
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const isNew  = !initial.id
  const dirty  = Object.keys(form).some(k => String(form[k]) !== String(initial[k] ?? ''))
  const valid  = form.name.trim() && form.price && form.stock
  const cat    = categories.find(c => c.key === form.category)
  const br     = SHOP_BRANCHES.find(b => b.id === form.branch)

  return (
    <SectionPanel
      eyebrow="Punto de Venta"
      title={isNew ? <>Nuevo <em>Producto</em></> : <>Editar <em>Producto</em></>}
      subtitle={isNew
        ? 'Completa los datos para agregar el producto al inventario.'
        : `Editando "${initial.name}".`}
      onBack={onBack}
      dirty={dirty}
      actions={
        <button
          className="btn-primary"
          onClick={() => onSave({ ...form, price: Number(form.price), stock: Number(form.stock) })}
          disabled={!valid}
          style={{ opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>save</span>
          {isNew ? 'Crear producto' : 'Guardar cambios'}
        </button>
      }
    >
      <div className="user-form-grid">
        <Field label="Nombre del producto">
          <Input placeholder="Ej. Miel de Mangrove" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Precio (MXN)">
          <Input type="number" placeholder="280" value={form.price} onChange={set('price')} min="0" />
        </Field>
        <Field label="Stock disponible">
          <Input type="number" placeholder="24" value={form.stock} onChange={set('stock')} min="0" />
        </Field>
        <Field label="Categoría">
          <Select value={form.category} onChange={set('category')}>
            {categories.map(c => <option key={c.key} value={c.key}>{c.key}</option>)}
          </Select>
        </Field>
        <Field label="Sucursal">
          <Select value={form.branch} onChange={set('branch')}>
            {SHOP_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name} — {b.location}</option>)}
          </Select>
        </Field>
        <Field label="Descripción (opcional)" style={{ gridColumn: '1 / -1' }}>
          <Input
            placeholder="Breve descripción del producto..."
            value={form.description}
            onChange={set('description')}
          />
        </Field>
      </div>

      <div className="user-form-role-hint">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: cat ? `${cat.color}22` : 'var(--surface-container)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: cat?.color ?? 'var(--primary)' }}>
              {cat?.icon ?? 'category'}
            </span>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '4px' }}>
              {form.category || 'Sin categoría'} · {br?.name ?? form.branch}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--on-surface-var)', lineHeight: 1.55 }}>
              Se registrará en <strong>{br?.name}</strong> ({br?.location}) bajo la categoría <strong>{form.category}</strong>.
            </div>
          </div>
        </div>
      </div>
    </SectionPanel>
  )
}

/* ══════════════════════════════════════════════
   CategoryForm — inline inside categories panel
   ══════════════════════════════════════════════ */
function CategoryForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...initial })
  const set    = k => e   => setForm(f => ({ ...f, [k]: e.target.value }))
  const setVal = k => val => setForm(f => ({ ...f, [k]: val }))
  const isNew  = !initial._editing
  const valid  = form.key.trim()

  return (
    <div className="shop-cat-form">
      <div className="shop-cat-form__label">
        {isNew ? '+ Nueva categoría' : 'Editar categoría'}
      </div>

      <div className="user-form-grid" style={{ marginBottom: '16px' }}>
        <Field label="Nombre">
          <Input placeholder="Ej. Gastronomía" value={form.key} onChange={set('key')} />
        </Field>
        <Field label="Color">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '6px 0' }}>
            {CAT_COLORS.map(c => (
              <button
                key={c.value}
                title={c.label}
                onClick={() => setVal('color')(c.value)}
                style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: c.value,
                  border: form.color === c.value ? '3px solid var(--on-surface)' : '3px solid transparent',
                  cursor: 'pointer', outline: 'none', transition: 'border 0.15s',
                  boxSizing: 'border-box',
                }}
              />
            ))}
          </div>
        </Field>
      </div>

      <Field label="Icono" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
          {CAT_ICONS.map(icon => (
            <button
              key={icon}
              title={icon}
              onClick={() => setVal('icon')(icon)}
              style={{
                width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
                background: form.icon === icon ? `${form.color}22` : 'var(--surface-container)',
                border: form.icon === icon ? `1.5px solid ${form.color}` : '1.5px solid transparent',
                cursor: 'pointer', display: 'grid', placeItems: 'center',
                color: form.icon === icon ? form.color : 'var(--outline)',
                transition: 'all 0.15s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icon}</span>
            </button>
          ))}
        </div>
      </Field>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 18px', borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--outline-var)', background: 'transparent',
            color: 'var(--on-surface)', fontFamily: 'var(--font-body)',
            fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container-low)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          Cancelar
        </button>
        <button
          className="btn-primary"
          onClick={() => valid && onSave(form)}
          disabled={!valid}
          style={{ height: '36px', padding: '0 20px', opacity: valid ? 1 : 0.5 }}
        >
          {isNew ? 'Crear' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   CategoriesPanel
   ══════════════════════════════════════════════ */
function CategoriesPanel({ categories, products, onSave, onDelete, onBack }) {
  const [showForm,   setShowForm]   = useState(false)
  const [editingCat, setEditingCat] = useState(null)

  const countProducts = key => products.filter(p => p.category === key).length

  const handleSave = (form) => {
    onSave(editingCat?.key ?? null, form)
    setShowForm(false)
    setEditingCat(null)
  }

  return (
    <SectionPanel
      eyebrow="Boutique"
      title={<>Gestión de <em>Categorías</em></>}
      subtitle="Crea, edita y elimina las categorías del catálogo."
      onBack={onBack}
      dirty={showForm || editingCat !== null}
      actions={
        !showForm && !editingCat ? (
          <button className="btn-primary" onClick={() => { setShowForm(true); setEditingCat(null) }}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
            Nueva categoría
          </button>
        ) : null
      }
    >
      <AnimatePresence mode="wait">
        {showForm && (
          <motion.div key="new-cat" variants={catFormVariants} initial="initial" animate="animate" exit="exit">
            <CategoryForm initial={EMPTY_CAT} onSave={handleSave} onCancel={() => setShowForm(false)} />
          </motion.div>
        )}
        {editingCat && (
          <motion.div key={`edit-${editingCat.key}`} variants={catFormVariants} initial="initial" animate="animate" exit="exit">
            <CategoryForm
              initial={{ ...editingCat, _editing: true }}
              onSave={handleSave}
              onCancel={() => setEditingCat(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {categories.map(cat => {
          const count = countProducts(cat.key)
          return (
            <div key={cat.key} className="shop-cat-row">
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: `${cat.color}22`,
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: cat.color }}>
                  {cat.icon}
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1rem', color: 'var(--on-surface)' }}>
                  {cat.key}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-var)', marginTop: '2px' }}>
                  {count} producto{count !== 1 ? 's' : ''}
                </div>
              </div>

              <div style={{
                padding: '4px 12px', borderRadius: 'var(--radius-full)',
                background: `${cat.color}18`, color: cat.color,
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
                display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{cat.icon}</span>
                {cat.key}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="btn-outline"
                  style={{ height: '32px', padding: '0 14px', fontSize: '11px' }}
                  onClick={() => { setEditingCat(cat); setShowForm(false) }}
                >
                  Editar
                </button>
                <ConfirmButton
                  onConfirm={() => onDelete(cat.key)}
                  label={count > 0 ? `Afecta ${count} producto${count !== 1 ? 's' : ''}.` : '¿Eliminar esta categoría?'}
                  confirmLabel="Eliminar"
                  cancelLabel="Cancelar"
                  align="right"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>delete</span>
                </ConfirmButton>
              </div>
            </div>
          )
        })}

        {categories.length === 0 && (
          <div style={{
            padding: '48px', textAlign: 'center',
            color: 'var(--outline)', fontFamily: 'var(--font-body)', fontSize: '13px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}>category</span>
            Sin categorías. Crea una para comenzar.
          </div>
        )}
      </div>
    </SectionPanel>
  )
}

/* ══════════════════════════════════════════════
   ProductCard
   ══════════════════════════════════════════════ */
function ProductCard({ product, cat, branchName, onEdit, onDelete, index }) {
  const isLow = product.stock <= LOW_STOCK_THRESHOLD
  return (
    <motion.div
      className="shop-pcard"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
    >
      <div className="shop-pcard__img">
        <img src={product.img} alt={product.name} />
        <div
          className="shop-pcard__cat-badge"
          style={{ background: `${cat?.color ?? '#006971'}cc` }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>{cat?.icon ?? 'category'}</span>
          {product.category}
        </div>
        <div
          className="shop-pcard__stock-badge"
          style={{ background: isLow ? 'rgba(186,26,26,0.85)' : 'rgba(22,163,74,0.85)' }}
        >
          {product.stock} uds{isLow ? ' ⚠' : ''}
        </div>
      </div>

      <div className="shop-pcard__body">
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--on-surface-var)', marginBottom: '4px',
          }}>
            {branchName}
          </div>
          <div style={{
            fontFamily: 'var(--font-headline)', fontSize: '1.05rem',
            color: 'var(--on-surface)', lineHeight: 1.25,
          }}>
            {product.name}
          </div>
          <div style={{
            fontFamily: 'var(--font-headline)', fontSize: '1.3rem',
            color: cat?.color ?? 'var(--primary)', marginTop: '8px',
          }}>
            MXN ${product.price.toLocaleString()}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button
            className="btn-outline"
            style={{ flex: 1, justifyContent: 'center', height: '36px', fontSize: '11px' }}
            onClick={onEdit}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
            Editar
          </button>
          <ConfirmButton
            onConfirm={onDelete}
            label="¿Eliminar este producto?"
            confirmLabel="Eliminar"
            cancelLabel="Cancelar"
            align="right"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>delete</span>
          </ConfirmButton>
        </div>
      </div>
    </motion.div>
  )
}

function SkeletonProductCard() {
  return (
    <div className="shop-pcard">
      <Skeleton variant="rect" style={{ height: '200px', borderRadius: 0 }} />
      <div className="shop-pcard__body">
        <Skeleton variant="text" width="55px" height="10px" />
        <Skeleton variant="text" width="75%" height="17px" style={{ marginTop: '8px' }} />
        <Skeleton variant="text" width="42%" height="22px" style={{ marginTop: '10px' }} />
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <Skeleton variant="text" style={{ flex: 1, height: '36px', borderRadius: 'var(--radius-full)' }} />
          <Skeleton variant="circle" width="34px" height="34px" />
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   ShopPage — main export
   ══════════════════════════════════════════════ */
export default function ShopPage() {
  const [products,     setProducts]     = useState(SHOP_DATA)
  const [categories,   setCategories]   = useState(SHOP_CATEGORIES)
  const [search,       setSearch]       = useState('')
  const [catFilter,    setCatFilter]    = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [page,         setPage]         = useState(1)
  const [loading,      setLoading]      = useState(true)
  const [view,         setView]         = useState('list')
  const [editTarget,   setEditTarget]   = useState(null)
  const [direction,    setDirection]    = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1800)
    return () => clearTimeout(t)
  }, [])

  /* Filters */
  const filtered = products.filter(p => {
    const matchesCat    = catFilter    === 'all' || p.category === catFilter
    const matchesBranch = branchFilter === 'all' || p.branch   === branchFilter
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesBranch && matchesSearch
  })

  const totalPages    = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage      = Math.min(page, totalPages)
  const pagedProducts = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  /* Sidebar stats */
  const ctxProducts = branchFilter === 'all' ? products : products.filter(p => p.branch === branchFilter)
  const lowStock    = ctxProducts.filter(p => p.stock <= LOW_STOCK_THRESHOLD)
  const totalValue  = ctxProducts.reduce((acc, p) => acc + p.price * p.stock, 0)

  const goTo = (nextView, target = null) => {
    setDirection(nextView === 'list' ? -1 : 1)
    setEditTarget(target)
    setView(nextView)
  }

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [view])

  /* Handlers */
  const handleSaveProduct = (form) => {
    if (editTarget?.id) {
      setProducts(prev => prev.map(p => p.id === editTarget.id ? { ...p, ...form } : p))
    } else {
      setProducts(prev => [...prev, {
        id: Date.now(), ...form,
        img: `https://placehold.co/400x320/003b41/006971?text=${encodeURIComponent(form.name.slice(0, 18))}`,
      }])
    }
    goTo('list')
  }

  const handleRemoveProduct = (id) => setProducts(prev => prev.filter(p => p.id !== id))

  const handleSaveCat = (oldKey, newCat) => {
    if (oldKey && oldKey !== newCat.key) {
      setProducts(prev => prev.map(p => p.category === oldKey ? { ...p, category: newCat.key } : p))
    }
    if (oldKey) {
      setCategories(prev => prev.map(c => c.key === oldKey ? newCat : c))
    } else {
      setCategories(prev => [...prev, newCat])
    }
  }
  const handleDeleteCat = (key) => setCategories(prev => prev.filter(c => c.key !== key))

  const getCat    = key => categories.find(c => c.key === key)
  const getBranch = id  => SHOP_BRANCHES.find(b => b.id === id)

  return (
    <AnimatePresence mode="wait" custom={direction}>

      {/* ── Product form ── */}
      {(view === 'new' || view === 'edit') && (
        <motion.div key={view} custom={direction} variants={panelVariants} initial="initial" animate="animate" exit="exit">
          <ProductForm
            initial={view === 'edit'
              ? editTarget
              : { category: categories[0]?.key ?? '', branch: SHOP_BRANCHES[0].id }}
            categories={categories}
            onSave={handleSaveProduct}
            onBack={() => goTo('list')}
          />
        </motion.div>
      )}

      {/* ── Categories panel ── */}
      {view === 'categories' && (
        <motion.div key="categories" custom={direction} variants={panelVariants} initial="initial" animate="animate" exit="exit">
          <CategoriesPanel
            categories={categories}
            products={products}
            onSave={handleSaveCat}
            onDelete={handleDeleteCat}
            onBack={() => goTo('list')}
          />
        </motion.div>
      )}

      {/* ── List view ── */}
      {view === 'list' && (
        <motion.div key="list" variants={listVariants} initial="initial" animate="animate" exit="exit">
          <div>
            {/* Header */}
            <div className="admin-page-header">
              <div>
                <span className="admin-page-eyebrow">Punto de Venta</span>
                <h1 className="admin-page-title">Boutique &<br /><em>Inventario</em></h1>
              </div>
              <div className="admin-page-header-actions">
                <div className="admin-page-header-actions-row">
                  <button className="btn-outline" onClick={() => goTo('categories')}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>category</span>
                    Categorías
                  </button>
                  <button className="btn-primary" onClick={() => goTo('new')}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
                    Nuevo producto
                  </button>
                </div>
              </div>
            </div>

            {/* Search + category chips */}
            <div className="users-toolbar" style={{ marginBottom: '12px' }}>
              <div className="users-search">
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--outline)', flexShrink: 0 }}>search</span>
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  style={{
                    border: 'none', background: 'transparent', outline: 'none',
                    fontFamily: 'var(--font-body)', fontSize: '13px',
                    color: 'var(--on-surface)', width: '100%',
                  }}
                />
                {search && (
                  <button
                    onClick={() => { setSearch(''); setPage(1) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)', display: 'flex', padding: 0 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                  </button>
                )}
              </div>
              <div className="users-filters">
                {['all', ...categories.map(c => c.key)].map(c => (
                  <button
                    key={c}
                    onClick={() => { setCatFilter(c); setPage(1) }}
                    className={`users-filter-chip${catFilter === c ? ' users-filter-chip--active' : ''}`}
                  >
                    {c === 'all' ? 'Todos' : c}
                  </button>
                ))}
              </div>
            </div>

            {/* Branch filter */}
            <div className="users-filters" style={{ marginBottom: '28px', alignItems: 'center' }}>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: 'var(--on-surface-var)', display: 'flex', alignItems: 'center', gap: '5px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>store</span>
                Sucursal:
              </span>
              {['all', ...SHOP_BRANCHES.map(b => b.id)].map(bid => (
                <button
                  key={bid}
                  onClick={() => { setBranchFilter(bid); setPage(1) }}
                  className={`users-filter-chip${branchFilter === bid ? ' users-filter-chip--active' : ''}`}
                >
                  {bid === 'all' ? 'Todas' : (getBranch(bid)?.name ?? bid)}
                </button>
              ))}
            </div>

            {/* 2-col layout */}
            <div className="shop-layout">

              {/* Product cards */}
              <div>
                <div className="shop-cards-grid">
                  {loading
                    ? Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonProductCard key={i} />)
                    : pagedProducts.length === 0
                      ? (
                        <div className="shop-empty-state">
                          <span className="material-symbols-outlined" style={{ fontSize: '44px', display: 'block', marginBottom: '12px' }}>
                            inventory_2
                          </span>
                          <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--on-surface-var)' }}>
                            Sin productos
                          </div>
                          <div>No se encontraron productos con ese criterio.</div>
                        </div>
                      )
                      : <>
                        {pagedProducts.map((p, i) => (
                          <ProductCard
                            key={p.id}
                            product={p}
                            cat={getCat(p.category)}
                            branchName={getBranch(p.branch)?.name ?? p.branch}
                            index={i}
                            onEdit={() => goTo('edit', {
                              ...p,
                              price: String(p.price),
                              stock: String(p.stock),
                              description: p.description ?? '',
                            })}
                            onDelete={() => handleRemoveProduct(p.id)}
                          />
                        ))}
                        {pagedProducts.length > 0 && pagedProducts.length < PAGE_SIZE &&
                          Array.from({ length: PAGE_SIZE - pagedProducts.length }).map((_, i) => (
                            <div key={`ghost-${i}`} className="shop-pcard" style={{ visibility: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
                              <div className="shop-pcard__img" />
                              <div className="shop-pcard__body" style={{ flex: 1 }} />
                            </div>
                          ))
                        }
                      </>
                  }
                </div>

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                  <div className="users-pagination">
                    <span className="users-pagination__info">
                      {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length}
                    </span>
                    <div className="users-pagination__controls">
                      <button className="users-pagination__btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                        <button key={n} onClick={() => setPage(n)} className={`users-pagination__btn${n === safePage ? ' users-pagination__btn--active' : ''}`}>
                          {n}
                        </button>
                      ))}
                      <button className="users-pagination__btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="shop-sidebar">

                {/* Inventory health */}
                {loading ? (
                  <div className="shop-sidebar-card">
                    <Skeleton variant="text" width="150px" height="18px" style={{ marginBottom: '18px' }} />
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--outline-var)' : 'none' }}>
                        <Skeleton variant="text" width="100px" height="12px" />
                        <Skeleton variant="text" width="50px" height="12px" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="shop-sidebar-card">
                    <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1.1rem', color: 'var(--on-surface)', marginBottom: '16px' }}>
                      Estado del Inventario
                    </div>

                    {lowStock.length > 0 && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--error)', marginBottom: '8px' }}>
                          Stock crítico
                        </div>
                        {lowStock.map((item, i) => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < lowStock.length - 1 ? '1px solid var(--outline-var)' : 'none' }}>
                            <div>
                              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', color: 'var(--on-surface)' }}>{item.name}</div>
                              <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--error)', fontWeight: 600, marginTop: '1px' }}>Solo {item.stock} uds</div>
                            </div>
                            <button
                              className="btn-outline"
                              style={{ height: '26px', padding: '0 10px', fontSize: '10px', borderColor: 'rgba(186,26,26,0.25)', color: 'var(--error)' }}
                              onClick={() => goTo('edit', { ...item, price: String(item.price), stock: String(item.stock), description: item.description ?? '' })}
                            >
                              Reponer
                            </button>
                          </div>
                        ))}
                        <div style={{ borderTop: '1px solid var(--outline-var)', marginTop: '4px', paddingTop: '12px' }} />
                      </div>
                    )}

                    {[
                      { label: 'Total productos',    value: ctxProducts.length },
                      { label: 'Valor inventario',   value: `$${totalValue.toLocaleString()}` },
                      { label: 'Stock crítico',      value: lowStock.length },
                      { label: 'Categorías activas', value: categories.length },
                    ].map((stat, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < 3 ? '1px solid var(--outline-var)' : 'none' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-var)', fontWeight: 600 }}>{stat.label}</span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface)', fontWeight: 700 }}>{stat.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Category breakdown */}
                {loading ? (
                  <div className="shop-sidebar-card">
                    <Skeleton variant="text" width="100px" height="10px" style={{ marginBottom: '14px' }} />
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <Skeleton variant="text" width="80px" height="12px" />
                          <Skeleton variant="text" width="30px" height="12px" />
                        </div>
                        <Skeleton variant="text" height="4px" style={{ borderRadius: '2px' }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="shop-sidebar-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--outline)' }}>
                        Por categoría
                      </div>
                      <button
                        onClick={() => goTo('categories')}
                        style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: 0 }}
                      >
                        Gestionar
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>arrow_forward</span>
                      </button>
                    </div>
                    {categories.map(cat => {
                      const count = ctxProducts.filter(p => p.category === cat.key).length
                      const pct   = ctxProducts.length ? Math.round((count / ctxProducts.length) * 100) : 0
                      return (
                        <div key={cat.key} style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: cat.color }}>{cat.icon}</span>
                              {cat.key}
                            </span>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--outline)', fontWeight: 600 }}>{count}</span>
                          </div>
                          <div style={{ height: '4px', borderRadius: '2px', background: 'var(--surface-container)' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Branch breakdown */}
                {!loading && (
                  <div className="shop-sidebar-card">
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--outline)', marginBottom: '12px' }}>
                      Por sucursal
                    </div>
                    {SHOP_BRANCHES.map(br => {
                      const count = products.filter(p => p.branch === br.id).length
                      const pct   = products.length ? Math.round((count / products.length) * 100) : 0
                      return (
                        <div key={br.id} style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <div>
                              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--on-surface)' }}>{br.name}</div>
                              <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--on-surface-var)' }}>{br.location}</div>
                            </div>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--outline)', fontWeight: 600, alignSelf: 'center' }}>{count} prods.</span>
                          </div>
                          <div style={{ height: '4px', borderRadius: '2px', background: 'var(--surface-container)' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: '2px' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
