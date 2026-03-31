import { useState, useEffect } from 'react'
import SectionPanel from '../components/SectionPanel'
import { Field, Input, Select, Textarea } from '@/components/frida/Field'
import { useToast } from '@/components/frida/Toast'

const EMPTY = {
  huespedNombre: '',
  huespedEmail: '',
  huespedTel: '',
  propiedad: '',
  habitacion: '',
  llegada: '',
  salida: '',
  adultos: '2',
  ninos: '0',
  metodoPago: '',
  notas: '',
}

function isDirty(form) {
  return Object.entries(form).some(([k, v]) => {
    if (k === 'adultos') return v !== '2'
    if (k === 'ninos') return v !== '0'
    return v !== ''
  })
}

const SectionLabel = ({ children }) => (
  <div style={{
    fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 800,
    letterSpacing: '0.18em', textTransform: 'uppercase',
    color: 'var(--outline)', marginBottom: '14px', marginTop: '28px',
    paddingBottom: '8px', borderBottom: '1px solid var(--outline-var)',
  }}>
    {children}
  </div>
)

export default function NuevaReservaPage({ onBack, onDirtyChange }) {
  const addToast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)

  const dirty = isDirty(form)

  /* Notificar dirty state al padre (AdminApp) para la guardia de navegación */
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty])  // eslint-disable-line

  const set = key => e => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = e => {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      onDirtyChange?.(false)
      addToast('Reserva creada correctamente', { type: 'success', title: 'Reserva confirmada' })
      onBack()
    }, 1200)
  }

  const actions = (
    <>
      <button
        type="button"
        onClick={onBack}
        style={{
          padding: '9px 18px', borderRadius: 'var(--radius-md)',
          border: '1.5px solid var(--outline-var)', background: 'transparent',
          color: 'var(--on-surface)', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container-low)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        Cancelar
      </button>
      <button
        type="submit"
        form="nueva-reserva-form"
        disabled={submitting}
        className="btn-primary"
        style={{ opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
          {submitting ? 'hourglass_empty' : 'check_circle'}
        </span>
        {submitting ? 'Guardando…' : 'Confirmar reserva'}
      </button>
    </>
  )

  return (
    <SectionPanel
      eyebrow="Reservaciones"
      title={<>Nueva<br /><em>Reserva</em></>}
      subtitle="Completa los datos para registrar la reservación en el sistema"
      onBack={onBack}
      dirty={dirty}
      actions={actions}
    >
      <form id="nueva-reserva-form" onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '32px', alignItems: 'start' }}>

          {/* ── Left column ── */}
          <div>
            <SectionLabel>Datos del huésped</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Field label="Nombre completo">
                <Input required placeholder="Ej. Ana García López"
                  value={form.huespedNombre} onChange={set('huespedNombre')} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Correo electrónico">
                  <Input type="email" required placeholder="correo@ejemplo.com"
                    value={form.huespedEmail} onChange={set('huespedEmail')} />
                </Field>
                <Field label="Teléfono">
                  <Input type="tel" placeholder="+52 999 000 0000"
                    value={form.huespedTel} onChange={set('huespedTel')} />
                </Field>
              </div>
            </div>

            <SectionLabel>Detalles de la estancia</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Propiedad">
                  <Select required value={form.propiedad} onChange={set('propiedad')}>
                    <option value="">Seleccionar…</option>
                    <option value="grand">Grand Oasis — Chelem</option>
                    <option value="chuburna">Casa Frida — Chuburná</option>
                    <option value="merida">Boutique Mérida</option>
                  </Select>
                </Field>
                <Field label="Habitación">
                  <Select required value={form.habitacion} onChange={set('habitacion')}>
                    <option value="">Seleccionar…</option>
                    <option value="coral">Suite Coral Grande</option>
                    <option value="horizonte">Suite Horizonte Azul</option>
                    <option value="sunset">Villa Chuburná Sunset</option>
                    <option value="manglar">Cabaña del Manglar</option>
                  </Select>
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Fecha de llegada">
                  <Input type="date" required value={form.llegada} onChange={set('llegada')} />
                </Field>
                <Field label="Fecha de salida">
                  <Input type="date" required value={form.salida} onChange={set('salida')} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Adultos">
                  <Select value={form.adultos} onChange={set('adultos')}>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                  </Select>
                </Field>
                <Field label="Niños">
                  <Select value={form.ninos} onChange={set('ninos')}>
                    {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                  </Select>
                </Field>
              </div>
            </div>

            <SectionLabel>Notas internas</SectionLabel>
            <Field label="Observaciones y peticiones especiales">
              <Textarea placeholder="Peticiones especiales, alergias, ocasión especial…"
                value={form.notas} onChange={set('notas')} style={{ minHeight: '90px' }} />
            </Field>
          </div>

          {/* ── Right column ── */}
          <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Payment */}
            <div style={{
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-var)',
              borderRadius: 'var(--radius-xl)', padding: '22px',
            }}>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 800,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: 'var(--outline)', marginBottom: '14px',
              }}>
                Método de pago
              </div>
              <Field label="Forma de pago">
                <Select required value={form.metodoPago} onChange={set('metodoPago')}>
                  <option value="">Seleccionar…</option>
                  <option value="tarjeta">Tarjeta crédito / débito</option>
                  <option value="transferencia">Transferencia bancaria</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="oxxo">OXXO Pay</option>
                </Select>
              </Field>
            </div>

            {/* Price summary */}
            <div style={{
              background: 'var(--primary)',
              borderRadius: 'var(--radius-xl)', padding: '22px',
              color: '#fff',
            }}>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 800,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: 'rgba(76,205,218,0.8)', marginBottom: '14px',
              }}>
                Resumen de costo
              </div>
              {[
                { label: 'Tarifa por noche', value: 'MXN $—' },
                { label: 'Noches', value: '—' },
                { label: 'Impuestos (16%)', value: 'MXN $—' },
              ].map((row, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  marginBottom: '8px',
                }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>
                    {row.label}
                  </span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                    {row.value}
                  </span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                marginTop: '14px', paddingTop: '14px',
                borderTop: '1px solid rgba(255,255,255,0.15)',
              }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                  Total estimado
                </span>
                <span style={{ fontFamily: 'var(--font-headline)', fontSize: '1.5rem', color: '#fff' }}>
                  MXN $—
                </span>
              </div>
            </div>

            {/* Quick info */}
            <div style={{
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-var)',
              borderRadius: 'var(--radius-xl)', padding: '18px',
              display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              {[
                { icon: 'policy', text: 'Cancelación gratuita hasta 48h antes' },
                { icon: 'child_care', text: 'Niños menores de 3 años sin cargo' },
                { icon: 'pets', text: 'Mascotas permitidas con previo aviso' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--primary)', marginTop: '1px', flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-var)', lineHeight: 1.5 }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </SectionPanel>
  )
}
