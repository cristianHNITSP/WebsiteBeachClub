import { motion } from 'framer-motion'
import { Button, Icon } from '@/components/frida'
import s from './Footer.module.css'

const SOCIAL_LINKS = [
  { icon: 'chat',         label: 'WhatsApp', href: 'https://wa.me/529991234567', color: '#25D366' },
  { icon: 'photo_camera', label: 'Instagram', href: '#',                          color: '#E1306C' },
  { icon: 'facebook',     label: 'Facebook',  href: '#',                          color: '#1877F2' },
]

const NAV_LINKS = [
  { label: 'Inicio',                  view: 'home' },
  { label: 'Habitaciones',            view: 'search' },
  { label: 'Cabañas Frida — Chelem',  view: 'search' },
  { label: 'Casa Frida — Chuburná',   view: 'search' },
  { label: 'Mis Reservas',            view: 'account' },
]

const LEGAL_LINKS = [
  'Política de privacidad',
  'Términos y condiciones',
  'Política de cancelación',
]

export default function Footer({ onNavigate }) {
  const nav = (view) => (e) => { e.preventDefault(); onNavigate?.(view) }

  return (
    <footer className={s.footer}>
      <div className={s.grid}>

        {/* ── Brand ── */}
        <div>
          <div className={s.logoRow}>
            <div className={s.logoIcon}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>waves</span>
            </div>
            <div>
              <div className={s.logoName}>Hoteles Frida</div>
              <div className={s.logoSub}>Yucatán · México</div>
            </div>
          </div>

          <p className={s.desc}>
            Dos propiedades únicas frente al Mar Caribe, donde la hospitalidad yucateca
            se fusiona con el lujo contemporáneo.
          </p>

          {/* Social links */}
          <nav aria-label="Redes sociales">
            <ul className={s.socialList}>
              {SOCIAL_LINKS.map(link => (
                <li key={link.label}>
                  <motion.a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.label}
                    className={s.socialBtn}
                    whileHover={{ scale: 1.12, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = link.color
                      e.currentTarget.style.borderColor = link.color
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'var(--on-surface-var)'
                      e.currentTarget.style.borderColor = 'var(--outline-var)'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>{link.icon}</span>
                  </motion.a>
                </li>
              ))}
            </ul>
          </nav>

          <Button variant="primary" onClick={nav('search')}>
            <Icon name="search" size={16} />
            Ver habitaciones
          </Button>
        </div>

        {/* ── Explorar ── */}
        <nav aria-label="Explorar">
          <h2 className={s.colLabel}>Explorar</h2>
          <ul className={s.linkList}>
            {NAV_LINKS.map(link => (
              <li key={link.label}>
                <button className={s.link} onClick={nav(link.view)}>{link.label}</button>
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
          <p className={s.contactDesc}>Disponibles todos los días de 8am a 10pm.</p>
          <ul className={s.linkList}>
            <li>
              <span className={s.link} style={{ cursor: 'default' }}>
                <Icon name="phone" size={14} />
                +52 (999) 123 4567
              </span>
            </li>
            <li>
              <span className={s.link} style={{ cursor: 'default' }}>
                <Icon name="mail" size={14} />
                hola@hotelesfrida.mx
              </span>
            </li>
            <li>
              <span className={s.link} style={{ cursor: 'default' }}>
                <Icon name="location_on" size={14} />
                Chelem &amp; Chuburná, Yucatán
              </span>
            </li>
          </ul>

          <motion.a
            href="https://wa.me/529991234567"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              marginTop: '20px', fontSize: '13px', fontWeight: 700,
              color: '#fff', background: '#25D366',
              padding: '10px 18px', borderRadius: 'var(--radius-full)',
              boxShadow: '0 4px 14px rgba(37,211,102,0.35)',
              textDecoration: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chat</span>
            Chatear en WhatsApp
          </motion.a>
        </address>
      </div>

      {/* Bottom bar */}
      <div className={s.bottom}>
        <span className={s.copyright}>© 2026 Hoteles Frida. Todos los derechos reservados.</span>
        <Button
          variant="outline"
          style={{ fontSize: '12px', padding: '7px 16px' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <Icon name="arrow_upward" size={13} /> Volver arriba
        </Button>
      </div>
    </footer>
  )
}
