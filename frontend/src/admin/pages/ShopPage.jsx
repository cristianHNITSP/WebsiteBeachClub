import { useState } from 'react'
import { SHOP_DATA } from '../../data/admin'

const LOW_STOCK_THRESHOLD = 5

export default function ShopPage() {
  const [searchProduct, setSearchProduct] = useState('')
  const [catFilter, setCatFilter] = useState('all')

  const categories = [...new Set(SHOP_DATA.map(p => p.category))]
  const visibleProducts = SHOP_DATA.filter(p => {
    if (catFilter !== 'all' && p.category !== catFilter) return false
    if (searchProduct && !p.name.toLowerCase().includes(searchProduct.toLowerCase())) return false
    return true
  })

  const lowStockItems = SHOP_DATA.filter(p => p.stock <= LOW_STOCK_THRESHOLD)
  const totalRevenue = SHOP_DATA.reduce((acc, p) => acc + p.price * p.stock, 0)

  return (
    <div>
      {/* Page header */}
      <div className="admin-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className="admin-page-eyebrow">Inventario boutique</span>
            <h1 className="admin-page-title">
              Inventario de<br />
              <em>La Boutique</em>
            </h1>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'var(--surface-container)', border: '1px solid var(--outline-var)',
                borderRadius: 'var(--radius-full)', padding: '8px 16px', flex: '1', minWidth: '200px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--outline)' }}>search</span>
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={searchProduct}
                  onChange={e => setSearchProduct(e.target.value)}
                  style={{
                    border: 'none', background: 'transparent', outline: 'none',
                    fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--on-surface)', width: '100%',
                  }}
                />
              </div>
              {['all', ...categories].map(c => (
                <button
                  key={c}
                  onClick={() => setCatFilter(c)}
                  style={{
                    padding: '8px 16px', borderRadius: 'var(--radius-full)',
                    border: `1.5px solid ${catFilter === c ? 'var(--primary)' : 'var(--outline-var)'}`,
                    background: catFilter === c ? 'rgba(0,105,113,0.10)' : 'transparent',
                    color: catFilter === c ? 'var(--primary)' : 'var(--on-surface-var)',
                    fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {c === 'all' ? 'Todos' : c}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
            Agregar producto
          </button>
        </div>
      </div>

      <div className="shop-grid">
        {/* Products */}
        <div>
          <div className="shop-products-grid">
            {/* Hero product */}
            <div className="shop-hero">
              <img
                src="https://placehold.co/1200x450/003b41/006971?text=Boutique+Frida"
                alt="Boutique Frida"
              />
              <div className="shop-hero__info">
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: '700', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--tertiary)', marginBottom: '4px' }}>
                    Colección destacada
                  </div>
                  <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1.375rem', color: 'var(--on-surface)' }}>
                    Productos Artesanales Yucatecos
                  </div>
                </div>
                <button className="btn-primary">
                  Ver todo el catálogo
                </button>
              </div>
            </div>

            {/* Product cards */}
            {visibleProducts.map((product) => (
              <div key={product.id} className="shop-product-card">
                <div className="shop-product-card__image">
                  <img src={product.img} alt={product.name} />
                  {product.stock <= LOW_STOCK_THRESHOLD && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'var(--error)',
                      color: '#fff',
                      borderRadius: 'var(--radius-full)',
                      padding: '3px 10px',
                      fontSize: '10px',
                      fontWeight: '700',
                      letterSpacing: '0.05em',
                    }}>
                      Stock bajo
                    </div>
                  )}
                </div>
                <div className="shop-product-card__body">
                  <div className="shop-product-card__title">{product.name}</div>
                  <div className="shop-product-card__sub">{product.category}</div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px',
                  }}>
                    <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1.375rem', color: 'var(--on-surface)' }}>
                      MXN ${product.price.toLocaleString()}
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: product.stock <= LOW_STOCK_THRESHOLD ? 'var(--error)' : 'var(--on-surface-variant)', fontWeight: '700' }}>
                      {product.stock} en stock
                    </div>
                  </div>
                  <div className="shop-product-card__footer">
                    <button className="shop-product-card__edit">
                      Editar
                    </button>
                    <button className="shop-product-card__more" title="Más opciones">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>more_horiz</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar panel */}
        <div className="shop-panel">
          {/* Inventory health */}
          <div className="inventory-health">
            <div className="inventory-health__title">Estado del Inventario</div>

            {lowStockItems.length > 0 ? (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '10px',
                  fontWeight: '700',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--error)',
                  marginBottom: '12px',
                }}>
                  ⚠ Stock crítico
                </div>
                {lowStockItems.map(item => (
                  <div key={item.id} className="inventory-alert">
                    <div>
                      <div style={{ fontFamily: 'var(--font-body)', fontWeight: '700', fontSize: '13px', color: 'var(--on-surface)' }}>
                        {item.name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--error)', fontWeight: '600', marginTop: '2px' }}>
                        Solo {item.stock} unidades
                      </div>
                    </div>
                    <button className="btn-outline" style={{ height: '30px', padding: '0 12px', fontSize: '10px', borderColor: 'rgba(186,26,26,0.2)', color: 'var(--error)' }}>
                      Reponer
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '16px', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', marginBottom: '20px', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#16a34a', fontSize: '24px' }}>check_circle</span>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>
                  Todo el stock en niveles óptimos
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--surface-container-highest)', paddingTop: '20px' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--outline)', marginBottom: '16px' }}>
                Resumen
              </div>
              {[
                { label: 'Total productos', value: SHOP_DATA.length },
                { label: 'Valor en inventario', value: `MXN $${totalRevenue.toLocaleString()}` },
                { label: 'Productos con stock bajo', value: lowStockItems.length },
                { label: 'Categorías', value: [...new Set(SHOP_DATA.map(p => p.category))].length },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: i < 3 ? '1px solid var(--surface-container-highest)' : 'none',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--on-surface-variant)', fontWeight: '600' }}>
                    {stat.label}
                  </span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--on-surface)', fontWeight: '700' }}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="admin-card">
            <span className="admin-card__label">Por categoría</span>
            {[...new Set(SHOP_DATA.map(p => p.category))].map((cat, i) => {
              const items = SHOP_DATA.filter(p => p.category === cat)
              const total = items.length
              const pct = Math.round((total / SHOP_DATA.length) * 100)
              return (
                <div key={i} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: '700', color: 'var(--on-surface)' }}>
                      {cat}
                    </span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--outline)', fontWeight: '600' }}>
                      {total} producto{total !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '2px', background: 'var(--surface-container-highest)' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, var(--surface-tint), var(--secondary))',
                      borderRadius: '2px',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick actions */}
          <div className="admin-card admin-card--primary">
            <span className="admin-card__label">Acciones rápidas</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {[
                { icon: 'download', label: 'Exportar inventario' },
                { icon: 'qr_code', label: 'Generar QR catálogo' },
                { icon: 'print', label: 'Imprimir lista de precios' },
              ].map((action, i) => (
                <button
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#fff',
                    letterSpacing: '0.05em',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
