import { useState, useEffect } from 'react'
import SectionPanel from '../components/SectionPanel'
import { Field, Input, Select, Textarea } from '@/components/frida/Field'
import { useToast } from '@/components/frida/Toast'
import s from './FormLayout.module.css'

const EMPTY = {
  nombre: '',
  tipo: '',
  propiedad: '',
  capacidad: '2',
  camas: '',
  tamanio: '',
  tarifa: '',
  estado: 'active',
  descripcion: '',
}

function isDirty(form) {
  return Object.entries(form).some(([k, v]) => {
    if (k === 'capacidad') return v !== '2'
    if (k === 'estado') return false
    return v !== ''
  })
}

const AMENIDADES = [
  { icon: 'ac_unit',          label: 'A/C' },
  { icon: 'pool',             label: 'Alberca' },
  { icon: 'waves',            label: 'Vista al mar' },
  { icon: 'kitchen',          label: 'Cocina' },
  { icon: 'hot_tub',          label: 'Jacuzzi' },
  { icon: 'balcony',          label: 'Balcón' },
  { icon: 'wifi',             label: 'Wi-Fi' },
  { icon: 'lock',             label: 'Caja fuerte' },
  { icon: 'tv',               label: 'Smart TV' },
  { icon: 'directions_car',   label: 'Estacionamiento' },
  { icon: 'local_bar',        label: 'Minibar' },
  { icon: 'fitness_center',   label: 'Gym' },
]

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

export default function NuevaHabitacionPage({ onBack, onDirtyChange }) {
  const addToast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [amenidades, setAmenidades] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const set = key => e => setForm(prev => ({ ...prev, [key]: e.target.value }))
  const toggleAmenidad = a => setAmenidades(prev =>
    prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
  )

  const dirty = isDirty(form) || amenidades.length > 0

  /* Notificar dirty state al padre (AdminApp) para la guardia de navegación */
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty])  // eslint-disable-line

  const handleSubmit = e => {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      onDirtyChange?.(false)
      addToast('Habitación registrada correctamente', { type: 'success', title: 'Habitación creada' })
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
        form="nueva-habitacion-form"
        disabled={submitting}
        className="btn-primary"
        style={{ opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
          {submitting ? 'hourglass_empty' : 'add_circle'}
        </span>
        {submitting ? 'Guardando…' : 'Crear habitación'}
      </button>
    </>
  )

  return (
    <SectionPanel
      eyebrow="Habitaciones"
      title={<>Nueva<br /><em>Habitación</em></>}
      subtitle="Registra una nueva habitación o suite en el inventario de propiedades"
      onBack={onBack}
      dirty={dirty}
      actions={actions}
    >
      <form id="nueva-habitacion-form" onSubmit={handleSubmit}>
        <div className={s.formGrid}>

          {/* ── Left column ── */}
          <div>
            <SectionLabel>Identificación</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Field label="Nombre de la habitación">
                <Input required placeholder="Ej. Suite Coral Grande"
                  value={form.nombre} onChange={set('nombre')} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Tipo">
                  <Select required value={form.tipo} onChange={set('tipo')}>
                    <option value="">Seleccionar…</option>
                    <option value="suite">Suite</option>
                    <option value="villa">Villa</option>
                    <option value="cabana">Cabaña</option>
                    <option value="habitacion">Habitación estándar</option>
                    <option value="departamento">Departamento</option>
                  </Select>
                </Field>
                <Field label="Propiedad">
                  <Select required value={form.propiedad} onChange={set('propiedad')}>
                    <option value="">Seleccionar…</option>
                    <option value="grand">Grand Oasis — Chelem</option>
                    <option value="chuburna">Casa Frida — Chuburná</option>
                    <option value="merida">Boutique Mérida</option>
                  </Select>
                </Field>
              </div>
            </div>

            <SectionLabel>Capacidad y tamaño</SectionLabel>
            <div className={s.threeCol}>
              <Field label="Capacidad (personas)">
                <Select value={form.capacidad} onChange={set('capacidad')}>
                  {[1,2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n}</option>)}
                </Select>
              </Field>
              <Field label="Tipo de cama">
                <Select value={form.camas} onChange={set('camas')}>
                  <option value="">Seleccionar…</option>
                  <option value="king">King</option>
                  <option value="queen">Queen</option>
                  <option value="matrimonial">Matrimonial</option>
                  <option value="doble">2 individuales</option>
                </Select>
              </Field>
              <Field label="Tamaño (m²)">
                <Input type="number" min="10" placeholder="45"
                  value={form.tamanio} onChange={set('tamanio')} />
              </Field>
            </div>

            <SectionLabel>Amenidades</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {AMENIDADES.map(({ icon, label }) => {
                const sel = amenidades.includes(label)
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleAmenidad(label)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-full)',
                      border: `1.5px solid ${sel ? 'var(--primary)' : 'var(--outline-var)'}`,
                      background: sel ? 'rgba(0,105,113,0.10)' : 'transparent',
                      color: sel ? 'var(--primary)' : 'var(--on-surface-var)',
                      fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{icon}</span>
                    {label}
                  </button>
                )
              })}
            </div>

            <SectionLabel>Descripción pública</SectionLabel>
            <Field label="Descripción visible para huéspedes">
              <Textarea
                placeholder="Describe la habitación: vistas, estilo, características únicas…"
                value={form.descripcion} onChange={set('descripcion')}
                style={{ minHeight: '100px' }}
              />
            </Field>
          </div>

          {/* ── Right column ── */}
          <div className={s.sidePanel}>
            {/* Tarifa y estado */}
            <div style={{
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-var)',
              borderRadius: 'var(--radius-xl)', padding: '22px',
              display: 'flex', flexDirection: 'column', gap: '14px',
            }}>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 800,
                letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--outline)',
              }}>
                Tarifa y disponibilidad
              </div>
              <Field label="Tarifa por noche (MXN)">
                <Input type="number" required min="0" placeholder="3500"
                  value={form.tarifa} onChange={set('tarifa')} />
              </Field>
              <Field label="Estado inicial">
                <Select value={form.estado} onChange={set('estado')}>
                  <option value="active">Disponible</option>
                  <option value="maintenance">En preparación</option>
                  <option value="inactive">Inactiva</option>
                </Select>
              </Field>
            </div>

            {/* Preview card */}
            <div style={{
              background: 'var(--primary)',
              borderRadius: 'var(--radius-xl)', overflow: 'hidden',
            }}>
              <div style={{
                height: '120px',
                background: 'linear-gradient(135deg, rgba(0,59,65,0.6) 0%, rgba(0,105,113,0.4) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'rgba(255,255,255,0.3)' }}>
                  bed
                </span>
              </div>
              <div style={{ padding: '18px' }}>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 800,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: 'rgba(76,205,218,0.8)', marginBottom: '6px',
                }}>
                  Vista previa
                </div>
                <div style={{
                  fontFamily: 'var(--font-headline)', fontSize: '1.1rem',
                  color: '#fff', marginBottom: '4px',
                }}>
                  {form.nombre || 'Nombre de habitación'}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                  {[form.tipo, form.propiedad ? ({ grand: 'Grand Oasis', chuburna: 'Casa Frida', merida: 'Boutique Mérida' }[form.propiedad]) : null]
                    .filter(Boolean).join(' · ') || 'Tipo · Propiedad'}
                </div>
                {form.tarifa && (
                  <div style={{
                    marginTop: '12px', paddingTop: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.12)',
                    fontFamily: 'var(--font-headline)', fontSize: '1.2rem', color: '#fff',
                  }}>
                    MXN ${Number(form.tarifa).toLocaleString()}
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginLeft: '4px' }}>
                      / noche
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tips */}
            <div style={{
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-var)',
              borderRadius: 'var(--radius-xl)', padding: '18px',
              display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              {[
                { icon: 'photo_camera', text: 'Agrega fotos después de crear la habitación' },
                { icon: 'edit_calendar', text: 'Las fechas de bloqueo se gestionan desde el calendario' },
                { icon: 'local_offer', text: 'Los precios especiales se configuran en Boutique' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--primary)', marginTop: '1px', flexShrink: 0 }}>
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
