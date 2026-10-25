import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'
import { CaretLeftIcon, CaretRightIcon, CloudArrowUpIcon, StarIcon, TrashIcon } from '@phosphor-icons/react'
import SectionPanel from '../components/SectionPanel'
import { SkeletonCard } from '@/components/frida/Skeleton'
import { Button } from '@/components/ui/button'
import Imagen from '@/components/marca/Imagen'
import Pista, { GrupoPistas } from '@/components/marca/Pista'
import { usePedido } from '@/hooks/usePedido'
import { useSesion } from '@/lib/sesion'
import { SITUACION } from '@/lib/situacion'
import { animacionItem } from '@/lib/animacionListas'
import { habitacionesApi, pesos } from '../habitaciones'
import s from './GestionFotos.module.css'

/*
 * Fotos de una habitación (fase 3d, PLAN-BACKEND §18). Cada acción se guarda al
 * momento (no hay "Guardar"): subir, cambiar el orden (la primera es la
 * portada) y mandar a la papelera, con "Deshacer". El servidor valida el
 * contenido, quita los metadatos y genera los tamaños: aquí solo se muestran.
 */

const ACEPTA = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
const MAX_MB = 15

export default function GestionFotosPage({ habitacionId, onBack }) {
  const pedido = usePedido(senal => habitacionesApi.obtener(habitacionId, senal), [habitacionId])
  const titulo = <>Gestionar<br /><em>Fotos</em></>
  if (pedido.error) {
    return (
      <SectionPanel eyebrow="Habitaciones" title={titulo} subtitle={pedido.error.message} onBack={onBack}>
        <Button variant="outline" onClick={pedido.recargar}>Reintentar</Button>
      </SectionPanel>
    )
  }
  if (pedido.cargando) {
    return (
      <SectionPanel eyebrow="Habitaciones" title={titulo} subtitle="Cargando la habitación" onBack={onBack}>
        <SkeletonCard height="420px" />
      </SectionPanel>
    )
  }
  const fuera = SITUACION[pedido.datos.situacion]
  if (fuera) {
    return <SectionPanel eyebrow="Habitaciones" title={<>{pedido.datos.nombre}</>} subtitle={`${fuera.texto}. ${fuera.detalle}`} onBack={onBack} />
  }
  return <Galeria room={pedido.datos} onBack={onBack} />
}

function Galeria({ room, onBack }) {
  const { sesion } = useSesion()
  const puedeEditar = sesion?.permisos?.includes('habitaciones.editar')
  const puedeQuitar = sesion?.permisos?.includes('habitaciones.eliminar')
  const fotos = usePedido(senal => habitacionesApi.fotos(room.id, senal), [room.id])
  const lista = fotos.datos ?? []
  const [subiendo, setSubiendo] = useState([]) // [{ clave, nombre }]
  const [arrastrando, setArrastrando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const entrada = useRef(null)

  const subir = async archivos => {
    const nuevos = [...archivos].map((archivo, i) => ({ clave: `${Date.now()}-${i}`, nombre: archivo.name, archivo }))
    if (!nuevos.length) return
    setSubiendo(x => [...x, ...nuevos])
    let bien = 0
    // Una a una: el servidor procesa cada foto (puede tardar un segundo).
    for (const n of nuevos) {
      try {
        if (n.archivo.size > MAX_MB * 1024 * 1024) throw new Error(`Pesa más de ${MAX_MB} MB`)
        await habitacionesApi.subirFoto(room.id, n.archivo)
        bien++
      } catch (e) {
        toast.error(`No se subió «${n.nombre}»`, { description: e.message })
      } finally {
        setSubiendo(x => x.filter(y => y.clave !== n.clave))
      }
    }
    if (bien) toast.success(bien === 1 ? 'Foto agregada' : `${bien} fotos agregadas`)
    fotos.recargar()
  }

  const ordenar = async ids => {
    setOcupado(true)
    try {
      await habitacionesApi.ordenarFotos(room.id, ids)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setOcupado(false)
      fotos.recargar()
    }
  }
  const mover = (i, paso) => {
    const ids = lista.map(f => f.id)
    ;[ids[i], ids[i + paso]] = [ids[i + paso], ids[i]]
    ordenar(ids)
  }
  const portada = i => ordenar([lista[i].id, ...lista.filter((_, j) => j !== i).map(f => f.id)])

  const quitar = async f => {
    try {
      await habitacionesApi.quitarFoto(room.id, f.id)
      fotos.recargar()
      toast.success('Foto en la papelera', {
        action: { label: 'Deshacer', onClick: () => habitacionesApi.restaurarFoto(room.id, f.id).then(fotos.recargar, e => toast.error(e.message)) },
      })
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <SectionPanel
      eyebrow="Habitaciones"
      title={<>Gestionar<br /><em>Fotos</em></>}
      subtitle={`Imágenes de «${room.nombre}». La primera es la portada.`}
      onBack={onBack}
    >
      <div className={s.rejilla}>
        <div>
          {puedeEditar && (
            <label
              className={`${s.zona} ${arrastrando ? s.zonaActiva : ''}`}
              onDragOver={e => { e.preventDefault(); setArrastrando(true) }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={e => { e.preventDefault(); setArrastrando(false); subir(e.dataTransfer.files) }}
            >
              <CloudArrowUpIcon size={40} weight="duotone" aria-hidden="true" />
              <span className={s.zonaTitulo}>{arrastrando ? 'Suelta las fotos aquí' : 'Arrastra fotos o haz clic para elegirlas'}</span>
              <span className={s.zonaAyuda}>JPG, PNG, WebP o HEIC (iPhone), hasta {MAX_MB} MB cada una. Se guardan sin datos de ubicación.</span>
              <input ref={entrada} type="file" accept={ACEPTA} multiple className={s.oculto}
                onChange={e => { subir(e.target.files); e.target.value = '' }} />
            </label>
          )}

          <h3 className={s.cuenta}>
            {fotos.cargando ? 'Cargando fotos' : lista.length === 0 ? 'Sin fotos' : `${lista.length} foto${lista.length !== 1 ? 's' : ''}`}
          </h3>

          {fotos.error ? (
            <div className={s.vacio} role="alert">
              <p>{fotos.error.message}</p>
              <Button variant="outline" size="sm" onClick={fotos.recargar}>Reintentar</Button>
            </div>
          ) : fotos.cargando ? (
            <div className={s.fotos}>{[0, 1, 2].map(i => <div key={i} className={s.foto}><div className={s.marco}><Imagen cargando /></div></div>)}</div>
          ) : lista.length === 0 && subiendo.length === 0 ? (
            <div className={s.vacio} role="status">
              <div className={s.vacioImagen}><Imagen src={null} alt={room.nombre} /></div>
              <p>Esta habitación aún no tiene fotos.{puedeEditar ? ' Sube la primera arriba.' : ''}</p>
            </div>
          ) : (
            <GrupoPistas>
              <ul className={s.fotos} aria-busy={ocupado}>
                <AnimatePresence initial={false} mode="popLayout">
                  {lista.map((f, i) => (
                    <motion.li key={f.id} layout {...animacionItem} className={`${s.foto} ${i === 0 ? s.fotoPortada : ''}`}>
                      <div className={s.marco}>
                        <Imagen src={f.urls['480']} alt={`Foto ${i + 1} de ${room.nombre}`} />
                        {i === 0 && <span className={s.insignia}><StarIcon size={12} weight="fill" aria-hidden="true" /> Portada</span>}
                      </div>
                      {(puedeEditar || puedeQuitar) && (
                        <div className={s.acciones}>
                          {puedeEditar && i > 0 && (
                            <Pista contenido="Hacer portada">
                              <button type="button" className={s.accion} disabled={ocupado} onClick={() => portada(i)} aria-label="Hacer portada">
                                <StarIcon size={16} weight="bold" />
                              </button>
                            </Pista>
                          )}
                          {puedeEditar && (
                            <>
                              <Pista contenido="Mover antes">
                                <button type="button" className={s.accion} disabled={ocupado || i === 0} onClick={() => mover(i, -1)} aria-label="Mover antes">
                                  <CaretLeftIcon size={16} weight="bold" />
                                </button>
                              </Pista>
                              <Pista contenido="Mover después">
                                <button type="button" className={s.accion} disabled={ocupado || i === lista.length - 1} onClick={() => mover(i, 1)} aria-label="Mover después">
                                  <CaretRightIcon size={16} weight="bold" />
                                </button>
                              </Pista>
                            </>
                          )}
                          {puedeQuitar && (
                            <Pista contenido="Mandar a la papelera">
                              <button type="button" className={`${s.accion} ${s.accionQuitar}`} onClick={() => quitar(f)} aria-label="Mandar a la papelera">
                                <TrashIcon size={16} weight="bold" />
                              </button>
                            </Pista>
                          )}
                        </div>
                      )}
                    </motion.li>
                  ))}
                  {subiendo.map(n => (
                    <motion.li key={n.clave} {...animacionItem} className={s.foto} aria-label={`Subiendo ${n.nombre}`}>
                      <div className={s.marco}>
                        <Imagen cargando />
                        <span className={s.subiendo}>Subiendo…</span>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </GrupoPistas>
          )}
        </div>

        {/* Resumen de la habitación, con su portada */}
        <aside className={s.resumen}>
          <div className={s.resumenFoto}><Imagen src={lista[0]?.urls['1080'] ?? null} alt={room.nombre} /></div>
          <div className={s.resumenTexto}>
            <span className="rotulo">{room.tipo}</span>
            <strong>{room.nombre}</strong>
            <span>{pesos(room.tarifa_centavos)} / noche</span>
          </div>
        </aside>
      </div>
    </SectionPanel>
  )
}
