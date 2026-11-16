import { useEffect, useRef, useState } from 'react'
import { toast } from '@/admin/toast'
import {
  ArrowSquareOutIcon, CaretDownIcon, CheckCircleIcon, LinkIcon, MagnifyingGlassIcon, WarningCircleIcon,
} from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/coss/button'
import { Input } from '@/components/coss/input'
import { Label } from '@/components/coss/label'
import { SkeletonCard } from '@/components/frida/Skeleton'
import FichasExternas from '../components/FichasExternas'
import CalendarioExterno from '../components/CalendarioExterno'
import { LiquidSegments } from '@/components/devl/liquid-segments'
import { useParametros } from '@/hooks/useParametros'
import { StatusPill } from '@/components/status-pill'
import { WorkingOutLoud } from '@/components/working-out-loud'
import { usePedido } from '@/hooks/usePedido'
import { useSesion } from '@/lib/sesion'
import { escucharEventos } from '@/lib/eventos'
import { externasApi, nombreCanal } from '../externas'
import { usePropiedadActual } from '../propiedadActual'
import s from './ExternasPage.module.css'

/*
 * Otras plataformas (PLAN-BACKEND §13), con `externas.ver`. Un AÑADIDO de solo consulta: cómo
 * aparece el hotel en cada plataforma (sus fichas y lo que publican, a su manera), el calendario
 * de lo que tienen ocupado y las próximas reservas de fuera. Los calendarios (iCal) se conectan
 * a cada publicación de la plataforma, NO a las habitaciones del motor: habitaciones y reservas
 * son del motor y las plataformas no son espejo. Conectar pide `ajustes.editar`. Todo lo que
 * viene de fuera se pinta como texto.
 */

const ESTADO_MENCION = {
  leida: 'Leída', sin_leer: 'Sin leer', error: 'No se pudo leer',
  bloqueada_dominio: 'Solo lo del buscador (sus términos prohíben leerla)', bloqueada_robots: 'Solo lo del buscador (su robots.txt no lo permite)',
}
const corta = f => new Date(`${f}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
const momento = v => (v ? new Date(v).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'aún no')
const iso = d => d.toLocaleDateString('sv-SE', { timeZone: 'America/Merida' })

const PESTANAS = [
  { value: 'calendario', label: 'Calendario' },
  { value: 'general', label: 'General' },
]

export default function ExternasPage() {
  // La pestaña va en la URL (?pestana=): recargar o compartir el enlace deja la misma pantalla.
  const [{ pestana }, set] = useParametros({ pestana: 'calendario' })
  const { sesion } = useSesion()
  const editar = Boolean(sesion?.permisos?.includes('ajustes.editar'))
  const { propiedadId } = usePropiedadActual()
  const cals = usePedido(senal => externasApi.calendarios({ propiedad: propiedadId }, senal), [propiedadId])
  // Una lectura nueva con reservas de fuera (SSE): se refresca sola.
  const recargarCals = cals.recargar
  useEffect(() => escucharEventos(m => { if (m.agregado === 'externas') recargarCals() }), [recargarCals])
  const bot = usePedido(senal => externasApi.bot(senal), [])
  const ultimaLectura = (cals.datos ?? []).map(c => c.ultima_lectura).filter(Boolean).sort().at(-1)
  return (
    <div className={s.pagina}>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Otras plataformas</h1>
          <p className="admin-date">Un añadido: lo que Booking, Hoteles.com y compañía muestran del hotel. Solo consulta; no manda sobre el motor</p>
        </div>
        <StatusPill
          phases={['Leyendo calendarios', 'Buscando reservas nuevas']} interval={1200}
          done={!cals.cargando}
          doneLabel={ultimaLectura ? `Calendarios revisados ${momento(ultimaLectura)}` : 'Listo'}
        />
      </div>


      <LiquidSegments options={PESTANAS} value={pestana} onValueChange={v => set({ pestana: v })} aria-label="Vista de Otras plataformas" />

      {pestana === 'calendario' ? (
        <>
          <CalendarioExterno propiedadId={propiedadId} />
          {/* `version`: se vuelve a pedir al conectar, desconectar o leer un calendario. */}
          <Proximas propiedadId={propiedadId} version={(cals.datos ?? []).map(c => `${c.id}${c.ultima_lectura}${c.eventos}`).join()} />
        </>
      ) : (
        <>
          <FichasExternas editar={editar} calendarios={cals} />
          {bot.datos?.tiene_clave
            ? <Menciones editar={editar} bot={bot} />
            : <p className={s.nota}><MagnifyingGlassIcon size={14} aria-hidden="true" /> El buscador de menciones en la web está apagado. Falta configurar su clave en el servidor.</p>}
        </>
      )}
    </div>
  )
}

function Fallo({ error, onReintentar }) {
  return (
    <div className={s.vacio} role="alert">
      <WarningCircleIcon size={28} aria-hidden="true" /><p>{error.message}</p>
      <Button variant="outline" size="lg" onClick={onReintentar}>Reintentar</Button>
    </div>
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
      <h2 className={s.seccion} id="t-proximas">Próximas reservas de otras plataformas (90 días)</h2>
      {pedido.cargando ? <SkeletonCard height="72px" />
        : pedido.error ? <Fallo error={pedido.error} onReintentar={pedido.recargar} />
          : lista.length === 0 ? <p className={s.nota}>Ninguna por ahora. Cuando conectes el calendario de una publicación, lo que se venda fuera aparece aquí.</p>
            : (
              <ul className={s.filas}>
                {lista.map(x => (
                  <li key={x.id} className={s.fila}>
                    <Badge variant="outline">{nombreCanal(x.canal)}</Badge>
                    <span className={s.texto}>
                      <strong>{corta(x.llegada)} → {corta(x.salida)}</strong>
                      <span>{x.publicacion ?? 'Sin publicación'}{x.titulo ? `, ${x.titulo}` : ''}</span>
                    </span>
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
  // "Buscar ahora" corre en el servidor (Celery): se avisa lo que de verdad pasa, sin tiempos inventados.
  // 0 = reposo, 1 = enviando la orden, 2 = buscando (se consulta cada 3 s hasta que cambie la última vuelta), 3 = listo.
  const [fase, setFase] = useState(0)
  const [demora, setDemora] = useState(false)
  const antes = useRef(estado.ultima_ejecucion)
  const listoRef = useRef(onListo) // sin esto cada render reiniciaría el sondeo y el límite de espera
  listoRef.current = onListo
  const buscar = async () => {
    setOcupado(true); setDemora(false); antes.current = estado.ultima_ejecucion; setFase(1)
    try { await externasApi.buscarAhora(); setFase(2) } catch (e) { toast.error(e.message); setFase(0) } finally { setOcupado(false) }
  }
  useEffect(() => {
    if (fase !== 2) return
    const sondeo = setInterval(() => listoRef.current(), 3000)
    const limite = setTimeout(() => setDemora(true), 150_000)
    return () => { clearInterval(sondeo); clearTimeout(limite) }
  }, [fase])
  useEffect(() => { if (fase === 2 && estado.ultima_ejecucion !== antes.current) setFase(3) }, [fase, estado.ultima_ejecucion])
  return (
    <form className={s.tarjeta} onSubmit={guardar}>
      <h2 className={s.titulo}><MagnifyingGlassIcon size={18} weight="bold" aria-hidden="true" /> El bot</h2>
      <p className={s.ayuda}>
        Busca dónde aparece el hotel y lee esas páginas solo si su robots.txt lo permite. Lo que encuentra por búsqueda en Booking, Airbnb, Expedia y compañía no se lee (solo lo que dice el buscador); las fichas propias de arriba sí, porque el hotel las dio. Necesita un contacto: va en cada visita del bot.
      </p>
      {!estado.tiene_clave && <p className={s.aviso} role="status">Falta la clave de Brave Search (BRAVE_SEARCH_CLAVE) en el servidor: el bot no busca.</p>}
      <p className={s.estado}>
        {estado.consultas_mes} de {estado.tope_mensual} búsquedas este mes. Última vuelta: {momento(estado.ultima_ejecucion)}{estado.ultimo_resultado ? `. ${estado.ultimo_resultado}` : '.'}
      </p>
      {editar && (
        <>
          <div className={s.formulario}>
            <div className={s.campo}><Label htmlFor="bot-contacto">Contacto (va en cada visita del bot)</Label>
              <Input id="bot-contacto" maxLength={120} value={form.contacto} onChange={set('contacto')} size="lg" placeholder="reservas@hotelesfrida.mx" /></div>
            <div className={s.campo}><Label htmlFor="bot-tope">Tope de búsquedas al mes</Label>
              <Input id="bot-tope" type="number" min="0" max="10000" required value={form.tope_mensual} onChange={set('tope_mensual')} size="lg" /></div>
          </div>
          <div className={s.formulario}>
            <div className={s.campo}><Label htmlFor="bot-consultas">Qué busca (una por línea)</Label>
              <textarea id="bot-consultas" className={s.area} rows={3} value={form.consultas} onChange={set('consultas')} /></div>
            <div className={s.campo}><Label htmlFor="bot-bloqueados">Dominios que nunca lee</Label>
              <textarea id="bot-bloqueados" className={s.area} rows={3} value={form.dominios_bloqueados} onChange={set('dominios_bloqueados')} /></div>
          </div>
          <div className={s.acciones}>
            <Button type="submit" disabled={ocupado}>Guardar</Button>
            <Button type="button" variant="outline" disabled={ocupado || fase === 1 || fase === 2 || !estado.tiene_clave || !estado.contacto} onClick={buscar}>Buscar ahora</Button>
          </div>
          {fase > 0 && (
            <>
              <WorkingOutLoud
                className="max-w-none" title="El bot está buscando" active={fase === 1 ? 0 : fase === 2 ? 1 : 2} finished={fase === 3}
                steps={[{ label: 'Enviando la orden al servidor' }, { label: 'Buscando en la web y leyendo solo lo permitido' }]}
                textos={{ listo: s => `Búsqueda lista en ${s} s`, resumen: () => estado.ultimo_resultado ?? 'Revisa las menciones más abajo' }}
              />
              {demora && fase === 2 && <p className={s.ayuda} role="status">Tarda más de lo normal. Sigue en cola y el resultado aparecerá solo cuando termine.</p>}
            </>
          )}
        </>
      )}
    </form>
  )
}
