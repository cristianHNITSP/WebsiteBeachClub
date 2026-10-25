import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeftIcon, WifiHighIcon, SnowflakeIcon, CarIcon, BedIcon, SignInIcon, SignOutIcon,
  PawPrintIcon, CigaretteSlashIcon, MapPinIcon, LockSimpleIcon, StarIcon, MinusIcon, PlusIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Stepper, { Step } from '@/components/bits/Stepper'
import Counter from '@/components/bits/Counter'
import SpringCheck from '@/components/bits/SpringCheck'
import BounceCards from '@/components/bits/BounceCards'
import { useTheme } from '@/context/ThemeContext'
import { nochesEntre, aISO, rangoDeParams } from '@/lib/fechas'
import { useParametros } from '@/hooks/useParametros'
import SelectorFechas from '@/components/marca/SelectorFechas'
import s from './DetailPage.module.css'

const AMENITY_META = {
  wifi:    { Icono: WifiHighIcon,  label: 'WiFi incluido' },
  ac:      { Icono: SnowflakeIcon, label: 'Aire acondicionado' },
  parking: { Icono: CarIcon,       label: 'Estacionamiento' },
}

const POLICIES = [
  { Icono: SignInIcon,         label: 'Check-in',  value: '3:00 PM' },
  { Icono: SignOutIcon,        label: 'Check-out', value: '12:00 PM' },
  { Icono: PawPrintIcon,       label: 'Mascotas',  value: 'No permitidas' },
  { Icono: CigaretteSlashIcon, label: 'Fumar',     value: 'No fumador' },
]

// Extras de ejemplo (demo sin backend).
const EXTRAS = [
  { key: 'desayuno', label: 'Desayuno yucateco',     detalle: 'MXN $250 por huésped, por noche', precio: (n, h) => 250 * n * h },
  { key: 'traslado', label: 'Traslado desde Mérida', detalle: 'MXN $900, un viaje',              precio: () => 900 },
  { key: 'tarde',    label: 'Salida tardía (3 PM)',  detalle: 'MXN $450',                        precio: () => 450 },
]

const MAX_HUESPEDES = 6
const mxn = n => `MXN $${Math.round(n).toLocaleString('es-MX')}`
const corta = d => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

function StarRating({ rating }) {
  const full = Math.round(rating)
  return (
    <span className="inline-flex text-secondary" aria-hidden="true">
      {[0, 1, 2, 3, 4].map(i => <StarIcon key={i} size={17} weight={i < full ? 'fill' : 'regular'} />)}
    </span>
  )
}

/* Galería con BounceCards: mide el ancho real y escala tarjetas y abanico. */
function Galeria({ room }) {
  const { reduceMotion } = useTheme()
  const ref = useRef(null)
  const [ancho, setAncho] = useState(0)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setAncho(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const fotos = [room.img, ...[1, 2, 3, 4].map(i => `https://picsum.photos/seed/${room.id}-galeria-${i}/400/400`)]
  const tarjeta = Math.min(190, ancho / 3.4)
  const d = tarjeta * 1.05
  return (
    <div ref={ref} className="w-full" aria-label={`Galería de ${room.title}`} role="img">
      {ancho > 0 && (
        <BounceCards
          images={fotos}
          containerWidth="100%"
          containerHeight={tarjeta * 1.4}
          cardSize={tarjeta}
          pushOffset={tarjeta * 0.7}
          transformStyles={[
            `rotate(8deg) translate(${-d}px)`,
            `rotate(4deg) translate(${-d / 2}px)`,
            'rotate(-3deg)',
            `rotate(-8deg) translate(${d / 2}px)`,
            `rotate(3deg) translate(${d}px)`,
          ]}
          enableHover
          animationDelay={0.3}
          reducirMovimiento={reduceMotion}
        />
      )}
    </div>
  )
}

/* Panel de reserva: Stepper de React Bits en 3 pasos, dentro de la misma Card. */
function PanelReserva({ room, onConfirm }) {
  // Fechas, huéspedes, extras y paso viven en la URL: recargar no pierde la
  // reserva a medias. La aceptación de la política NO: un consentimiento se
  // vuelve a dar.
  const [p, set] = useParametros({ llegada: '', salida: '', huespedes: 2, extras: '', paso: 1 })
  const fechas = rangoDeParams(p.llegada, p.salida)
  const setFechas = r => set({ llegada: aISO(r?.from), salida: aISO(r?.to) })
  const huespedes = Math.min(Math.max(1, p.huespedes), MAX_HUESPEDES)
  const setHuespedes = f => set({ huespedes: typeof f === 'function' ? f(huespedes) : f })
  const listaExtras = p.extras ? p.extras.split(',') : []
  const extras = Object.fromEntries(listaExtras.map(k => [k, true]))
  const setExtra = (clave, activo) =>
    set({ extras: (activo ? [...new Set([...listaExtras, clave])] : listaExtras.filter(k => k !== clave)).join(',') })
  const noches0 = nochesEntre(fechas)
  // Un paso guardado no vale si faltan sus requisitos (p. ej. fechas borradas).
  const paso = noches0 > 0 ? Math.min(Math.max(1, p.paso), 3) : 1
  const setPaso = n => set({ paso: n })
  const [acepta, setAcepta] = useState(false)

  const noches = noches0
  const subtotal = noches * room.price
  const totalExtras = EXTRAS.reduce((t, e) => t + (extras[e.key] ? e.precio(noches, huespedes) : 0), 0)
  const impuestos = (subtotal + totalExtras) * 0.16
  const total = subtotal + totalExtras + impuestos

  const bloqueado = (paso === 1 && noches <= 0) || (paso === 3 && !acepta)

  return (
    <Stepper
      initialStep={paso}
      onStepChange={setPaso}
      onFinalStepCompleted={() => onConfirm?.({
        room,
        checkIn: corta(fechas.from),
        checkOut: corta(fechas.to),
        guests: huespedes,
        total: Math.round(total),
      })}
      completeButtonText="Confirmar reserva"
      nextButtonProps={{ disabled: bloqueado }}
    >
      <Step>
        <div className="grid gap-2">
          <Label htmlFor="det-fechas">¿Cuándo llegas?</Label>
          <SelectorFechas id="det-fechas" value={fechas} onChange={setFechas} />
          <p className={s.datePlaceholder}>
            {noches > 0
              ? `${noches} noche${noches !== 1 ? 's' : ''} por ${mxn(subtotal)}`
              : 'Elige llegada y salida para continuar.'}
          </p>
        </div>
      </Step>

      <Step>
        <div className="grid gap-5">
          <div className={s.huespedes}>
            <span className={s.huespedesLabel} id="lbl-huespedes">Huéspedes</span>
            <div className={s.huespedesControl} role="group" aria-labelledby="lbl-huespedes">
              <Button type="button" variant="outline" size="icon" aria-label="Quitar huésped"
                disabled={huespedes <= 1} onClick={() => setHuespedes(h => h - 1)}>
                <MinusIcon size={16} weight="bold" />
              </Button>
              <span className="sr-only" aria-live="polite">{huespedes}</span>
              <span aria-hidden="true">
                <Counter value={huespedes} places={[1]} fontSize={28} padding={4} gap={0}
                  textColor="var(--foreground)" fontWeight={700}
                  gradientFrom="var(--card)" gradientTo="transparent" gradientHeight={8} />
              </span>
              <Button type="button" variant="outline" size="icon" aria-label="Agregar huésped"
                disabled={huespedes >= MAX_HUESPEDES} onClick={() => setHuespedes(h => h + 1)}>
                <PlusIcon size={16} weight="bold" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            <span className={s.huespedesLabel}>Extras</span>
            {EXTRAS.map(e => (
              <div key={e.key} className={s.extra}>
                <SpringCheck
                  label={e.label}
                  checked={!!extras[e.key]}
                  onChange={v => setExtra(e.key, v)}
                  strike="none"
                  doneOpacity={1}
                  boxSize={22}
                  boxRadius={7}
                  fontSize={14}
                  color="var(--foreground)"
                  fillColor="var(--primary)"
                  checkColor="var(--primary-foreground)"
                />
                <span className={s.extraDetalle}>{e.detalle}</span>
              </div>
            ))}
          </div>
        </div>
      </Step>

      <Step>
        <div>
          <div className={s.summaryRow}>
            <span className={s.summaryLabel}>{mxn(room.price)} × {noches} noche{noches !== 1 ? 's' : ''}</span>
            <span className={s.summaryValue}>{mxn(subtotal)}</span>
          </div>
          {EXTRAS.filter(e => extras[e.key]).map(e => (
            <div key={e.key} className={s.summaryRow}>
              <span className={s.summaryLabel}>{e.label}</span>
              <span className={s.summaryValue}>{mxn(e.precio(noches, huespedes))}</span>
            </div>
          ))}
          <div className={s.summaryRow}>
            <span className={s.summaryLabel}>Impuestos (16%)</span>
            <span className={s.summaryValue}>{mxn(impuestos)}</span>
          </div>
          <Separator className="mt-4" />
          <div className={s.summaryTotal}>
            <span className={s.summaryTotalLabel}>Total</span>
            <span className={s.summaryTotalAmount}>{mxn(total)}</span>
          </div>
          <div className="mt-4">
            <SpringCheck
              label="Acepto la política de cancelación"
              checked={acepta}
              onChange={setAcepta}
              strike="none"
              doneOpacity={1}
              boxSize={22}
              boxRadius={7}
              fontSize={14}
              color="var(--foreground)"
              fillColor="var(--primary)"
              checkColor="var(--primary-foreground)"
            />
          </div>
        </div>
      </Step>
    </Stepper>
  )
}

export default function DetailPage({ room, onGoBack, onConfirm }) {
  if (!room) {
    return (
      <div className={s.wrapper}>
        <div className={s.inner}>
          <div className={s.backRow}>
            <Button variant="ghost" onClick={onGoBack}>
              <ArrowLeftIcon size={16} weight="bold" /> Volver
            </Button>
          </div>
          <p>Habitación no encontrada.</p>
        </div>
      </div>
    )
  }

  const locationLabel = room.location === 'chelem'
    ? 'Cabañas Frida, Chelem, Yucatán'
    : 'Casa Frida, Chuburná, Yucatán'

  return (
    <div className={s.wrapper}>
      <div className={s.inner}>
        <div className={s.backRow}>
          <Button variant="ghost" onClick={onGoBack}>
            <ArrowLeftIcon size={16} weight="bold" /> Volver a resultados
          </Button>
        </div>

        <div className={s.layout}>
          {/* ── LEFT COLUMN ── */}
          <div>
            <div className={s.hero}>
              <img src={room.img} alt={room.title} />
              <div className={s.heroOverlay} />
              <div className={s.heroPrice}>
                {room.hasDiscount && (
                  <del className={s.heroPriceOriginal}>MXN ${room.basePrice.toLocaleString()}</del>
                )}
                <div className={s.heroPriceAmount}>MXN ${room.price.toLocaleString()}</div>
                <div className={s.heroPriceLabel}>por noche</div>
              </div>
            </div>

            <Card className={s.infoCard}>
              <CardContent>
                <div className={s.cardLabel}>
                  <MapPinIcon size={13} weight="fill" aria-hidden="true" />
                  {locationLabel}
                </div>
                <h1 className={s.cardTitle}>{room.title}</h1>

                <div className={s.ratingRow}>
                  <StarRating rating={room.rating} />
                  <span className={s.ratingNum}>{room.rating.toFixed(1)}</span>
                  <span className={s.ratingCount}>({room.reviews} reseñas)</span>
                  {room.size && <Badge variant="outline">{room.size}</Badge>}
                </div>

                <p className={s.desc}>{room.desc}</p>

                <ul className={s.amenities}>
                  {room.amenities.filter(a => AMENITY_META[a]).map(a => {
                    const { Icono, label } = AMENITY_META[a]
                    return (
                      <li key={a}>
                        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground">
                          <Icono size={15} aria-hidden="true" />
                          {label}
                        </Badge>
                      </li>
                    )
                  })}
                  <li>
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground capitalize">
                      <BedIcon size={15} aria-hidden="true" />
                      {room.roomType}
                    </Badge>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className={s.infoCard}>
              <CardContent>
                <div className={s.cardLabel}>Galería</div>
                <Galeria room={room} />
              </CardContent>
            </Card>

            <Card className={s.infoCard}>
              <CardContent>
                <div className={s.cardLabel}>Políticas y condiciones</div>
                <dl className={s.policiesGrid}>
                  {POLICIES.map(item => (
                    <div key={item.label} className={s.policyItem}>
                      <span className={s.policyIcon}><item.Icono size={18} aria-hidden="true" /></span>
                      <div>
                        <dt className={s.policyLabel}>{item.label}</dt>
                        <dd className={s.policyValue}>{item.value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* ── BOOKING SIDEBAR ── */}
          <aside>
            <Card className={s.summaryCard}>
              <CardContent>
                <div className={s.summaryTitle}>Resumen de reserva</div>
                <PanelReserva room={room} onConfirm={onConfirm} />
                <div className={s.secureNote}>
                  <LockSimpleIcon size={13} weight="bold" aria-hidden="true" />
                  Pago seguro y cancelación gratuita
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}
