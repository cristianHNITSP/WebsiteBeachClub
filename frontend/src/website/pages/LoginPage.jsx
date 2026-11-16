import { useEffect, useLayoutEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  UserIcon, LockSimpleIcon, EyeIcon, EyeSlashIcon, WarningCircleIcon, WarningIcon,
  SignInIcon, HouseIcon, ArrowUpIcon,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/coss/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/coss/input-group'
import { Label } from '@/components/coss/label'
import { DropletButton } from '@/components/devl/droplet-button'
import { LiquidCheckbox } from '@/components/devl/liquid-checkbox'
import { MorphIcon } from '@/components/devl/morph-icons'
import { Toaster } from '@/components/ui/sonner'
import BotonTema from '@/components/marca/BotonTema'
import Pista from '@/components/marca/Pista'
import { useTheme } from '@/context/ThemeContext'
import { usePaletaSitio } from '@/hooks/usePaletaSitio'
import { alternarTemaConCirculo } from '@/lib/transicionTema'
import Wordmark, { Florecita } from '@/components/marca/Wordmark'
import LogoGoogle from '@/components/marca/LogoGoogle'
import { PantallaVerificando } from '@/components/marca/RutaProtegida'
import { instalarVida } from '@/admin/vida'
import { PRODUCTO } from '@/lib/producto'
import { useSesion, iniciarSesion, destinoTrasEntrar } from '@/lib/sesion'
import { ErrorApi } from '@/lib/api'
import s from './LoginPage.module.css'

/* ── Entrada escalonada: subida corta + opacidad (SISTEMA-DE-DISENO §10) ── */
const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 10 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay },
})

const aparecer = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit:    { opacity: 0, height: 0 },
  transition: { duration: 0.2 },
}

/* La corona del logotipo, en grande: cada flor brota al entrar y se mece. [color, x %, y %, tamaño] */
const CORONA = [
  ['turquesa', 8, 56, 74], ['orquidea', 20, 37, 92], ['naranja', 35, 24, 80], ['morado', 50, 17, 118],
  ['rojo', 65, 25, 84], ['dorado', 78, 38, 90], ['turquesa', 90, 56, 70], ['morado', 27, 54, 54], ['naranja', 72, 56, 58],
]

/** El lado de la marca: mar, sol y corona de flores. Dibujado, sin fotos ni datos de muestra. */
function Escena() {
  return (
    <div className={s.escena} aria-hidden="true">
      <span className={s.sol} />
      <svg className={s.rama} viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M8 56 Q50 -22 90 56" fill="none" stroke="var(--flor-hoja)" strokeWidth="0.8" strokeLinecap="round" vectorEffect="non-scaling-stroke" /></svg>
      {CORONA.map(([flor, x, y, tamano], i) => (
        <span key={i} className={s.brote} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${0.15 + i * 0.08}s` }}>
          <span data-mece="" style={{ animationDelay: `${-i * 0.9}s` }}><Florecita color={`var(--flor-${flor})`} tamano={tamano} /></span>
        </span>
      ))}
      <svg className={s.mar} viewBox="0 0 1200 200" preserveAspectRatio="none">
        <path className={s.ola1} d="M0 70 Q150 30 300 70 T600 70 T900 70 T1200 70 T1500 70 T1800 70 V200 H0Z" />
        <path className={s.ola2} d="M0 110 Q150 70 300 110 T600 110 T900 110 T1200 110 T1500 110 T1800 110 V200 H0Z" />
      </svg>
      <p className={s.lema}>Dos casas junto al mar, un solo motor de reservas.</p>
    </div>
  )
}

/** El tema es una gota que brota del panel de flores y, al pasar, se funde otra vez con él. */
function GotaTema() {
  const { isDark, toggleDark, reduceMotion } = useTheme()
  const texto = isDark ? 'Modo claro' : 'Modo oscuro'
  return (
    <div className={s.gota}>
      <svg width="0" height="0" className={s.gotaFiltro} aria-hidden="true">
        <filter id="gota-tema" colorInterpolationFilters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11" />
        </filter>
      </svg>
      <div className={s.gotaLiquido} aria-hidden="true">
        <span className={s.gotaOrilla} />
        <span className={s.gotaBola} />
      </div>
      <div className={s.gotaToque}>
        <Pista contenido={texto} lado="bottom">
          <button type="button" className={s.gotaBoton} aria-label={texto} onClick={e => alternarTemaConCirculo(e, toggleDark, reduceMotion)}>
            <MorphIcon name="theme" morphed={isDark} className="size-5" />
          </button>
        </Pista>
      </div>
    </div>
  )
}

/* ── Mensaje bajo un campo ── */
function Aviso({ id, mensaje, tono = 'error', Icono = WarningCircleIcon }) {
  return (
    <AnimatePresence initial={false}>
      {mensaje && (
        <motion.p id={id} {...aparecer} className={`${s.aviso} ${tono === 'atencion' ? s.avisoAtencion : ''}`}>
          <Icono size={14} weight="bold" aria-hidden="true" />
          {mensaje}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

/*
 * Login ÚNICO (/entrar), para personal y huéspedes. El rol decide a dónde se
 * llega: personal → panel (o la pantalla del panel que pidió), huésped → Mi
 * cuenta. `?volver=` guarda la pantalla pedida; destinoTrasEntrar() valida que
 * sea interna y que un huésped nunca aterrice en el panel.
 */
export default function LoginPage() {
  usePaletaSitio()
  // Los tokens, las letras y los botones vivos del panel: es su puerta de entrada.
  useLayoutEffect(() => {
    document.body.classList.add('panel')
    return () => document.body.classList.remove('panel')
  }, [])
  useEffect(instalarVida, [])
  const navigate  = useNavigate()
  const [params]  = useSearchParams()
  const volver    = params.get('volver')
  const { verificando, sesion } = useSesion()

  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [recordar,     setRecordar]     = useState(true)
  const [capsLock,     setCapsLock]     = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [bloqueo,      setBloqueo]      = useState(null)   // { hasta, mensaje } que manda la API (429)
  const [shake,        setShake]        = useState(false)
  const [errors,       setErrors]       = useState({ email: '', password: '' })

  const bloqueado = Boolean(bloqueo)
  // El bloqueo lo decide el servidor (5 intentos en 15 min); al vencer, se quita solo.
  useEffect(() => {
    if (!bloqueo) return
    const t = setTimeout(() => setBloqueo(null), Math.max(0, bloqueo.hasta - Date.now()))
    return () => clearTimeout(t)
  }, [bloqueo])

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
    if (!email.trim())
      e.email = 'Escribe tu usuario o correo'
    if (!password)
      e.password = 'La contraseña es obligatoria'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (bloqueado || loading) return
    if (!validate()) { triggerShake(); return }

    setLoading(true)
    try {
      const sesionNueva = await iniciarSesion(email.trim(), password, recordar)
      toast.success(`¡Hola, ${sesionNueva.nombre.split(' ')[0]}!`, { description: 'Sesión iniciada.' })
      navigate(destinoTrasEntrar(sesionNueva, volver), { replace: true })
    } catch (err) {
      triggerShake()
      const mensaje = err instanceof ErrorApi ? err.message : 'No se pudo entrar. Intenta de nuevo.'
      if (err instanceof ErrorApi && err.estado === 429) {
        setBloqueo({ hasta: Date.now() + (err.datos?.reintentar_en ?? 60) * 1000, mensaje })
      } else if (err instanceof ErrorApi && err.estado === 401) {
        setErrors({ email: 'Revisa tu usuario o correo', password: 'Revisa la contraseña' })
        toast.error('Acceso denegado', { description: mensaje })
      } else {
        toast.error('No se pudo entrar', { description: mensaje })
      }
    } finally {
      setLoading(false)
    }
  }

  // Google: se activa con su configuración (PLAN-BACKEND §11). Hoy el botón ni
  // se muestra (es para huéspedes, apagados en lib/producto.js).
  const conGoogle = () => toast.info('Pronto', { description: 'El acceso con Google se activará cuando se configure.' })

  // Ya con sesión: directo a su lugar (p. ej. al volver con "atrás").
  if (verificando) return <PantallaVerificando />
  if (sesion) return <Navigate to={destinoTrasEntrar(sesion, volver)} replace />

  return (
    <div className={s.pagina}>
      <div className={s.hoja}>
        <main className={s.lado}>
          <div className={s.arriba}>
            <Wordmark tamano={1.5} />
            <span className={s.temaMovil}><BotonTema lado="left" /></span>
          </div>

          <motion.div
            animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.45 }}
            className={s.columna}
          >
            <motion.div {...fadeUp(0.1)}>
              <h1 className={s.tituloTexto}>Entra al panel</h1>
              <p className={s.subtitulo}>{PRODUCTO.huespedes
                ? 'Entra con tu usuario o correo. Te llevamos a tu cuenta o al panel, según tu perfil.'
                : 'Panel de reservas de Cabañas Frida y Casa Frida. Entra con tu usuario o correo.'}</p>
            </motion.div>

            {/* ── Bloqueo por intentos ── */}
            <AnimatePresence initial={false}>
              {bloqueado && (
                <motion.div {...aparecer} role="alert" className={s.bloqueo}>
                  <WarningIcon size={18} weight="fill" aria-hidden="true" />
                  <div>
                    <div className={s.bloqueoTitulo}>Demasiados intentos fallidos</div>
                    <div className={s.bloqueoTexto}>{bloqueo?.mensaje} Si olvidaste tu contraseña, pide a gerencia que la restablezca.</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Formulario ── */}
            <form onSubmit={handleSubmit} noValidate className={s.form}>
              <motion.div {...fadeUp(0.18)} className={s.campo}>
                <Label htmlFor="login-email">Usuario o correo</Label>
                <InputGroup className={s.grupo}>
                  <InputGroupAddon><UserIcon size={17} aria-hidden="true" /></InputGroupAddon>
                  <InputGroupInput
                    id="login-email"
                    type="text"
                    size="lg"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="tu usuario o tu@correo.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearError('email') }}
                    autoComplete="username"
                    disabled={loading}
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? 'err-email' : undefined}
                  />
                </InputGroup>
                <Aviso id="err-email" mensaje={errors.email} />
              </motion.div>

              <motion.div {...fadeUp(0.24)} className={s.campo}>
                <div className={s.filaLabel}>
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Pista contenido="Te enviaremos un enlace a tu correo registrado" lado="top">
                    <button type="button" className={s.olvido}
                      onClick={() => toast.info('Recuperar contraseña', { description: 'Función disponible en producción.' })}>
                      ¿Olvidaste tu contraseña?
                    </button>
                  </Pista>
                </div>
                <InputGroup className={s.grupo}>
                  <InputGroupAddon><LockSimpleIcon size={17} aria-hidden="true" /></InputGroupAddon>
                  <InputGroupInput
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    size="lg"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearError('password') }}
                    autoComplete="current-password"
                    disabled={loading}
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={errors.password ? 'err-password' : undefined}
                  />
                  <InputGroupAddon align="inline-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeSlashIcon size={17} /> : <EyeIcon size={17} />}
                    </Button>
                  </InputGroupAddon>
                </InputGroup>
                <Aviso id="err-password" mensaje={errors.password} />
                <Aviso
                  mensaje={capsLock && password.length > 0 ? 'Bloq Mayús activado' : ''}
                  tono="atencion"
                  Icono={ArrowUpIcon}
                />
              </motion.div>

              <motion.div {...fadeUp(0.3)}>
                <LiquidCheckbox checked={recordar} onCheckedChange={setRecordar} label="Mantener la sesión iniciada" />
              </motion.div>

              <motion.div {...fadeUp(0.36)}>
                <DropletButton type="submit" size="lg" className="w-full" loading={loading} disabled={bloqueado} aria-label={loading ? 'Verificando' : undefined}>
                  Entrar <SignInIcon size={18} weight="bold" aria-hidden="true" />
                </DropletButton>
              </motion.div>
            </form>

            {/* ── Otros accesos (Google era para huéspedes: lib/producto.js) ── */}
            {PRODUCTO.huespedes && <motion.div {...fadeUp(0.42)} className={s.otros}>
              <div className={s.o} role="separator"><span>o</span></div>
              <Button type="button" variant="outline" size="lg" className="w-full" onClick={conGoogle} disabled={loading}>
                <LogoGoogle tamano={18} retraso={0.7} />
                Continuar con Google
              </Button>
            </motion.div>}

            {PRODUCTO.websitePublica && <motion.div {...fadeUp(0.46)} className={s.pie}>
              <Button type="button" variant="ghost" onClick={() => navigate('/')}>
                <HouseIcon size={16} weight="bold" /> Ir al sitio web
              </Button>
            </motion.div>}
          </motion.div>
        </main>

        <div className={s.escenaCaja}>
          <Escena />
          <GotaTema />
        </div>
      </div>

      <Toaster position="top-center" closeButton />
    </div>
  )
}
