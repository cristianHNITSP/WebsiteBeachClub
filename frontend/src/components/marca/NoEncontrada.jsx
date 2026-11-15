import { useNavigate } from 'react-router-dom'
import { Unplugged } from '@/components/devl/unplugged'
import { usePaletaSitio } from '@/hooks/usePaletaSitio'

const ETIQUETAS = {
  pill: { offline: 'Error 404', connecting: 'Buscando', online: 'Encontrada' },
  connecting: 'Buscando',
  online: 'Llevándote',
}

/**
 * 404 (Unplugged de devl.dev): el cable desconectado ES la página que no existe;
 * al pulsar el botón se enchufa y te lleva `a` (por omisión, el inicio).
 */
export default function NoEncontrada({ a = '/', texto = 'Volver al inicio' }) {
  usePaletaSitio()
  const navigate = useNavigate()
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <Unplugged
        hue="violet"
        grande
        title="Esta página no existe"
        description="El enlace está roto o la página cambió de lugar."
        onlineTitle="Listo"
        onlineDescription="Te llevo de vuelta."
        actionLabel={texto}
        etiquetas={ETIQUETAS}
        onReconnect={() => setTimeout(() => navigate(a, { replace: true }), 1200)}
      />
    </main>
  )
}
