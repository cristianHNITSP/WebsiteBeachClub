import {
  ArrowLeftIcon, GlobeIcon, MoonIcon, ShieldCheckIcon, TextAaIcon, PersonArmsSpreadIcon, UserIcon,
  CircleHalfIcon, PersonSimpleRunIcon,
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/ThemeContext'
import { useParametros } from '@/hooks/useParametros'
import { useSesion } from '@/lib/sesion'
import SeguridadCuenta from '../components/SeguridadCuenta'
import SitiosWeb from '../components/SitiosWeb'
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
  { key: 'perfil', label: 'Perfil', Icono: UserIcon },
  { key: 'seguridad', label: 'Seguridad', Icono: ShieldCheckIcon },
  { key: 'accesibilidad', label: 'Accesibilidad', Icono: PersonArmsSpreadIcon },
  { key: 'sitios', label: 'Sitios web', Icono: GlobeIcon, permiso: 'sitios.gestionar' },
]
const TAMANOS = [{ value: 'pequeño', label: 'Pequeño' }, { value: 'normal', label: 'Normal' }, { value: 'grande', label: 'Grande' }]

export default function ConfigPage({ onBack }) {
  const [{ pestana }, set] = useParametros({ pestana: 'perfil' })
  const { sesion } = useSesion()
  const pestanas = PESTANAS.filter(t => !t.permiso || sesion?.permisos?.includes(t.permiso))
  const actual = pestanas.some(t => t.key === pestana) ? pestana : 'perfil'

  return (
    <div className={s.pagina}>
      <Button variant="ghost" onClick={onBack} className="h-11 w-fit"><ArrowLeftIcon size={18} /> Regresar</Button>
      <div className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">Cuenta</span>
          <h1 className="admin-page-title">Configuración</h1>
        </div>
      </div>
      <div className={s.layout}>
        <nav className={s.nav} aria-label="Secciones de configuración">
          {pestanas.map(({ key, label, Icono }) => (
            <button
              key={key}
              type="button"
              className={`${s.pestana} ${actual === key ? s.activa : ''}`}
              aria-current={actual === key ? 'page' : undefined}
              onClick={() => set({ pestana: key })}
            >
              {actual === key && <motion.span layoutId="config-activa" className={s.marca} transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <Icono size={18} weight={actual === key ? 'fill' : 'regular'} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <motion.section key={actual} className={s.contenido} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          {actual === 'perfil' && <div className={s.grupo}><DatosCuenta /></div>}
          {actual === 'seguridad' && <SeguridadCuenta />}
          {actual === 'accesibilidad' && <Accesibilidad />}
          {actual === 'sitios' && <SitiosWeb />}
        </motion.section>
      </div>
    </div>
  )
}

function Accesibilidad() {
  const { isDark, toggleDark, fontSize, setFontSize, highContrast, setHighContrast, reduceMotion, setReduceMotion } = useTheme()
  return (
    <div className={s.tarjeta}>
      <p className={s.ayuda}>Se aplican al instante y se recuerdan en este navegador. Funcionan todas a la vez.</p>
      <Interruptor Icono={MoonIcon} titulo="Modo oscuro" ayuda="Menos brillo en entornos con poca luz" valor={isDark} onCambio={() => toggleDark()} />
      <Interruptor Icono={CircleHalfIcon} titulo="Alto contraste" ayuda="Bordes y textos más marcados" valor={highContrast} onCambio={setHighContrast} />
      <Interruptor Icono={PersonSimpleRunIcon} titulo="Reducir movimiento" ayuda="Sin transiciones ni animaciones al navegar" valor={reduceMotion} onCambio={setReduceMotion} />
      <div className={s.fila}>
        <TextAaIcon size={20} className={s.icono} aria-hidden="true" />
        <div className={s.texto}>
          <span id="tam-texto" className={s.titulo}>Tamaño de texto</span>
          <span className={s.ayuda}>El de todo el panel</span>
        </div>
        <div className={s.opciones} role="group" aria-labelledby="tam-texto">
          {TAMANOS.map(t => (
            <Button key={t.value} type="button" variant={fontSize === t.value ? 'default' : 'outline'} className="h-11"
              aria-pressed={fontSize === t.value} onClick={() => setFontSize(t.value)}>
              {t.label}
            </Button>
          ))}
        </div>
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
      <button type="button" role="switch" aria-checked={valor} aria-label={titulo} className={`${s.interruptor} ${valor ? s.encendido : ''}`} onClick={() => onCambio(!valor)}>
        <span className={s.perilla} />
      </button>
    </div>
  )
}
