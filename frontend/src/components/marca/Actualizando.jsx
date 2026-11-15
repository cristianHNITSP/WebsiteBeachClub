import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Unplugged } from '@/components/devl/unplugged'
import { caidoDesde, revisar, useServicio } from '@/lib/servicio'
import s from './Actualizando.module.css'

/*
 * "Reservas Frida se está actualizando" (Unplugged de devl.dev): sale cuando el servidor deja
 * de responder, casi siempre porque se está instalando una versión nueva (despliegue), y se
 * revisa sola cada 5 s. Lo que la persona tenía en pantalla sigue debajo, intacto.
 *  - Espera 1 s antes de aparecer: un tropiezo suelto no hace parpadear la pantalla.
 *  - Si pasan 2 minutos, lo dice y pide avisar a quien administra el sistema.
 *  - Al volver enseña "disponible" un instante y se retira sola.
 */

const ESPERA_MS = 1000
const LENTO_MS = 2 * 60 * 1000
const ESTADO = { caido: 'offline', revisando: 'connecting', volvio: 'online' }
const ETIQUETAS = {
  pill: { offline: 'Actualizando', connecting: 'Revisando', online: 'Disponible' },
  connecting: 'Revisando',
  online: 'Disponible',
}

export default function Actualizando() {
  const estado = useServicio()
  const caido = estado !== 'bien'
  const [visible, setVisible] = useState(false)
  const [lento, setLento] = useState(false)

  useEffect(() => {
    if (!caido) { setVisible(false); setLento(false); return }
    const aparecer = setTimeout(() => setVisible(true), ESPERA_MS)
    const tarda = setTimeout(() => setLento(true), Math.max(0, LENTO_MS - (Date.now() - caidoDesde())))
    return () => { clearTimeout(aparecer); clearTimeout(tarda) }
  }, [caido])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className={s.velo} role="alertdialog" aria-modal="true" aria-labelledby="actualizando-t"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <h2 id="actualizando-t" className="sr-only">Reservas Frida se está actualizando</h2>
          <Unplugged
            hue="violet"
            grande
            status={ESTADO[estado] ?? 'online'}
            title="Reservas Frida se está actualizando"
            description={lento
              ? 'Está tardando más de lo normal. Si sigue así en unos minutos, avisa a quien administra el sistema.'
              : 'Se está instalando una versión nueva. El panel se reconecta solo en unos segundos; lo que tenías en pantalla sigue aquí.'}
            onlineTitle="El panel ya está disponible"
            onlineDescription="Puedes seguir donde te quedaste."
            actionLabel="Revisar ahora"
            etiquetas={ETIQUETAS}
            onReconnect={revisar}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
