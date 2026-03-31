import { USERS_DATA } from '../../data/admin'

const ROLES = [
  {
    key: 'Curator',
    title: 'Curator',
    desc: 'Gestiona la experiencia del huésped, coordina servicios especiales y mantiene los estándares de lujo de la propiedad.',
    icon: 'auto_awesome',
    iconBg: 'rgba(126,70,154,0.12)',
    iconColor: 'var(--secondary)',
    badgeClass: 'badge--secondary',
    permissions: ['Gestión de reservas', 'Acceso a perfiles de huéspedes', 'Configuración de servicios', 'Reportes de satisfacción'],
  },
  {
    key: 'Artisan',
    title: 'Artisan',
    desc: 'Responsable de la operación diaria de habitaciones, housekeeping y mantenimiento de los espacios de la propiedad.',
    icon: 'build',
    iconBg: 'rgba(0,59,65,0.12)',
    iconColor: 'var(--primary)',
    badgeClass: 'badge--primary',
    permissions: ['Gestión de habitaciones', 'Asignación de housekeeping', 'Reporte de mantenimiento', 'Inventario de suministros'],
  },
  {
    key: 'Steward',
    title: 'Steward',
    desc: 'Supervisa los ingresos, facturación y análisis financiero de la operación hotelera con enfoque en optimización.',
    icon: 'bar_chart',
    iconBg: 'rgba(115,92,0,0.12)',
    iconColor: 'var(--tertiary)',
    badgeClass: 'badge--tertiary',
    permissions: ['Reportes financieros', 'Gestión de tarifas', 'Análisis de ocupación', 'Exportación de datos'],
  },
]

const badgeClassMap = {
  Curator: 'badge--secondary',
  Artisan: 'badge--primary',
  Steward: 'badge--tertiary',
}

export default function UsersPage() {
  return (
    <div>
      {/* Page header */}
      <div className="admin-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className="admin-page-eyebrow">Team Management</span>
            <h1 className="admin-page-title">
              Personal &<br />
              <em>Roles de Acceso</em>
            </h1>
            <p className="admin-page-sub">
              Directorio de colaboradores y arquitectura de permisos por rol dentro
              del ecosistema operacional de Hoteles Frida.
            </p>
          </div>
          <button className="btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person_add</span>
            Invitar miembro
          </button>
        </div>
      </div>

      {/* Role archetypes grid */}
      <div className="role-grid">
        {ROLES.map((role) => (
          <div key={role.key} className="role-card">
            <div
              className="role-card__icon-wrap"
              style={{ background: role.iconBg }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '22px', color: role.iconColor }}
              >
                {role.icon}
              </span>
            </div>
            <h3 className="role-card__title">{role.title}</h3>
            <p className="role-card__desc">{role.desc}</p>
            <div>
              {role.permissions.map((perm, i) => (
                <div key={i} className="role-card__perm">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '14px', color: role.iconColor }}
                  >
                    check_circle
                  </span>
                  {perm}
                </div>
              ))}
            </div>
            <div style={{ marginTop: '24px' }}>
              <span className={`badge ${role.badgeClass}`}>
                {USERS_DATA.filter(u => u.role === role.key).length} miembro{USERS_DATA.filter(u => u.role === role.key).length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Personnel directory */}
      <div style={{ marginBottom: '64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <span className="admin-page-eyebrow" style={{ marginBottom: '4px' }}>Personnel Directory</span>
            <h2 className="admin-section-title" style={{ marginBottom: 0 }}>Directorio de Personal</h2>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-outline">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>filter_list</span>
              Filtrar por rol
            </button>
            <button className="btn-outline">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
              Exportar
            </button>
          </div>
        </div>

        <div className="user-list">
          {USERS_DATA.map((user) => (
            <div key={user.id} className="user-item">
              <div className="user-item__left">
                <div className="user-item__avatar">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div>
                  <div className="user-item__name">{user.name}</div>
                  <div className="user-item__email">{user.email}</div>
                </div>
              </div>

              <div className="user-item__right">
                <span className={`badge ${badgeClassMap[user.role] || 'badge--primary'}`}>
                  {user.role}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: '600' }}>
                    Último acceso
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--on-surface)', fontWeight: '700', marginTop: '2px' }}>
                    {user.lastActive}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-outline" style={{ height: '34px', padding: '0 14px', fontSize: '11px' }}>
                    Editar
                  </button>
                  <button
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: 'var(--radius-full)',
                      border: '1.5px solid rgba(186,26,26,0.2)',
                      background: 'transparent',
                      color: 'var(--error)',
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                    title="Eliminar usuario"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
