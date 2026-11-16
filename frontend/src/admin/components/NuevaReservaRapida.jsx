import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircleIcon, MinusIcon, PlusIcon } from '@phosphor-icons/react'
import { toast } from '@/admin/toast'
import { Button } from '@/components/coss/button'
import { Input } from '@/components/coss/input'
import { Label } from '@/components/coss/label'
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from '@/components/coss/sheet'
import { DropletButton } from '@/components/devl/droplet-button'
import { LiquidSegments } from '@/components/devl/liquid-segments'
import { MoneyInput } from '@/components/devl/money-input'
import { StatusPill } from '@/components/status-pill'
import { usePedido } from '@/hooks/usePedido'
import { deISO } from '@/lib/fechas'
import OpcionesCobro from './OpcionesCobro'
import { fichaHabitacion, incluye, pesos } from '../habitaciones'
import { reservasApi } from '../reservas'
import s from './LineaTiempo.module.css'

/*
 * Nueva reserva desde el calendario, sin salir de él (ticket de la recepción, 2026-11-15: saltar
 * al formulario completo hacía perder el hilo). Dos pasos en el mismo panel:
 *   1. Datos: huésped, teléfono, noches, adultos y menores (nunca más que la capacidad).
 *   2. Pago y confirmación: la cotización del servidor (con las personas de más), cuánto pagó ya,
 *      la forma de pago y Confirmar. El mantenimiento se bloquea en el paso 1.
 * Arriba, el estado vivo (como el Delivery Tracker de devl): las fechas en grande, una frase que
 * dice qué falta y los pasos que se van llenando.
 */

const METODOS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
]
const MXN = [{ code: 'MXN', locale: 'es-MX', name: 'Peso mexicano' }]
const corto = d => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

function Contador({ id, etiqueta, valor, min, max, onCambiar }) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium" id={id}>{etiqueta}</span>
      <div className={s.contador} role="group" aria-labelledby={id}>
        <Button type="button" variant="outline" size="icon" aria-label={`Menos: ${etiqueta}`} disabled={valor <= min}
          onClick={() => onCambiar(valor - 1)}><MinusIcon size={14} weight="bold" /></Button>
        <span className={s.contadorValor} aria-live="polite">{valor}</span>
        <Button type="button" variant="outline" size="icon" aria-label={`Más: ${etiqueta}`} disabled={valor >= max}
          onClick={() => onCambiar(valor + 1)}><PlusIcon size={14} weight="bold" /></Button>
      </div>
    </div>
  )
}

export default function NuevaReservaRapida({ nueva, setNueva, hab, salida, choca, crear, reduceMotion, resorte }) {
  const [enviando, setEnviando] = useState(false)
  const paso2 = nueva?.paso === 2 && nueva.tipo === 'reserva'
  const cot = usePedido(
    senal => (paso2
      ? reservasApi.cotizar({ habitacion_id: nueva.habitacionId, llegada: nueva.llegada, salida, adultos: nueva.adultos, ninos: nueva.menores }, senal)
      : null),
    [paso2, nueva?.habitacionId, nueva?.llegada, salida, nueva?.adultos, nueva?.menores],
  )
  const cambiar = cambios => setNueva(n => ({ ...n, ...cambios }))

  return (
    <Sheet open={!!nueva} onOpenChange={o => { if (!o) setNueva(null) }}>
      <SheetPopup closeProps={{ 'aria-label': 'Cerrar' }}>
        {nueva && hab && (() => {
          const bloqueo = nueva.tipo === 'bloqueo'
          const listo = bloqueo || nueva.huesped.trim().length >= 2
          const c = paso2 ? cot.datos : null
          const primera = c?.precios_noche_centavos?.[0] ?? 0
          const monto = Math.min(nueva.monto, c?.total_centavos ?? nueva.monto)
          const llenos = paso2 ? 2 : listo ? 2 : 1
          const relleno = i => (i < llenos ? 1 : i === llenos ? (paso2 && monto > 0 ? 0.7 : 0.35) : 0)
          const fase = choca
            ? `Choca con ${choca.estado === 'bloqueo' ? 'un bloqueo de mantenimiento' : `la reserva de ${choca.huesped}`}. Reduce las noches o elige otro día.`
            : bloqueo ? 'Esas noches quedan fuera de venta mientras dure el mantenimiento.'
              : paso2 ? (c && !c.disponible ? `Esas noches ya están ocupadas: ${c.choque}.` : 'Registra lo que ya pagó el cliente y confirma.')
                : listo ? 'Sigue el pago: cuánto deja el cliente y con qué paga.'
                  : 'Escribe el nombre del huésped para continuar.'
          const entra = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, filter: 'blur(2px)' }
          const personas = [plural(nueva.adultos, 'adulto', 'adultos'), nueva.menores ? plural(nueva.menores, 'menor', 'menores') : null].filter(Boolean).join(' y ')

          const confirmar = async () => {
            if (!c?.disponible || enviando) return
            setEnviando(true)
            const fallo = await crear({
              tipo: 'reserva', habitacion_id: hab.id, llegada: nueva.llegada, salida,
              huesped_nombre: nueva.huesped.trim(), huesped_telefono: nueva.telefono.trim() || null,
              adultos: nueva.adultos, ninos: nueva.menores,
              pago_inicial: monto > 0 ? { metodo: nueva.metodo, referencia: nueva.referencia.trim() || null, monto_centavos: monto } : null,
            })
            setEnviando(false)
            if (fallo) { toast.error('No se guardó la reserva', { description: fallo.message }); return }
            toast.success('Reserva confirmada', { description: `${nueva.huesped.trim()}, ${hab.name}, ${corto(deISO(nueva.llegada))} → ${corto(deISO(salida))}.` })
            setNueva(null)
          }
          const bloquear = async () => {
            const fallo = await crear({ tipo: 'bloqueo', habitacion_id: hab.id, llegada: nueva.llegada, salida, notas: nueva.huesped.trim() || 'Mantenimiento' })
            if (fallo) { toast.error('No se bloquearon las fechas', { description: fallo.message }); return }
            toast.success('Fechas bloqueadas', { description: `${nueva.huesped.trim() || 'Mantenimiento'}, ${hab.name}.` })
            setNueva(null)
          }

          return (
            <form className={s.hojaForm} onSubmit={e => {
              e.preventDefault()
              if (!listo || choca) return
              if (bloqueo) bloquear()
              else if (!paso2) cambiar({ paso: 2 })
              else confirmar()
            }}>
              <SheetHeader>
                <SheetTitle>{bloqueo ? 'Bloquear fechas' : paso2 ? 'Pago y confirmación' : 'Nueva reserva'}</SheetTitle>
                <SheetDescription>{hab.name}. {fichaHabitacion({ tipo: hab.type, cama: hab.cama, capacidad: hab.capacidad })}.</SheetDescription>
              </SheetHeader>
              <SheetPanel className={s.hojaCuerpo}>
                <section className={s.hojaEstado} aria-live="polite">
                  <span className={s.hojaEtiqueta}>{bloqueo ? 'Fuera de venta' : paso2 ? `${nueva.huesped.trim()}, ${personas}` : 'Estancia'}</span>
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span key={paso2 && c ? `t${c.total_centavos}` : salida} className={s.hojaCifra} initial={entra}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
                      {paso2 && c ? pesos(c.total_centavos) : `${corto(deISO(nueva.llegada))} → ${corto(deISO(salida))}`}
                    </motion.span>
                  </AnimatePresence>
                  <span className={s.hojaSub}>
                    {paso2
                      ? `${corto(deISO(nueva.llegada))} → ${corto(deISO(salida))}, ${plural(nueva.noches, 'noche', 'noches')}`
                      : `${plural(nueva.noches, 'noche', 'noches')}${bloqueo ? '' : `, ${personas}`}`}
                  </span>
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.p key={fase} className={choca || (c && !c.disponible) ? s.formError : s.formAyuda}
                      role={choca || (c && !c.disponible) ? 'alert' : undefined}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                      {fase}
                    </motion.p>
                  </AnimatePresence>
                  {!bloqueo && (
                    <ol className={s.etapas} aria-label="Pasos de la reserva">
                      {['Fechas', 'Huésped', 'Pago y confirmación'].map((t, i) => (
                        <li key={t} className={s.etapa}>
                          <span className={s.etapaBarra}>
                            <motion.span className={s.etapaRelleno} initial={false} transition={resorte} animate={{ scaleX: relleno(i) }} />
                          </span>
                          <span aria-current={i === llenos ? 'step' : undefined} className={i <= llenos ? s.etapaActiva : s.etapaPendiente}>{t}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                {!paso2 ? (
                  <>
                    <section className={s.formulario}>
                      <LiquidSegments options={[{ value: 'reserva', label: 'Reserva' }, { value: 'bloqueo', label: 'Mantenimiento' }]} value={nueva.tipo}
                        onValueChange={v => cambiar({ tipo: v })} aria-label="Tipo" size="sm" />
                      <div className="grid gap-2">
                        <Label htmlFor="lt-huesped">{bloqueo ? 'Motivo' : 'Huésped'}</Label>
                        <Input id="lt-huesped" autoFocus value={nueva.huesped} maxLength={120} autoComplete="off"
                          placeholder={bloqueo ? 'Ej. Pintura, plomería' : 'Nombre completo'}
                          onChange={e => cambiar({ huesped: e.target.value })} size="lg" />
                      </div>
                      {!bloqueo && (
                        <div className="grid gap-2">
                          <Label htmlFor="lt-telefono">Teléfono (opcional)</Label>
                          <Input id="lt-telefono" type="tel" inputMode="tel" value={nueva.telefono} maxLength={20}
                            placeholder="+52 999 000 0000" onChange={e => cambiar({ telefono: e.target.value })} size="lg" />
                        </div>
                      )}
                    </section>
                    <section className={s.formFila}>
                      <Contador id="lt-noches" etiqueta="Noches" valor={nueva.noches} min={1} max={30} onCambiar={v => cambiar({ noches: v })} />
                      {!bloqueo && <>
                        <Contador id="lt-adultos" etiqueta="Adultos" valor={nueva.adultos} min={1} max={hab.capacidad - nueva.menores}
                          onCambiar={v => cambiar({ adultos: v })} />
                        <Contador id="lt-menores" etiqueta="Menores" valor={nueva.menores} min={0} max={hab.capacidad - nueva.adultos}
                          onCambiar={v => cambiar({ menores: v })} />
                      </>}
                    </section>
                    {!bloqueo && <p className={s.formAyuda}>{incluye(hab)}</p>}
                  </>
                ) : !c ? (
                  <section className={s.formulario}>
                    {cot.error
                      ? <p className={s.formError} role="alert">{cot.error.message}</p>
                      : <StatusPill size="sm" phases={['Consultando tarifa', 'Revisando noches libres']} interval={1100} done={false} />}
                  </section>
                ) : (
                  <>
                    <section className={s.formulario} aria-label="Costo">
                      <div className={s.resumenFila}><span>Tarifa por noche</span><strong>{pesos(c.tarifa_noche_centavos)}</strong></div>
                      {c.extra_noche_centavos > 0 && (
                        <div className={s.resumenFila}>
                          <span>{[c.adultos_extra && plural(c.adultos_extra, 'adulto', 'adultos'), c.menores_extra && plural(c.menores_extra, 'menor', 'menores')].filter(Boolean).join(' y ')} de más</span>
                          <strong>+{pesos(c.extra_noche_centavos)} por noche</strong>
                        </div>
                      )}
                      <div className={s.resumenFila}><span>{plural(c.noches, 'noche', 'noches')}</span><strong>{pesos(c.total_centavos)}</strong></div>
                    </section>
                    <section className={s.formulario}>
                      <span className="text-sm font-medium">¿Cuánto pagó ya el cliente?</span>
                      <OpcionesCobro pendientes={c.precios_noche_centavos} valor={monto} extras={[{ etiqueta: 'Sin pago inicial', monto: 0 }]}
                        onElegir={m => cambiar({ monto: m })} />
                      <MoneyInput label="Otro monto" currencies={MXN} currency="MXN" min={0} max={c.total_centavos / 100}
                        value={monto ? monto / 100 : null} onValueChange={v => cambiar({ monto: v == null ? 0 : Math.round(v * 100) })} />
                      {monto > 0 && (
                        <>
                          <span className="text-sm font-medium" id="lt-metodo">Forma de pago</span>
                          <LiquidSegments options={METODOS} value={nueva.metodo} onValueChange={v => cambiar({ metodo: v })} aria-labelledby="lt-metodo" size="sm" />
                          {nueva.metodo !== 'efectivo' && (
                            <Input aria-label="Referencia (folio o autorización)" placeholder="Referencia (folio o autorización)" maxLength={100}
                              value={nueva.referencia} onChange={e => cambiar({ referencia: e.target.value })} size="lg" />
                          )}
                        </>
                      )}
                      <p className={s.formAyuda}>
                        {monto >= c.total_centavos ? 'Queda todo pagado.'
                          : monto >= primera ? `Quedan ${pesos(c.total_centavos - monto)} por cobrar, noche por noche o de una vez.`
                            : `Al llegar se cobra al menos la primera noche (${pesos(primera)}).`}
                      </p>
                    </section>
                  </>
                )}
              </SheetPanel>
              <SheetFooter>
                {paso2
                  ? <Button type="button" variant="outline" onClick={() => cambiar({ paso: 1 })}>Volver</Button>
                  : <Button type="button" variant="outline" onClick={() => setNueva(null)}>Cancelar</Button>}
                <DropletButton type="submit" disabled={!listo || !!choca || (paso2 && (!c || !c.disponible || enviando))}>
                  {paso2 && <CheckCircleIcon size={16} weight="bold" aria-hidden="true" />}
                  {bloqueo ? 'Bloquear fechas' : paso2 ? (enviando ? 'Guardando…' : 'Confirmar reserva') : 'Continuar al pago'}
                </DropletButton>
              </SheetFooter>
            </form>
          )
        })()}
      </SheetPopup>
    </Sheet>
  )
}
