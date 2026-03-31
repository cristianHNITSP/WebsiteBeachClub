import { useState } from 'react'
import SectionPanel from '../components/SectionPanel'
import { Field, Input, Select } from '@/components/frida/Field'
import { useTheme } from '@/context/ThemeContext'
import { useToast } from '@/components/frida/Toast'

/* ── Reusable sub-components ── */
function ConfigSection({ title, children }) {
  return (
    <div style={{
      background: 'var(--surface-container-low)',
      border: '1px solid var(--outline-var)',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      marginBottom: '16px',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--outline-var)',
        fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 800,
        letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--outline)',
      }}>
        {title}
      </div>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {children}
      </div>
    </div>
  )
}

function ConfigRow({ icon, label, description, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '16px', padding: '4px 0',
    }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
        <span className="material-symbols-outlined" style={{
          fontSize: '18px', color: 'var(--primary)', flexShrink: 0,
        }}>
          {icon}
        </span>
        <div>
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '13px',
            fontWeight: 700, color: 'var(--on-surface)',
          }}>
            {label}
          </div>
          {description && (
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: '11px',
              color: 'var(--on-surface-var)', marginTop: '2px',
            }}>
              {description}
            </div>
          )}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {children}
      </div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: '42px', height: '24px', borderRadius: '12px', border: 'none',
        background: value ? 'var(--primary)' : 'var(--surface-container-highest)',
        cursor: 'pointer', position: 'relative',
        transition: 'background 0.22s ease',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: '3px',
        left: value ? '21px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        transition: 'left 0.22s ease',
        display: 'block',
      }} />
    </button>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--outline-var)', margin: '2px 0' }} />
}

/* ── Tabs ── */
const TABS = [
  { key: 'perfil',         label: 'Perfil',          icon: 'person' },
  { key: 'seguridad',      label: 'Seguridad',        icon: 'shield' },
  { key: 'accesibilidad',  label: 'Accesibilidad',    icon: 'accessibility' },
]

export default function ConfigPage({ onBack }) {
  const addToast = useToast()
  const { isDark, toggleDark } = useTheme()
  const [tab, setTab] = useState('perfil')

  /* Seguridad state */
  const [twoFA, setTwoFA]           = useState(false)
  const [loginAlerts, setLoginAlerts] = useState(true)
  const [sessionLog, setSessionLog]  = useState(true)

  /* Accesibilidad state */
  const [animations, setAnimations]     = useState(true)
  const [highContrast, setHighContrast] = useState(false)
  const [fontSize, setFontSize]         = useState('normal')
  const [language, setLanguage]         = useState('es')

  /* Perfil state */
  const [nombre, setNombre]   = useState('Administrador')
  const [correo, setCorreo]   = useState('admin@hotelesfrida.mx')
  const [telefono, setTelefono] = useState('+52 999 000 0000')

  const handleSave = () => {
    addToast('Configuración guardada correctamente', { type: 'success', title: 'Guardado' })
  }

  const handlePasswordReset = () => {
    addToast('Enlace de restablecimiento enviado a tu correo', { type: 'info', title: 'Correo enviado' })
  }

  const handleRevokeSessions = () => {
    addToast('Todas las sesiones activas han sido cerradas', { type: 'warning', title: 'Sesiones cerradas' })
  }

  return (
    <SectionPanel
      eyebrow="Cuenta"
      title={<>Configuración<br /><em>del sistema</em></>}
      subtitle="Personaliza tu cuenta, seguridad y preferencias de accesibilidad"
      onBack={onBack}
      actions={
        <button className="btn-primary" onClick={handleSave}>
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>save</span>
          Guardar cambios
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '24px', alignItems: 'start' }}>

        {/* ── Tab sidebar ── */}
        <nav style={{
          background: 'var(--surface-container-low)',
          border: '1px solid var(--outline-var)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          position: 'sticky', top: '80px',
        }}>
          {/* Profile mini-card */}
          <div style={{
            padding: '20px', textAlign: 'center',
            borderBottom: '1px solid var(--outline-var)',
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), #009aa5)',
              display: 'grid', placeItems: 'center',
              margin: '0 auto 10px',
              border: '3px solid rgba(0,105,113,0.2)',
            }}>
              <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '26px' }}>person</span>
            </div>
            <div style={{
              fontFamily: 'var(--font-headline)', fontSize: '13px',
              fontWeight: 700, color: 'var(--on-surface)',
            }}>
              {nombre}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--on-surface-var)', marginTop: '2px' }}>
              Gerente General
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              marginTop: '8px', padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(22,163,74,0.10)',
              color: '#16a34a',
              fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 800,
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
              En línea
            </div>
          </div>

          {/* Tab items */}
          <div style={{ padding: '8px' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  width: '100%', border: 'none', textAlign: 'left',
                  padding: '10px 12px', borderRadius: 'var(--radius-md)',
                  background: tab === t.key
                    ? 'linear-gradient(135deg, rgba(0,105,113,0.12) 0%, rgba(0,105,113,0.06) 100%)'
                    : 'transparent',
                  color: tab === t.key ? 'var(--primary)' : 'var(--on-surface-var)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  fontSize: '13px', fontWeight: tab === t.key ? 700 : 500,
                  display: 'flex', alignItems: 'center', gap: '10px',
                  transition: 'all 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (tab !== t.key) e.currentTarget.style.background = 'var(--surface-container)' }}
                onMouseLeave={e => { if (tab !== t.key) e.currentTarget.style.background = 'transparent' }}
              >
                {tab === t.key && (
                  <span style={{
                    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: '3px', height: '18px', background: 'var(--primary)',
                    borderRadius: '0 3px 3px 0',
                  }} />
                )}
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        {/* ── Tab content ── */}
        <div>

          {/* ── PERFIL ── */}
          {tab === 'perfil' && (
            <>
              <ConfigSection title="Información personal">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Field label="Nombre completo">
                    <Input value={nombre} onChange={e => setNombre(e.target.value)} />
                  </Field>
                  <Field label="Correo electrónico">
                    <Input type="email" value={correo} onChange={e => setCorreo(e.target.value)} />
                  </Field>
                </div>
                <Field label="Teléfono">
                  <Input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} />
                </Field>
              </ConfigSection>

              <ConfigSection title="Rol y propiedad">
                <ConfigRow icon="badge" label="Rol" description="No puede modificarse desde aquí">
                  <span style={{
                    padding: '4px 12px', borderRadius: 'var(--radius-full)',
                    background: 'rgba(0,105,113,0.10)', color: 'var(--primary)',
                    fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800,
                  }}>
                    Gerente General
                  </span>
                </ConfigRow>
                <Divider />
                <ConfigRow icon="location_on" label="Propiedad principal" description="Grand Oasis — Chelem, Yucatán">
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-var)' }}>
                    Asignada
                  </span>
                </ConfigRow>
              </ConfigSection>

              <ConfigSection title="Zona horaria e idioma">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Field label="Zona horaria">
                    <Select defaultValue="america_merida">
                      <option value="america_merida">América/Mérida (CST)</option>
                      <option value="america_mexico_city">América/México (CST)</option>
                      <option value="america_cancun">América/Cancún (EST)</option>
                    </Select>
                  </Field>
                  <Field label="Idioma del sistema">
                    <Select value={language} onChange={e => setLanguage(e.target.value)}>
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </Select>
                  </Field>
                </div>
              </ConfigSection>
            </>
          )}

          {/* ── SEGURIDAD ── */}
          {tab === 'seguridad' && (
            <>
              <ConfigSection title="Contraseña">
                <ConfigRow
                  icon="lock"
                  label="Cambiar contraseña"
                  description="Te enviaremos un enlace de restablecimiento a tu correo"
                >
                  <button
                    onClick={handlePasswordReset}
                    style={{
                      padding: '7px 16px', borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--outline-var)', background: 'transparent',
                      color: 'var(--on-surface)', cursor: 'pointer',
                      fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                      whiteSpace: 'nowrap', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container-low)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Enviar enlace
                  </button>
                </ConfigRow>
              </ConfigSection>

              <ConfigSection title="Autenticación de dos factores">
                <ConfigRow
                  icon="verified_user"
                  label="Autenticación 2FA"
                  description={twoFA ? 'Activa — tu cuenta tiene protección adicional' : 'Inactiva — se recomienda activarla'}
                >
                  <Toggle value={twoFA} onChange={setTwoFA} />
                </ConfigRow>
                {twoFA && (
                  <div style={{
                    padding: '12px 14px',
                    background: 'rgba(22,163,74,0.08)',
                    border: '1px solid rgba(22,163,74,0.2)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#16a34a', marginTop: '1px', flexShrink: 0 }}>
                      check_circle
                    </span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#16a34a', lineHeight: 1.5 }}>
                      2FA activado. Usa tu app de autenticación para generar el código al iniciar sesión.
                    </span>
                  </div>
                )}
              </ConfigSection>

              <ConfigSection title="Alertas y sesiones">
                <ConfigRow
                  icon="notifications_active"
                  label="Alertas de inicio de sesión"
                  description="Notificación por correo cuando se accede desde un dispositivo nuevo"
                >
                  <Toggle value={loginAlerts} onChange={setLoginAlerts} />
                </ConfigRow>
                <Divider />
                <ConfigRow
                  icon="history"
                  label="Registro de actividad"
                  description="Guardar historial de accesos y acciones en el sistema"
                >
                  <Toggle value={sessionLog} onChange={setSessionLog} />
                </ConfigRow>
                <Divider />
                <ConfigRow
                  icon="logout"
                  label="Cerrar todas las sesiones"
                  description="Esto cerrará sesión en todos los dispositivos excepto el actual"
                >
                  <button
                    onClick={handleRevokeSessions}
                    style={{
                      padding: '7px 16px', borderRadius: 'var(--radius-md)',
                      border: '1.5px solid rgba(186,26,26,0.3)',
                      background: 'rgba(186,26,26,0.06)',
                      color: 'var(--error)', cursor: 'pointer',
                      fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                      whiteSpace: 'nowrap', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(186,26,26,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(186,26,26,0.06)'}
                  >
                    Revocar acceso
                  </button>
                </ConfigRow>
              </ConfigSection>

              {/* Active sessions list */}
              <ConfigSection title="Sesiones activas">
                {[
                  { device: 'Chrome · macOS', location: 'Mérida, Yucatán', time: 'Ahora mismo', current: true },
                  { device: 'Safari · iPhone', location: 'Mérida, Yucatán', time: 'Hace 2 horas', current: false },
                  { device: 'Chrome · Windows', location: 'CDMX, México',   time: 'Ayer 10:32 AM', current: false },
                ].map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 0',
                    borderTop: i > 0 ? '1px solid var(--outline-var)' : 'none',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--outline)', flexShrink: 0 }}>
                      devices
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--on-surface)' }}>
                          {s.device}
                        </span>
                        {s.current && (
                          <span style={{
                            padding: '2px 8px', borderRadius: 'var(--radius-full)',
                            background: 'rgba(22,163,74,0.10)', color: '#16a34a',
                            fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 800,
                            textTransform: 'uppercase', letterSpacing: '0.1em',
                          }}>
                            Actual
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--on-surface-var)', marginTop: '2px' }}>
                        {s.location} · {s.time}
                      </div>
                    </div>
                    {!s.current && (
                      <button style={{
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        color: 'var(--outline)', padding: '4px',
                        transition: 'color 0.15s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--outline)'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                      </button>
                    )}
                  </div>
                ))}
              </ConfigSection>
            </>
          )}

          {/* ── ACCESIBILIDAD ── */}
          {tab === 'accesibilidad' && (
            <>
              <ConfigSection title="Apariencia">
                <ConfigRow
                  icon={isDark ? 'light_mode' : 'dark_mode'}
                  label="Modo oscuro"
                  description="Reduce la fatiga visual en entornos con poca luz"
                >
                  <Toggle value={isDark} onChange={toggleDark} />
                </ConfigRow>
                <Divider />
                <ConfigRow
                  icon="contrast"
                  label="Alto contraste"
                  description="Aumenta el contraste de colores para mejor legibilidad"
                >
                  <Toggle value={highContrast} onChange={setHighContrast} />
                </ConfigRow>
                <Divider />
                <ConfigRow
                  icon="format_size"
                  label="Tamaño de texto"
                  description="Ajusta el tamaño base del texto en el sistema"
                >
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['pequeño', 'normal', 'grande'].map(size => (
                      <button
                        key={size}
                        onClick={() => setFontSize(size)}
                        style={{
                          padding: '5px 12px', borderRadius: 'var(--radius-full)',
                          border: `1.5px solid ${fontSize === size ? 'var(--primary)' : 'var(--outline-var)'}`,
                          background: fontSize === size ? 'rgba(0,105,113,0.10)' : 'transparent',
                          color: fontSize === size ? 'var(--primary)' : 'var(--on-surface-var)',
                          fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700,
                          cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s',
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </ConfigRow>
              </ConfigSection>

              <ConfigSection title="Movimiento y animaciones">
                <ConfigRow
                  icon="animation"
                  label="Animaciones de interfaz"
                  description="Transiciones y efectos de movimiento al navegar"
                >
                  <Toggle value={animations} onChange={setAnimations} />
                </ConfigRow>
              </ConfigSection>

              <ConfigSection title="Navegación y teclado">
                <ConfigRow
                  icon="keyboard"
                  label="Navegación con teclado"
                  description="Atajos de teclado para acceder rápidamente a secciones"
                >
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { key: 'G + D', label: 'Tablero' },
                      { key: 'G + R', label: 'Reservas' },
                      { key: 'G + H', label: 'Habitaciones' },
                    ].map(s => (
                      <span key={s.key} style={{
                        padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                        background: 'var(--surface-container-highest)',
                        fontFamily: 'var(--font-body)', fontSize: '10px',
                        fontWeight: 800, color: 'var(--on-surface)',
                        border: '1px solid var(--outline-var)',
                      }}>
                        {s.key}
                      </span>
                    ))}
                  </div>
                </ConfigRow>
              </ConfigSection>

              <ConfigSection title="Información del sistema">
                {[
                  { label: 'Versión del sistema',  value: 'Frida Admin v2.1.0' },
                  { label: 'Última actualización',  value: '31 de marzo, 2026' },
                  { label: 'Entorno',               value: 'Producción' },
                ].map((item, i) => (
                  <ConfigRow key={i} icon={i === 0 ? 'info' : i === 1 ? 'update' : 'cloud'} label={item.label}>
                    <span style={{
                      fontFamily: 'var(--font-body)', fontSize: '12px',
                      color: 'var(--on-surface-var)', fontWeight: 600,
                    }}>
                      {item.value}
                    </span>
                  </ConfigRow>
                ))}
              </ConfigSection>
            </>
          )}

        </div>
      </div>
    </SectionPanel>
  )
}
