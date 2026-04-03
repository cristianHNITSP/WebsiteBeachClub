import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SALES_DATA, REFUNDS_DATA, SHOP_BRANCHES, SHOP_DATA } from '../../data/admin'
import SectionPanel from '../components/SectionPanel'
import ConfirmButton from '../../components/frida/ConfirmButton'
import Skeleton from '../../components/frida/Skeleton'
import DataTable from '../../components/frida/DataTable'
import { Field, Input, Select } from '../../components/frida/Field'

const PAGE_SIZE = 8

const PAYMENT_METHODS = [
  { key: 'card',     label: 'Tarjeta',       icon: 'credit_card'     },
  { key: 'cash',     label: 'Efectivo',      icon: 'payments'        },
  { key: 'transfer', label: 'Transferencia', icon: 'account_balance' },
]

const SALE_STATUSES = [
  { key: 'completed', label: 'Completado', color: '#16a34a' },
  { key: 'pending',   label: 'Pendiente',  color: '#d97706' },
  { key: 'refunded',  label: 'Devuelto',   color: '#ba1a1a' },
  { key: 'partial',   label: 'Parcial',    color: '#7e469a' },
]

const REFUND_STATUSES = [
  { key: 'pending',  label: 'Pendiente', color: '#d97706' },
  { key: 'approved', label: 'Aprobado',  color: '#16a34a' },
  { key: 'rejected', label: 'Rechazado', color: '#ba1a1a' },
]

const calcTotal = (items) => items.reduce((sum, i) => sum + i.price * i.qty, 0)

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
const inlineFormVariants = {
  initial: { opacity: 0, y: -14 },
  animate: { opacity: 1, y: 0,  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.14, ease: 'easeIn' } },
}

/* ── Helpers ── */
function StatusBadge({ statusKey, statuses }) {
  const s = statuses.find(st => st.key === statusKey)
  if (!s) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: 'var(--radius-full)',
      background: `${s.color}18`, color: s.color,
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}

function PaymentBadge({ method }) {
  const m = PAYMENT_METHODS.find(p => p.key === method)
  if (!m) return <span>{method}</span>
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-var)',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{m.icon}</span>
      {m.label}
    </span>
  )
}

/* ══════════════════════════════════════════════
   ItemsEditor — search + cart with qty controls
   ══════════════════════════════════════════════ */
function ItemsEditor({ items, branch, onAdd, onRemove, onQtyChange }) {
  const [search, setSearch] = useState('')

  const available = SHOP_DATA.filter(p => !branch || p.branch === branch)
  const shown     = search.trim()
    ? available.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : available

  return (
    <div className="shop-cat-form" style={{ marginBottom: '16px' }}>
      <div className="shop-cat-form__label">Productos de la venta</div>

      {/* ── Cart items ── */}
      {items.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 0', borderBottom: '1px solid var(--outline-var)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--on-surface-var)', marginTop: '1px' }}>
                  ${item.price.toLocaleString()} c/u ·{' '}
                  <strong style={{ color: 'var(--on-surface)' }}>${(item.qty * item.price).toLocaleString()}</strong>
                </div>
              </div>

              {/* qty − n + */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <button
                  onClick={() => onQtyChange(i, item.qty - 1)}
                  disabled={item.qty <= 1}
                  style={{
                    width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                    border: '1.5px solid var(--outline-var)', background: 'transparent',
                    color: 'var(--on-surface-var)', cursor: item.qty > 1 ? 'pointer' : 'not-allowed',
                    display: 'grid', placeItems: 'center', opacity: item.qty <= 1 ? 0.3 : 1,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>remove</span>
                </button>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--on-surface)', minWidth: '20px', textAlign: 'center' }}>
                  {item.qty}
                </span>
                <button
                  onClick={() => onQtyChange(i, item.qty + 1)}
                  style={{
                    width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                    border: '1.5px solid var(--outline-var)', background: 'transparent',
                    color: 'var(--on-surface-var)', cursor: 'pointer',
                    display: 'grid', placeItems: 'center', transition: 'border-color 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--outline-var)'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                </button>
              </div>

              <button
                onClick={() => onRemove(i)}
                style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  border: 'none', background: 'rgba(186,26,26,0.1)', color: 'var(--error)',
                  cursor: 'pointer', display: 'grid', placeItems: 'center', transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(186,26,26,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(186,26,26,0.1)'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--on-surface-var)' }}>
              Total ({items.reduce((s, i) => s + i.qty, 0)} art.)
            </span>
            <span style={{ fontFamily: 'var(--font-headline)', fontSize: '1.15rem', color: 'var(--primary)', fontWeight: 700 }}>
              MXN ${calcTotal(items).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* ── Search input ── */}
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)', marginBottom: '6px' }}>
        Agregar producto
      </div>
      <div style={{ position: 'relative', marginBottom: '8px' }}>
        <span className="material-symbols-outlined" style={{
          position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '16px', color: 'var(--outline)', pointerEvents: 'none',
        }}>search</span>
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '9px 36px',
            border: '1.5px solid var(--outline-var)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-container)',
            fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--on-surface)',
            outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
          onBlur={e  => e.target.style.borderColor = 'var(--outline-var)'}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)', display: 'flex', padding: '2px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
          </button>
        )}
      </div>

      {/* ── Product results list ── */}
      <div style={{
        maxHeight: '216px', overflowY: 'auto',
        border: '1.5px solid var(--outline-var)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-lowest)',
      }}>
        {shown.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--outline)', fontFamily: 'var(--font-body)', fontSize: '12px' }}>
            Sin resultados para &ldquo;{search}&rdquo;
          </div>
        ) : shown.map((prod, idx) => {
          const inCart = items.find(i => i.productId === prod.id)
          return (
            <button
              key={prod.id}
              onClick={() => onAdd({ productId: prod.id, name: prod.name, price: prod.price, qty: 1 })}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px',
                background: 'transparent', border: 'none',
                borderBottom: idx < shown.length - 1 ? '1px solid var(--outline-var)' : 'none',
                cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container-low)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {prod.name}
                  {inCart && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-container)', padding: '1px 7px', borderRadius: 'var(--radius-full)' }}>
                      ×{inCart.qty} en carrito
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--on-surface-var)', marginTop: '1px' }}>
                  {prod.category}
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-headline)', fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>
                ${prod.price.toLocaleString()}
              </span>
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                background: inCart ? 'var(--surface-container)' : 'var(--primary)',
                color: inCart ? 'var(--primary)' : 'white',
                display: 'grid', placeItems: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   SaleForm
   ══════════════════════════════════════════════ */
function SaleForm({ initial, onSave, onBack }) {
  const isNew  = !initial.id
  const today  = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    customer:      initial.customer      ?? '',
    branch:        initial.branch        ?? SHOP_BRANCHES[0].id,
    date:          initial.date          ?? today,
    items:         initial.items         ?? [],
    paymentMethod: initial.paymentMethod ?? 'card',
    status:        initial.status        ?? 'completed',
    notes:         initial.notes         ?? '',
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  /* When branch changes, clear items that don't belong */
  const handleBranchChange = e => {
    const newBranch = e.target.value
    setForm(f => ({
      ...f,
      branch: newBranch,
      items:  f.items.filter(i => {
        const prod = SHOP_DATA.find(p => p.id === i.productId)
        return prod?.branch === newBranch
      }),
    }))
  }

  const dirty = form.customer !== (initial.customer ?? '')
    || form.branch !== (initial.branch ?? SHOP_BRANCHES[0].id)
    || form.date !== (initial.date ?? today)
    || form.paymentMethod !== (initial.paymentMethod ?? 'card')
    || form.status !== (initial.status ?? 'completed')
    || form.notes !== (initial.notes ?? '')
    || JSON.stringify(form.items) !== JSON.stringify(initial.items ?? [])

  const valid = form.customer.trim() && form.items.length > 0
  const total = calcTotal(form.items)
  const br    = SHOP_BRANCHES.find(b => b.id === form.branch)

  const addItem = (item) => setForm(f => {
    const existing = f.items.findIndex(i => i.productId === item.productId)
    if (existing >= 0) {
      const updated = [...f.items]
      updated[existing] = { ...updated[existing], qty: updated[existing].qty + 1 }
      return { ...f, items: updated }
    }
    return { ...f, items: [...f.items, item] }
  })
  const changeQty  = (idx, newQty) => {
    if (newQty < 1) return
    setForm(f => {
      const updated = [...f.items]
      updated[idx] = { ...updated[idx], qty: newQty }
      return { ...f, items: updated }
    })
  }
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))

  return (
    <SectionPanel
      eyebrow="Boutique"
      title={isNew ? <>Nueva <em>Venta</em></> : <>Editar <em>Venta</em></>}
      subtitle={isNew
        ? 'Registra los productos vendidos en la boutique.'
        : `Editando venta ${initial.id}.`}
      onBack={onBack}
      dirty={dirty}
      actions={
        <button
          className="btn-primary"
          onClick={() => onSave({ ...form, total })}
          disabled={!valid}
          style={{ opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>save</span>
          {isNew ? 'Registrar venta' : 'Guardar cambios'}
        </button>
      }
    >
      <div className="user-form-grid" style={{ marginBottom: '20px' }}>
        <Field label="Cliente">
          <Input placeholder="Nombre del cliente" value={form.customer} onChange={set('customer')} />
        </Field>
        <Field label="Fecha">
          <Input type="date" value={form.date} onChange={set('date')} />
        </Field>
        <Field label="Sucursal">
          <Select value={form.branch} onChange={handleBranchChange}>
            {SHOP_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name} — {b.location}</option>)}
          </Select>
        </Field>
        <Field label="Método de pago">
          <Select value={form.paymentMethod} onChange={set('paymentMethod')}>
            {PAYMENT_METHODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </Select>
        </Field>
        <Field label="Estado">
          <Select value={form.status} onChange={set('status')}>
            {SALE_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </Select>
        </Field>
        <Field label="Notas (opcional)">
          <Input placeholder="Observaciones adicionales..." value={form.notes} onChange={set('notes')} />
        </Field>
      </div>

      <ItemsEditor
        items={form.items}
        branch={form.branch}
        onAdd={addItem}
        onRemove={removeItem}
        onQtyChange={changeQty}
      />

      {form.items.length > 0 && (
        <div className="user-form-role-hint">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'var(--surface-container)',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>receipt_long</span>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '4px' }}>
                {br?.name} · {PAYMENT_METHODS.find(m => m.key === form.paymentMethod)?.label}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--on-surface-var)', lineHeight: 1.55 }}>
                {form.items.length} línea{form.items.length !== 1 ? 's' : ''},{' '}
                {form.items.reduce((s, i) => s + i.qty, 0)} artículo{form.items.reduce((s, i) => s + i.qty, 0) !== 1 ? 's' : ''} por{' '}
                <strong>MXN ${total.toLocaleString()}</strong>.
              </div>
            </div>
          </div>
        </div>
      )}
    </SectionPanel>
  )
}

/* ══════════════════════════════════════════════
   RefundForm — inline inside RefundsPanel
   ══════════════════════════════════════════════ */
function RefundForm({ initial, sales, onSave, onCancel, onDirtyChange }) {
  const [form, setForm] = useState({
    saleId:   initial.saleId   ?? '',
    customer: initial.customer ?? '',
    branch:   initial.branch   ?? SHOP_BRANCHES[0].id,
    date:     initial.date     ?? new Date().toISOString().slice(0, 10),
    reason:   initial.reason   ?? '',
    amount:   initial.amount != null ? String(initial.amount) : '',
    status:   initial.status   ?? 'pending',
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const isNew = !initial._editing

  const dirty = form.customer !== (initial.customer ?? '')
    || form.saleId   !== (initial.saleId   ?? '')
    || form.reason   !== (initial.reason   ?? '')
    || String(form.amount) !== String(initial.amount ?? '')
    || form.status   !== (initial.status   ?? 'pending')

  useEffect(() => { onDirtyChange?.(dirty) }, [dirty]) // eslint-disable-line
  const valid = form.customer.trim() && form.amount && form.reason.trim()

  const handleSaleSelect = e => {
    const id   = e.target.value
    const sale = sales.find(s => s.id === id)
    setForm(f => ({
      ...f,
      saleId:   id,
      customer: sale?.customer ?? f.customer,
      branch:   sale?.branch   ?? f.branch,
      amount:   sale ? String(calcTotal(sale.items)) : f.amount,
    }))
  }

  return (
    <motion.div
      className="shop-cat-form"
      variants={inlineFormVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="shop-cat-form__label">
        {isNew ? '+ Nueva devolución' : 'Editar devolución'}
      </div>

      <div className="user-form-grid" style={{ marginBottom: '16px' }}>
        <Field label="Venta relacionada">
          <Select value={form.saleId} onChange={handleSaleSelect}>
            <option value="">— Sin venta relacionada —</option>
            {sales.map(s => (
              <option key={s.id} value={s.id}>
                {s.id} · {s.customer} · ${calcTotal(s.items).toLocaleString()}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cliente">
          <Input placeholder="Nombre del cliente" value={form.customer} onChange={set('customer')} />
        </Field>
        <Field label="Sucursal">
          <Select value={form.branch} onChange={set('branch')}>
            {SHOP_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>
        <Field label="Fecha">
          <Input type="date" value={form.date} onChange={set('date')} />
        </Field>
        <Field label="Monto devuelto (MXN)">
          <Input type="number" placeholder="350" min="0" value={form.amount} onChange={set('amount')} />
        </Field>
        <Field label="Estado">
          <Select value={form.status} onChange={set('status')}>
            {REFUND_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </Select>
        </Field>
        <Field label="Motivo" style={{ gridColumn: '1 / -1' }}>
          <Input placeholder="Ej. Producto dañado al recibirlo" value={form.reason} onChange={set('reason')} />
        </Field>
      </div>

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
          onClick={() => valid && onSave({ ...form, amount: Number(form.amount) })}
          disabled={!valid}
          style={{ height: '36px', padding: '0 20px', opacity: valid ? 1 : 0.5 }}
        >
          {isNew ? 'Registrar' : 'Guardar'}
        </button>
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════
   RefundsPanel
   ══════════════════════════════════════════════ */
function RefundsPanel({ refunds, sales, onSave, onDelete, onBack }) {
  const [showForm,   setShowForm]   = useState(false)
  const [editingRef, setEditingRef] = useState(null)
  const [formDirty,  setFormDirty]  = useState(false)

  const EMPTY_REF = {
    saleId: '', customer: '', branch: SHOP_BRANCHES[0].id,
    date: new Date().toISOString().slice(0, 10),
    reason: '', amount: '', status: 'pending',
  }

  const handleSave = (form) => {
    onSave(editingRef?.id ?? null, form)
    setShowForm(false)
    setEditingRef(null)
    setFormDirty(false)
  }

  const handleCancelNew  = () => { setShowForm(false);   setFormDirty(false) }
  const handleCancelEdit = () => { setEditingRef(null);  setFormDirty(false) }

  return (
    <SectionPanel
      eyebrow="Boutique"
      title={<>Gestión de <em>Devoluciones</em></>}
      subtitle="Registra, edita y gestiona las devoluciones de productos."
      onBack={onBack}
      dirty={formDirty}
      actions={
        !showForm && !editingRef ? (
          <button className="btn-primary" onClick={() => { setShowForm(true); setEditingRef(null) }}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
            Nueva devolución
          </button>
        ) : null
      }
    >
      <AnimatePresence mode="wait">
        {showForm && (
          <RefundForm
            key="new-refund"
            initial={EMPTY_REF}
            sales={sales}
            onSave={handleSave}
            onCancel={handleCancelNew}
            onDirtyChange={setFormDirty}
          />
        )}
        {editingRef && (
          <RefundForm
            key={`edit-${editingRef.id}`}
            initial={{ ...editingRef, _editing: true }}
            sales={sales}
            onSave={handleSave}
            onCancel={handleCancelEdit}
            onDirtyChange={setFormDirty}
          />
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {refunds.map(ref => {
          const rs = REFUND_STATUSES.find(s => s.key === ref.status)
          return (
            <div key={ref.id} className="shop-cat-row">
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: `${rs?.color ?? '#d97706'}22`,
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: rs?.color ?? '#d97706' }}>
                  undo
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1rem', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ref.customer}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-var)', marginTop: '2px' }}>
                  {ref.saleId !== '—' ? `Venta ${ref.saleId}` : 'Sin venta relacionada'} · {ref.date}
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1rem', color: 'var(--error)', fontWeight: 700 }}>
                  −${ref.amount.toLocaleString()}
                </div>
                <StatusBadge statusKey={ref.status} statuses={REFUND_STATUSES} />
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="btn-outline"
                  style={{ height: '32px', padding: '0 14px', fontSize: '11px' }}
                  onClick={() => { setEditingRef(ref); setShowForm(false) }}
                >
                  Editar
                </button>
                <ConfirmButton
                  onConfirm={() => onDelete(ref.id)}
                  label="¿Eliminar esta devolución?"
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

        {refunds.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--outline)', fontFamily: 'var(--font-body)', fontSize: '13px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}>undo</span>
            Sin devoluciones registradas. Crea una para comenzar.
          </div>
        )}
      </div>
    </SectionPanel>
  )
}

/* ══════════════════════════════════════════════
   SalesPage — main export
   ══════════════════════════════════════════════ */
export default function SalesPage() {
  const [sales,        setSales]        = useState(SALES_DATA)
  const [refunds,      setRefunds]      = useState(REFUNDS_DATA)
  const [search,       setSearch]       = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
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
  const filtered = sales.filter(s => {
    const matchesBranch = branchFilter === 'all' || s.branch === branchFilter
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    const matchesSearch = !search
      || s.customer.toLowerCase().includes(search.toLowerCase())
      || s.id.toLowerCase().includes(search.toLowerCase())
    return matchesBranch && matchesStatus && matchesSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pagedSales = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  /* Stats */
  const ctxSales      = branchFilter === 'all' ? sales : sales.filter(s => s.branch === branchFilter)
  const totalRevenue  = ctxSales.filter(s => s.status !== 'refunded').reduce((acc, s) => acc + calcTotal(s.items), 0)
  const totalRefunded = refunds.filter(r => r.status === 'approved').reduce((acc, r) => acc + r.amount, 0)
  const avgSale       = ctxSales.length ? Math.round(totalRevenue / ctxSales.length) : 0

  const goTo = (nextView, target = null) => {
    setDirection(nextView === 'list' ? -1 : 1)
    setEditTarget(target)
    setView(nextView)
  }

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [view])

  /* Handlers */
  const handleSaveSale = (form) => {
    if (editTarget?.id) {
      setSales(prev => prev.map(s => s.id === editTarget.id ? { ...s, ...form } : s))
    } else {
      const newId = `VT${String(Date.now()).slice(-4)}`
      setSales(prev => [...prev, { id: newId, ...form }])
    }
    goTo('list')
  }

  const handleDeleteSale   = (id)      => setSales(prev => prev.filter(s => s.id !== id))

  const handleSaveRefund   = (oldId, form) => {
    if (oldId) {
      setRefunds(prev => prev.map(r => r.id === oldId ? { ...r, ...form } : r))
    } else {
      const newId = `DV${String(Date.now()).slice(-4)}`
      setRefunds(prev => [...prev, { id: newId, ...form }])
    }
  }
  const handleDeleteRefund = (id)      => setRefunds(prev => prev.filter(r => r.id !== id))

  const getBranch = id => SHOP_BRANCHES.find(b => b.id === id)

  /* DataTable column definitions */
  const columns = [
    {
      key: 'id', label: 'ID', width: '80px',
      skeleton: () => <Skeleton variant="text" width="52px" height="13px" />,
      render: row => (
        <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}>
          {row.id}
        </span>
      ),
    },
    {
      key: 'date', label: 'Fecha', width: '100px',
      skeleton: () => <Skeleton variant="text" width="74px" height="13px" />,
      render: row => (
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-var)' }}>
          {row.date}
        </span>
      ),
    },
    {
      key: 'customer', label: 'Cliente',
      skeleton: () => (
        <div>
          <Skeleton variant="text" width="110px" height="14px" />
          <Skeleton variant="text" width="70px" height="11px" style={{ marginTop: '4px' }} />
        </div>
      ),
      render: row => (
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--on-surface)' }}>
            {row.customer}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--on-surface-var)', marginTop: '2px' }}>
            {getBranch(row.branch)?.name ?? row.branch}
          </div>
        </div>
      ),
    },
    {
      key: 'items', label: 'Arts.', width: '60px', align: 'center',
      skeleton: () => <Skeleton variant="text" width="24px" height="13px" style={{ margin: '0 auto' }} />,
      render: row => (
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
          color: 'var(--on-surface-var)', display: 'block', textAlign: 'center',
        }}>
          {row.items.reduce((s, i) => s + i.qty, 0)}
        </span>
      ),
    },
    {
      key: 'total', label: 'Total', width: '110px', align: 'right',
      skeleton: () => <Skeleton variant="text" width="60px" height="14px" style={{ marginLeft: 'auto' }} />,
      render: row => {
        const t = calcTotal(row.items)
        return (
          <span style={{
            fontFamily: 'var(--font-headline)', fontSize: '0.95rem',
            color: row.status === 'refunded' ? 'var(--outline)' : 'var(--primary)',
            display: 'block', textAlign: 'right',
            textDecoration: row.status === 'refunded' ? 'line-through' : 'none',
          }}>
            ${t.toLocaleString()}
          </span>
        )
      },
    },
    {
      key: 'paymentMethod', label: 'Método', width: '130px',
      skeleton: () => <Skeleton variant="text" width="85px" height="13px" />,
      render: row => <PaymentBadge method={row.paymentMethod} />,
    },
    {
      key: 'status', label: 'Estado', width: '115px',
      skeleton: () => <Skeleton variant="text" width="80px" height="20px" style={{ borderRadius: '100px' }} />,
      render: row => <StatusBadge statusKey={row.status} statuses={SALE_STATUSES} />,
    },
    {
      key: 'actions', label: '', width: '84px', align: 'right',
      skeleton: () => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          <Skeleton variant="circle" width="30px" height="30px" />
          <Skeleton variant="circle" width="30px" height="30px" />
        </div>
      ),
      render: row => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => goTo('edit', row)}
            style={{
              width: '30px', height: '30px', borderRadius: 'var(--radius-full)',
              border: '1.5px solid var(--outline-var)', background: 'transparent',
              color: 'var(--on-surface-var)', cursor: 'pointer',
              display: 'grid', placeItems: 'center', transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline-var)'; e.currentTarget.style.color = 'var(--on-surface-var)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
          </button>
          <ConfirmButton
            onConfirm={() => handleDeleteSale(row.id)}
            label="¿Eliminar esta venta?"
            confirmLabel="Eliminar"
            cancelLabel="Cancelar"
            align="right"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
          </ConfirmButton>
        </div>
      ),
    },
  ]

  return (
    <AnimatePresence mode="wait" custom={direction}>

      {/* ── Sale form ── */}
      {(view === 'new' || view === 'edit') && (
        <motion.div key={view} custom={direction} variants={panelVariants} initial="initial" animate="animate" exit="exit">
          <SaleForm
            initial={view === 'edit' ? editTarget : {}}
            onSave={handleSaveSale}
            onBack={() => goTo('list')}
          />
        </motion.div>
      )}

      {/* ── Refunds panel ── */}
      {view === 'refunds' && (
        <motion.div key="refunds" custom={direction} variants={panelVariants} initial="initial" animate="animate" exit="exit">
          <RefundsPanel
            refunds={refunds}
            sales={sales}
            onSave={handleSaveRefund}
            onDelete={handleDeleteRefund}
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
                <span className="admin-page-eyebrow">Boutique</span>
                <h1 className="admin-page-title">Ventas &<br /><em>Devoluciones</em></h1>
              </div>
              <div className="admin-page-header-actions">
                <div className="admin-page-header-actions-row">
                  <button className="btn-outline" onClick={() => goTo('refunds')}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>undo</span>
                    Devoluciones
                  </button>
                  <button className="btn-primary" onClick={() => goTo('new')}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
                    Nueva venta
                  </button>
                </div>
              </div>
            </div>

            {/* Search + status chips */}
            <div className="users-toolbar" style={{ marginBottom: '12px' }}>
              <div className="users-search">
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--outline)', flexShrink: 0 }}>search</span>
                <input
                  type="text"
                  placeholder="Buscar cliente o ID…"
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
                {['all', ...SALE_STATUSES.map(s => s.key)].map(key => (
                  <button
                    key={key}
                    onClick={() => { setStatusFilter(key); setPage(1) }}
                    className={`users-filter-chip${statusFilter === key ? ' users-filter-chip--active' : ''}`}
                  >
                    {key === 'all' ? 'Todos' : (SALE_STATUSES.find(s => s.key === key)?.label ?? key)}
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
            <div className="sales-layout">

              {/* Table */}
              <div>
                <DataTable
                  columns={columns}
                  data={pagedSales}
                  loading={loading}
                  fixedRows={PAGE_SIZE}
                  emptyMessage="No se encontraron ventas con ese criterio."
                  rowKey="id"
                  style={{ height: `${PAGE_SIZE * 62 + 44}px`, overflowY: 'hidden' }}
                />

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
              <div className="sales-sidebar">

                {/* Revenue summary */}
                {loading ? (
                  <div className="sales-sidebar-card">
                    <Skeleton variant="text" width="120px" height="18px" style={{ marginBottom: '18px' }} />
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--outline-var)' : 'none' }}>
                        <Skeleton variant="text" width="110px" height="12px" />
                        <Skeleton variant="text" width="55px" height="12px" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="sales-sidebar-card">
                    <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1.1rem', color: 'var(--on-surface)', marginBottom: '16px' }}>
                      Resumen
                    </div>
                    {[
                      { label: 'Ingresos netos',       value: `$${totalRevenue.toLocaleString()}`  },
                      { label: 'Total transacciones',   value: ctxSales.length                     },
                      { label: 'Ticket promedio',       value: `$${avgSale.toLocaleString()}`      },
                      { label: 'Total devuelto',        value: `-$${totalRefunded.toLocaleString()}`, red: true },
                    ].map((stat, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < 3 ? '1px solid var(--outline-var)' : 'none' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-var)', fontWeight: 600 }}>{stat.label}</span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: stat.red ? 'var(--error)' : 'var(--on-surface)', fontWeight: 700 }}>{stat.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* By status */}
                {loading ? (
                  <div className="sales-sidebar-card">
                    <Skeleton variant="text" width="90px" height="10px" style={{ marginBottom: '14px' }} />
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <Skeleton variant="text" width="80px" height="12px" />
                          <Skeleton variant="text" width="24px" height="12px" />
                        </div>
                        <Skeleton variant="text" height="4px" style={{ borderRadius: '2px' }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="sales-sidebar-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--outline)' }}>
                        Por estado
                      </div>
                      <button
                        onClick={() => goTo('refunds')}
                        style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', padding: 0 }}
                      >
                        Devoluciones
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>arrow_forward</span>
                      </button>
                    </div>
                    {SALE_STATUSES.map(st => {
                      const count = ctxSales.filter(s => s.status === st.key).length
                      const pct   = ctxSales.length ? Math.round((count / ctxSales.length) * 100) : 0
                      return (
                        <div key={st.key} style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: st.color, flexShrink: 0, display: 'inline-block' }} />
                              {st.label}
                            </span>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--outline)', fontWeight: 600 }}>{count}</span>
                          </div>
                          <div style={{ height: '4px', borderRadius: '2px', background: 'var(--surface-container)' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: st.color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Branch revenue */}
                {!loading && (
                  <div className="sales-sidebar-card">
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--outline)', marginBottom: '12px' }}>
                      Por sucursal
                    </div>
                    {SHOP_BRANCHES.map(br => {
                      const brSales = sales.filter(s => s.branch === br.id && s.status !== 'refunded')
                      const revenue = brSales.reduce((acc, s) => acc + calcTotal(s.items), 0)
                      const maxRev  = Math.max(...SHOP_BRANCHES.map(b =>
                        sales.filter(s => s.branch === b.id && s.status !== 'refunded').reduce((a, s) => a + calcTotal(s.items), 0)
                      ))
                      const pct = maxRev ? Math.round((revenue / maxRev) * 100) : 0
                      return (
                        <div key={br.id} style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <div>
                              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--on-surface)' }}>{br.name}</div>
                              <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--on-surface-var)' }}>{br.location}</div>
                            </div>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--primary)', fontWeight: 700, alignSelf: 'center' }}>
                              ${revenue.toLocaleString()}
                            </span>
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
