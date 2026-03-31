import { useState } from 'react'
import Icon from '@/components/frida/Icon'

/* ── Navigation groups ── */
const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { key: 'dashboard', label: 'Tablero',      icon: 'grid_view',        badge: null },
      { key: 'calendar',  label: 'Reservaciones', icon: 'calendar_month',   badge: 3 },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { key: 'rooms',        label: 'Habitaciones', icon: 'bed',               badge: null },
      { key: 'housekeeping', label: 'Limpieza',      icon: 'cleaning_services', badge: 2 },
      { key: 'users',        label: 'Huéspedes',     icon: 'group',             badge: null },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { key: 'shop',      label: 'Boutique',  icon: 'storefront', badge: null },
      { key: 'marketing', label: 'Marketing', icon: 'campaign',   badge: null },
    ],
  },
]

const PROPERTIES = [
  { id: 'grand',   name: 'Grand Oasis',            location: 'Chelem, Yucatán' },
  { id: 'chuburna', name: 'Casa Frida',            location: 'Chuburná, Yucatán' },
  { id: 'merida',  name: 'Boutique Mérida',        location: 'Centro Histórico' },
]

/* ── Single nav item ── */
function SideItem({ item, active, onClick }) {
  const [hov, setHov] = useState(false)
  const isActive = active

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 14px',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        background: isActive
          ? 'linear-gradient(135deg, rgba(0,105,113,0.14) 0%, rgba(0,105,113,0.06) 100%)'
          : hov ? 'var(--surface-container-low)' : 'transparent',
        color: isActive ? 'var(--primary)' : hov ? 'var(--on-surface)' : 'var(--on-surface-var)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: isActive ? 700 : 500,
        fontFamily: 'var(--font-body)',
        width: '100%',
        textAlign: 'left',
        transition: 'all 0.18s ease',
        position: 'relative',
      }}
    >
      {/* Active indicator */}
      {isActive && (
        <span style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
          width: '3px', height: '20px', background: 'var(--primary)',
          borderRadius: '0 3px 3px 0',
        }} />
      )}

      <span style={{
        width: '32px', height: '32px',
        borderRadius: 'var(--radius-sm)',
        background: isActive ? 'rgba(0,105,113,0.15)' : hov ? 'var(--surface-container)' : 'transparent',
        display: 'grid', placeItems: 'center',
        flexShrink: 0,
        transition: 'background 0.18s',
      }}>
        <Icon name={item.icon} size={17} />
      </span>

      <span style={{ flex: 1 }}>{item.label}</span>

      {item.badge != null && (
        <span style={{
          minWidth: '18px', height: '18px',
          padding: '0 5px',
          background: isActive ? 'var(--primary)' : 'var(--secondary-container)',
          color: isActive ? '#fff' : 'var(--secondary)',
          borderRadius: 'var(--radius-full)',
          fontSize: '10px', fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          letterSpacing: '0',
        }}>
          {item.badge}
        </span>
      )}
    </button>
  )
}

export default function SideNav({ page, onNavigate }) {
  const [propertyOpen, setPropertyOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(PROPERTIES[0])

  return (
    <aside style={{
      position: 'fixed', top: '64px', left: 0, bottom: 0,
      width: '256px',
      display: 'flex', flexDirection: 'column',
      background: 'var(--surface)',
      borderRight: '1px solid var(--outline-var)',
      overflowY: 'auto',
      zIndex: 40,
    }}>

      {/* ── Property switcher ── */}
      <div style={{ padding: '14px 12px', borderBottom: '1px solid var(--outline-var)' }}>
        <button
          onClick={() => setPropertyOpen(o => !o)}
          style={{
            width: '100%', background: 'var(--surface-container-low)',
            border: '1px solid var(--outline-var)',
            borderRadius: 'var(--radius-md)', padding: '10px 12px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
            textAlign: 'left', transition: 'background 0.18s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-container-low)'}
        >
          {/* Property icon */}
          <span style={{
            width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--primary) 0%, #009aa5 100%)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 3px 8px rgba(0,105,113,0.28)',
          }}>
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '16px' }}>hotel</span>
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-headline)', fontSize: '13px',
              fontWeight: 700, color: 'var(--on-surface)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {selectedProperty.name}
            </div>
            <div style={{
              fontSize: '11px', color: 'var(--on-surface-var)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {selectedProperty.location}
            </div>
          </div>

          <span className="material-symbols-outlined" style={{
            fontSize: '16px', color: 'var(--on-surface-var)',
            transform: propertyOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}>
            expand_more
          </span>
        </button>

        {/* Dropdown */}
        {propertyOpen && (
          <div style={{
            marginTop: '6px',
            background: 'var(--surface-container-low)',
            border: '1px solid var(--outline-var)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            {PROPERTIES.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedProperty(p); setPropertyOpen(false) }}
                style={{
                  width: '100%', border: 'none', background: 'transparent',
                  padding: '9px 12px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  borderBottom: '1px solid var(--outline-var)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span className="material-symbols-outlined" style={{
                  fontSize: '14px',
                  color: selectedProperty.id === p.id ? 'var(--primary)' : 'var(--outline)',
                }}>
                  {selectedProperty.id === p.id ? 'radio_button_checked' : 'radio_button_unchecked'}
                </span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--on-surface)', fontFamily: 'var(--font-body)' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--on-surface-var)' }}>{p.location}</div>
                </div>
              </button>
            ))}
            <button
              style={{
                width: '100%', border: 'none', background: 'transparent',
                padding: '9px 12px', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '8px',
                color: 'var(--primary)', fontSize: '12px', fontWeight: 700,
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add_circle</span>
              Agregar propiedad
            </button>
          </div>
        )}
      </div>

      {/* ── Navigation groups ── */}
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: '6px' }}>
            <span style={{
              display: 'block',
              padding: '8px 14px 4px',
              fontFamily: 'var(--font-body)',
              fontSize: '9px', fontWeight: 800,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'var(--outline)',
            }}>
              {group.label}
            </span>
            {group.items.map(item => (
              <SideItem
                key={item.key}
                item={item}
                active={page === item.key}
                onClick={() => onNavigate(item.key)}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* ── User profile card ── */}
      <div style={{
        padding: '10px 8px',
        borderTop: '1px solid var(--outline-var)',
      }}>
        {/* Quick actions */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          <button
            onClick={() => onNavigate('config')}
            style={{
              flex: 1, padding: '8px', border: '1px solid var(--outline-var)',
              borderRadius: 'var(--radius-md)', background: 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '12px', color: 'var(--on-surface-var)', fontFamily: 'var(--font-body)',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-container-low)'; e.currentTarget.style.color = 'var(--on-surface)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--on-surface-var)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>settings</span>
            Config.
          </button>
          <button
            onClick={() => onNavigate('login')}
            style={{
              flex: 1, padding: '8px', border: '1px solid var(--outline-var)',
              borderRadius: 'var(--radius-md)', background: 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '12px', color: 'var(--on-surface-var)', fontFamily: 'var(--font-body)',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(186,26,26,0.06)'; e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.borderColor = 'rgba(186,26,26,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--on-surface-var)'; e.currentTarget.style.borderColor = 'var(--outline-var)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>logout</span>
            Salir
          </button>
        </div>

        {/* Profile row */}
        <div
          onClick={() => onNavigate('config')}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px',
            background: 'var(--surface-container-low)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            border: '1px solid var(--outline-var)',
            transition: 'background 0.18s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-container-low)'}
        >
          <div style={{
            width: '34px', height: '34px', borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, var(--primary), #009aa5)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
            border: '2px solid rgba(0,105,113,0.3)',
          }}>
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '17px' }}>person</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: '12px',
              fontWeight: 700, color: 'var(--on-surface)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              Gerente General
            </div>
            <div style={{
              fontSize: '10px', color: 'var(--on-surface-var)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              admin@hoteles-frida.mx
            </div>
          </div>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#16a34a', flexShrink: 0,
            boxShadow: '0 0 0 2px rgba(22,163,74,0.25)',
          }} />
        </div>
      </div>
    </aside>
  )
}
