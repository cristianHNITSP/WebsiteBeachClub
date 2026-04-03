import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { USERS_DATA } from '../../data/admin'
import SectionPanel from '../components/SectionPanel'
import DataTable from '../../components/frida/DataTable'
import ConfirmButton from '../../components/frida/ConfirmButton'
import Skeleton from '../../components/frida/Skeleton'
import { Field, Input, Select } from '../../components/frida/Field'

/* ── Role definitions ── */
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
    iconColor: 'var(--gold)',
    badgeClass: 'badge--tertiary',
    permissions: ['Reportes financieros', 'Gestión de tarifas', 'Análisis de ocupación', 'Exportación de datos'],
  },
]

const badgeClassMap = {
  Curator: 'badge--secondary',
  Artisan: 'badge--primary',
  Steward: 'badge--tertiary',
}

const EMPTY_FORM = { name: '', email: '', role: 'Curator' }

/* ── User form (inside SectionPanel) ── */
function UserForm({ initial = EMPTY_FORM, onSave, onBack }) {
  const [form, setForm] = useState(initial)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const dirty =
    form.name !== initial.name ||
    form.email !== initial.email ||
    form.role !== initial.role

  const isNew = !initial.id
  const valid = form.name.trim() && form.email.trim()

  return (
    <SectionPanel
      eyebrow="Gestión de Usuarios"
      title={isNew ? <>Nuevo <em>Miembro</em></> : <>Editar <em>Usuario</em></>}
      subtitle={isNew
        ? 'Completa la información para agregar un nuevo miembro al equipo.'
        : `Editando el perfil de ${initial.name}.`}
      onBack={onBack}
      dirty={dirty}
      actions={
        <button
          className="btn-primary"
          onClick={() => onSave(form)}
          disabled={!valid}
          style={{ opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>save</span>
          {isNew ? 'Crear miembro' : 'Guardar cambios'}
        </button>
      }
    >
      <div className="user-form-grid">
        <Field label="Nombre completo">
          <Input
            placeholder="Ej. Valeria Montoya"
            value={form.name}
            onChange={set('name')}
          />
        </Field>

        <Field label="Correo electrónico">
          <Input
            type="email"
            placeholder="Ej. valeria@hotelesfrida.mx"
            value={form.email}
            onChange={set('email')}
          />
        </Field>

        <Field label="Rol de acceso">
          <Select value={form.role} onChange={set('role')}>
            {ROLES.map(r => (
              <option key={r.key} value={r.key}>{r.title}</option>
            ))}
          </Select>
        </Field>
      </div>

      {/* Role description hint */}
      <div className="user-form-role-hint">
        {ROLES.filter(r => r.key === form.role).map(r => (
          <div key={r.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: r.iconBg, display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: r.iconColor }}>
                {r.icon}
              </span>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '4px' }}>
                {r.title}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--on-surface-var)', lineHeight: 1.55 }}>
                {r.desc}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                {r.permissions.map((p, i) => (
                  <span key={i} style={{
                    fontSize: '11px', fontWeight: 700, padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--surface-container)',
                    color: 'var(--on-surface-var)',
                    fontFamily: 'var(--font-body)',
                  }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionPanel>
  )
}

/* ── Main page ── */
export default function UsersPage() {
  const PAGE_SIZE = 5

  const [users, setUsers] = useState(USERS_DATA)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')  // 'list' | 'new' | 'edit'
  const [editTarget, setEditTarget] = useState(null)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = back

  /* Roles section collapsed state — persisted */
  const [rolesCollapsed, setRolesCollapsed] = useState(() => {
    return localStorage.getItem('frida-roles-collapsed') === 'true'
  })

  const toggleRoles = () => {
    const next = !rolesCollapsed
    setRolesCollapsed(next)
    localStorage.setItem('frida-roles-collapsed', String(next))
  }

  /* Simulate loading */
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1800)
    return () => clearTimeout(t)
  }, [])

  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pagedUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const changeFilter = (r) => { setRoleFilter(r); setPage(1) }
  const changeSearch = (v) => { setSearch(v);     setPage(1) }

  const goTo = (nextView, target = null) => {
    setDirection(nextView === 'list' ? -1 : 1)
    setEditTarget(target)
    setView(nextView)
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [view])

  const handleSave = (form) => {
    if (editTarget) {
      setUsers(prev => prev.map(u => u.id === editTarget.id ? { ...u, ...form } : u))
    } else {
      const initials = form.name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase()
      const newUser = {
        id: Date.now(),
        ...form,
        lastActive: 'Ahora mismo',
        avatar: `https://placehold.co/56x56/006971/ffffff?text=${initials}`,
      }
      setUsers(prev => [...prev, newUser])
    }
    goTo('list')
  }

  const handleRemove = (id) => {
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  /* ── Table columns ── */
  const columns = [
    {
      key: 'user',
      label: 'Usuario',
      skeleton: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Skeleton variant="circle" width="36px" height="36px" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Skeleton variant="text" width="130px" height="13px" />
            <Skeleton variant="text" width="90px" height="10px" />
          </div>
        </div>
      ),
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="user-item__avatar">
            <img src={row.avatar} alt={row.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div className="dt-user-name">{row.name}</div>
            <div className="dt-user-email">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Rol',
      width: '120px',
      skeleton: () => <Skeleton variant="text" width="72px" height="22px" style={{ borderRadius: 'var(--radius-full)' }} />,
      render: (row) => (
        <span className={`badge ${badgeClassMap[row.role] ?? 'badge--primary'}`}>
          {row.role}
        </span>
      ),
    },
    {
      key: 'lastActive',
      label: 'Último acceso',
      width: '160px',
      skeleton: () => <Skeleton variant="text" width="90px" height="13px" />,
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--on-surface-var)', fontWeight: 500 }}>
          {row.lastActive}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '110px',
      align: 'right',
      skeleton: () => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Skeleton variant="text" width="56px" height="30px" style={{ borderRadius: 'var(--radius-full)' }} />
          <Skeleton variant="circle" width="34px" height="34px" />
        </div>
      ),
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            className="btn-outline"
            style={{ height: '32px', padding: '0 14px', fontSize: '11px' }}
            onClick={() => goTo('edit', row)}
          >
            Editar
          </button>
          <ConfirmButton
            onConfirm={() => handleRemove(row.id)}
            label="¿Eliminar este usuario?"
            confirmLabel="Eliminar"
            cancelLabel="Cancelar"
            align="right"
            title="Eliminar usuario"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>delete</span>
          </ConfirmButton>
        </div>
      ),
    },
  ]

  // custom(dir): dir=1 → forward (panel slides in from right)
  //              dir=-1 → back   (list slides in from top, panel exits right)
  const panelVariants = {
    initial: (dir) => ({ opacity: 0, x: dir * 44 }),
    animate: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
    exit:    (dir) => ({ opacity: 0, x: dir * -30, transition: { duration: 0.18, ease: 'easeIn' } }),
  }

  // List always enters top→down, exits upward
  const listVariants = {
    initial: { opacity: 0, y: -18 },
    animate: { opacity: 1, y: 0,  transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
    exit:    { opacity: 0, y: -10, transition: { duration: 0.16, ease: 'easeIn' } },
  }

  return (
    <AnimatePresence mode="wait" custom={direction}>
      {/* ── Panel views ── */}
      {view === 'new' && (
        <motion.div key="new" custom={direction} variants={panelVariants} initial="initial" animate="animate" exit="exit">
          <UserForm
            initial={EMPTY_FORM}
            onSave={handleSave}
            onBack={() => goTo('list')}
          />
        </motion.div>
      )}

      {view === 'edit' && editTarget && (
        <motion.div key="edit" custom={direction} variants={panelVariants} initial="initial" animate="animate" exit="exit">
          <UserForm
            initial={editTarget}
            onSave={handleSave}
            onBack={() => goTo('list')}
          />
        </motion.div>
      )}

      {/* ── List view ── */}
      {view === 'list' && (
      <motion.div key="list" variants={listVariants} initial="initial" animate="animate" exit="exit">
    <div>
      {/* Page header */}
      <div className="admin-page-header">
        <div>
          <span className="admin-page-eyebrow">Gestión de personal</span>
          <h1 className="admin-page-title">
            Usuarios &<br />
            <em>Roles de Acceso</em>
          </h1>
        </div>
      </div>

      {/* Search + filters */}
      <div className="users-toolbar">
        <div className="users-search">
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--outline)', flexShrink: 0 }}>search</span>
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={e => changeSearch(e.target.value)}
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              fontFamily: 'var(--font-body)', fontSize: '13px',
              color: 'var(--on-surface)', width: '100%',
            }}
          />
        </div>
        <div className="users-filters">
          {['all', 'Curator', 'Artisan', 'Steward'].map(r => (
            <button
              key={r}
              onClick={() => changeFilter(r)}
              className={`users-filter-chip${roleFilter === r ? ' users-filter-chip--active' : ''}`}
            >
              {r === 'all' ? 'Todos' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Collapsible roles section */}
      <div className="collapsible-section" style={{ marginBottom: '40px' }}>
        <button className="collapsible-toggle" onClick={toggleRoles}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
              manage_accounts
            </span>
            <div>
              <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1rem', color: 'var(--on-surface)' }}>
                Roles de Acceso
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--on-surface-var)', fontWeight: 500 }}>
                {ROLES.map(r => `${USERS_DATA.filter(u => u.role === r.key).length} ${r.key}`).join(' · ')}
              </div>
            </div>
          </div>
          <motion.span
            className="material-symbols-outlined"
            animate={{ rotate: rolesCollapsed ? 0 : 180 }}
            transition={{ duration: 0.22 }}
            style={{ fontSize: '20px', color: 'var(--outline)', display: 'block' }}
          >
            expand_more
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {!rolesCollapsed && (
            <motion.div
              key="roles-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div className="role-grid" style={{ marginTop: '16px', marginBottom: 0 }}>
                {ROLES.map((role) => {
                  const count = users.filter(u => u.role === role.key).length
                  return (
                    <div key={role.key} className="role-card">
                      <div className="role-card__icon-wrap" style={{ background: role.iconBg }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '22px', color: role.iconColor }}>
                          {role.icon}
                        </span>
                      </div>
                      <h3 className="role-card__title">{role.title}</h3>
                      <p className="role-card__desc">{role.desc}</p>
                      <div>
                        {role.permissions.map((perm, i) => (
                          <div key={i} className="role-card__perm">
                            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: role.iconColor }}>
                              check_circle
                            </span>
                            {perm}
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: '24px' }}>
                        <span className={`badge ${role.badgeClass}`}>
                          {count} miembro{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Directory section */}
      <div style={{ marginBottom: '64px' }}>
        <div className="users-dir-header">
          <div>
            <span className="admin-page-eyebrow" style={{ marginBottom: '4px' }}>Directorio</span>
            <h2 className="admin-section-title" style={{ marginBottom: 0 }}>Equipo de Trabajo</h2>
          </div>
          <button className="btn-primary" onClick={() => goTo('new')}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>person_add</span>
            Nuevo miembro
          </button>
        </div>

        <DataTable
          columns={columns}
          data={pagedUsers}
          loading={loading}
          fixedRows={PAGE_SIZE}
          emptyMessage="No se encontraron usuarios con ese criterio."
          style={{ marginTop: '20px' }}
        />

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="users-pagination">
            <span className="users-pagination__info">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredUsers.length)} de {filteredUsers.length}
            </span>
            <div className="users-pagination__controls">
              <button
                className="users-pagination__btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                aria-label="Página anterior"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`users-pagination__btn${n === safePage ? ' users-pagination__btn--active' : ''}`}
                >
                  {n}
                </button>
              ))}

              <button
                className="users-pagination__btn"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                aria-label="Página siguiente"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
      </motion.div>
      )}
    </AnimatePresence>
  )
}
