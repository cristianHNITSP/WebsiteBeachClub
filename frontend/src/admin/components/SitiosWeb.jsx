import { useState } from 'react'
import { toast } from 'sonner'
import { CopyIcon, GlobeIcon, KeyIcon, PlusIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SkeletonCard } from '@/components/frida/Skeleton'
import ConfirmarDescarte from '@/components/marca/ConfirmarDescarte'
import { usePedido } from '@/hooks/usePedido'
import { useParametros } from '@/hooks/useParametros'
import { useSesion } from '@/lib/sesion'
import { sitiosApi } from '../sitios'
import s from './SitiosWeb.module.css'

/*
 * Sitios web que reservan por la API pública v1 (PLAN-BACKEND §4.2), permiso
 * `sitios.gestionar`. Cada sitio: sus claves, los orígenes desde los que puede
 * usar la clave pública, las propiedades que vende y la URL de sus webhooks.
 * Los secretos se ven UNA vez (al crear o rotar): solo viven en este estado,
 * nunca en la URL ni en el navegador. El formulario abierto va en `?sitio=`.
 */

const fecha = iso => new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const ESTADO_ENTREGA = { pendiente: 'Pendiente', entregada: 'Entregada', fallida: 'Fallida' }

async function copiar(texto, que) {
  try { await navigator.clipboard.writeText(texto); toast.success(`${que} copiada`) } catch { toast.error('No se pudo copiar: cópiala a mano') }
}

export default function SitiosWeb() {
  const pedido = usePedido(senal => sitiosApi.listar(senal), [])
  const [{ sitio: abierto }, set] = useParametros({ sitio: '' })
  const [secretos, setSecretos] = useState(null) // { nombre, clave_secreta?, secreto_webhooks? }
  const { sesion } = useSesion()
  const propiedades = sesion?.propiedades ?? []

  const listo = (r, mensaje) => {
    if (r.clave_secreta || r.secreto_webhooks) setSecretos({ nombre: r.nombre, clave_secreta: r.clave_secreta, secreto_webhooks: r.secreto_webhooks })
    toast.success(mensaje)
    set({ sitio: '' })
    pedido.recargar()
  }

  if (pedido.cargando) return <div className={s.contenedor}><SkeletonCard height="160px" /><SkeletonCard height="160px" /></div>
  if (pedido.error) {
    return (
      <div className={s.vacio} role="alert">
        <WarningCircleIcon size={28} aria-hidden="true" /><p>{pedido.error.message}</p>
        <Button variant="outline" size="sm" onClick={pedido.recargar}>Reintentar</Button>
      </div>
    )
  }
  const sitios = pedido.datos
  const editando = sitios.find(x => x.id === abierto)

  return (
    <div className={s.contenedor}>
      <div className={s.cabecera}>
        <p className={s.ayuda}>
          Cada website (WordPress, Shopify) reserva con sus propias claves. La pública va en su HTML; la secreta, solo en su servidor.
          Mientras no haya proveedor de pagos, las reservas de la web quedan retenidas 15 minutos y se liberan solas.
        </p>
        {abierto !== 'nuevo' && <Button onClick={() => set({ sitio: 'nuevo' })}><PlusIcon size={16} weight="bold" /> Nuevo sitio</Button>}
      </div>

      {secretos && <Secretos secretos={secretos} onCerrar={() => setSecretos(null)} />}

      {(abierto === 'nuevo' || editando) && (
        <Formulario
          key={abierto}
          sitio={editando}
          propiedades={propiedades}
          onCancelar={() => set({ sitio: '' })}
          onGuardado={listo}
        />
      )}

      {sitios.length === 0 && abierto !== 'nuevo' ? (
        <div className={s.vacio} role="status"><GlobeIcon size={28} aria-hidden="true" /><p>Aún no hay sitios web conectados.</p></div>
      ) : (
        <ul className={s.lista}>
          {sitios.map(x => (
            <Sitio key={x.id} sitio={x} propiedades={propiedades} onEditar={() => set({ sitio: x.id })} onListo={listo} />
          ))}
        </ul>
      )}
    </div>
  )
}

function Secretos({ secretos, onCerrar }) {
  return (
    <section className={s.secretos} role="status" aria-labelledby="secretos-titulo">
      <h3 id="secretos-titulo" className={s.titulo}><KeyIcon size={18} weight="bold" aria-hidden="true" /> Secretos de «{secretos.nombre}»</h3>
      <p className={s.ayuda}>Cópialos ahora y guárdalos en el servidor del sitio: no se vuelven a mostrar. Si se pierden, rota las claves.</p>
      {secretos.clave_secreta && <Secreto etiqueta="Clave secreta" valor={secretos.clave_secreta} />}
      {secretos.secreto_webhooks && <Secreto etiqueta="Secreto de webhooks" valor={secretos.secreto_webhooks} />}
      <div><Button variant="outline" onClick={onCerrar}>Ya los guardé</Button></div>
    </section>
  )
}

function Secreto({ etiqueta, valor }) {
  return (
    <div className={s.dato}>
      <span className={s.etiqueta}>{etiqueta}</span>
      <div className={s.fila}>
        <code className={s.codigo}>{valor}</code>
        <Button variant="outline" size="icon" aria-label={`Copiar ${etiqueta.toLowerCase()}`} className="size-11 shrink-0" onClick={() => copiar(valor, etiqueta)}>
          <CopyIcon size={16} />
        </Button>
      </div>
    </div>
  )
}

function Formulario({ sitio, propiedades, onCancelar, onGuardado }) {
  const [form, setForm] = useState({
    nombre: sitio?.nombre ?? '',
    origenes: (sitio?.origenes ?? []).join('\n'),
    webhook_url: sitio?.webhook_url ?? '',
    propiedades: sitio?.propiedades ?? propiedades.map(p => p.id),
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const alternar = id => setForm(f => ({ ...f, propiedades: f.propiedades.includes(id) ? f.propiedades.filter(p => p !== id) : [...f.propiedades, id] }))

  const guardar = async e => {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    const datos = {
      nombre: form.nombre,
      origenes: form.origenes.split(/\s+/).filter(Boolean),
      webhook_url: form.webhook_url.trim() || null,
      propiedades: form.propiedades,
    }
    try {
      const r = sitio ? await sitiosApi.editar(sitio.id, datos) : await sitiosApi.crear(datos)
      onGuardado(r, sitio ? 'Sitio actualizado' : 'Sitio creado')
    } catch (err) {
      const campos = err.datos?.campos ?? []
      setError(campos.length ? `${err.message}: ${campos.map(c => c.campo).join(', ')}` : err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className={s.tarjeta} onSubmit={guardar}>
      <h3 className={s.titulo}>{sitio ? `Editar «${sitio.nombre}»` : 'Nuevo sitio web'}</h3>
      <div className={s.campo}>
        <Label htmlFor="sw-nombre">Nombre</Label>
        <Input id="sw-nombre" required minLength={2} maxLength={80} value={form.nombre} onChange={set('nombre')} className="h-11" placeholder="Hoteles Frida (WordPress)" />
      </div>
      <fieldset className={s.campo}>
        <legend className={s.leyenda}>Propiedades que vende</legend>
        {propiedades.map(p => (
          <label key={p.id} className={s.casilla}>
            <input type="checkbox" checked={form.propiedades.includes(p.id)} onChange={() => alternar(p.id)} />
            {p.nombre}
          </label>
        ))}
      </fieldset>
      <div className={s.campo}>
        <Label htmlFor="sw-origenes">Orígenes permitidos (uno por línea)</Label>
        <textarea id="sw-origenes" className={s.area} rows={3} value={form.origenes} onChange={set('origenes')} placeholder="https://hotelesfrida.mx" />
        <span className={s.ayuda}>Exactos, como los manda el navegador: https y el dominio, sin ruta ni barra final.</span>
      </div>
      <div className={s.campo}>
        <Label htmlFor="sw-webhook">URL de webhooks (opcional)</Label>
        <Input id="sw-webhook" type="url" maxLength={500} value={form.webhook_url} onChange={set('webhook_url')} className="h-11" placeholder="https://hotelesfrida.mx/wp-json/frida/webhook" />
        <span className={s.ayuda}>Aquí avisamos cuando una reserva del sitio vence, se cancela o cambia.</span>
      </div>
      {error && <p className={s.error} role="alert">{error}</p>}
      <div className={s.acciones}>
        <Button type="submit" disabled={guardando || form.propiedades.length === 0}>{sitio ? 'Guardar' : 'Crear sitio'}</Button>
        <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
      </div>
    </form>
  )
}

function Sitio({ sitio, propiedades, onEditar, onListo }) {
  const [confirmar, setConfirmar] = useState(null) // 'claves' | 'webhook' | 'revocar'
  const [ocupado, setOcupado] = useState(false)
  const [verEntregas, setVerEntregas] = useState(false)
  const revocado = Boolean(sitio.revocado_en)
  const nombres = sitio.propiedades.map(id => propiedades.find(p => p.id === id)?.nombre ?? 'Propiedad').join(', ')

  const ACCIONES = {
    claves: {
      titulo: '¿Rotar las claves?', accion: 'Rotar claves', hacer: () => sitiosApi.rotarClaves(sitio.id), listo: 'Claves nuevas',
      texto: 'Las claves actuales dejan de funcionar en este momento: el sitio no podrá reservar hasta que pongas las nuevas.',
    },
    webhook: {
      titulo: '¿Nuevo secreto de webhooks?', accion: 'Generar secreto', hacer: () => sitiosApi.rotarWebhook(sitio.id), listo: 'Secreto de webhooks nuevo',
      texto: 'Los avisos se firmarán con el secreto nuevo: el sitio rechazará los que lleguen hasta que lo actualice.',
    },
    revocar: {
      titulo: '¿Revocar este sitio?', accion: 'Revocar', hacer: () => sitiosApi.revocar(sitio.id), listo: 'Sitio revocado',
      texto: 'Sus claves dejan de funcionar y no recibe más avisos. No se deshace: si vuelve, se da de alta otro. Sus reservas se conservan.',
    },
  }
  const ejecutar = async () => {
    const a = ACCIONES[confirmar]
    setConfirmar(null)
    setOcupado(true)
    try { onListo(await a.hacer(), a.listo) } catch (e) { toast.error(e.message) } finally { setOcupado(false) }
  }

  return (
    <li className={`${s.tarjeta} ${revocado ? s.revocado : ''}`}>
      <div className={s.cabecera}>
        <h3 className={s.titulo}>{sitio.nombre}</h3>
        <span className={revocado ? s.estadoMalo : s.estado}>{revocado ? `Revocado el ${fecha(sitio.revocado_en)}` : 'Vigente'}</span>
      </div>
      <dl className={s.datos}>
        <div className={s.dato}>
          <dt className={s.etiqueta}>Clave pública</dt>
          <dd className={s.fila}>
            <code className={s.codigo}>{sitio.clave_publica}</code>
            <Button variant="outline" size="icon" aria-label="Copiar clave pública" className="size-11 shrink-0" onClick={() => copiar(sitio.clave_publica, 'Clave pública')}><CopyIcon size={16} /></Button>
          </dd>
        </div>
        <div className={s.dato}><dt className={s.etiqueta}>Clave secreta</dt><dd><code className={s.codigo}>sk_…{sitio.clave_secreta_pista}</code></dd></div>
        <div className={s.dato}><dt className={s.etiqueta}>Vende</dt><dd>{nombres}</dd></div>
        <div className={s.dato}><dt className={s.etiqueta}>Orígenes</dt><dd>{sitio.origenes.length ? sitio.origenes.join(', ') : 'Ninguno: solo de servidor a servidor'}</dd></div>
        <div className={s.dato}><dt className={s.etiqueta}>Webhooks</dt><dd className={sitio.webhook_url ? s.url : undefined}>{sitio.webhook_url ?? 'Sin URL: no recibe avisos'}</dd></div>
      </dl>
      {!revocado && (
        <div className={s.acciones}>
          <Button variant="outline" disabled={ocupado} onClick={onEditar}>Editar</Button>
          <Button variant="outline" disabled={ocupado} onClick={() => setConfirmar('claves')}>Rotar claves</Button>
          <Button variant="outline" disabled={ocupado} onClick={() => setConfirmar('webhook')}>Nuevo secreto de webhooks</Button>
          <Button variant="outline" disabled={ocupado} onClick={() => setVerEntregas(v => !v)} aria-expanded={verEntregas}>Avisos enviados</Button>
          <Button variant="destructive" disabled={ocupado} onClick={() => setConfirmar('revocar')}>Revocar</Button>
        </div>
      )}
      {verEntregas && <Entregas sitioId={sitio.id} />}
      <ConfirmarDescarte
        abierto={confirmar !== null}
        titulo={ACCIONES[confirmar]?.titulo}
        texto={ACCIONES[confirmar]?.texto}
        accion={ACCIONES[confirmar]?.accion}
        cancelar="Cancelar"
        onConfirmar={ejecutar}
        onCancelar={() => setConfirmar(null)}
      />
    </li>
  )
}

function Entregas({ sitioId }) {
  const pedido = usePedido(senal => sitiosApi.entregas(sitioId, senal), [sitioId])
  const reintentar = async id => {
    try { await sitiosApi.reintentar(sitioId, id); toast.success('Se volverá a enviar en unos segundos'); pedido.recargar() } catch (e) { toast.error(e.message) }
  }
  if (pedido.cargando) return <SkeletonCard height="80px" />
  if (pedido.error) return <p className={s.error} role="alert">{pedido.error.message}</p>
  if (!pedido.datos.length) return <p className={s.ayuda}>Aún no se le ha enviado ningún aviso.</p>
  return (
    <ul className={s.entregas}>
      {pedido.datos.map(e => (
        <li key={e.id} className={s.entrega}>
          <span className={s.entregaTexto}>
            <strong>{e.tipo}</strong>
            <span>
              {ESTADO_ENTREGA[e.estado]}, {e.intentos} intento{e.intentos !== 1 ? 's' : ''}. {fecha(e.creada)}
              {e.ultimo_error ? `. Último error: ${e.ultimo_error}` : ''}
            </span>
          </span>
          {e.estado === 'fallida' && <Button variant="outline" size="sm" className="h-11" onClick={() => reintentar(e.id)}>Reintentar</Button>}
        </li>
      ))}
    </ul>
  )
}
