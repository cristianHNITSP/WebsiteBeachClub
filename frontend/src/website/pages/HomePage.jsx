import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { ArrowRightIcon, ArrowDownIcon, MagnifyingGlassIcon, UmbrellaSimpleIcon, FlowerLotusIcon, CookingPotIcon } from '@phosphor-icons/react'
import { SUCURSALES } from '../../data/rooms'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import SplitText from '@/components/bits/SplitText'
import RotatingText from '@/components/bits/RotatingText'
import CountUp from '@/components/bits/CountUp'
import SpotlightCard from '@/components/bits/SpotlightCard'
import ClickSpark from '@/components/bits/ClickSpark'
import CurvedLoop from '@/components/bits/CurvedLoop'
import { useTheme } from '@/context/ThemeContext'
import { leerToken } from '@/lib/tokens-css'
import { aISO } from '@/lib/fechas'
import { animacionItem } from '@/lib/animacionListas'
import { useParametros } from '@/hooks/useParametros'
import RoomCard from '../components/RoomCard'
import ScrollReveal from '../components/ScrollReveal'
import PortadaFotos from '../components/PortadaFotos'
import { CoronaFlores } from '@/components/marca/Wordmark'
import Encabezado from '@/components/marca/Encabezado'
import SelectorFechas from '@/components/marca/SelectorFechas'
import Selector from '@/components/marca/Selector'
import s from './HomePage.module.css'

const EXPERIENCE_ITEMS = [
  {
    Icono: UmbrellaSimpleIcon,
    title: 'Acceso directo al mar',
    desc: 'Todas nuestras propiedades están a pasos de la playa yucateca.',
    flor: 'turquesa',
  },
  {
    Icono: FlowerLotusIcon,
    title: 'Bienestar y spa',
    desc: 'Tratamientos artesanales con ingredientes de la región para renovar cuerpo y mente.',
    flor: 'orquidea',
  },
  {
    Icono: CookingPotIcon,
    title: 'Gastronomía local',
    desc: 'Desayunos con productos frescos de productores yucatecos de temporada.',
    flor: 'naranja',
  },
]

// Cada sucursal con su par de flores del logo.
const SUCURSAL_FONDO = {
  chelem:   'linear-gradient(150deg, var(--noche) 0%, var(--flor-morado) 55%, var(--flor-orquidea) 100%)',
  chuburna: 'linear-gradient(150deg, var(--noche) 0%, color-mix(in srgb, var(--flor-turquesa) 70%, var(--noche)) 55%, var(--flor-turquesa) 100%)',
}

// Algo de rebote para que la pastilla "respire" al cambiar de ancho.
const RESORTE_ROTADOR = { type: 'spring', damping: 22, stiffness: 260, mass: 0.9 }

const FILTROS = [
  { key: 'all',     label: 'Todos' },
  { key: 'familia', label: 'Familia' },
  { key: 'deal',    label: 'Ofertas' },
]

export default function HomePage({ onNavigate, onSelectRoom, rooms, favorites, onToggleFav }) {
  const { reduceMotion } = useTheme()
  const navigate = useNavigate()
  const [sucursal, setSucursal] = useState('todas')
  const [fechas, setFechas] = useState({})
  const [escena, setEscena] = useState(0) // foto de fondo = palabra del rotador
  // El filtro de destacadas vive en la URL (?destacadas=familia) como el resto.
  const [{ destacadas: categoryFilter }, setParam] = useParametros({ destacadas: 'all' })
  const setCategoryFilter = v => setParam({ destacadas: v })

  // Buscar: destino y fechas viajan a la búsqueda por la URL.
  const buscar = () => {
    const q = new URLSearchParams()
    if (sucursal !== 'todas') q.set('sucursal', sucursal)
    if (fechas.from) q.set('llegada', aISO(fechas.from))
    if (fechas.to) q.set('salida', aISO(fechas.to))
    navigate(`/habitaciones${q.size ? `?${q}` : ''}`)
  }

  // El canvas de ClickSpark no resuelve var(): se lee el token ya calculado.
  const colores = useMemo(() => ({ chispa: leerToken('--flor-dorado', '#E8A828') }), [])

  // Cifras del hero sacadas de los datos (no inventadas).
  const cifras = useMemo(() => ({
    habitaciones: rooms.length,
    resenas: rooms.reduce((n, r) => n + r.reviews, 0),
    rating: Math.round((rooms.reduce((n, r) => n + r.rating, 0) / rooms.length) * 10) / 10,
  }), [rooms])

  const filteredRooms = rooms.filter(r => {
    if (categoryFilter === 'familia') return r.roomType === 'familiar'
    if (categoryFilter === 'deal')    return r.hasDiscount
    return true
  }).slice(0, 6)

  const heroContenido = (
    <div className="hero__content">
      <p className="hero__badge">
        <CoronaFlores className="hero__badge-flor" />
        Chelem y Chuburná, Yucatán
      </p>

      <h1 className="hero__title">
        {reduceMotion
          ? <span>Vive la costa yucateca</span>
          : (
            <SplitText
              text="Vive la costa yucateca"
              tag="span"
              splitType="words"
              delay={70}
              duration={0.9}
              from={{ opacity: 0, y: '0.45em' }}
              to={{ opacity: 1, y: 0 }}
              rootMargin="0px"
            />
          )}
        <br />
        {/* LayoutGroup: cuando RotatingText cambia de palabra, "en" también se
            entera y se desliza en vez de saltar. La palabra lleva un trazo a
            mano (dorado) que se vuelve a dibujar en cada cambio. */}
        <LayoutGroup>
          <span className="hero__title-acento">
            <motion.span layout transition={RESORTE_ROTADOR}>en</motion.span>
            <motion.span layout transition={RESORTE_ROTADOR} className="hero__palabra">
            <RotatingText
              texts={['Chelem', 'Chuburná', 'Hoteles Frida']}
              mainClassName="hero__rotador"
              // popLayout (no "wait"): la palabra nueva entra mientras la vieja
              // sale, y el cambio de ancho ocurre en el mismo render en que el
              // contenedor `layout` se mide, así la pastilla se estira con resorte.
              animatePresenceMode="popLayout"
              staggerFrom="last"
              initial={{ y: '110%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-120%', opacity: 0 }}
              staggerDuration={0.03}
              splitLevelClassName="overflow-hidden pb-1"
              transition={RESORTE_ROTADOR}
              rotationInterval={3600}
              auto={!reduceMotion}
              onNext={setEscena}
            />
              <svg className="hero__trazo" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true">
                <motion.path
                  key={escena}
                  d="M3 11 C 60 4, 120 3, 170 7 S 260 12, 297 5"
                  initial={{ pathLength: reduceMotion ? 1 : 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1], delay: 0.25 }}
                />
              </svg>
            </motion.span>
          </span>
        </LayoutGroup>
      </h1>

      <p className="hero__subtitle">
        Dos casas frente al Golfo de México, con la hospitalidad yucateca de siempre
        y el color de las flores de Frida.
      </p>

      {/* Buscador */}
      <form className="hero__search-box" onSubmit={e => { e.preventDefault(); buscar() }}>
        <div className="hero__search-grid">
          <div className="grid gap-2">
            <Label id="lbl-destino">Destino</Label>
            <Selector
              ariaLabel="Destino"
              value={sucursal}
              onChange={setSucursal}
              opciones={[
                { value: 'todas', label: 'Todas las propiedades' },
                ...SUCURSALES.map(sc => ({ value: sc.key, label: sc.name, tag: sc.subtitle.split(',')[0] })),
              ]}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hero-fechas">Fechas</Label>
            <SelectorFechas id="hero-fechas" value={fechas} onChange={setFechas} />
          </div>

          <Button type="submit" size="lg" className="h-11 w-full px-6">
            <MagnifyingGlassIcon size={18} weight="bold" />
            Buscar
          </Button>
        </div>
      </form>

      {/* Cifras */}
      <dl className="hero__stats">
        <div className="hero__stat">
          <dt className="hero__stat-label">Habitaciones</dt>
          <dd className="hero__stat-valor">
            {reduceMotion ? cifras.habitaciones : <CountUp to={cifras.habitaciones} duration={1.6} />}
          </dd>
        </div>
        <div className="hero__stat">
          <dt className="hero__stat-label">Calificación</dt>
          <dd className="hero__stat-valor">
            {reduceMotion ? cifras.rating : <CountUp from={3} to={cifras.rating} duration={1.8} />} ★
          </dd>
        </div>
        <div className="hero__stat">
          <dt className="hero__stat-label">Reseñas</dt>
          <dd className="hero__stat-valor">
            {reduceMotion ? cifras.resenas.toLocaleString('es-MX') : <CountUp to={cifras.resenas} separator="," duration={2} />}
          </dd>
        </div>
      </dl>
    </div>
  )

  return (
    <div>
      {/* ══════════ HERO ══════════ */}
      <section className="hero" aria-label="Portada">
        <PortadaFotos escena={escena} reduceMotion={reduceMotion} />
        <div className="hero__overlay" />

        {reduceMotion
          ? heroContenido
          : (
            <ClickSpark sparkColor={colores.chispa} sparkSize={11} sparkRadius={22} sparkCount={9} duration={450}>
              {heroContenido}
            </ClickSpark>
          )}

        <button
          className="hero__scroll-btn"
          onClick={() => document.getElementById('sucursales')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })}
        >
          <ArrowDownIcon size={16} weight="bold" />
          Descubrir
        </button>
      </section>

      {/* ══════════ MARQUESINA ══════════ */}
      <div className="marquesina" aria-hidden="true">
        <CurvedLoop
          marqueeText="Chelem ✿ Chuburná ✿ Golfo de México ✿ Beach Club ✿ "
          speed={reduceMotion ? 0 : 1.2}
          curveAmount={140}
          interactive={!reduceMotion}
        />
      </div>

      {/* ══════════ SUCURSALES ══════════ */}
      <section className="section" id="sucursales">
        <div className="section__container">
          <ScrollReveal>
            <Encabezado
              eyebrow="Nuestros destinos"
              title="Nuestras sucursales"
              subtitle="Dos destinos, una sola promesa: vivir Yucatán con todos los sentidos."
            />
          </ScrollReveal>

          <div className="sucursal-grid">
            {SUCURSALES.map((sc, i) => (
              <ScrollReveal key={sc.key} delay={i * 0.12}>
                <button className="sucursal-card" onClick={() => navigate(`/habitaciones?sucursal=${sc.key}`)}>
                  <div className="sucursal-card__img-placeholder" style={{ background: SUCURSAL_FONDO[sc.key] }} />
                  <CoronaFlores className="sucursal-card__corona" />
                  <div className="sucursal-card__overlay" />
                  <div className="sucursal-card__body">
                    <div>
                      <div className="sucursal-card__name">{sc.name}</div>
                      <div className="sucursal-card__sub">{sc.subtitle}</div>
                    </div>
                    <span className="sucursal-card__arrow">
                      <ArrowRightIcon size={18} weight="bold" />
                    </span>
                  </div>
                </button>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FEATURED ROOMS ══════════ */}
      <section className="section--alt" id="habitaciones">
        <div className="section__container">
          <div className={s.sectionHeaderRow}>
            <ScrollReveal>
              <Encabezado
                eyebrow="Selección curada"
                title="Habitaciones destacadas"
                subtitle="Nuestros espacios más especiales."
                className="encabezado--pegado"
              />
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className={s.filterGroup}>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={categoryFilter}
                  onValueChange={v => v && setCategoryFilter(v)}
                  aria-label="Filtrar habitaciones"
                >
                  {FILTROS.map(f => (
                    <ToggleGroupItem key={f.key} value={f.key} className="px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      {f.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <Button variant="link" className="px-0" onClick={() => onNavigate('search')}>
                  Ver todas <ArrowRightIcon size={14} weight="bold" />
                </Button>
              </div>
            </ScrollReveal>
          </div>

          {/* Al filtrar: las que salen se encogen, las que quedan se reacomodan
              con resorte (layout) y las nuevas entran. popLayout saca de la
              rejilla a las que salen para que el resto se mueva al mismo tiempo. */}
          <ScrollReveal>
            <motion.div layout className="home-rooms-grid" style={{ marginTop: '36px' }}>
              <AnimatePresence mode="popLayout" initial={false}>
                {filteredRooms.map(room => (
                  <motion.div key={room.id} {...animacionItem} style={{ height: '100%' }}>
                    <RoomCard
                      room={room}
                      onSelect={onSelectRoom}
                      isFav={favorites.includes(room.id)}
                      onToggleFav={onToggleFav}
                      vertical
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </ScrollReveal>
        </div>
      </section>

      {/* ══════════ EXPERIENCE STRIP ══════════ */}
      <section className="section">
        <div className="section__container">
          <ScrollReveal>
            <Encabezado
              eyebrow="Por qué elegirnos"
              title="La experiencia Frida"
              subtitle="Todo lo que necesitas para una estancia perfecta."
              center
            />
          </ScrollReveal>

          <div className={s.experienceGrid}>
            {EXPERIENCE_ITEMS.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 0.12} style={{ height: '100%' }}>
                <SpotlightCard
                  className="h-full p-0"
                  spotlightColor={`color-mix(in srgb, var(--flor-${item.flor}) 22%, transparent)`}
                >
                  <div className={s.experienceCard}>
                    <div
                      className={s.experienceIcon}
                      style={{ background: `var(--flor-${item.flor})`, color: `var(--flor-${item.flor}-fg)` }}
                    >
                      <item.Icono size={30} weight="duotone" aria-hidden="true" />
                    </div>
                    <h3 className={s.experienceTitle}>{item.title}</h3>
                    <p className={s.experienceDesc}>{item.desc}</p>
                  </div>
                </SpotlightCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
