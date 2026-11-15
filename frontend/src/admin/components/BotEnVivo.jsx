import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { XIcon } from 'lucide-react'
import { WorkingOutLoud } from '@/components/working-out-loud'
import { Button } from '@/components/coss/button'
import { escucharEventos } from '@/lib/eventos'
import s from './BotEnVivo.module.css'

/*
 * Lo que el bot hace en su vuelta diaria, en vivo y para todas las personas conectadas
 * (evento de paso `bot.progreso` por SSE; no se guarda). Cada aviso trae la lista completa
 * de páginas, así que quien abre el panel a media vuelta la ve entera con el siguiente.
 * Se puede cerrar; al terminar se retira solo. Una vuelta nueva lo vuelve a mostrar.
 */

const RESULTADO = {
  leida: 'Leída',
  sin_datos: 'Respondió, sin datos nuevos',
  verificacion: 'Pidió verificación; el bot no insiste',
  bloqueada_robots: 'Su robots.txt no permite leerla',
  error: 'No respondió',
}
const RETIRAR_MS = 20_000

const detalleDe = p =>
  p.estado === 'leyendo' ? p.fase : p.estado === 'pendiente' ? 'En espera' : RESULTADO[p.estado] ?? p.estado

export default function BotEnVivo() {
  const [vuelta, setVuelta] = useState(null) // el último aviso del bot
  const [cerrada, setCerrada] = useState(null) // `inicio` de la vuelta que la persona cerró

  useEffect(() => escucharEventos(m => { if (m.tipo === 'bot.progreso') setVuelta(m) }), [])

  const terminada = vuelta?.estado === 'terminado'
  useEffect(() => {
    if (!terminada) return
    const t = setTimeout(() => setCerrada(vuelta.inicio), RETIRAR_MS)
    return () => clearTimeout(t)
  }, [terminada, vuelta?.inicio])

  const visible = vuelta && vuelta.inicio !== cerrada
  const paginas = vuelta?.paginas ?? []
  const enCurso = paginas.findIndex(p => p.estado === 'leyendo')
  const hechas = paginas.filter(p => p.estado !== 'pendiente' && p.estado !== 'leyendo').length
  const leidas = paginas.filter(p => p.estado === 'leida' || p.estado === 'sin_datos').length

  return (
    <AnimatePresence>
      {visible && (
        <motion.section key={vuelta.inicio} className={s.bot} aria-label="Revisión del bot en otras plataformas"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}>
          <WorkingOutLoud
            className="max-w-none pe-10 shadow-lg/5"
            title="El bot está revisando las plataformas"
            active={enCurso >= 0 ? enCurso : hechas}
            finished={terminada}
            steps={paginas.map(p => ({ label: `${p.sitio}, ${p.propiedad}`, detail: detalleDe(p) }))}
            textos={{
              listo: () => 'Revisión del bot terminada',
              resumen: () => `${leidas} de ${paginas.length} páginas respondieron`,
            }}
          />
          <Button variant="ghost" size="icon-sm" className={s.cerrar} aria-label="Ocultar la revisión del bot"
            onClick={() => setCerrada(vuelta.inicio)}>
            <XIcon />
          </Button>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
