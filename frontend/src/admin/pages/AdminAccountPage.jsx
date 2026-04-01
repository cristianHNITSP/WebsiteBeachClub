import Button from '@/components/frida/Button'
import { SurfaceCard } from '@/components/frida/Card'
import Badge from '@/components/frida/Badge'
import Icon from '@/components/frida/Icon'
import s from './AdminAccountPage.module.css'

const INFO_ITEMS = [
  { icon: 'badge',       label: 'Rol',       value: 'Gerente General' },
  { icon: 'location_on', label: 'Propiedad', value: 'Grand Oasis' },
  { icon: 'mail',        label: 'Correo',    value: 'admin@hotelesfrida.mx' },
]

export default function AdminAccountPage({ onBack }) {
  return (
    <div>
      <Button variant="ghost" onClick={onBack} style={{ marginBottom: '24px' }}>
        <Icon name="arrow_back" size={20} /> Regresar
      </Button>

      {/* Perfil */}
      <div className={s.profileRow}>
        <img
          src="https://placehold.co/96x96/003b41/ffffff?text=A"
          alt="Avatar"
          className={s.avatar}
        />
        <div>
          <Badge variant="outline" style={{ marginBottom: '8px' }}>Mi Cuenta</Badge>
          <h1 style={{
            fontFamily: 'var(--font-headline)', fontSize: '28px',
            fontWeight: 700, color: 'var(--on-surface)', marginBottom: '4px',
          }}>
            Administrador
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--on-surface-var)' }}>
            Gerente · Grand Oasis · Hoteles Frida
          </p>
        </div>
      </div>

      {/* Info cards */}
      <div className={s.infoGrid}>
        {INFO_ITEMS.map((item, i) => (
          <SurfaceCard key={i} style={{ padding: '20px' }}>
            <Icon name={item.icon} size={24} style={{ color: 'var(--primary)', display: 'block', marginBottom: '8px' }} />
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-var)', marginBottom: '4px' }}>
              {item.label}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface)' }}>
              {item.value}
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  )
}
