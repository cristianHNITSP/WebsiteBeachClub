import { useState } from 'react'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { Button } from '@/components/coss/button'
import ConfirmarDescarte from '@/components/marca/ConfirmarDescarte'
import Pista from '@/admin/components/Pista'
import s from './SectionPanel.module.css'

/* ── SectionPanel ────────────────────────────────────────────────
   Ocupa todo el área de contenido del AdminLayout.

   Props:
     title     ReactNode — título principal (puede tener <em>)
     subtitle  string    — descripción corta bajo el título
     onBack    fn        — navegar de regreso
     dirty     boolean   — si true, volver pide confirmación (AlertDialog)
     actions   ReactNode — botones al lado derecho del header (ej. Guardar)
     children  ReactNode — contenido del formulario / información
   ──────────────────────────────────────────────────────────────── */
export default function SectionPanel({
  title, subtitle,
  onBack, dirty = false,
  actions, children,
}) {
  const [showConfirm, setShowConfirm] = useState(false)

  const handleBack = () => {
    if (dirty) setShowConfirm(true)
    else onBack()
  }

  return (
    <>
      <div className="admin-page-header">
        <div className={s.titleGroup}>
          <Pista contenido="Volver" lado="bottom">
            <Button variant="outline" size="icon" className={s.backBtn} onClick={handleBack} aria-label="Volver">
              <ArrowLeftIcon size={18} weight="bold" />
            </Button>
          </Pista>

          <div>
            <h1 className="admin-page-title">{title}</h1>
            {subtitle && <p className={s.subtitle}>{subtitle}</p>}
          </div>
        </div>

        {actions && (
          <div className="admin-page-header-actions">
            <div className="admin-page-header-actions-row">{actions}</div>
          </div>
        )}
      </div>

      {children}

      <ConfirmarDescarte
        abierto={showConfirm}
        texto="Tienes cambios sin guardar. Si regresas ahora, toda la información capturada se perderá."
        onConfirmar={() => { setShowConfirm(false); onBack() }}
        onCancelar={() => setShowConfirm(false)}
      />
    </>
  )
}
