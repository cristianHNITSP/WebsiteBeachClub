import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  UserIcon, LockSimpleIcon, EyeIcon, EyeSlashIcon, WarningCircleIcon, WarningIcon,
  SignInIcon, HouseIcon, ArrowUpIcon, SpinnerGapIcon,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Toaster } from '@/components/ui/sonner'
import Aurora from '@/components/bits/Aurora'
import SpotlightCard from '@/components/bits/SpotlightCard'
import SplitText from '@/components/bits/SplitText'
import BotonDestacado from '@/components/marca/BotonDestacado'
import BotonTema from '@/components/marca/BotonTema'
import Pista from '@/components/marca/Pista'
import SpringCheck from '@/components/bits/SpringCheck'
import { useTheme } from '@/context/ThemeContext'
import { usePaletaSitio } from '@/hooks/usePaletaSitio'
import { leerToken } from '@/lib/tokens-css'
import Wordmark from '@/components/marca/Wordmark'
import LogoGoogle from '@/components/marca/LogoGoogle'
import { PantallaVerificando } from '@/components/marca/RutaProtegida'
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
  const navigate  = useNavigate()
  const [params]  = useSearchParams()
  const volver    = params.get('volver')
  const { verificando, sesion } = useSesion()
  const { reduceMotion } = useTheme()

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

  // WebGL no entiende var(): tokens ya resueltos.
  const aurora = useMemo(() => [
    leerToken('--flor-morado', '#7A32C0'),
    leerToken('--flor-turquesa', '#4EC8BC'),
    leerToken('--flor-orquidea', '#A848B8'),
  ], [])

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
    <>
      <div className={s.pagina}>
        {/* ── Fondo: Aurora (WebGL) o degradado quieto con reducir movimiento ── */}
        <div className={s.fondo} aria-hidden="true">
          <div className={s.fondoQuieto} />
          {!reduceMotion && (
            <div className={s.fondoAurora}>
              <Aurora colorStops={aurora} amplitude={1.1} blend={0.55} speed={0.5} />
            </div>
          )}
        </div>

        {/* ── Cambio de tema (círculo desde el botón) ── */}
        <BotonTema className={s.tema} lado="left" />

        <main className={s.main}>
          <motion.div
            animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.45 }}
            className={s.columna}
          >
            <motion.div {...fadeUp(0.05)}>
              <SpotlightCard className={s.tarjeta} spotlightColor="color-mix(in srgb, var(--flor-orquidea) 16%, transparent)">

                {/* ── Marca ── */}
                <motion.div {...fadeUp(0.12)} className={s.marca}>
                  <Wordmark tamano={2} />
                </motion.div>

                {/* ── Título ── */}
                <motion.div {...fadeUp(0.18)} className={s.titulo}>
                  {reduceMotion
                    ? <h1 className={s.tituloTexto}>Acceder</h1>
                    : <SplitText text="Acceder" tag="h1" className={s.tituloTexto} splitType="chars" delay={45} duration={0.7}
                        from={{ opacity: 0, y: '0.45em' }} to={{ opacity: 1, y: 0 }} textAlign="left" rootMargin="0px" />}
                  <p className={s.subtitulo}>{PRODUCTO.huespedes
                    ? 'Entra con tu usuario o correo. Te llevamos a tu cuenta o al panel, según tu perfil.'
                    : 'Motor de reservas. Entra con tu usuario o correo.'}</p>
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
                  <motion.div {...fadeUp(0.3)} className={s.campo}>
                    <Label htmlFor="login-email">Usuario o correo</Label>
                    <div className={s.conIcono}>
                      <UserIcon size={18} className={s.iconoCampo} aria-hidden="true" />
                      <Input
                        id="login-email"
                        type="text"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="tu usuario o tu@correo.com"
                        value={email}
                        onChange={e => { setEmail(e.target.value); clearError('email') }}
                        autoComplete="username"
                        disabled={loading}
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? 'err-email' : undefined}
                        className="h-11 pl-10"
                      />
                    </div>
                    <Aviso id="err-email" mensaje={errors.email} />
                  </motion.div>

                  <motion.div {...fadeUp(0.36)} className={s.campo}>
                    <div className={s.filaLabel}>
                      <Label htmlFor="login-password">Contraseña</Label>
                      <Pista contenido="Te enviaremos un enlace a tu correo registrado" lado="top">
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 text-xs"
                            onClick={() => toast.info('Recuperar contraseña', { description: 'Función disponible en producción.' })}
                          >
                            ¿Olvidaste tu contraseña?
                          </Button>
                      </Pista>
                    </div>
                    <div className={s.conIcono}>
                      <LockSimpleIcon size={18} className={s.iconoCampo} aria-hidden="true" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Tu contraseña"
                        value={password}
                        onChange={e => { setPassword(e.target.value); clearError('password') }}
                        autoComplete="current-password"
                        disabled={loading}
                        aria-invalid={!!errors.password}
                        aria-describedby={errors.password ? 'err-password' : undefined}
                        className="h-11 pl-10 pr-11"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={s.ojo}
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeSlashIcon size={18} /> : <EyeIcon size={18} />}
                      </Button>
                    </div>
                    <Aviso id="err-password" mensaje={errors.password} />
                    <Aviso
                      mensaje={capsLock && password.length > 0 ? 'Bloq Mayús activado' : ''}
                      tono="atencion"
                      Icono={ArrowUpIcon}
                    />
                  </motion.div>

                  <motion.div {...fadeUp(0.4)}>
                    <SpringCheck
                      label="Mantener la sesión iniciada"
                      checked={recordar}
                      onChange={setRecordar}
                      strike="none"
                      doneOpacity={1}
                      boxSize={20}
                      boxRadius={6}
                      fontSize={14}
                      color="var(--foreground)"
                      fillColor="var(--primary)"
                      checkColor="var(--primary-foreground)"
                    />
                  </motion.div>

                  <motion.div {...fadeUp(0.44)}>
                    <BotonDestacado
                      type="submit"
                      tamano="lg"
                      disabled={loading || bloqueado}
                      className={`w-full ${loading || bloqueado ? 'opacity-60 pointer-events-none' : ''}`}
                      aria-busy={loading}
                    >
                      {loading ? (
                        <>
                          <SpinnerGapIcon size={18} weight="bold" className="animate-spin" aria-hidden="true" />
                          Verificando
                        </>
                      ) : (
                        <>
                          <SignInIcon size={18} weight="bold" aria-hidden="true" />
                          Entrar
                        </>
                      )}
                    </BotonDestacado>
                  </motion.div>
                </form>

                {/* ── Otros accesos (Google era para huéspedes: lib/producto.js) ── */}
                {PRODUCTO.huespedes && <motion.div {...fadeUp(0.48)} className={s.otros}>
                  <div className={s.o} role="separator"><span>o</span></div>
                  <Button type="button" variant="outline" size="lg" className="h-11 w-full" onClick={conGoogle} disabled={loading}>
                    <LogoGoogle tamano={18} retraso={0.7} />
                    Continuar con Google
                  </Button>
                </motion.div>}

                {PRODUCTO.websitePublica && <>
                <Separator className="my-5" />

                <motion.div {...fadeUp(0.5)} className={s.pie}>
                  <Button type="button" variant="outline" onClick={() => navigate('/')}>
                    <HouseIcon size={16} weight="bold" />
                    Ir al sitio web
                  </Button>
                </motion.div>
                </>}
              </SpotlightCard>
            </motion.div>
          </motion.div>
        </main>

        <Toaster position="top-center" closeButton />
      </div>
    </>
  )
}
