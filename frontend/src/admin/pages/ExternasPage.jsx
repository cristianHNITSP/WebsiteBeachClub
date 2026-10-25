import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowSquareOutIcon, CaretDownIcon, CheckCircleIcon, LinkIcon, MagnifyingGlassIcon, WarningCircleIcon,
} from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SkeletonCard } from '@/components/frida/Skeleton'
import ConfirmarDescarte from '@/components/marca/ConfirmarDescarte'
import { usePedido } from '@/hooks/usePedido'
import { useSesion } from '@/lib/sesion'
import { escucharEventos } from '@/lib/eventos'
import { externasApi, nombreCanal } from '../externas'
import { habitacionesApi } from '../habitaciones'
import { usePropiedadActual } from '../propiedadActual'
import s from './ExternasPage.module.css'

/*
 * Otras plataformas (PLAN-BACKEND §13), con `externas.ver`. UNA pantalla que se
 * entiende sin experimentar: cómo funciona, la conexión de cada habitación con
 * cada plataforma (se pega su enlace iCal UNA vez; después se revisa sola cada
 * 5 min) y las próximas reservas de fuera (que además salen en la Línea de
 * tiempo). Conectar pide `ajustes.editar`. El buscador de menciones solo
 * aparece si está configurado. Todo lo que viene de fuera se pinta como texto.
 */

// Dónde saca cada plataforma el enlace (los menús pueden cambiar de nombre).
const PLATAFORMAS = [
  { canal: 'booking', nombre: 'Booking.com', pasos: ['Entra a la Extranet de Booking.com.', 'Tarifas y disponibilidad → Sincronizar calendarios.', 'Elige la habitación → Exportar calendario y copia el enlace.'] },
  { canal: 'airbnb', nombre: 'Airbnb', pasos: ['Entra a tu cuenta de anfitrión.', 'Calendario → Disponibilidad → Conectar calendarios.', 'Exportar calendario y copia el enlace (uno por anuncio).'] },
  { canal: 'expedia', nombre: 'Expedia y Hoteles.com', pasos: ['Entra a Expedia Partner Central (sirve para las dos).', 'Busca "Sincronizar calendario" (iCal).', 'Si tu cuenta no tiene esa opción (pasa con propiedades dadas de alta como hotel), se conecta con un channel manager: dínoslo.'] },
  { canal: 'vrbo', nombre: 'Vrbo', pasos: ['Entra a tu cuenta de Vrbo.', 'Calendario → Importar y exportar.', 'Exportar y copia el enlace.'] },
]
const ESTADO_MENCION = {
  leida: 'Leída', sin_leer: 'Sin leer', error: 'No se pudo leer',
  bloqueada_dominio: 'Solo lo del buscador (sus términos prohíben leerla)', bloqueada_robots: 'Solo lo del buscador (su robots.txt no lo permite)',
}
const corta = f => new Date(`${f}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
const momento = v => (v ? new Date(v).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'aún no')
const iso = d => d.toLocaleDateString('sv-SE', { timeZone: 'America/Merida' })

export default function ExternasPage() {
  const { sesion } = useSesion()
  const editar = Boolean(sesion?.permisos?.includes('ajustes.editar'))
  const { propiedadId } = usePropiedadActual()
  const habs = usePedido(senal => habitacionesApi.listar({ por_pagina: 100, propiedad: propiedadId }, senal), [propiedadId])
  const cals = usePedido(senal => externasApi.calendarios({ propiedad: propiedadId }, senal), [propiedadId])
  // Una lectura nueva con reservas de fuera (SSE): se refresca sola.
  const recargarCals = cals.recargar
  useEffect(() => escucharEventos(m => { if (m.agregado === 'externas') recargarCals() }), [recargarCals])
  const bot = usePedido(senal => externasApi.bot(senal), [])
  return (
    <div className={s.pagina}>
      <div className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">Operaciones</span>
          <h1 className="admin-page-title">Otras <em>plataformas</em></h1>
        </div>
      </div>

      <ol className={s.pasos} aria-label="Cómo funciona">
        <li><strong>1. Conecta cada habitación una vez.</strong> Pega el enlace de calendario que te da Booking, Airbnb, etc.</li>
        <li><strong>2. Se revisa sola cada 5 minutos.</strong> Nadie tiene que capturar nada.</li>
        <li><strong>3. Lo vendido fuera aparece en la Línea de tiempo</strong> y llega un aviso. Si choca con una reserva propia, también se avisa.</li>
      </ol>

      {habs.cargando || cals.cargando ? (
        <div className={s.lista}>{[0, 1].map(i => <SkeletonCard key={i} height="120px" />)}</div>
      ) : habs.error || cals.error ? (
        <Fallo error={habs.error ?? cals.error} onReintentar={() => { habs.recargar(); cals.recargar() }} />
      ) : (
        <section className={s.lista} aria-labelledby="t-conexiones">
          <h2 className={s.seccion} id="t-conexiones">Conexiones</h2>
          {PLATAFORMAS.map(pl => (
            <Plataforma key={pl.canal} plataforma={pl} habitaciones={habs.datos.items}
              calendarios={cals.datos.filter(c => c.canal === pl.canal)} editar={editar} onCambio={cals.recargar} />
          ))}
        </section>
      )}

      {/* `version`: se vuelve a pedir al conectar, desconectar o leer un calendario. */}
      <Proximas propiedadId={propiedadId} version={(cals.datos ?? []).map(c => `${c.id}${c.ultima_lectura}${c.eventos}`).join()} />

      {bot.datos?.tiene_clave
        ? <Menciones editar={editar} bot={bot} />
        : <p className={s.nota}><MagnifyingGlassIcon size={14} aria-hidden="true" /> El buscador de menciones en la web está apagado (falta configurar su clave en el servidor).</p>}
    </div>
  )
}

function Fallo({ error, onReintentar }) {
  return (
    <div className={s.vacio} role="alert">
      <WarningCircleIcon size={28} aria-hidden="true" /><p>{error.message}</p>
      <Button variant="outline" className="h-11" onClick={onReintentar}>Reintentar</Button>
    </div>
  )
}

function Plataforma({ plataforma, habitaciones, calendarios, editar, onCambio }) {
  const conectadas = new Map(calendarios.map(c => [c.habitacion_id, c]))
  const [abierta, setAbierta] = useState(conectadas.size > 0 && conectadas.size < habitaciones.length)
  const [quitar, setQuitar] = useState(null)
  const confirmarQuitar = async () => {
    const c = quitar
    setQuitar(null)
    try { await externasApi.borrarCalendario(c.id); toast.success('Desconectada', { description: 'Sus reservas pasadas se conservan como historia.' }); onCambio() } catch (e) { toast.error(e.message) }
  }
  return (
    <article className={s.tarjeta}>
      <button type="button" className={s.cabecera} aria-expanded={abierta} onClick={() => setAbierta(a => !a)}>
        <span className={s.plataforma}>{plataforma.nombre}</span>
        <Badge variant={conectadas.size ? 'default' : 'outline'}>{conectadas.size} de {habitaciones.length} habitaciones conectadas</Badge>
        <CaretDownIcon size={18} className={abierta ? s.girado : ''} aria-hidden="true" />
      </button>
      {abierta && (
        <div className={s.cuerpo}>
          <details className={s.como}>
            <summary>¿Dónde saco el enlace?</summary>
            <ol>{plataforma.pasos.map(p => <li key={p}>{p}</li>)}</ol>
            <p>El enlace termina en <code>.ics</code> y lleva una clave de la plataforma: aquí solo se muestra el dominio y el final.</p>
          </details>
          <ul className={s.habitaciones}>
            {habitaciones.map(h => (
              <Habitacion key={h.id} habitacion={h} canal={plataforma.canal} calendario={conectadas.get(h.id)} editar={editar}
                onCambio={onCambio} onQuitar={setQuitar} />
            ))}
          </ul>
        </div>
      )}
      <ConfirmarDescarte
        abierto={quitar !== null} titulo="¿Desconectar esta habitación?" accion="Desconectar" cancelar="Cancelar"
        texto="Se deja de revisar. Las reservas que ya trajo se conservan como historia."
        onConfirmar={confirmarQuitar} onCancelar={() => setQuitar(null)}
      />
    </article>
  )
}

function Habitacion({ habitacion, canal, calendario, editar, onCambio, onQuitar }) {
  const [url, setUrl] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const conectar = async e => {
    e.preventDefault()
    setOcupado(true)
    try {
      await externasApi.crearCalendario({ habitacion_id: habitacion.id, canal, url: url.trim() })
      toast.success(`${habitacion.nombre} conectada`, { description: 'Se lee ahora y luego cada 5 minutos.' })
      setUrl('')
      setTimeout(onCambio, 4000) // da tiempo a la primera lectura
      onCambio()
    } catch (err) { toast.error(err.message) } finally { setOcupado(false) }
  }
  const leer = async () => {
    try { await externasApi.leerCalendario(calendario.id); toast.success('Revisando ahora'); setTimeout(onCambio, 4000) } catch (e) { toast.error(e.message) }
  }
  if (calendario) {
    return (
      <li className={s.habitacion}>
        <span className={s.habNombre}>{habitacion.nombre}</span>
        <span className={s.estado}>
          {calendario.ultimo_error
            ? <Badge variant="destructive">No se pudo leer: {calendario.ultimo_error}</Badge>
            : <><CheckCircleIcon size={16} weight="fill" className={s.ok} aria-hidden="true" /> Conectada. Revisada {momento(calendario.ultima_lectura)}, {calendario.eventos} fechas ocupadas.</>}
        </span>
        {editar && (
          <span className={s.acciones}>
            <Button variant="outline" className="h-11" onClick={leer}>Revisar ahora</Button>
            <Button variant="outline" className="h-11" onClick={() => onQuitar(calendario)}>Desconectar</Button>
          </span>
        )}
      </li>
    )
  }
  return (
    <li className={s.habitacion}>
      <span className={s.habNombre}>{habitacion.nombre}</span>
      {editar ? (
        <form className={s.conectar} onSubmit={conectar}>
          <Label htmlFor={`url-${canal}-${habitacion.id}`} className="sr-only">Enlace de calendario de {habitacion.nombre}</Label>
          <Input id={`url-${canal}-${habitacion.id}`} type="url" required maxLength={1000} pattern="https://.*" placeholder="Pega aquí el enlace (https://…)"
            value={url} onChange={e => setUrl(e.target.value)} className="h-11" />
          <Button type="submit" className="h-11" disabled={ocupado || !url.trim()}><LinkIcon size={16} weight="bold" aria-hidden="true" /> Conectar</Button>
        </form>
      ) : <span className={s.estado}>Sin conectar</span>}
    </li>
  )
}

function Proximas({ propiedadId, version }) {
  const hoy = new Date()
  const pedido = usePedido(
    senal => externasApi.reservas({ desde: iso(hoy), hasta: iso(new Date(hoy.getTime() + 90 * 864e5)), propiedad: propiedadId }, senal),
    [propiedadId, version],
  )
  const lista = (pedido.datos ?? []).filter(x => x.estado === 'vigente')
  return (
    <section className={s.lista} aria-labelledby="t-proximas">
      <h2 className={s.seccion} id="t-proximas">Próximas reservas de fuera (90 días)</h2>
      {pedido.cargando ? <SkeletonCard height="72px" />
        : pedido.error ? <Fallo error={pedido.error} onReintentar={pedido.recargar} />
          : lista.length === 0 ? <p className={s.nota}>Ninguna por ahora. Cuando conectes una habitación, lo que se venda fuera aparece aquí y en la Línea de tiempo.</p>
            : (
              <ul className={s.filas}>
                {lista.map(x => (
                  <li key={x.id} className={s.fila}>
                    <Badge variant="outline">{nombreCanal(x.canal)}</Badge>
                    <span className={s.texto}>
                      <strong>{corta(x.llegada)} → {corta(x.salida)}</strong>
                      <span>{x.habitacion_nombre ?? 'Sin habitación'}{x.titulo ? `, ${x.titulo}` : ''}</span>
                    </span>
                    {x.choca && <Badge variant="destructive"><WarningCircleIcon weight="fill" aria-hidden="true" /> Choca con una reserva propia</Badge>}
                  </li>
                ))}
              </ul>
            )}
    </section>
  )
}

/* ── El buscador de menciones (solo si está configurado) ── */

function Menciones({ editar, bot }) {
  const menciones = usePedido(senal => externasApi.menciones(senal), [])
  return (
    <div className={s.contenedor}>
      {bot.cargando ? <SkeletonCard height="140px" /> : bot.error ? <Fallo pedido={bot} /> : <Bot estado={bot.datos} editar={editar} onListo={() => { bot.recargar(); menciones.recargar() }} />}
      {menciones.cargando ? <div className={s.lista}>{[0, 1, 2].map(i => <SkeletonCard key={i} height="88px" />)}</div>
        : menciones.error ? <Fallo pedido={menciones} />
          : menciones.datos.length === 0 ? <Vacio Icono={MagnifyingGlassIcon}>El bot aún no ha encontrado nada.</Vacio>
            : (
              <ul className={s.lista}>
                {menciones.datos.map(m => (
                  <li key={m.id} className={s.fila}>
                    <span className={s.texto}>
                      <strong>{m.titulo ?? m.dominio}</strong>
                      <span>{m.dominio}. {ESTADO_MENCION[m.estado] ?? m.estado}{m.detalle && m.estado === 'error' ? `: ${m.detalle}` : ''}.</span>
                      {(m.calificacion != null || m.precio) && (
                        <span>
                          {m.calificacion != null ? `${Number(m.calificacion).toLocaleString('es-MX', { maximumFractionDigits: 1 })} de 5${m.resenas ? ` (${m.resenas} reseñas)` : ''}` : ''}
                          {m.calificacion != null && m.precio ? '. ' : ''}{m.precio ? `Precio publicado: ${m.precio}` : ''}
                        </span>
                      )}
                      {m.descripcion && <span>{m.descripcion}</span>}
                    </span>
                    <a className={s.enlace} href={m.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Abrir ${m.dominio} en otra pestaña`}>
                      <ArrowSquareOutIcon size={18} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
    </div>
  )
}

function Bot({ estado, editar, onListo }) {
  const [form, setForm] = useState({
    contacto: estado.contacto ?? '', tope_mensual: String(estado.tope_mensual),
    consultas: estado.consultas.join('\n'), dominios_bloqueados: estado.dominios_bloqueados.join('\n'),
  })
  const [ocupado, setOcupado] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const lineas = v => v.split('\n').map(x => x.trim()).filter(Boolean)
  const guardar = async e => {
    e.preventDefault()
    setOcupado(true)
    try {
      await externasApi.cambiarBot({ contacto: form.contacto || null, tope_mensual: Number(form.tope_mensual), consultas: lineas(form.consultas), dominios_bloqueados: lineas(form.dominios_bloqueados) })
      toast.success('Ajustes del bot guardados')
      onListo()
    } catch (err) { toast.error(err.message) } finally { setOcupado(false) }
  }
  const buscar = async () => {
    setOcupado(true)
    try { await externasApi.buscarAhora(); toast.success('El bot está buscando', { description: 'Respeta el tope del mes. El resultado aparece aquí en unos minutos.' }); setTimeout(onListo, 8000) } catch (e) { toast.error(e.message) } finally { setOcupado(false) }
  }
  return (
    <form className={s.tarjeta} onSubmit={guardar}>
      <h2 className={s.titulo}><MagnifyingGlassIcon size={18} weight="bold" aria-hidden="true" /> El bot</h2>
      <p className={s.ayuda}>
        Busca dónde aparece el hotel y lee esas páginas solo si su robots.txt lo permite. Booking, Airbnb, Expedia y compañía nunca se leen: sus términos lo prohíben.
      </p>
      {!estado.tiene_clave && <p className={s.aviso} role="status">Falta la clave de Brave Search (BRAVE_SEARCH_CLAVE) en el servidor: el bot no busca.</p>}
      <p className={s.estado}>
        {estado.consultas_mes} de {estado.tope_mensual} búsquedas este mes. Última vuelta: {momento(estado.ultima_ejecucion)}{estado.ultimo_resultado ? `. ${estado.ultimo_resultado}` : '.'}
      </p>
      {editar && (
        <>
          <div className={s.formulario}>
            <div className={s.campo}><Label htmlFor="bot-contacto">Contacto (va en cada visita del bot)</Label>
              <Input id="bot-contacto" maxLength={120} value={form.contacto} onChange={set('contacto')} className="h-11" placeholder="reservas@hotelesfrida.mx" /></div>
            <div className={s.campo}><Label htmlFor="bot-tope">Tope de búsquedas al mes</Label>
              <Input id="bot-tope" type="number" min="0" max="10000" required value={form.tope_mensual} onChange={set('tope_mensual')} className="h-11" /></div>
          </div>
          <div className={s.formulario}>
            <div className={s.campo}><Label htmlFor="bot-consultas">Qué busca (una por línea)</Label>
              <textarea id="bot-consultas" className={s.area} rows={3} value={form.consultas} onChange={set('consultas')} /></div>
            <div className={s.campo}><Label htmlFor="bot-bloqueados">Dominios que nunca lee</Label>
              <textarea id="bot-bloqueados" className={s.area} rows={3} value={form.dominios_bloqueados} onChange={set('dominios_bloqueados')} /></div>
          </div>
          <div className={s.acciones}>
            <Button type="submit" disabled={ocupado}>Guardar</Button>
            <Button type="button" variant="outline" disabled={ocupado || !estado.tiene_clave || !estado.contacto} onClick={buscar}>Buscar ahora</Button>
          </div>
        </>
      )}
    </form>
  )
}
