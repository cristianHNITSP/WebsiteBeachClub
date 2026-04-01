import { useState } from 'react'
import { motion } from 'framer-motion'
import Icon from '@/components/frida/Icon'

function ColLabel({ children, style }) {
  return (
    <h2 style={{
      fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
      letterSpacing: '0.14em', color: 'var(--primary)',
      marginBottom: '14px', ...style,
    }}>
      {children}
    </h2>
  )
}

function FooterLink({ onClick, children }) {
  const [hov, setHov] = useState(false)
  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '14px', padding: '5px 0', cursor: onClick ? 'pointer' : 'default',
        color: hov ? 'var(--on-surface)' : 'var(--on-surface-var)',
        transition: 'color 0.2s ease',
        borderLeft: hov && onClick ? '2px solid var(--primary)' : '2px solid transparent',
        paddingLeft: '8px',
        marginLeft: '-8px',
      }}
    >
      {children}
    </span>
  )
}

const SOCIAL_LINKS = [
  { icon: 'chat', label: 'WhatsApp', href: 'https://wa.me/529991234567', color: '#25D366' },
  { icon: 'photo_camera', label: 'Instagram', href: '#', color: '#E1306C' },
  { icon: 'facebook', label: 'Facebook', href: '#', color: '#1877F2' },
]

export default function Footer({ onNavigate }) {
  const nav = (view) => () => onNavigate && onNavigate(view)

  return (
    <footer style={{ background: 'var(--surface-container)', borderTop: '1px solid var(--outline-var)' }}>
      <div className="footer-grid" style={{
        maxWidth: '1200px', margin: '0 auto', padding: '72px 32px 56px',
        display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '56px',
      }}>

        {/* ── Brand ── */}
        <div>
          {/* Logo row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--primary) 0%, #009aa5 100%)',
              display: 'grid', placeItems: 'center',
              boxShadow: '0 4px 14px rgba(0,105,113,0.35)',
            }}>
              <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '20px' }}>waves</span>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '20px', color: 'var(--on-surface)', lineHeight: 1.1 }}>
                Hoteles Frida
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--primary)' }}>
                Yucatán · México
              </div>
            </div>
          </div>

          <p style={{ fontSize: '14px', color: 'var(--on-surface-var)', lineHeight: 1.75, marginBottom: '24px', marginTop: '16px' }}>
            Dos propiedades únicas frente al Mar Caribe, donde la hospitalidad yucateca
            se fusiona con el lujo contemporáneo.
          </p>

          {/* Social links */}
          <nav aria-label="Redes sociales" style={{ marginBottom: '24px' }}>
          <ul style={{ display: 'flex', gap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
            {SOCIAL_LINKS.map(s => (
              <li key={s.label}><motion.a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                title={s.label}
                whileHover={{ scale: 1.12, y: -2 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  width: '38px', height: '38px',
                  borderRadius: '10px',
                  border: '1px solid var(--outline-var)',
                  background: 'var(--surface-lowest)',
                  display: 'grid', placeItems: 'center',
                  color: 'var(--on-surface-var)',
                  transition: 'color 0.2s, border-color 0.2s',
                  fontSize: '18px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = s.color
                  e.currentTarget.style.borderColor = s.color
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--on-surface-var)'
                  e.currentTarget.style.borderColor = 'var(--outline-var)'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>{s.icon}</span>
              </motion.a></li>
            ))}
          </ul>
          </nav>

          {/* CTA button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={nav('search')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 22px', borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, var(--primary) 0%, #009aa5 100%)',
              color: '#fff', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px',
              boxShadow: '0 4px 16px rgba(0,105,113,0.35)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>search</span>
            Ver habitaciones
          </motion.button>
        </div>

        {/* ── Explorar ── */}
        <nav aria-label="Explorar">
          <ColLabel>Explorar</ColLabel>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <li><FooterLink onClick={nav('home')}>Inicio</FooterLink></li>
            <li><FooterLink onClick={nav('search')}>Habitaciones</FooterLink></li>
            <li><FooterLink onClick={nav('search')}>Cabañas Frida — Chelem</FooterLink></li>
            <li><FooterLink onClick={nav('search')}>Casa Frida — Chuburná</FooterLink></li>
            <li><FooterLink onClick={nav('account')}>Mis Reservas</FooterLink></li>
          </ul>
          <ColLabel style={{ marginTop: '24px' }}>Legal</ColLabel>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <li><FooterLink>Política de privacidad</FooterLink></li>
            <li><FooterLink>Términos y condiciones</FooterLink></li>
            <li><FooterLink>Política de cancelación</FooterLink></li>
          </ul>
        </nav>

        {/* ── Contacto ── */}
        <address style={{ fontStyle: 'normal' }}>
          <ColLabel>Contacto</ColLabel>
          <p style={{ fontSize: '14px', color: 'var(--on-surface-var)', lineHeight: 1.75, marginBottom: '18px' }}>
            Disponibles todos los días de 8am a 10pm.
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <li><FooterLink>
              <Icon name="phone" size={14} />
              +52 (999) 123 4567
            </FooterLink></li>
            <li><FooterLink>
              <Icon name="mail" size={14} />
              hola@hotelesfrida.mx
            </FooterLink></li>
            <li><FooterLink>
              <Icon name="location_on" size={14} />
              Chelem &amp; Chuburná, Yucatán
            </FooterLink></li>
          </ul>

          {/* WhatsApp CTA */}
          <motion.a
            href="https://wa.me/529991234567"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              marginTop: '20px',
              fontSize: '13px', fontWeight: 700,
              color: '#fff',
              background: '#25D366',
              padding: '10px 18px', borderRadius: 'var(--radius-full)',
              boxShadow: '0 4px 14px rgba(37,211,102,0.35)',
              transition: 'box-shadow 0.2s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chat</span>
            Chatear en WhatsApp
          </motion.a>
        </address>
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom" style={{
        maxWidth: '1200px', margin: '0 auto', padding: '16px 32px',
        borderTop: '1px solid var(--outline-var)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--on-surface-var)' }}>
          © 2026 Hoteles Frida. Todos los derechos reservados.
        </span>
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'var(--surface-lowest)', border: '1px solid var(--outline-var)',
            padding: '7px 16px', borderRadius: 'var(--radius-full)',
            fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600,
            color: 'var(--on-surface-var)', cursor: 'pointer',
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--primary)'
            e.currentTarget.style.color = 'var(--primary)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--outline-var)'
            e.currentTarget.style.color = 'var(--on-surface-var)'
          }}
        >
          <Icon name="arrow_upward" size={13} /> Volver arriba
        </motion.button>
      </div>
    </footer>
  )
}
