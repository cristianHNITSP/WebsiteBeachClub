import { useState, useEffect } from 'react'
import SectionPanel from '../components/SectionPanel'
import {
  BarbellIcon, BathtubIcon, CalendarDotsIcon, CameraIcon, CarIcon, CookingPotIcon, DoorOpenIcon, FloppyDiskIcon, LockIcon, PlusCircleIcon, SnowflakeIcon, SwimmingPoolIcon, TelevisionIcon, TrashIcon, WavesIcon, WifiHighIcon, WineIcon,
} from '@phosphor-icons/react'
import { Field, Input, Select, Textarea } from '@/components/frida/Field'
import { SkeletonCard } from '@/components/frida/Skeleton'
import { toast } from '@/admin/toast'
import { DropletButton } from '@/components/devl/droplet-button'
import { Button } from '@/components/coss/button'
import { LiquidSwitch } from '@/components/devl/liquid-switch'
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

const aFormulario = h => ({
  nombre: h?.nombre ?? '',
  tipo: h?.tipo ?? '',
  propiedad_id: h?.propiedad_id ?? '',
  capacidad: String(h?.capacidad ?? 2),
  cama: h?.cama ?? '',
  tamano_m2: h?.tamano_m2 != null ? String(h.tamano_m2) : '',
  tarifa: h ? String(h.tarifa_centavos / 100) : '',
  estado: h?.estado ?? 'activa',
  venta_en_linea: h?.venta_en_linea ?? false,
  descripcion: h?.descripcion ?? '',
  amenidades: h?.amenidades ?? [],
})

export default function HabitacionFormPage({ habitacionId, onBack, onDirtyChange }) {
  const pedido = usePedido(senal => (habitacionId ? habitacionesApi.obtener(habitacionId, senal) : null), [habitacionId])

  if (!habitacionId) return <Formulario onBack={onBack} onDirtyChange={onDirtyChange} />
  if (pedido.error) {
    return (
      <SectionPanel title="Editar habitación" subtitle={pedido.error.message} onBack={onBack}>
        <Button variant="outline" onClick={pedido.recargar}>Reintentar</Button>
      </SectionPanel>
    )
  }
  if (pedido.cargando) {
    return (
      <SectionPanel title="Editar habitación" subtitle="Cargando la habitación" onBack={onBack}>
        <div className={s.formGrid}><SkeletonCard height="520px" /><SkeletonCard height="320px" /></div>
      </SectionPanel>
    )
  }
  const fuera = SITUACION[pedido.datos.situacion]
  if (fuera) {
    return (
      <SectionPanel title={<>{pedido.datos.nombre}</>}
        subtitle={`${fuera.texto}. ${fuera.detalle}`} onBack={onBack} />
    )
  }
  // key: si se recarga tras un 409, el formulario arranca de nuevo con lo nuevo.
  return <Formulario key={pedido.datos.version} room={pedido.datos} onBack={onBack} onDirtyChange={onDirtyChange} onRecargar={pedido.recargar} />
}

function Formulario({ room, onBack, onDirtyChange, onRecargar }) {
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
      venta_en_linea: form.venta_en_linea,
    }
    try {
      if (nueva) await habitacionesApi.crear({ ...cuerpo, propiedad_id: form.propiedad_id })
      else await habitacionesApi.editar(room.id, { ...cuerpo, version: room.version })
      onDirtyChange?.(false)
      toast.success(nueva ? 'Habitación registrada correctamente' : 'Habitación actualizada correctamente')
      onBack()
    } catch (err) {
      if (err.datos?.codigo === 'version') setDesactualizada(true)
      toast.error('No se guardó', { description: err.message })
      setSubmitting(false)
    }
  }

  const actions = (
    <>
      <Button variant="outline" size="lg" className="rounded-full" onClick={onBack}>Cancelar</Button>
      <DropletButton type="submit" form="habitacion-form" disabled={submitting}>
        {nueva ? <PlusCircleIcon size={16} weight="bold" aria-hidden="true" /> : <FloppyDiskIcon size={16} weight="bold" aria-hidden="true" />}
        {submitting ? 'Guardando…' : nueva ? 'Crear habitación' : 'Guardar cambios'}
      </DropletButton>
    </>
  )

  return (
    <SectionPanel
      title={nueva ? "Nueva habitación" : "Editar habitación"}
      subtitle={nueva ? 'Registra una nueva habitación o cabaña en una de las propiedades' : `Modifica los detalles de «${room.nombre}»`}
      onBack={onBack}
      dirty={dirty}
      actions={actions}
    >
      {desactualizada && (
        <div role="alert" className={s.desactualizada}>
          Alguien más guardó cambios en esta habitación. Recarga para ver lo nuevo (perderás lo que escribiste aquí).
          <Button variant="outline" size="sm" onClick={() => { onDirtyChange?.(false); onRecargar() }}>Recargar</Button>
        </div>
      )}
      <form id="habitacion-form" onSubmit={handleSubmit}>
        <div className={s.formGrid}>

          {/* ── Columna izquierda ── */}
          <div>
            <h2 className={s.rotulo}>Identificación</h2>
            <div className={s.pila}>
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

            <h2 className={s.rotulo}>Capacidad y tamaño</h2>
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

            <h2 className={s.rotulo}>Amenidades</h2>
            <div className={s.amenidades}>
              {AMENIDADES.map(({ Icono, label }) => (
                <button key={label} type="button" className={s.amenidad} aria-pressed={form.amenidades.includes(label)} onClick={() => toggleAmenidad(label)}>
                  <Icono size={14} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            <h2 className={s.rotulo}>Descripción pública</h2>
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
            <div className={s.lateral}>
              <div className={s.lateralTitulo}>Tarifa y disponibilidad</div>
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
              <div className={s.interruptor}>
                <div>
                  <div id="venta-linea-t" className={s.interruptorTitulo}>Se vende en línea</div>
                  <p className={s.ayuda}>
                    Encendido: se ofrece en la web y a esta habitación se asignan las reservas de Booking y Airbnb.
                    Apagado: solo la usa la recepción.
                  </p>
                </div>
                <LiquidSwitch checked={form.venta_en_linea} aria-labelledby="venta-linea-t"
                  onCheckedChange={v => setForm(f => ({ ...f, venta_en_linea: v }))} />
              </div>
            </div>

            {/* Vista previa */}
            <div className={s.previa}>
              <div className={s.previaFoto}><Imagen src={room?.foto} alt={room?.nombre ?? 'Nueva habitación'} /></div>
              <div className={s.previaTexto}>
                <span className={s.ayuda}>Vista previa</span>
                <span className={s.previaNombre}>{form.nombre || 'Nombre de habitación'}</span>
                <span className={s.ayuda}>{form.tipo || 'Tipo'}</span>
                {form.tarifa && <span className={s.previaTarifa}>MXN ${Number(form.tarifa).toLocaleString('es-MX')} <small>/ noche</small></span>}
              </div>
            </div>

            <div className={s.notas}>
              {[
                { Icono: CameraIcon, text: 'Las fotos se gestionan desde la galería de la habitación' },
                { Icono: CalendarDotsIcon, text: 'Las fechas de bloqueo se gestionan desde el calendario' },
                { Icono: TrashIcon, text: 'Mandarla a la papelera se hace desde la lista de habitaciones' },
              ].map(item => <div key={item.text} className={s.nota}><item.Icono size={14} aria-hidden="true" /><span>{item.text}</span></div>)}
            </div>
          </div>
        </div>
      </form>
      {/* Fuera del formulario: cada temporada se guarda por su cuenta. */}
      {!nueva && <TarifasTemporada habitacionId={room.id} base={room.tarifa_centavos} />}
    </SectionPanel>
  )
}
