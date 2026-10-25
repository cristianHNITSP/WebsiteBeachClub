import { useState, useEffect } from 'react'
import SectionPanel from '../components/SectionPanel'
import {
  BarbellIcon, BathtubIcon, CalendarDotsIcon, CameraIcon, CarIcon, CookingPotIcon, DoorOpenIcon, FloppyDiskIcon, HourglassIcon, LockIcon, PlusCircleIcon, SnowflakeIcon, SwimmingPoolIcon, TelevisionIcon, TrashIcon, WavesIcon, WifiHighIcon, WineIcon,
} from '@phosphor-icons/react'
import { Field, Input, Select, Textarea } from '@/components/frida/Field'
import { SkeletonCard } from '@/components/frida/Skeleton'
import { useToast } from '@/components/frida/Toast'
import { Button } from '@/components/ui/button'
import Imagen from '@/components/marca/Imagen'
import TarifasTemporada from '../components/TarifasTemporada'
import { usePedido } from '@/hooks/usePedido'
import { useSesion } from '@/lib/sesion'
import { SITUACION } from '@/lib/situacion'
import { habitacionesApi } from '../habitaciones'
import s from './FormLayout.module.css'

/*
 * Alta y edición de una habitación (un solo formulario: antes eran dos copias).
 * Sin `habitacionId` crea; con él, la pide a la API y la edita enviando la
 * `version` que se vio: si alguien la cambió mientras tanto, la API responde
 * 409 y aquí se ofrece recargar (PLAN-BACKEND §6.3).
 */

const TIPOS = ['Suite', 'Suite Premium', 'Villa', 'Cabaña', 'Estudio', 'Familiar', 'Habitación estándar', 'Departamento']
const CAMAS = { king: 'King', queen: 'Queen', matrimonial: 'Matrimonial', individuales: '2 individuales' }

// Las mismas que acepta la API (esquemas/habitaciones.py: Amenidad).
const AMENIDADES = [
  { Icono: SnowflakeIcon, label: 'A/C' },
  { Icono: SwimmingPoolIcon, label: 'Alberca' },
  { Icono: WavesIcon, label: 'Vista al mar' },
  { Icono: CookingPotIcon, label: 'Cocina' },
  { Icono: BathtubIcon, label: 'Jacuzzi' },
  { Icono: DoorOpenIcon, label: 'Balcón' },
  { Icono: WifiHighIcon, label: 'Wi-Fi' },
  { Icono: LockIcon, label: 'Caja fuerte' },
  { Icono: TelevisionIcon, label: 'Smart TV' },
  { Icono: CarIcon, label: 'Estacionamiento' },
  { Icono: WineIcon, label: 'Minibar' },
  { Icono: BarbellIcon, label: 'Gym' },
]

const SectionLabel = ({ children }) => (
  <div style={{
    fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', fontWeight: 800,
    letterSpacing: '0.18em', textTransform: 'uppercase',
    color: 'var(--outline)', marginBottom: '14px', marginTop: '28px',
    paddingBottom: '8px', borderBottom: '1px solid var(--outline-var)',
  }}>
    {children}
  </div>
)

const aFormulario = h => ({
  nombre: h?.nombre ?? '',
  tipo: h?.tipo ?? '',
  propiedad_id: h?.propiedad_id ?? '',
  capacidad: String(h?.capacidad ?? 2),
  cama: h?.cama ?? '',
  tamano_m2: h?.tamano_m2 != null ? String(h.tamano_m2) : '',
  tarifa: h ? String(h.tarifa_centavos / 100) : '',
  estado: h?.estado ?? 'activa',
  descripcion: h?.descripcion ?? '',
  amenidades: h?.amenidades ?? [],
})

export default function HabitacionFormPage({ habitacionId, onBack, onDirtyChange }) {
  const pedido = usePedido(senal => (habitacionId ? habitacionesApi.obtener(habitacionId, senal) : null), [habitacionId])

  if (!habitacionId) return <Formulario onBack={onBack} onDirtyChange={onDirtyChange} />
  if (pedido.error) {
    return (
      <SectionPanel eyebrow="Habitaciones" title={<>Editar<br /><em>Habitación</em></>} subtitle={pedido.error.message} onBack={onBack}>
        <Button variant="outline" onClick={pedido.recargar}>Reintentar</Button>
      </SectionPanel>
    )
  }
  if (pedido.cargando) {
    return (
      <SectionPanel eyebrow="Habitaciones" title={<>Editar<br /><em>Habitación</em></>} subtitle="Cargando la habitación" onBack={onBack}>
        <div className={s.formGrid}><SkeletonCard height="520px" /><SkeletonCard height="320px" /></div>
      </SectionPanel>
    )
  }
  const fuera = SITUACION[pedido.datos.situacion]
  if (fuera) {
    return (
      <SectionPanel eyebrow="Habitaciones" title={<>{pedido.datos.nombre}</>}
        subtitle={`${fuera.texto}. ${fuera.detalle}`} onBack={onBack} />
    )
  }
  // key: si se recarga tras un 409, el formulario arranca de nuevo con lo nuevo.
  return <Formulario key={pedido.datos.version} room={pedido.datos} onBack={onBack} onDirtyChange={onDirtyChange} onRecargar={pedido.recargar} />
}

function Formulario({ room, onBack, onDirtyChange, onRecargar }) {
  const addToast = useToast()
  const { sesion } = useSesion()
  const nueva = !room
  const inicial = aFormulario(room)
  const [form, setForm] = useState(inicial)
  const [submitting, setSubmitting] = useState(false)
  const [desactualizada, setDesactualizada] = useState(false)

  const set = key => e => setForm(prev => ({ ...prev, [key]: e.target.value }))
  const toggleAmenidad = a => setForm(prev => ({
    ...prev, amenidades: prev.amenidades.includes(a) ? prev.amenidades.filter(x => x !== a) : [...prev.amenidades, a],
  }))

  const dirty = JSON.stringify(form) !== JSON.stringify(inicial)
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty])  // eslint-disable-line

  const propiedades = sesion?.propiedades ?? []
  const tipos = form.tipo && !TIPOS.includes(form.tipo) ? [form.tipo, ...TIPOS] : TIPOS

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)
    // Montos en centavos: el panel nunca manda decimales de peso a la API.
    const cuerpo = {
      nombre: form.nombre,
      tipo: form.tipo,
      capacidad: Number(form.capacidad),
      cama: form.cama || null,
      tamano_m2: form.tamano_m2 ? Number(form.tamano_m2) : null,
      amenidades: form.amenidades,
      descripcion: form.descripcion,
      tarifa_centavos: Math.round(Number(form.tarifa) * 100),
      estado: form.estado,
    }
    try {
      if (nueva) await habitacionesApi.crear({ ...cuerpo, propiedad_id: form.propiedad_id })
      else await habitacionesApi.editar(room.id, { ...cuerpo, version: room.version })
      onDirtyChange?.(false)
      addToast(nueva ? 'Habitación registrada correctamente' : 'Habitación actualizada correctamente',
        { type: 'success', title: nueva ? 'Habitación creada' : 'Cambios guardados' })
      onBack()
    } catch (err) {
      if (err.datos?.codigo === 'version') setDesactualizada(true)
      addToast(err.message, { type: 'error', title: 'No se guardó' })
      setSubmitting(false)
    }
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
          fontFamily: 'var(--font-body)', fontSize: 'var(--fs-sm)', fontWeight: 700,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container-low)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        Cancelar
      </button>
      <button
        type="submit"
        form="habitacion-form"
        disabled={submitting}
        className="btn-primary"
        style={{ opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
      >
        {submitting ? <HourglassIcon size={15} aria-hidden="true" /> : nueva ? <PlusCircleIcon size={15} weight="bold" aria-hidden="true" /> : <FloppyDiskIcon size={15} weight="bold" aria-hidden="true" />}
        {submitting ? 'Guardando…' : nueva ? 'Crear habitación' : 'Guardar cambios'}
      </button>
    </>
  )

  return (
    <SectionPanel
      eyebrow="Habitaciones"
      title={nueva ? <>Nueva<br /><em>Habitación</em></> : <>Editar<br /><em>Habitación</em></>}
      subtitle={nueva ? 'Registra una nueva habitación o cabaña en una de las propiedades' : `Modifica los detalles de «${room.nombre}»`}
      onBack={onBack}
      dirty={dirty}
      actions={actions}
    >
      {desactualizada && (
        <div role="alert" style={{
          display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '18px',
          padding: '12px 16px', borderRadius: 'var(--radius-lg)',
          background: 'var(--secondary-container)', color: 'var(--on-surface)', fontSize: 'var(--fs-sm)',
        }}>
          Alguien más guardó cambios en esta habitación. Recarga para ver lo nuevo (perderás lo que escribiste aquí).
          <Button variant="outline" size="sm" onClick={() => { onDirtyChange?.(false); onRecargar() }}>Recargar</Button>
        </div>
      )}
      <form id="habitacion-form" onSubmit={handleSubmit}>
        <div className={s.formGrid}>

          {/* ── Columna izquierda ── */}
          <div>
            <SectionLabel>Identificación</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Field label="Nombre de la habitación">
                <Input required minLength={2} maxLength={120} placeholder="Ej. Suite Coral Grande"
                  value={form.nombre} onChange={set('nombre')} />
              </Field>
              <div className={s.twoCol}>
                <Field label="Tipo">
                  <Select required value={form.tipo} onChange={set('tipo')}>
                    <option value="">Seleccionar…</option>
                    {tipos.map(t => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </Field>
                <Field label="Propiedad">
                  {/* Una habitación no cambia de propiedad: al editar, solo se muestra. */}
                  <Select required={nueva} disabled={!nueva} value={form.propiedad_id} onChange={set('propiedad_id')}>
                    <option value="">Seleccionar…</option>
                    {propiedades.map(p => <option key={p.id} value={p.id}>{p.nombre}, {p.lugar}</option>)}
                  </Select>
                </Field>
              </div>
            </div>

            <SectionLabel>Capacidad y tamaño</SectionLabel>
            <div className={s.threeCol}>
              <Field label="Capacidad (personas)">
                <Select value={form.capacidad} onChange={set('capacidad')}>
                  {[...new Set([1, 2, 3, 4, 5, 6, 8, 10, Number(form.capacidad)])].sort((a, b) => a - b)
                    .map(n => <option key={n} value={n}>{n}</option>)}
                </Select>
              </Field>
              <Field label="Tipo de cama">
                <Select value={form.cama} onChange={set('cama')}>
                  <option value="">Sin dato</option>
                  {Object.entries(CAMAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
              <Field label="Tamaño (m²)">
                <Input type="number" min="5" max="2000" placeholder="45"
                  value={form.tamano_m2} onChange={set('tamano_m2')} />
              </Field>
            </div>

            <SectionLabel>Amenidades</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {AMENIDADES.map(({ Icono, label }) => {
                const sel = form.amenidades.includes(label)
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={sel}
                    onClick={() => toggleAmenidad(label)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-full)',
                      border: `1.5px solid ${sel ? 'var(--primary)' : 'var(--outline-var)'}`,
                      background: sel ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
                      color: sel ? 'var(--primary)' : 'var(--on-surface-var)',
                      fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}
                  >
                    <Icono size={14} aria-hidden="true" />
                    {label}
                  </button>
                )
              })}
            </div>

            <SectionLabel>Descripción pública</SectionLabel>
            <Field label="Descripción visible para huéspedes">
              <Textarea
                maxLength={2000}
                placeholder="Describe la habitación: vistas, estilo, características únicas…"
                value={form.descripcion} onChange={set('descripcion')}
                style={{ minHeight: '100px' }}
              />
            </Field>
          </div>

          {/* ── Columna derecha ── */}
          <div className={s.sidePanel}>
            <div style={{
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-var)',
              borderRadius: 'var(--radius-xl)', padding: '22px',
              display: 'flex', flexDirection: 'column', gap: '14px',
            }}>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', fontWeight: 800,
                letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--outline)',
              }}>
                Tarifa y disponibilidad
              </div>
              <Field label="Tarifa base por noche (MXN, IVA incluido)">
                <Input type="number" required min="1" max="100000" step="0.01" placeholder="3500"
                  value={form.tarifa} onChange={set('tarifa')} />
              </Field>
              <Field label="Estado">
                <Select value={form.estado} onChange={set('estado')}>
                  <option value="activa">Disponible</option>
                  <option value="mantenimiento">En mantenimiento</option>
                  <option value="inactiva">Inactiva</option>
                </Select>
              </Field>
            </div>

            {/* Vista previa */}
            <div style={{ background: 'var(--primary)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
              <div style={{ height: '120px' }}>
                <Imagen src={room?.foto} alt={room?.nombre ?? 'Nueva habitación'} />
              </div>
              <div style={{ padding: '18px' }}>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', fontWeight: 800,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: 'color-mix(in srgb, var(--primary-foreground) 80%, transparent)', marginBottom: '6px',
                }}>
                  Vista previa
                </div>
                <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1.1rem', color: 'var(--primary-foreground)', marginBottom: '4px' }}>
                  {form.nombre || 'Nombre de habitación'}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'color-mix(in srgb, var(--primary-foreground) 75%, transparent)' }}>
                  {form.tipo || 'Tipo'}
                </div>
                {form.tarifa && (
                  <div style={{
                    marginTop: '12px', paddingTop: '12px',
                    borderTop: '1px solid color-mix(in srgb, var(--primary-foreground) 15%, transparent)',
                    fontFamily: 'var(--font-headline)', fontSize: '1.2rem', color: 'var(--primary-foreground)',
                  }}>
                    MXN ${Number(form.tarifa).toLocaleString('es-MX')}
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'color-mix(in srgb, var(--primary-foreground) 75%, transparent)', marginLeft: '4px' }}>
                      / noche
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div style={{
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-var)',
              borderRadius: 'var(--radius-xl)', padding: '18px',
              display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              {[
                { Icono: CameraIcon, text: 'Las fotos se gestionan desde la galería de la habitación' },
                { Icono: CalendarDotsIcon, text: 'Las fechas de bloqueo se gestionan desde el calendario' },
                { Icono: TrashIcon, text: 'Mandarla a la papelera se hace desde la lista de habitaciones' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <item.Icono size={14} aria-hidden="true" style={{ color: 'var(--primary)', marginTop: '1px', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'var(--on-surface-var)', lineHeight: 1.5 }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
      {/* Fuera del formulario: cada temporada se guarda por su cuenta. */}
      {!nueva && <TarifasTemporada habitacionId={room.id} base={room.tarifa_centavos} />}
    </SectionPanel>
  )
}
