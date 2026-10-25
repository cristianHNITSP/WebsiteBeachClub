import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SkeletonCard } from '@/components/frida/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  BellIcon, BellSlashIcon, CalendarDotsIcon, CreditCardIcon, WrenchIcon, StarIcon, GearSixIcon,
  EnvelopeSimpleIcon, EnvelopeSimpleOpenIcon, TrashIcon, ArrowRightIcon, ChecksIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import JellyRadio from '@/components/bits/JellyRadio'
import TarjetaCifra from '@/components/marca/TarjetaCifra'
import Paginador from '@/components/marca/Paginador'
import Pista, { GrupoPistas } from '@/components/marca/Pista'
import { useParametros } from '@/hooks/useParametros'
import { animacionItem } from '@/lib/animacionListas'
import { useAvisos, grupoDe, haceCuanto } from '../avisos'
import s from './AvisosPage.module.css'

const POR_PAGINA = 8

// Cada tipo con su flor del logo (identidad, no estado) y su icono.
const TIPO = {
  reserva:   { Icono: CalendarDotsIcon, flor: 'morado',   nombre: 'Reservas' },
  pago:      { Icono: CreditCardIcon,   flor: 'dorado',   nombre: 'Pagos' },
  operacion: { Icono: WrenchIcon,       flor: 'turquesa', nombre: 'Operación' },
  resena:    { Icono: StarIcon,         flor: 'orquidea', nombre: 'Reseñas' },
  sistema:   { Icono: GearSixIcon,      flor: 'naranja',  nombre: 'Sistema' },
}

const FILTROS = [
  { value: 'todos',     label: 'Todos' },
  { value: 'sin-leer',  label: 'Sin leer' },
  { value: 'reserva',   label: 'Reservas' },
  { value: 'pago',      label: 'Pagos' },
  { value: 'operacion', label: 'Operación' },
  { value: 'sistema',   label: 'Sistema' },
]

export default function AvisosPage({ onNavigate }) {
  const { avisos, sinLeer, cargando, error, recargar, marcarLeido, marcarTodos, borrar, restaurar } = useAvisos()
  const navigate = useNavigate()
  // Filtro y página en la URL (?filtro=pago&pagina=2): recargar conserva la vista.
  const [p, set] = useParametros({ filtro: 'todos', pagina: 1 })

  const filtrados = useMemo(() => avisos.filter(a =>
    p.filtro === 'todos' ? true : p.filtro === 'sin-leer' ? !a.leido : a.tipo === p.filtro,
  ), [avisos, p.filtro])

  const total = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const pagina = Math.min(Math.max(1, p.pagina), total)
  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const cuenta = tipo => avisos.filter(a => a.tipo === tipo).length

  const quitar = aviso => {
    borrar(aviso.id)
    toast('Aviso eliminado', {
      description: aviso.titulo,
      action: { label: 'Deshacer', onClick: () => restaurar(aviso.id) },
    })
  }

  const abrir = aviso => {
    marcarLeido(aviso.id)
    // El destino es una ruta del panel (p. ej. la reserva abierta en la Línea de tiempo).
    if (aviso.destino.startsWith('/')) navigate(aviso.destino)
    else onNavigate(aviso.destino)
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">Centro de avisos</span>
          <h1 className="admin-page-title">Tus <em>avisos</em></h1>
          <p className="admin-page-sub">
            {sinLeer > 0 ? `Tienes ${sinLeer} aviso${sinLeer !== 1 ? 's' : ''} sin leer.` : 'Estás al día. No hay avisos sin leer.'}
          </p>
        </div>
        <div className="admin-page-header-actions">
          <div className="admin-page-header-actions-row">
            <Button
              variant="outline"
              disabled={sinLeer === 0}
              onClick={() => { marcarTodos(); toast.success('Todo marcado como leído') }}
            >
              <ChecksIcon size={16} weight="bold" /> Marcar todo como leído
            </Button>
          </div>
        </div>
      </div>

      <div className="inventory-grid" style={{ marginBottom: 28 }}>
        <TarjetaCifra Icono={BellIcon}         flor="morado"   label="Sin leer" value={sinLeer} />
        <TarjetaCifra Icono={CalendarDotsIcon} flor="turquesa" label="Reservas" value={cuenta('reserva')} />
        <TarjetaCifra Icono={CreditCardIcon}   flor="dorado"   label="Pagos"    value={cuenta('pago')} />
        <TarjetaCifra Icono={WrenchIcon}       flor="naranja"  label="Operación" value={cuenta('operacion')} />
      </div>

      {/* Filtros: JellyRadio (React Bits). Cambiar de filtro vuelve a la página 1 */}
      <div className={s.filtros}>
        <JellyRadio
          items={FILTROS}
          value={p.filtro}
          onChange={v => set({ filtro: v, pagina: 1 })}
          ariaLabel="Filtrar avisos"
          size="md"
          chipColor="var(--muted)"
          activeColor="var(--primary)"
          textColor="var(--muted-foreground)"
          activeTextColor="var(--primary-foreground)"
        />
        <span className={s.resultado}>{filtrados.length} aviso{filtrados.length !== 1 ? 's' : ''}</span>
      </div>

      <div className={s.bandeja}>
        {cargando ? (
          <div className={s.lista} style={{ display: "grid", gap: 10 }}>{[0, 1, 2, 3].map(i => <SkeletonCard key={i} height="76px" />)}</div>
        ) : error ? (
          <div className={s.vacio} role="alert">
            <span className={s.vacioIcono}><BellSlashIcon size={30} /></span>
            <div className={s.vacioTitulo}>{error.message}</div>
            <Button variant="outline" size="sm" onClick={recargar}>Reintentar</Button>
          </div>
        ) : visibles.length === 0 ? (
          <div className={s.vacio} role="status">
            <span className={s.vacioIcono}><BellSlashIcon size={30} /></span>
            <div className={s.vacioTitulo}>{p.filtro === 'sin-leer' ? 'No tienes avisos sin leer' : 'No hay avisos aquí'}</div>
            <div className={s.vacioTexto}>Cuando pase algo en tus hoteles, lo verás en esta bandeja.</div>
          </div>
        ) : (
          <GrupoPistas>
            <motion.ul layout className={s.lista}>
              <AnimatePresence mode="popLayout" initial={false}>
                {visibles.map((aviso, i) => {
                  const t = TIPO[aviso.tipo]
                  const grupo = grupoDe(aviso.fecha)
                  const nuevoGrupo = i === 0 || grupoDe(visibles[i - 1].fecha) !== grupo
                  return (
                    <motion.li key={aviso.id} {...animacionItem}>
                      {nuevoGrupo && <div className={`rotulo ${s.grupo}`}>{grupo}</div>}
                      <article className={`${s.aviso} ${aviso.leido ? '' : s.noLeido}`}>
                        <span className={s.icono} style={{ background: `var(--flor-${t.flor})`, color: `var(--flor-${t.flor}-fg)` }}>
                          <t.Icono size={19} weight="fill" aria-hidden="true" />
                        </span>
                        <div className={s.cuerpo}>
                          <div className={s.cabecera}>
                            <h2 className={s.titulo}>{aviso.titulo}</h2>
                            {!aviso.leido && <span className={s.punto} aria-label="Sin leer" />}
                          </div>
                          <p className={s.texto}>{aviso.texto}</p>
                          <div className={s.meta}>
                            <span className="rotulo">{t.nombre}</span>
                            <time dateTime={aviso.fecha.toISOString()}>{haceCuanto(aviso.fecha)}</time>
                          </div>
                        </div>
                        <div className={s.acciones}>
                          <Button variant="ghost" size="sm" onClick={() => abrir(aviso)}>
                            Ver <ArrowRightIcon size={14} weight="bold" />
                          </Button>
                          <Pista contenido={aviso.leido ? 'Marcar como no leído' : 'Marcar como leído'} lado="top">
                            <Button variant="ghost" size="icon" aria-label={aviso.leido ? 'Marcar como no leído' : 'Marcar como leído'}
                              onClick={() => marcarLeido(aviso.id, !aviso.leido)}>
                              {aviso.leido ? <EnvelopeSimpleIcon size={18} /> : <EnvelopeSimpleOpenIcon size={18} />}
                            </Button>
                          </Pista>
                          <Pista contenido="Eliminar" lado="top">
                            <Button variant="ghost" size="icon" aria-label="Eliminar aviso" className={s.borrar} onClick={() => quitar(aviso)}>
                              <TrashIcon size={18} />
                            </Button>
                          </Pista>
                        </div>
                      </article>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </motion.ul>
          </GrupoPistas>
        )}
      </div>

      <Paginador id="avisos" etiqueta="Páginas de avisos" pagina={pagina} total={total}
        onCambiar={n => set({ pagina: n }, { historial: true })} />
    </div>
  )
}
