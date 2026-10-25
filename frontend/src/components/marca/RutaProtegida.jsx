import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CoronaFlores } from '@/components/marca/Wordmark'
import { useSesion, rutaEntrar } from '@/lib/sesion'

/** Pantalla mientras se verifica la sesión: nada de la página protegida se monta. */
export function PantallaVerificando() {
  return (
    <div className="pantalla-verificando" role="status" aria-live="polite">
      <motion.span
        className="pantalla-verificando__corona"
        animate={{ scale: [1, 1.08, 1], opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <CoronaFlores />
      </motion.span>
      <span className="pantalla-verificando__texto">Verificando tu sesión…</span>
    </div>
  )
}

/**
 * Guardia ÚNICA de pantallas protegidas (Mi cuenta, panel). Orden:
 *   1. verificando → pantalla de carga (la página protegida NO se monta);
 *   2. sin sesión → /entrar?volver=<aquí>;
 *   3. sin permiso (`permitir(sesion)` falso) → `sinPermiso`.
 * Es experiencia de uso: la protección real de los datos es del backend
 * (sin sesión válida la API responde 401).
 */
export default function RutaProtegida({ permitir = () => true, sinPermiso = '/mi-cuenta', children }) {
  const { verificando, sesion } = useSesion()
  const location = useLocation()
  if (verificando) return <PantallaVerificando />
  if (!sesion) return <Navigate to={rutaEntrar(location)} replace />
  if (!permitir(sesion)) return <Navigate to={sinPermiso} replace />
  return children
}
