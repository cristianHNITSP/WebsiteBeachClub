import { useEffect, useRef, useState } from 'react'
import { ArrowClockwiseIcon, ArrowSquareOutIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { toast } from '@/admin/toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/coss/button'
import { Input } from '@/components/coss/input'
import { Label } from '@/components/coss/label'
import { StatusPill } from '@/components/status-pill'
import { WorkingOutLoud } from '@/components/working-out-loud'
import { SkeletonCard } from '@/components/frida/Skeleton'
import { Florecita } from '@/components/marca/Wordmark'
import ConfirmarRiesgo from '@/components/marca/ConfirmarRiesgo'
import { usePedido } from '@/hooks/usePedido'
import { useSesion } from '@/lib/sesion'
import { etiquetaDePublicacion, externasApi } from '../externas'
import s from './FichasExternas.module.css'

/*
 * Las fichas del hotel en otras plataformas. Nadie sincroniza nada: el hotel da la dirección
 * de su ficha UNA vez y el bot la lee cada día (robots.txt, contacto, sin saltarse ninguna
 * verificación). Al leer, el panel sigue al bot EN VIVO: cada ficha pasa por "leyendo" con la
 * fase real en que va. De las fichas salen los TIPOS de habitación que publica el hotel (no hay
 * habitaciones numeradas); el gerente importa cada tipo con su tarifa y cuántas unidades hay.
 * Todo lo que viene de fuera se pinta como texto.
 */

const ESTADO = {
  pendiente: ['Por leer', 'secondary'],
  leyendo: ['Leyendo', 'secondary'],
  leida: ['Leída', 'default'],
  sin_datos: ['Leída', 'secondary'],
  bloqueada_robots: ['Su robots.txt no lo permite', 'secondary'],
  verificacion: ['Pidió verificación anti-robot', 'destructive'],
  error: ['No se pudo leer', 'destructive'],
}
const MARCAS = [
  [/booking\./, 'Booking.com', 'B', 'morado'], [/expedia\.|hoteles\.com|hotels\.com/, 'Expedia y Hoteles.com', 'E', 'dorado'],
  [/kayak\./, 'Kayak', 'K', 'turquesa'], [/facebook\./, 'Facebook', 'F', 'orquidea'], [/google\./, 'Google Maps', 'G', 'naranja'],
]
const host = url => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url } }
const marcaDe = url => {
  const h = host(url)
  const [, nombre, letra, flor] = MARCAS.find(([re]) => re.test(h)) ?? [null, h, h[0]?.toUpperCase() ?? '?', 'hoja']
  return { nombre, letra, flor }
}
const ruta = url => { try { const u = new URL(url); return u.pathname.length > 1 ? decodeURIComponent(u.pathname).slice(0, 44) : '' } catch { return '' } }
const hace = v => {
  if (!v) return 'aún no'
  const min = Math.round((Date.now() - new Date(v)) / 60000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  return h < 24 ? `hace ${h} h` : new Date(v).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}
const PASOS = {
  booking: 'Extranet de Booking.com → Tarifas y disponibilidad → Sincronizar calendarios → Exportar calendario (puede no existir según el tipo de alojamiento).',
  expedia: 'Expedia Partner Central → Sincronizar calendario (iCal). Solo existe para alojamientos tipo vacation rental; si no, va por un gestor de canales.',
  airbnb: 'Cuenta de anfitrión → Calendario → Disponibilidad → Conectar calendarios → Exportar calendario.',
  vrbo: 'Cuenta de Vrbo → Calendario → Importar y exportar → Exportar.',
}
const datosDe = c => [c.m2 && `${c.m2} m²`, c.camas, c.capacidad_maxima && `hasta ${c.capacidad_maxima} personas`].filter(Boolean).join(', ')

export default function FichasExternas({ editar, calendarios }) {
  const { sesion } = useSesion()
  const lista = usePedido(senal => externasApi.fichas(senal), [])
  const recargar = lista.recargar
  // Escaneo en curso: id de la ficha → su `leida_en` de antes (cuando cambia, ya se leyó).
  const [scan, setScan] = useState({})
  const scanRef = useRef(scan)
  scanRef.current = scan
  const enCurso = Object.keys(scan).length > 0

  // En vivo: se consulta cada segundo mientras el bot lee (máx. 3 min) y el panel sigue a cada ficha.
  useEffect(() => {
    if (!enCurso) return
    const sondeo = setInterval(recargar, 1000)
    const limite = setTimeout(() => setScan({}), 180_000)
    return () => { clearInterval(sondeo); clearTimeout(limite) }
  }, [enCurso, recargar])

  const datos = lista.datos ?? []
  const enEscaneo = datos.filter(f => f.id in scan)
  const leida = f => f.estado !== 'leyendo' && f.leida_en !== scan[f.id] // ya terminó esta vuelta
  const activo = enEscaneo.findIndex(f => !leida(f))
  const terminado = enEscaneo.length > 0 && activo === -1
  // Terminado: el resumen se queda unos segundos y se despide solo.
  useEffect(() => {
    if (!terminado) return
    const t = setTimeout(() => setScan({}), 12_000)
    return () => clearTimeout(t)
  }, [terminado])

  const empezar = async (fichas, pedir) => {
    setScan(Object.fromEntries(fichas.map(f => [f.id, f.leida_en])))
    try { await pedir() } catch (e) { toast.error(e.message); setScan({}) }
  }
  const leerUna = f => empezar([f], () => externasApi.leerFicha(f.id))
  const leerTodas = () => empezar(datos, externasApi.leerFichas)

  const pasos = enEscaneo.map((f, i) => {
    const m = marcaDe(f.url)
    const listo = leida(f)
    return {
      label: `${m.nombre}${ruta(f.url) ? `, ${ruta(f.url).split('/').filter(Boolean).at(-1) ?? ''}` : ''}`,
      detail: listo ? (ESTADO[f.estado]?.[0] ?? f.estado) : i === activo ? (f.estado === 'leyendo' ? f.detalle : 'En espera') : undefined,
    }
  })

  const propiedades = sesion?.propiedades ?? []
  const grupos = propiedades.map(p => ({ p, items: datos.filter(f => f.propiedad_id === p.id) })).filter(g => g.items.length || editar)

  return (
    <section className={s.seccion} aria-label="Fichas del hotel">
      <div className={s.cabecera}>
        <div>
          <h2 className={s.titulo}>Cómo aparece el hotel en línea</h2>
          <p className={s.ayuda}>Solo referencia. Cada plataforma publica a su manera y solo lo que vende en línea; el inventario y las reservas de verdad son los del motor, y nada de aquí se mezcla con ellos. El bot revisa cada día que las páginas sigan en línea.</p>
        </div>
        {editar && (
          <Button variant="outline" size="lg" disabled={!datos.length || enCurso} onClick={leerTodas}>
            <ArrowClockwiseIcon size={16} aria-hidden="true" /> Leer todas ahora
          </Button>
        )}
      </div>

      {editar && <ContactoBot />}

      {enCurso && pasos.length > 0 && (
        <WorkingOutLoud
          className="max-w-none" title="El bot está leyendo las fichas" steps={pasos}
          active={terminado ? pasos.length : activo} finished={terminado}
          textos={{
            listo: seg => `Lectura lista en ${seg} s`,
            resumen: n => `${n} ${n === 1 ? 'ficha revisada' : 'fichas revisadas'}`,
          }}
        />
      )}

      {lista.cargando ? <SkeletonCard height="160px" /> : lista.error ? (
        <p className={s.error} role="alert">{lista.error.message} <Button variant="outline" size="sm" onClick={recargar}>Reintentar</Button></p>
      ) : grupos.map(({ p, items }) => (
        <Propiedad key={p.id} propiedad={p} fichas={items} editar={editar} calendarios={calendarios.datos ?? []} onCalendario={calendarios.recargar}
          leyendoDe={f => f.estado === 'leyendo' || (f.id in scan && !leida(f))}
          onLeer={leerUna} onCambio={recargar} onCreada={f => { recargar(); setScan(x => ({ ...x, [f.id]: null })) }} />
      ))}
    </section>
  )
}

function Propiedad({ propiedad, fichas, editar, calendarios, onCalendario, leyendoDe, onLeer, onCambio, onCreada }) {
  const [agregar, setAgregar] = useState(false)
  return (
    <article className={s.propiedad}>
      <header className={s.propiedadCabeza}>
        <Florecita tamano={18} />
        <h3 className={s.propiedadNombre}>{propiedad.nombre}</h3>
      </header>
      <ul className={s.fichas}>
        {fichas.map(f => <Ficha key={f.id} ficha={f} editar={editar} calendarios={calendarios.filter(c => c.ficha_id === f.id)} onCalendario={onCalendario} leyendo={leyendoDe(f)} onLeer={() => onLeer(f)} onCambio={onCambio} />)}
        {fichas.length === 0 && <li className={s.ayuda}>Aún no hay fichas de esta propiedad.</li>}
      </ul>
      {editar && (agregar
        ? <NuevaFicha propiedadId={propiedad.id} onCreada={f => { setAgregar(false); onCreada(f) }} onCancelar={() => setAgregar(false)} />
        : <Button variant="outline" size="sm" className="self-start rounded-full" onClick={() => setAgregar(true)}><PlusIcon size={14} aria-hidden="true" /> Agregar ficha</Button>)}
    </article>
  )
}

function Ficha({ ficha, editar, calendarios, onCalendario, leyendo, onLeer, onCambio }) {
  const m = marcaDe(ficha.url)
  const [etiqueta, variante] = ESTADO[ficha.estado] ?? ESTADO.error
  const [aQuitar, setAQuitar] = useState(false)
  const quitar = async () => {
    try { await externasApi.borrarFicha(ficha.id); toast.success('Ficha quitada', { description: `${m.nombre} ya no se revisa.` }); onCambio() } catch (e) { toast.error(e.message) }
  }
  return (
    <li className={s.ficha}>
      <ConfirmarRiesgo
        abierto={aQuitar}
        riesgo={calendarios.length ? 'alto' : 'medio'}
        titulo={`¿Quitar la ficha de ${m.nombre}?`}
        consecuencias={[
          'El bot deja de revisar esta página cada día.',
          ...(calendarios.length
            ? [`Se desconecta${calendarios.length > 1 ? 'n sus' : ' su'} ${calendarios.length} calendario${calendarios.length > 1 ? 's' : ''}: dejan de llegar reservas nuevas de ${m.nombre}.`,
              'Las reservas que ya trajo se conservan.']
            : []),
        ]}
        deshacer={calendarios.length ? undefined : 'Puedes volver a agregarla pegando su enlace.'}
        accion="Quitar ficha"
        onConfirmar={quitar}
        onCancelar={() => setAQuitar(false)}
      />
      <span className={s.marca} style={{ background: `var(--flor-${m.flor})`, color: `var(--flor-${m.flor}-fg)` }} aria-hidden="true">{m.letra}</span>
      <span className={s.fichaTexto}>
        <a className={s.enlace} href={ficha.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Abrir ${host(ficha.url)} en otra pestaña`}>
          {m.nombre} <ArrowSquareOutIcon size={13} aria-hidden="true" />
        </a>
        <span className={s.ruta}>{host(ficha.url)}{ruta(ficha.url)}</span>
      </span>
      <span className={s.estado}>
        {leyendo
          ? <StatusPill size="sm" phases={[ficha.estado === 'leyendo' && ficha.detalle ? ficha.detalle : 'En espera']} interval={1500} done={false} />
          : <>
              <Badge variant={variante}>{etiqueta}{ficha.estado === 'leida' ? `: ${ficha.cuartos?.length ?? 0}` : ''}</Badge>
              <span className={s.cuando}>{hace(ficha.leida_en)}</span>
            </>}
      </span>
      {editar && (
        <span className={s.acciones}>
          <Button variant="ghost" size="icon" aria-label={`Leer ahora ${m.nombre}`} disabled={leyendo} onClick={onLeer}><ArrowClockwiseIcon size={16} aria-hidden="true" /></Button>
          <Button variant="ghost" size="icon" aria-label={`Quitar la ficha de ${m.nombre}`} onClick={() => setAQuitar(true)}><TrashIcon size={16} aria-hidden="true" /></Button>
        </span>
      )}
      {ficha.detalle && ficha.estado !== 'leyendo' && ficha.estado !== 'leida' && ficha.estado !== 'sin_datos' && <p className={s.detalle}>{ficha.detalle}</p>}
      {(ficha.cuartos ?? []).length > 0 && (
        <ul className={s.publica} aria-label={`Lo que publica ${m.nombre}`}>
          {ficha.cuartos.map((c, i) => (
            <Publicacion key={i} ficha={ficha} cuarto={c} indice={i} editar={editar} onCambio={onCalendario}
              calendario={calendarios.find(k => k.publicacion === etiquetaDePublicacion(c))} />
          ))}
        </ul>
      )}
    </li>
  )
}

function NuevaFicha({ propiedadId, onCreada, onCancelar }) {
  const [url, setUrl] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const crear = async e => {
    e.preventDefault()
    setOcupado(true)
    try { onCreada(await externasApi.crearFicha({ propiedad_id: propiedadId, url: url.trim() })) } catch (err) { toast.error(err.message) } finally { setOcupado(false) }
  }
  return (
    <form className={s.nueva} onSubmit={crear}>
      <Label htmlFor={`nf-${propiedadId}`} className="sr-only">Dirección de la ficha</Label>
      <Input id={`nf-${propiedadId}`} type="url" required autoFocus maxLength={1000} pattern="https://.*" placeholder="Pega la dirección de la ficha (https://…)" value={url} onChange={e => setUrl(e.target.value)} size="lg" />
      <Button type="submit" size="lg" disabled={ocupado || !url.trim()}>Agregar</Button>
      <Button type="button" variant="outline" size="lg" onClick={onCancelar}>Cancelar</Button>
    </form>
  )
}

/** Sin contacto el bot no lee ninguna página: va en cada visita para que un sitio pueda escribirle. */
function ContactoBot() {
  const bot = usePedido(senal => externasApi.bot(senal), [])
  const [texto, setTexto] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  if (!bot.datos) return null
  const actual = bot.datos.contacto ?? ''
  const editando = texto !== null || !actual
  const guardar = async e => {
    e.preventDefault()
    setOcupado(true)
    try {
      const { tope_mensual, consultas, dominios_bloqueados } = bot.datos
      await externasApi.cambiarBot({ contacto: (texto ?? '').trim() || null, tope_mensual, consultas, dominios_bloqueados })
      toast.success('Contacto guardado', { description: 'Ya puede leer las fichas.' })
      setTexto(null)
      bot.recargar()
    } catch (err) { toast.error(err.message) } finally { setOcupado(false) }
  }
  if (!editando) {
    return (
      <p className={s.contactoFijo}>
        <span>El bot se presenta con <strong>{actual}</strong></span>
        <Button variant="ghost" size="sm" onClick={() => setTexto(actual)}>Cambiar</Button>
      </p>
    )
  }
  return (
    <form className={s.contacto} onSubmit={guardar} role="group" aria-label="Contacto del bot">
      <div className={s.campo}>
        <Label htmlFor="bot-contacto-fichas">Para empezar, escribe un contacto (correo o página web): va en cada visita del bot</Label>
        <Input id="bot-contacto-fichas" required maxLength={120} value={texto ?? ''} onChange={e => setTexto(e.target.value)} size="lg" placeholder="reservas@tu-hotel.mx" />
      </div>
      <Button type="submit" size="lg" disabled={ocupado || !(texto ?? '').trim()}>Guardar</Button>
      {actual && <Button type="button" variant="outline" size="lg" onClick={() => setTexto(null)}>Cancelar</Button>}
    </form>
  )
}

/** Una publicación de la plataforma (con SU nombre y formato) y el calendario iCal que la vincula con lo que la plataforma ya tiene ocupado. */
function Publicacion({ ficha, cuarto, indice, calendario, editar, onCambio }) {
  const [abierto, setAbierto] = useState(false)
  const [url, setUrl] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [leyendo, setLeyendo] = useState(false)
  const conectable = ficha.canal !== 'otro' // Kayak, Facebook y Google no reciben reservas
  const conectar = async e => {
    e.preventDefault()
    setOcupado(true)
    try {
      await externasApi.crearCalendario({ ficha_id: ficha.id, indice, url: url.trim() })
      toast.success('Calendario conectado', { description: 'Se lee ahora y luego cada 5 minutos.' })
      setUrl(''); setAbierto(false)
      onCambio()
      setTimeout(onCambio, 4000) // da tiempo a la primera lectura
    } catch (err) { toast.error(err.message) } finally { setOcupado(false) }
  }
  const leer = async () => {
    setLeyendo(true)
    try { await externasApi.leerCalendario(calendario.id); toast.success('Revisando ahora'); setTimeout(onCambio, 4000) } catch (e) { toast.error(e.message) }
    setTimeout(() => setLeyendo(false), 4000)
  }
  const [aDesconectar, setADesconectar] = useState(false)
  const quitar = async () => {
    try { await externasApi.borrarCalendario(calendario.id); toast.success('Calendario desconectado', { description: 'Las reservas que ya trajo se conservan.' }); onCambio() } catch (e) { toast.error(e.message) }
  }
  return (
    <li className={s.publicacion}>
      {calendario && (
        <ConfirmarRiesgo
          abierto={aDesconectar}
          riesgo="medio"
          titulo={`¿Desconectar el calendario de «${cuarto.nombre}»?`}
          consecuencias={[
            'Dejan de llegar reservas nuevas de esta publicación, y sus cambios y cancelaciones tampoco se reflejan.',
            'Las reservas que ya trajo se conservan, en el calendario y en la Línea de tiempo.',
          ]}
          deshacer="Vuelve a conectarlo pegando su enlace iCal."
          accion="Desconectar"
          onConfirmar={quitar}
          onCancelar={() => setADesconectar(false)}
        />
      )}
      <span className={s.publicacionTexto}><strong>{cuarto.nombre}</strong>{datosDe(cuarto) ? `: ${datosDe(cuarto)}` : ''}</span>
      {conectable && calendario && (
        <span className={s.calendario}>
          {calendario.ultimo_error
            ? <Badge variant="destructive">No se pudo leer: {calendario.ultimo_error}</Badge>
            : <span>Calendario conectado. Revisado {hace(calendario.ultima_lectura)}, {calendario.eventos} fechas ocupadas.</span>}
          {editar && (
            <span className={s.acciones}>
              {leyendo && <StatusPill size="sm" phases={['Pidiendo el calendario', 'Leyendo las fechas']} interval={1000} done={false} />}
              <Button variant="outline" size="sm" disabled={leyendo} onClick={leer}>Revisar ahora</Button>
              <Button variant="ghost" size="sm" onClick={() => setADesconectar(true)}>Desconectar</Button>
            </span>
          )}
        </span>
      )}
      {conectable && !calendario && editar && !abierto && (
        <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setAbierto(true)}>Conectar calendario (iCal)</Button>
      )}
      {abierto && (
        <form className={s.conectar} onSubmit={conectar}>
          <Label htmlFor={`ical-${ficha.id}-${indice}`} className="sr-only">Enlace de calendario de {cuarto.nombre}</Label>
          <Input id={`ical-${ficha.id}-${indice}`} type="url" required autoFocus maxLength={1000} pattern="https://.*" placeholder="Pega el enlace del calendario (https://…)" value={url} onChange={e => setUrl(e.target.value)} size="lg" />
          <Button type="submit" size="lg" disabled={ocupado || !url.trim()}>Conectar</Button>
          <Button type="button" variant="outline" size="lg" onClick={() => setAbierto(false)}>Cancelar</Button>
          {PASOS[ficha.canal] && <p className={s.detalle}>¿Dónde saco el enlace? {PASOS[ficha.canal]} El enlace lleva una clave de la plataforma: aquí solo se muestra el dominio y el final.</p>}
        </form>
      )}
    </li>
  )
}
