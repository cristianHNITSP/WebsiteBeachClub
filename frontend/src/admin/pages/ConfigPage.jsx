import { LiquidSegments } from '@/components/devl/liquid-segments'
import { LiquidSwitch } from '@/components/devl/liquid-switch'
import SectionPanel from '../components/SectionPanel'
import { MoonIcon, TextAaIcon, CircleHalfIcon, PersonSimpleRunIcon } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import ControlZoom from '@/components/marca/ControlZoom'
import { useTheme } from '@/context/ThemeContext'
import { PRODUCTO } from '@/lib/producto'
import { useParametros } from '@/hooks/useParametros'
import { useSesion } from '@/lib/sesion'
import SeguridadCuenta from '../components/SeguridadCuenta'
import SitiosWeb from '../components/SitiosWeb'
import PropiedadesConfig from '../components/PropiedadesConfig'
import { DatosCuenta } from './AdminAccountPage'
import s from './ConfigPage.module.css'

/*
 * Configuración (admin fase 2). Todo es real: el perfil sale de la sesión (lo
 * cambia un gerente en Personal), Seguridad y Sitios web van a la API, y
 * Accesibilidad aplica al instante (ThemeContext, por navegador). Por eso no
 * hay botón de "Guardar cambios". La pestaña va en la URL (?pestana=).
 * (Antes había aquí un perfil, zona horaria, idioma, atajos y una versión del
 * sistema de muestra que no hacían nada.)
 */

const PESTANAS = [
  { key: 'perfil', label: 'Perfil' },
  { key: 'seguridad', label: 'Seguridad' },
  { key: 'accesibilidad', label: 'Accesibilidad' },
  { key: 'propiedades', label: 'Propiedades', permiso: 'propiedades.gestionar' },
  { key: 'sitios', label: 'Sitios web', permiso: 'sitios.gestionar', producto: 'sitiosWeb' },
]

export default function ConfigPage({ onBack }) {
  const [{ pestana }, set] = useParametros({ pestana: 'perfil' })
  const { sesion } = useSesion()
  const pestanas = PESTANAS.filter(t => (!t.producto || PRODUCTO[t.producto]) && (!t.permiso || sesion?.permisos?.includes(t.permiso)))
  const actual = pestanas.some(t => t.key === pestana) ? pestana : 'perfil'

  return (
    <SectionPanel title="Configuración" onBack={onBack}>
      <div className={s.barra}>
        <LiquidSegments
          options={pestanas.map(({ key, label }) => ({ value: key, label }))}
          value={actual}
          onValueChange={key => set({ pestana: key })}
          aria-label="Secciones de configuración"
        />
      </div>
      <motion.section key={actual} className={s.contenido} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        {actual === 'perfil' && <DatosCuenta />}
        {actual === 'seguridad' && <SeguridadCuenta />}
        {actual === 'accesibilidad' && <Accesibilidad />}
        {actual === 'propiedades' && <PropiedadesConfig />}
        {actual === 'sitios' && <SitiosWeb />}
      </motion.section>
    </SectionPanel>
  )
}

function Accesibilidad() {
  const { isDark, toggleDark, highContrast, setHighContrast, reduceMotion, setReduceMotion } = useTheme()
  return (
    <div className={s.tarjeta}>
      <p className={s.ayuda}>Se aplican al instante y se recuerdan en este navegador. Funcionan todas a la vez.</p>
      <Interruptor Icono={MoonIcon} titulo="Modo oscuro" ayuda="Menos brillo en entornos con poca luz" valor={isDark} onCambio={() => toggleDark()} />
      <Interruptor Icono={CircleHalfIcon} titulo="Alto contraste" ayuda="Bordes y textos más marcados" valor={highContrast} onCambio={setHighContrast} />
      <Interruptor Icono={PersonSimpleRunIcon} titulo="Reducir movimiento" ayuda="Sin transiciones ni animaciones al navegar" valor={reduceMotion} onCambio={setReduceMotion} />
      <div className={s.fila}>
        <TextAaIcon size={20} className={s.icono} aria-hidden="true" />
        <div className={s.texto}>
          <span className={s.titulo}>Zoom</span>
          <span className={s.ayuda}>Todo el panel más chico o más grande. También se cambia desde el botón del sol o la luna, arriba.</span>
        </div>
        <div className="w-64 max-w-full"><ControlZoom /></div>
      </div>
    </div>
  )
}

function Interruptor({ Icono, titulo, ayuda, valor, onCambio }) {
  return (
    <div className={s.fila}>
      <Icono size={20} className={s.icono} aria-hidden="true" />
      <div className={s.texto}>
        <span className={s.titulo}>{titulo}</span>
        <span className={s.ayuda}>{ayuda}</span>
      </div>
      <LiquidSwitch checked={valor} onCheckedChange={onCambio} aria-label={titulo} />
    </div>
  )
}
