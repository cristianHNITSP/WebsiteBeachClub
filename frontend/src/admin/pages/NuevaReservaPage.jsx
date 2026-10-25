import { useState, useEffect } from 'react'
import SectionPanel from '../components/SectionPanel'
import { CalculatorIcon, ChartLineIcon, CheckCircleIcon, CreditCardIcon, HourglassIcon } from '@phosphor-icons/react'
import { Field, Input, Select, Textarea } from '@/components/frida/Field'
import OpcionesCobro from '../components/OpcionesCobro'
import SelectorFechas from '@/components/marca/SelectorFechas'
import { useToast } from '@/components/frida/Toast'
import { usePedido } from '@/hooks/usePedido'
import { useSesion } from '@/lib/sesion'
import { aISO, rangoDeParams } from '@/lib/fechas'
import { habitacionesApi, pesos } from '../habitaciones'
import { reservasApi } from '../reservas'
import { usePropiedadActual } from '../propiedadActual'
import s from './FormLayout.module.css'

/*
 * Captura de una reserva en el panel (fase 3c). Los montos los calcula SIEMPRE
 * el servidor (`/cotizar`): aquí solo se muestran. Se registra lo que el cliente
 * YA pagó (nada, unas noches, todo u otro monto); el resto se cobra después.
 */

const VACIO = {
  huespedNombre: '', huespedEmail: '', huespedTel: '',
  habitacion: '', llegada: '', salida: '', adultos: '2', ninos: '0', metodoPago: 'efectivo', referencia: '', notas: '', montoPago: '',
}
const METODOS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta crédito / débito', transferencia: 'Transferencia bancaria' }

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

const claro = (pct) => `color-mix(in srgb, var(--primary-foreground) ${pct}%, transparent)`

export default function NuevaReservaPage({ onBack, onDirtyChange }) {
  const addToast = useToast()
  const { sesion } = useSesion()
  const { propiedadId } = usePropiedadActual()
  const propiedades = sesion?.propiedades ?? []
  const inicial = { ...VACIO, propiedad: propiedadId ?? (propiedades.length === 1 ? propiedades[0].id : '') }
  const [form, setForm] = useState(inicial)
  const [submitting, setSubmitting] = useState(false)

  const dirty = JSON.stringify(form) !== JSON.stringify(inicial)
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty])  // eslint-disable-line

  const set = key => e => setForm(prev => ({ ...prev, [key]: e.target.value, ...(key === 'propiedad' ? { habitacion: '' } : {}) }))

  // Habitaciones reservables de la propiedad elegida.
  const habs = usePedido(
    senal => (form.propiedad ? habitacionesApi.listar({ propiedad: form.propiedad, estado: 'activa', por_pagina: 100 }, senal) : null),
    [form.propiedad],
  )
  const habitacion = habs.datos?.items.find(h => h.id === form.habitacion)

  // Cotización del servidor (total, anticipo, saldo y si las noches están libres).
  const fechasOk = form.llegada && form.salida && form.salida > form.llegada
  const cot = usePedido(
    senal => (form.habitacion && fechasOk
      ? reservasApi.cotizar({ habitacion_id: form.habitacion, llegada: form.llegada, salida: form.salida }, senal)
      : null),
    [form.habitacion, form.llegada, form.salida],
  )
  const c = form.habitacion && fechasOk ? cot.datos : null
  // Lo que el cliente ya pagó al reservar (decisión del usuario, 2026-10-24: no
  // hay "política de cobro" en Configuración; se decide aquí, reserva por reserva).
  const montoInicial = form.montoPago ? Math.round(Number(form.montoPago) * 100) : 0
  const personas = Number(form.adultos) + Number(form.ninos)
  const excede = habitacion && personas > habitacion.capacidad

  const handleSubmit = async e => {
    e.preventDefault()
    if (c && !c.disponible) return
    setSubmitting(true)
    try {
      const r = await reservasApi.crear({
        habitacion_id: form.habitacion,
        llegada: form.llegada,
        salida: form.salida,
        adultos: Number(form.adultos),
        ninos: Number(form.ninos),
        huesped_nombre: form.huespedNombre,
        huesped_correo: form.huespedEmail || null,
        huesped_telefono: form.huespedTel || null,
        notas: form.notas,
        // Lo que el cliente ya dio (nada, unas noches o todo); el resto se cobra después.
        pago_inicial: montoInicial > 0
          ? { metodo: form.metodoPago, referencia: form.referencia || null, monto_centavos: montoInicial }
          : null,
      })
      onDirtyChange?.(false)
      addToast(`${r.codigo}, ${r.huesped_nombre}.`, { type: 'success', title: 'Reserva confirmada' })
      onBack()
    } catch (err) {
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
        form="nueva-reserva-form"
        disabled={submitting || !fechasOk || (c && !c.disponible) || excede}
        className="btn-primary"
        style={{ opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
      >
        {submitting ? <HourglassIcon size={15} aria-hidden="true" /> : <CheckCircleIcon size={15} weight="bold" aria-hidden="true" />}
        {submitting ? 'Guardando…' : 'Confirmar reserva'}
      </button>
    </>
  )

  const filas = c ? [
    { label: 'Tarifa por noche', value: pesos(c.tarifa_noche_centavos) },
    { label: 'Noches', value: String(c.noches) },
    { label: 'Pagó al reservar', value: pesos(Math.min(montoInicial, c.total_centavos)) },
    { label: 'Queda por cobrar', value: pesos(Math.max(c.total_centavos - montoInicial, 0)) },
  ] : []

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
        <div className={s.formGrid}>

          {/* ── Columna izquierda ── */}
          <div>
            <SectionLabel>Datos del huésped</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Field label="Nombre completo">
                <Input required minLength={2} maxLength={120} placeholder="Ej. Ana García López"
                  value={form.huespedNombre} onChange={set('huespedNombre')} />
              </Field>
              <div className={s.twoCol}>
                <Field label="Correo electrónico">
                  <Input type="email" maxLength={254} placeholder="correo@ejemplo.com"
                    value={form.huespedEmail} onChange={set('huespedEmail')} />
                </Field>
                <Field label="Teléfono">
                  <Input type="tel" maxLength={20} placeholder="+52 999 000 0000"
                    value={form.huespedTel} onChange={set('huespedTel')} />
                </Field>
              </div>
            </div>

            <SectionLabel>Detalles de la estancia</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className={s.twoCol}>
                <Field label="Propiedad">
                  <Select required value={form.propiedad} onChange={set('propiedad')}>
                    <option value="">Seleccionar…</option>
                    {propiedades.map(p => <option key={p.id} value={p.id}>{p.nombre}, {p.lugar}</option>)}
                  </Select>
                </Field>
                <Field label="Habitación">
                  <Select required value={form.habitacion} onChange={set('habitacion')} disabled={!form.propiedad || habs.cargando}>
                    <option value="">{habs.error ? 'No se pudieron cargar' : 'Seleccionar…'}</option>
                    {habs.datos?.items.map(h => <option key={h.id} value={h.id}>{h.nombre} ({h.capacidad} pers.)</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="Llegada y salida">
                <SelectorFechas
                  ariaLabel="Llegada y salida"
                  value={rangoDeParams(form.llegada, form.salida)}
                  onChange={r => setForm(f => ({ ...f, llegada: aISO(r.from), salida: aISO(r.to) }))}
                />
              </Field>
              <div className={s.twoCol}>
                <Field label="Adultos">
                  <Select value={form.adultos} onChange={set('adultos')}>
                    {[1, 2, 3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
                  </Select>
                </Field>
                <Field label="Niños">
                  <Select value={form.ninos} onChange={set('ninos')}>
                    {[0, 1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                  </Select>
                </Field>
              </div>
              {excede && (
                <p role="alert" style={{ fontSize: 'var(--fs-sm)', color: 'var(--destructive)' }}>
                  «{habitacion.nombre}» es para {habitacion.capacidad} personas como máximo.
                </p>
              )}
            </div>

            <SectionLabel>Notas internas</SectionLabel>
            <Field label="Observaciones y peticiones especiales">
              <Textarea maxLength={1000} placeholder="Peticiones especiales, alergias, ocasión especial…"
                value={form.notas} onChange={set('notas')} style={{ minHeight: '90px' }} />
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
                ¿Cuánto pagó ya el cliente?
              </div>
              {!c ? (
                <p style={{ margin: 0, fontSize: 'var(--fs-xs)', color: 'var(--on-surface-var)' }}>Elige habitación y fechas para ver las opciones.</p>
              ) : (
                <>
                  <OpcionesCobro
                    pendientes={c.precios_noche_centavos}
                    valor={montoInicial}
                    extras={[{ etiqueta: 'Nada todavía', monto: 0 }]}
                    onElegir={m => setForm(f => ({ ...f, montoPago: m ? (m / 100).toFixed(2) : '' }))}
                  />
                  <Field label={`Otro monto (MXN, hasta ${pesos(c.total_centavos)})`}>
                    <Input type="number" min="0" step="0.01" max={c.total_centavos / 100} placeholder="0.00"
                      value={form.montoPago} onChange={set('montoPago')} />
                  </Field>
                  <p style={{ margin: 0, fontSize: 'var(--fs-xs)', color: 'var(--on-surface-var)' }}>
                    {montoInicial >= c.total_centavos ? 'Queda todo pagado.'
                      : montoInicial > 0 ? `Quedarán ${pesos(c.total_centavos - montoInicial)} por cobrar (noche por noche o de una vez, desde el detalle).`
                        : 'Se cobra después, desde el detalle de la reserva o en Llegadas y salidas.'}
                  </p>
                  {montoInicial > 0 && (
                    <Field label="Forma de pago">
                      <Select value={form.metodoPago} onChange={set('metodoPago')}>
                        {Object.entries(METODOS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </Select>
                    </Field>
                  )}
                  {montoInicial > 0 && form.metodoPago !== 'efectivo' && (
                    <Field label="Referencia (folio, autorización)">
                      <Input maxLength={100} value={form.referencia} onChange={set('referencia')} />
                    </Field>
                  )}
                </>
              )}
            </div>

            {/* Resumen: lo calcula el servidor */}
            <div aria-live="polite" style={{
              background: 'var(--primary)', borderRadius: 'var(--radius-xl)', padding: '22px', color: 'var(--primary-foreground)',
            }}>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', fontWeight: 800,
                letterSpacing: '0.18em', textTransform: 'uppercase', color: claro(80), marginBottom: '14px',
              }}>
                Resumen de costo
              </div>
              {!c ? (
                <p style={{ fontSize: 'var(--fs-sm)', color: claro(80) }}>
                  {cot.error ? cot.error.message : 'Elige habitación y fechas para ver el costo.'}
                </p>
              ) : (
                <>
                  {filas.map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: 'var(--fs-xs)', color: claro(75) }}>{row.label}</span>
                      <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700 }}>{row.value}</span>
                    </div>
                  ))}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${claro(15)}`,
                  }}>
                    <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: claro(85) }}>Total (IVA incluido)</span>
                    <span style={{ fontFamily: 'var(--font-headline)', fontSize: '1.5rem' }}>{pesos(c.total_centavos)}</span>
                  </div>
                  {!c.disponible && (
                    <p role="alert" style={{ marginTop: '12px', fontSize: 'var(--fs-sm)', fontWeight: 700 }}>
                      Esas noches ya están ocupadas: {c.choque}.
                    </p>
                  )}
                </>
              )}
            </div>

            <div style={{
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-var)',
              borderRadius: 'var(--radius-xl)', padding: '18px',
              display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              {[
                { Icono: CalculatorIcon, text: 'Los montos los calcula el sistema con la tarifa de la habitación.' },
                { Icono: CreditCardIcon, text: 'Lo que falte por cobrar se cobra después, noche por noche o de una vez, desde el detalle o en Llegadas y salidas.' },
                { Icono: ChartLineIcon, text: 'Para mover o estirar la reserva, usa la Línea de tiempo.' },
              ].map(item => (
                <div key={item.text} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <item.Icono size={15} aria-hidden="true" style={{ color: 'var(--primary)', marginTop: '1px', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-xs)', color: 'var(--on-surface-var)', lineHeight: 1.5 }}>
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
