import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Field, Input } from '@/components/frida/Field'
import Button from '@/components/frida/Button'
import { Spinner } from '@/components/frida/Loading'
import Tooltip from '@/components/frida/Tooltip'
import { useToast } from '@/components/frida/Toast'
import { useTheme } from '@/context/ThemeContext'

/* ── Credenciales de demo ── */
const DEMO_EMAIL    = 'admin@hotelesfrida.mx'
const DEMO_PASSWORD = 'frida2026'

/* ── Animaciones escalonadas ── */
const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 16 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay },
})

/* ── Inline error ── */
function FieldError({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--error, #ba1a1a)' }}>
            error
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--error, #ba1a1a)', fontWeight: 600 }}>
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function LoginPage({ onLogin }) {
  const navigate  = useNavigate()
  const addToast  = useToast()
  const { isDark } = useTheme()

  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock,     setCapsLock]     = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [attempts,     setAttempts]     = useState(0)
  const [shake,        setShake]        = useState(false)
  const [errors,       setErrors]       = useState({ email: '', password: '' })

  /* Detectar Caps Lock */
  useEffect(() => {
    const handler = (e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false)
    window.addEventListener('keydown', handler)
    window.addEventListener('keyup',   handler)
    return () => { window.removeEventListener('keydown', handler); window.removeEventListener('keyup', handler) }
  }, [])

  const clearError = (field) => setErrors(prev => ({ ...prev, [field]: '' }))

  const validate = () => {
    const e = {}
    if (!email)
      e.email = 'El correo es obligatorio'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Formato de correo inválido'
    if (!password)
      e.password = 'La contraseña es obligatoria'
    else if (password.length < 6)
      e.password = 'Mínimo 6 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) { triggerShake(); return }

    setLoading(true)
    await new Promise(r => setTimeout(r, 1400))
    setLoading(false)

    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      addToast('Bienvenido de vuelta al panel', { type: 'success', title: '¡Acceso concedido!' })
      setTimeout(onLogin, 600)
    } else {
      const next = attempts + 1
      setAttempts(next)
      triggerShake()
      if (next >= 3) {
        addToast('Demasiados intentos fallidos. Contacta al administrador si necesitas ayuda.', { type: 'error', title: 'Cuenta bloqueada temporalmente' })
      } else {
        addToast(`Credenciales incorrectas. Te quedan ${3 - next} intento${3 - next !== 1 ? 's' : ''}.`, { type: 'error', title: 'Acceso denegado' })
      }
      setErrors({ email: ' ', password: ' ' })
    }
  }

  const fillDemo = () => {
    setEmail(DEMO_EMAIL)
    setPassword(DEMO_PASSWORD)
    setErrors({ email: '', password: '' })
    addToast('Credenciales de demo aplicadas', { type: 'info', title: 'Demo' })
  }

  /* ── Tokens de tema ── */
  const cardBg     = isDark ? 'rgba(13,18,23,0.90)'     : 'rgba(255,255,255,0.94)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)'  : 'rgba(0,0,0,0.08)'
  const cardShadow = isDark ? '0 24px 56px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,105,113,0.12)' : '0 24px 56px rgba(0,0,0,0.15)'
  const mutedColor = isDark ? 'rgba(255,255,255,0.48)'  : 'var(--on-surface-var)'
  const eyeColor   = isDark ? 'rgba(255,255,255,0.38)'  : 'rgba(0,0,0,0.3)'
  const eyeHover   = isDark ? 'rgba(255,255,255,0.75)'  : 'rgba(0,0,0,0.7)'
  const divider    = isDark ? 'rgba(255,255,255,0.07)'  : 'var(--outline-var)'
  const demoText   = isDark ? 'rgba(255,255,255,0.6)'   : 'rgba(0,60,65,0.7)'
  const codeStyle  = isDark
    ? { background: 'rgba(255,255,255,0.08)', color: isDark ? 'rgba(255,255,255,0.85)' : 'var(--on-surface)' }
    : { background: 'rgba(0,105,113,0.08)',   color: 'var(--primary)' }
  const overlayBg  = isDark ? 'rgba(0,15,20,0.6)' : 'rgba(0,20,28,0.38)'

  return (
    <div className="login-page">

      {/* Background image */}
      <div className="login-bg">
        <img src="https://placehold.co/1920x1080/003b41/006971?text=Hoteles+Frida" alt="" />
      </div>

      {/* Overlay adaptivo */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: overlayBg }} />

      {/* Orbs decorativos */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {[
          { w: 420, top: '-80px',  left: '-80px',  color: 'rgba(0,105,113,0.18)', delay: 0    },
          { w: 280, top: '60%',    right: '-60px',  color: 'rgba(126,70,154,0.12)', delay: 1.5 },
          { w: 220, bottom: '-40px', left: '40%',  color: 'rgba(0,105,113,0.10)', delay: 0.8  },
        ].map((orb, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2, delay: orb.delay, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: orb.w, height: orb.w,
              borderRadius: '50%',
              background: orb.color,
              filter: 'blur(70px)',
              top: orb.top, left: orb.left, right: orb.right, bottom: orb.bottom,
            }}
          />
        ))}
      </div>

      {/* Contenido centrado */}
      <main style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}>
        <motion.div
          animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.45 }}
          style={{ width: '100%', maxWidth: '420px' }}
        >
          <motion.div
            {...fadeUp(0.1)}
            style={{
              background: cardBg,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: `1px solid ${cardBorder}`,
              borderRadius: 'var(--radius-xl)',
              padding: '28px 32px',
              boxShadow: cardShadow,
            }}
          >

            {/* ── Brand header ── */}
            <motion.div {...fadeUp(0.15)} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: 'var(--radius-lg)', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--primary), #009aa5)',
                display: 'grid', placeItems: 'center',
                boxShadow: '0 6px 18px rgba(0,105,113,0.38)',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#fff' }}>waves</span>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '14px', color: 'var(--on-surface)', lineHeight: 1.2 }}>
                  Hoteles Frida
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: mutedColor, marginTop: '2px' }}>
                  Panel Administrativo
                </div>
              </div>
            </motion.div>

            {/* ── Título ── */}
            <motion.div {...fadeUp(0.2)} style={{ marginBottom: '18px' }}>
              <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.65rem', color: 'var(--on-surface)', marginBottom: '4px', lineHeight: 1.2 }}>
                Acceder
              </h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: mutedColor }}>
                Ingresa tus credenciales para continuar
              </p>
            </motion.div>

            {/* ── Demo hint ── */}
            <motion.div
              {...fadeUp(0.25)}
              style={{
                background: 'rgba(0,105,113,0.10)',
                border: '1px solid rgba(0,105,113,0.20)',
                borderRadius: 'var(--radius-lg)',
                padding: '9px 12px',
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '6px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--primary)', flexShrink: 0 }}>info</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '11.5px', color: demoText, flex: 1 }}>
                Demo:{' '}
                <code style={{ ...codeStyle, padding: '1px 5px', borderRadius: '4px' }}>admin@hotelesfrida.mx</code>
                {' / '}
                <code style={{ ...codeStyle, padding: '1px 5px', borderRadius: '4px' }}>frida2026</code>
              </span>
              <Tooltip content="Rellenar automáticamente" position="top">
                <button
                  type="button"
                  onClick={fillDemo}
                  style={{
                    background: 'rgba(0,105,113,0.18)', border: '1px solid rgba(0,105,113,0.28)',
                    borderRadius: 'var(--radius-sm)', padding: '3px 8px', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700,
                    color: 'var(--primary)', flexShrink: 0,
                  }}
                >
                  Usar
                </button>
              </Tooltip>
            </motion.div>

            {/* ── Bloqueo por intentos ── */}
            <AnimatePresence>
              {attempts >= 3 && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: '10px' }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    background: 'rgba(186,26,26,0.11)',
                    border: '1px solid rgba(186,26,26,0.28)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '9px 12px',
                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#f87171', flexShrink: 0, marginTop: '1px' }}>warning</span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: '#f87171', marginBottom: '2px' }}>
                      Demasiados intentos fallidos
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: mutedColor }}>
                      Usa las credenciales de demo o contacta al administrador.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Formulario ── */}
            <form onSubmit={handleSubmit} noValidate style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Email */}
              <motion.div {...fadeUp(0.3)}>
                <Field label="Correo electrónico">
                  <Input
                    type="email"
                    placeholder="tu@hotelesfrida.mx"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearError('email') }}
                    autoComplete="email"
                    disabled={loading}
                    style={errors.email?.trim() ? { borderColor: 'var(--error, #ba1a1a)' } : {}}
                  />
                  <FieldError message={errors.email?.trim() ? errors.email : ''} />
                </Field>
              </motion.div>

              {/* Contraseña */}
              <motion.div {...fadeUp(0.35)}>
                <Field label={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Contraseña</span>
                    <Tooltip content="Te enviaremos un enlace a tu correo registrado" position="top">
                      <span
                        style={{
                          fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700,
                          color: 'var(--primary)', cursor: 'pointer',
                          textDecoration: 'underline', textDecorationStyle: 'dotted',
                          textTransform: 'none', letterSpacing: 0,
                        }}
                        onClick={() => addToast('Función disponible en producción', { type: 'info', title: 'Recuperar contraseña' })}
                      >
                        ¿Olvidaste tu contraseña?
                      </span>
                    </Tooltip>
                  </div>
                }>
                  <div style={{ position: 'relative' }}>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => { setPassword(e.target.value); clearError('password') }}
                      autoComplete="current-password"
                      disabled={loading}
                      style={{
                        paddingRight: '44px',
                        ...(errors.password?.trim() ? { borderColor: 'var(--error, #ba1a1a)' } : {}),
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      style={{
                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                        color: eyeColor, display: 'flex', alignItems: 'center',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = eyeHover}
                      onMouseLeave={e => e.currentTarget.style.color = eyeColor}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  <FieldError message={errors.password?.trim() ? errors.password : ''} />

                  {/* Caps Lock warning */}
                  <AnimatePresence>
                    {capsLock && password.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#d97706' }}>keyboard_capslock</span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#d97706', fontWeight: 600 }}>
                          Bloq Mayús activado
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Field>
              </motion.div>

              {/* Submit */}
              <motion.div {...fadeUp(0.4)}>
                <Button
                  type="submit"
                  disabled={loading || attempts >= 3}
                  style={{
                    width: '100%', justifyContent: 'center',
                    padding: '12px 24px', fontSize: '14px', fontWeight: 700,
                    opacity: attempts >= 3 ? 0.5 : 1,
                  }}
                >
                  {loading ? (
                    <>
                      <Spinner size={16} strokeWidth={2.5} color="#fff" />
                      Verificando…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>login</span>
                      Acceder al Panel
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            {/* ── Footer ── */}
            <motion.div
              {...fadeUp(0.45)}
              style={{
                marginTop: '18px', paddingTop: '16px',
                borderTop: `1px solid ${divider}`,
                display: 'flex', justifyContent: 'center',
              }}
            >
              <Tooltip content="Volver al sitio público de Hoteles Frida" position="top">
                <button
                  className="btn-outline"
                  type="button"
                  onClick={() => navigate('/')}
                  style={{ color: mutedColor, borderColor: divider }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--on-surface)'}
                  onMouseLeave={e => e.currentTarget.style.color = mutedColor}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>home</span>
                  Ir al sitio web
                </button>
              </Tooltip>
            </motion.div>

          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
