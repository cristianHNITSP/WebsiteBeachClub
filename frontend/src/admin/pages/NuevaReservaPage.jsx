import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import SectionPanel from '../components/SectionPanel'
import { CalculatorIcon, ChartLineIcon, CheckCircleIcon, CreditCardIcon } from '@phosphor-icons/react'
import { Button } from '@/components/coss/button'
import { DropletButton } from '@/components/devl/droplet-button'
import { MoneyInput } from '@/components/devl/money-input'
import { useConfetti } from '@/components/devl/confetti-burst'
import { Field, Input, Select, Textarea } from '@/components/frida/Field'
import OpcionesCobro from '../components/OpcionesCobro'
import SelectorFechas from '@/components/marca/SelectorFechas'
import { toast } from '@/admin/toast'
import { usePedido } from '@/hooks/usePedido'
import { useSesion } from '@/lib/sesion'
import { aISO, deISO, rangoDeParams } from '@/lib/fechas'
import { CartDrawer } from '@/components/cart-drawer'
import { StatusPill } from '@/components/status-pill'
import { fichaHabitacion, habitacionesApi, pesos } from '../habitaciones'
import { reservasApi, sumarDias } from '../reservas'
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

const corta = f => deISO(f)?.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) ?? ''
const MXN = [{ code: 'MXN', locale: 'es-MX', name: 'Peso mexicano' }]
const FLORES = ['bg-flor-morado', 'bg-flor-dorado', 'bg-flor-turquesa', 'bg-flor-orquidea', 'bg-flor-naranja']

export default function NuevaReservaPage({ onBack, onDirtyChange }) {
  const { fire, layer } = useConfetti({ palette: FLORES })
  const { sesion } = useSesion()
  const { propiedadId } = usePropiedadActual()
  const propiedades = sesion?.propiedades ?? []
  const base = { ...VACIO, propiedad: propiedadId ?? (propiedades.length === 1 ? propiedades[0].id : '') }
  // Lo que ya se eligió en el calendario (Línea de tiempo) llega en la URL: habitación, fechas,
  // huésped y personas. Cuenta como captura: salir sin guardar pide confirmación.
  const [params] = useSearchParams()
  const [form, setForm] = useState(() => {
    const previo = {
      propiedad: params.get('propiedad'), habitacion: params.get('habitacion'), llegada: params.get('llegada'),
      salida: params.get('salida'), huespedNombre: params.get('huesped'), adultos: params.get('adultos'),
    }
    return { ...base, ...Object.fromEntries(Object.entries(previo).filter(([, v]) => v)) }
  })
  const [submitting, setSubmitting] = useState(false)

  const dirty = JSON.stringify(form) !== JSON.stringify(base)
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty])  // eslint-disable-line

  const set = key => e => setForm(prev => ({ ...prev, [key]: e.target.value, ...(key === 'propiedad' ? { habitacion: '' } : {}) }))

  // Habitaciones reservables de la propiedad elegida.
  const habs = usePedido(
    senal => (form.propiedad ? habitacionesApi.listar({ propiedad: form.propiedad, estado: 'activa', por_pagina: 100 }, senal) : null),
    [form.propiedad],
  )
  const habitacion = habs.datos?.items.find(h => h.id === form.habitacion)

  // Personas coordinadas con la habitación: nunca más de su capacidad (adultos + niños).
  const capacidad = habitacion?.capacidad ?? 10
  const ajustar = (f, cap) => {
    const adultos = Math.min(Math.max(1, Number(f.adultos)), cap)
    return { ...f, adultos: String(adultos), ninos: String(Math.min(Number(f.ninos), cap - adultos)) }
  }
  const elegirHabitacion = e => {
    const h = habs.datos?.items.find(x => x.id === e.target.value)
    setForm(f => (h ? ajustar({ ...f, habitacion: h.id }, h.capacidad) : { ...f, habitacion: e.target.value }))
  }
  const elegirAdultos = e => setForm(f => ajustar({ ...f, adultos: e.target.value }, capacidad))

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
  // El resumen de la reserva en el panel lateral (CartDrawer): una línea con las noches.
  // El paso de noches mueve la salida; el precio por noche es el promedio de lo que cotizó el servidor.
  const [bolsa, setBolsa] = useState(false)
  const lineas = c && habitacion ? [{
    id: 'estancia', name: habitacion.nombre, variant: `${corta(form.llegada)} → ${corta(form.salida)}`, qty: c.noches, max: 30,
    price: c.total_centavos / 100 / c.noches,
  }] : []
  const cambiarNoches = items => {
    const n = items[0]?.qty ?? 1 // quitar la línea no borra nada: se queda en 1 noche
    setForm(f => ({ ...f, salida: aISO(sumarDias(deISO(f.llegada), Math.max(1, n))) }))
  }
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
      toast.success('Reserva confirmada', { description: `${r.codigo}, ${r.huesped_nombre}.` })
      fire()
      setTimeout(onBack, 900) // que alcance a verse el confeti
    } catch (err) {
      toast.error('No se guardó', { description: err.message })
      setSubmitting(false)
    }
  }

  const actions = (
    <>
      <Button variant="outline" size="lg" className="rounded-full" onClick={onBack}>Cancelar</Button>
      <span className={s.confeti}>
        <DropletButton type="submit" form="nueva-reserva-form" disabled={submitting || !fechasOk || (c && !c.disponible) || excede}>
          <CheckCircleIcon size={16} weight="bold" aria-hidden="true" />
          {submitting ? 'Guardando…' : 'Confirmar reserva'}
        </DropletButton>
        {layer}
      </span>
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
      title="Nueva reserva"
      subtitle="Completa los datos para registrar la reservación en el sistema"
      onBack={onBack}
      dirty={dirty}
      actions={actions}
    >
      <form id="nueva-reserva-form" onSubmit={handleSubmit}>
        <div className={s.formGrid}>

          {/* ── Columna izquierda ── */}
          <div>
            <h2 className={s.rotulo}>Datos del huésped</h2>
            <div className={s.pila}>
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

            <h2 className={s.rotulo}>Detalles de la estancia</h2>
            <div className={s.pila}>
              <div className={s.twoCol}>
                <Field label="Propiedad">
                  <Select required value={form.propiedad} onChange={set('propiedad')}>
                    <option value="">Seleccionar…</option>
                    {propiedades.map(p => <option key={p.id} value={p.id}>{p.nombre}, {p.lugar}</option>)}
                  </Select>
                </Field>
                <Field label="Habitación">
                  <Select required value={form.habitacion} onChange={elegirHabitacion} disabled={!form.propiedad || habs.cargando}>
                    <option value="">{habs.error ? 'No se pudieron cargar' : 'Seleccionar…'}</option>
                    {habs.datos?.items.map(h => <option key={h.id} value={h.id}>{h.nombre}, {h.tipo} (hasta {h.capacidad})</option>)}
                  </Select>
                  {habitacion && <p className={s.ayuda}>{fichaHabitacion(habitacion)}.</p>}
                </Field>
              </div>
              <Field label="Llegada y salida">
                <SelectorFechas className="rounded-lg"
                  ariaLabel="Llegada y salida"
                  value={rangoDeParams(form.llegada, form.salida)}
                  onChange={r => setForm(f => ({ ...f, llegada: aISO(r.from), salida: aISO(r.to) }))}
                />
              </Field>
              <div className={s.twoCol}>
                <Field label="Adultos">
                  <Select value={form.adultos} onChange={elegirAdultos}>
                    {Array.from({ length: capacidad }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                  </Select>
                </Field>
                <Field label="Niños">
                  <Select value={form.ninos} onChange={set('ninos')} disabled={capacidad - Number(form.adultos) <= 0}>
                    {Array.from({ length: Math.max(0, capacidad - Number(form.adultos)) + 1 }, (_, i) => i).map(n => <option key={n} value={n}>{n}</option>)}
                  </Select>
                </Field>
              </div>
              {habitacion && !excede && (
                <p className={s.ayuda}>«{habitacion.nombre}» recibe hasta {habitacion.capacidad} personas entre adultos y niños.</p>
              )}
              {excede && (
                <p role="alert" className={s.alerta}>
                  «{habitacion.nombre}» es para {habitacion.capacidad} personas como máximo.
                </p>
              )}
            </div>

            <h2 className={s.rotulo}>Notas internas</h2>
            <Field label="Observaciones y peticiones especiales">
              <Textarea maxLength={1000} placeholder="Peticiones especiales, alergias, ocasión especial…"
                value={form.notas} onChange={set('notas')} style={{ minHeight: '90px' }} />
            </Field>
          </div>

          {/* ── Columna derecha ── */}
          <div className={s.sidePanel}>
            <div className={s.lateral}>
              <div className={s.lateralTitulo}>¿Cuánto pagó ya el cliente?</div>
              {!c ? (
                <p className={s.ayuda}>Elige habitación y fechas para ver las opciones.</p>
              ) : (
                <>
                  <OpcionesCobro
                    pendientes={c.precios_noche_centavos}
                    valor={montoInicial}
                    extras={[{ etiqueta: 'Sin pago inicial', monto: 0 }]}
                    onElegir={m => setForm(f => ({ ...f, montoPago: m ? (m / 100).toFixed(2) : '' }))}
                  />
                  <MoneyInput label="Otro monto" currencies={MXN} currency="MXN" min={0} max={c.total_centavos / 100}
                    value={form.montoPago === '' ? null : Number(form.montoPago)}
                    onValueChange={v => setForm(f => ({ ...f, montoPago: v == null ? '' : String(v) }))} />
                  <p className={s.ayuda}>
                    {montoInicial >= c.total_centavos ? 'Queda todo pagado.'
                      : montoInicial > 0 ? `Quedan ${pesos(c.total_centavos - montoInicial)} por cobrar. Se registran por noche o completos desde el detalle.`
                        : 'El cobro se registra después, en el detalle de la reserva o en Llegadas y salidas.'}
                  </p>
                  <Field label="Forma de pago">
                    <Select value={form.metodoPago} onChange={set('metodoPago')} disabled={montoInicial === 0}>
                      {Object.entries(METODOS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                  </Field>
                  {montoInicial === 0 && <p className={s.ayuda}>Se habilita al registrar un pago inicial.</p>}
                  {montoInicial > 0 && form.metodoPago !== 'efectivo' && (
                    <Field label="Referencia (folio, autorización)">
                      <Input maxLength={100} value={form.referencia} onChange={set('referencia')} />
                    </Field>
                  )}
                </>
              )}
            </div>

            {/* Resumen: lo calcula el servidor. Se abre como panel lateral para repasar y confirmar. */}
            <CartDrawer
              pantalla
              className="border-0 bg-transparent shadow-none"
              items={lineas}
              onItemsChange={cambiarNoches}
              open={bolsa}
              onOpenChange={setBolsa}
              currency="MXN"
              locale="es-MX"
              freeShippingAt={c ? c.total_centavos / 100 : undefined}
              progresoActual={c ? Math.min(montoInicial, c.total_centavos) / 100 : 0}
              checkoutDisabled={submitting || !c || !c.disponible || excede}
              onCheckout={() => { setBolsa(false); document.getElementById('nueva-reserva-form')?.requestSubmit() }}
              textos={{
                titulo: 'Tu reserva', abrir: 'Ver tu reserva', subtotal: 'Total (IVA incluido)', envio: 'Pagó al reservar',
                envioLibre: 'Todo pagado', envioPendiente: montoInicial > 0 ? `${pesos(Math.min(montoInicial, c?.total_centavos ?? 0))}, ${METODOS[form.metodoPago]}` : pesos(0),
                pagar: 'Confirmar reserva', volver: 'Volver', vacio: 'Aún no hay reserva', vacioAyuda: 'Elige habitación y fechas.',
                barraLibre: 'Todo pagado', barraFalta: 'por cobrar', cantidad: 'Noches de', menos: 'Una noche menos en', mas: 'Una noche más en', quitar: 'Dejar en una noche',
              }}
            >
              {boton => (
                <div className={s.lateral} aria-live="polite">
                  <div className="flex items-center justify-between gap-2">
                    <div className={s.lateralTitulo}>Resumen de costo</div>
                    <div className="flex items-center gap-2">
                      {form.habitacion && fechasOk && (
                        <StatusPill size="sm" phases={['Consultando tarifa', 'Revisando noches libres']} doneLabel="Cotizado" interval={1100} done={!cot.cargando} />
                      )}
                      {c && boton}
                    </div>
                  </div>
                  {!c ? (
                    <p className={s.ayuda}>{cot.error ? cot.error.message : 'Elige habitación y fechas para ver el costo.'}</p>
                  ) : (
                    <>
                      {filas.map(row => <div key={row.label} className={s.resumenFila}><span>{row.label}</span><strong>{row.value}</strong></div>)}
                      <div className={s.resumenTotal}><span>Total (IVA incluido)</span><strong>{pesos(c.total_centavos)}</strong></div>
                      {!c.disponible && <p role="alert" className={s.alerta}>Esas noches ya están ocupadas: {c.choque}.</p>}
                    </>
                  )}
                </div>
              )}
            </CartDrawer>

            <div className={s.notas}>
              {[
                { Icono: CalculatorIcon, text: 'Los montos los calcula el sistema con la tarifa de la habitación.' },
                { Icono: CreditCardIcon, text: 'Lo que falte por cobrar se cobra después, noche por noche o de una vez, desde el detalle o en Llegadas y salidas.' },
                { Icono: ChartLineIcon, text: 'Para mover o estirar la reserva, usa la Línea de tiempo.' },
              ].map(item => <div key={item.text} className={s.nota}><item.Icono size={15} aria-hidden="true" /><span>{item.text}</span></div>)}
            </div>
          </div>
        </div>
      </form>
    </SectionPanel>
  )
}
