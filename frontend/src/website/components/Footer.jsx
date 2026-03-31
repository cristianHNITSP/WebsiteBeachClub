export default function Footer({ onNavigate }) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="footer">
      <div className="footer__inner">
        {/* Brand column */}
        <div>
          <div className="footer__logo">Hoteles Frida</div>
          <div className="footer__tagline">Yucatán • México</div>
          <p className="footer__text">
            Dos propiedades únicas frente al Mar Caribe, donde la hospitalidad yucateca
            se fusiona con el lujo contemporáneo. Cada estancia es una historia diferente.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              className="footer__top-btn"
              onClick={() => onNavigate && onNavigate('search')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>search</span>
              Ver habitaciones
            </button>
          </div>
        </div>

        {/* Links column */}
        <div>
          <div className="footer__col-label">Explorar</div>
          <span className="footer__link" onClick={() => onNavigate && onNavigate('home')}>Inicio</span>
          <span className="footer__link" onClick={() => onNavigate && onNavigate('search')}>Habitaciones</span>
          <span className="footer__link" onClick={() => onNavigate && onNavigate('search')}>Cabañas Frida — Chelem</span>
          <span className="footer__link" onClick={() => onNavigate && onNavigate('search')}>Casa Frida — Chuburná</span>
          <span className="footer__link" onClick={() => onNavigate && onNavigate('account')}>Mis Reservas</span>
          <div className="footer__col-label" style={{ marginTop: '20px' }}>Legal</div>
          <span className="footer__link">Política de privacidad</span>
          <span className="footer__link">Términos y condiciones</span>
          <span className="footer__link">Política de cancelación</span>
        </div>

        {/* Contact column */}
        <div>
          <div className="footer__col-label">Contacto</div>
          <p className="footer__text">
            ¿Tienes preguntas o necesitas ayuda con tu reserva? Nuestro equipo está disponible
            todos los días de 8am a 10pm.
          </p>
          <span className="footer__link">
            <span className="material-symbols-outlined" style={{ fontSize: '14px', marginRight: '8px', verticalAlign: 'middle' }}>phone</span>
            +52 (999) 123 4567
          </span>
          <span className="footer__link">
            <span className="material-symbols-outlined" style={{ fontSize: '14px', marginRight: '8px', verticalAlign: 'middle' }}>mail</span>
            hola@hotelesfrida.mx
          </span>
          <span className="footer__link">
            <span className="material-symbols-outlined" style={{ fontSize: '14px', marginRight: '8px', verticalAlign: 'middle' }}>location_on</span>
            Chelem & Chuburná, Yucatán
          </span>
          <div style={{ marginTop: '16px' }}>
            <a
              href="https://wa.me/529991234567"
              target="_blank"
              rel="noopener noreferrer"
              className="footer__top-btn"
              style={{ display: 'inline-flex', textDecoration: 'none' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chat</span>
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <span className="footer__copy">
          © 2026 Hoteles Frida. Todos los derechos reservados.
        </span>
        <button className="footer__top-btn" onClick={scrollToTop}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_upward</span>
          Ir arriba
        </button>
      </div>
    </footer>
  )
}
