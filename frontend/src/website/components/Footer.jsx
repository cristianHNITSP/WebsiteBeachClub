import { ArrowUpIcon, EnvelopeSimpleIcon, FacebookLogoIcon, InstagramLogoIcon, MagnifyingGlassIcon, MapPinIcon, PhoneIcon, WhatsappLogoIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useTheme } from '@/context/ThemeContext'
import Wordmark from '@/components/marca/Wordmark'
import s from './Footer.module.css'

const SOCIAL_LINKS = [
  { Icono: WhatsappLogoIcon,  label: 'WhatsApp',  href: 'https://wa.me/529991234567' },
  { Icono: InstagramLogoIcon, label: 'Instagram', href: '#' },
  { Icono: FacebookLogoIcon,  label: 'Facebook',  href: '#' },
]

const NAV_LINKS = [
  { label: 'Inicio',                   to: '/' },
  { label: 'Habitaciones',             to: '/habitaciones' },
  { label: 'Cabañas Frida, Chelem',    to: '/habitaciones?sucursal=chelem' },
  { label: 'Casa Frida, Chuburná',     to: '/habitaciones?sucursal=chuburna' },
  { label: 'Mis reservas',             to: '/mi-cuenta' },
]

const LEGAL_LINKS = [
  'Política de privacidad',
  'Términos y condiciones',
  'Política de cancelación',
]

export default function Footer() {
  const { reduceMotion } = useTheme()

  return (
    <footer className={s.footer}>
      <div className={s.grid}>

        {/* ── Brand ── */}
        <div>
          <div className={s.logoRow}>
            <Wordmark tamano={1.9} subtitulo="Yucatán, México" />
          </div>

          <p className={s.desc}>
            Dos propiedades frente al Golfo de México, donde la hospitalidad yucateca
            se encuentra con el color de Frida.
          </p>

          <nav aria-label="Redes sociales">
            <ul className={s.socialList}>
              {SOCIAL_LINKS.map(({ Icono, label, href }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={s.socialBtn}>
                    <Icono size={20} weight="fill" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <Button asChild>
            <Link to="/habitaciones">
              <MagnifyingGlassIcon size={16} weight="bold" />
              Ver habitaciones
            </Link>
          </Button>
        </div>

        {/* ── Explorar ── */}
        <nav aria-label="Explorar">
          <h2 className={s.colLabel}>Explorar</h2>
          <ul className={s.linkList}>
            {NAV_LINKS.map(link => (
              <li key={link.label}>
                <Link className={s.link} to={link.to}>{link.label}</Link>
              </li>
            ))}
          </ul>
          <h2 className={`${s.colLabel} ${s.colLabelSpaced}`}>Legal</h2>
          <ul className={s.linkList}>
            {LEGAL_LINKS.map(label => (
              <li key={label}>
                <button className={s.link}>{label}</button>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Contacto ── */}
        <address style={{ fontStyle: 'normal' }}>
          <h2 className={s.colLabel}>Contacto</h2>
          <p className={s.contactDesc}>Disponibles todos los días de 8 am a 10 pm.</p>
          <ul className={s.linkList}>
            <li>
              <span className={s.link} style={{ cursor: 'default' }}>
                <PhoneIcon size={15} aria-hidden="true" />
                +52 (999) 123 4567
              </span>
            </li>
            <li>
              <span className={s.link} style={{ cursor: 'default' }}>
                <EnvelopeSimpleIcon size={15} aria-hidden="true" />
                hola@hotelesfrida.mx
              </span>
            </li>
            <li>
              <span className={s.link} style={{ cursor: 'default' }}>
                <MapPinIcon size={15} aria-hidden="true" />
                Chelem y Chuburná, Yucatán
              </span>
            </li>
          </ul>

          <Button asChild className={`${s.whatsapp} mt-5`}>
            <a href="https://wa.me/529991234567" target="_blank" rel="noopener noreferrer">
              <WhatsappLogoIcon size={18} weight="fill" />
              Chatear en WhatsApp
            </a>
          </Button>
        </address>
      </div>

      <Separator />

      {/* Bottom bar */}
      <div className={s.bottom}>
        <div className={s.copyright}>
          <span>© 2026 Hoteles Frida. Todos los derechos reservados.</span>
          {/* Licencia CC BY-SA 2.0: crédito con autor, fuente y licencia */}
          <span className={s.creditos}>
            Fotos de portada: Marysol* en{' '}
            <a href="https://commons.wikimedia.org/wiki/File:Chelem,_Yucat%C3%A1n_-_Playa,_Mar,_y_Barco.jpg" target="_blank" rel="noopener noreferrer">Chelem</a>,{' '}
            <a href="https://commons.wikimedia.org/wiki/File:Chuburn%C3%A1_Puerto_-_Razi_Machay_-_01.jpg" target="_blank" rel="noopener noreferrer">Chuburná</a> y{' '}
            <a href="https://commons.wikimedia.org/wiki/File:Chelem,_Yucat%C3%A1n_-_Muelle.jpg" target="_blank" rel="noopener noreferrer">el muelle</a>{' '}
            (Wikimedia Commons,{' '}
            <a href="https://creativecommons.org/licenses/by-sa/2.0/deed.es" target="_blank" rel="noopener noreferrer">CC BY-SA 2.0</a>; recortadas).
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })}
        >
          <ArrowUpIcon size={13} weight="bold" /> Volver arriba
        </Button>
      </div>
    </footer>
  )
}
