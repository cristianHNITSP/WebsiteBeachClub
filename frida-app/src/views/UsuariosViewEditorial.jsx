// src/views/UsuariosViewEditorial.jsx
// "Access & Identity" — Editorial redesign exacta al mockup admin_users_editorial_v2
import { useState, useEffect, useCallback, useMemo } from "react";
import { message, Form, Spin } from "antd";
import axios from "@api/axios";
import { DS, glassCard, adaptiveText } from "../components/website/glassStyles";
import UsuariosCreatePanel from "../components/usuarios/UsuariosCreatePanel";
import UsuarioEditModal from "../components/usuarios/UsuarioEditModal";

// ── Tiny inline icon ──────────────────────────────────────────
const SvgIcon = ({ d, size = 18, style = {} }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={style}>
    <path d={d} />
  </svg>
);

const ICONS = {
  crown:   "M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z",
  brush:   "M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34c-.39-.39-1.02-.39-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z",
  box:     "M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5z",
  check:   "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  add:     "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  search:  "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  more:    "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  edit:    "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  mail:    "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  cancel:  "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z",
  shield:  "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z",
};

// ── Role config adapted to our system ─────────────────────────
const ROLES_CONFIG = {
  administrador: {
    label: "Curador",
    sublabel: "Administrador",
    iconKey: "crown",
    desc: "Supervisión estratégica total. Puede redefinir recursos, gestionar todas las propiedades y supervisar a todos los perfiles de staff.",
    perks: ["Acceso administrativo global", "Acceso a estrategia financiera"],
    color: DS.primary,
    containerBg: (isDark) => isDark ? "rgba(0,59,65,0.18)" : "rgba(0,84,91,0.08)",
    labelBg: (isDark) => isDark ? "rgba(0,105,113,0.20)" : "rgba(0,59,65,0.07)",
    glowColor: "rgba(0,59,65,0.07)",
  },
  staff: {
    label: "Artesano",
    sublabel: "Staff",
    iconKey: "brush",
    desc: "Excelencia operacional. Gestiona contenido diario, interacciones con huéspedes y programación de experiencias en las propiedades.",
    perks: ["Creación y edición de contenido", "Gestión de interacciones con huéspedes"],
    color: DS.secondary,
    containerBg: (isDark) => isDark ? "rgba(126,70,154,0.18)" : "rgba(126,70,154,0.07)",
    labelBg: (isDark) => isDark ? "rgba(126,70,154,0.20)" : "rgba(126,70,154,0.07)",
    glowColor: "rgba(126,70,154,0.07)",
  },
};

// ── Helpers ────────────────────────────────────────────────────
const getInitials = (name = "") =>
  name.split(" ").map((w) => w[0] || "").join("").slice(0, 2).toUpperCase() || "??";

const formatLastLogin = (iso) => {
  if (!iso) return "Sin acceso";
  const d = new Date(iso);
  if (isNaN(d)) return "Sin acceso";
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 2)   return "Ahora mismo";
  if (diffMin < 60)  return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)    return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1)   return "Ayer";
  if (diffD < 7)     return `Hace ${diffD} días`;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
};

const isObjectId = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

// ── Avatar circle ─────────────────────────────────────────────
const Avatar = ({ name, role, size = 52, isDark }) => {
  const cfg = ROLES_CONFIG[role] || ROLES_CONFIG.staff;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color}88)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Manrope', sans-serif", fontWeight: 800,
      fontSize: size * 0.32, color: "#fff",
      letterSpacing: "0.02em",
      border: `2px solid ${cfg.color}30`,
    }}>
      {getInitials(name)}
    </div>
  );
};

// ── Role badge pill ────────────────────────────────────────────
const RoleBadge = ({ role, isDark }) => {
  const cfg = ROLES_CONFIG[role] || ROLES_CONFIG.staff;
  return (
    <span style={{
      padding: "4px 12px",
      borderRadius: 999,
      background: cfg.labelBg(isDark),
      color: cfg.color,
      fontFamily: "'Manrope', sans-serif",
      fontWeight: 800, fontSize: 9,
      letterSpacing: "0.18em", textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
};

// ── Main component ─────────────────────────────────────────────
const UsuariosViewEditorial = ({ isMobile, currentUser, isDarkMode = false }) => {
  const t = adaptiveText(isDarkMode);
  const [messageApi, contextHolder] = message.useMessage();

  // ── State ─────────────────────────────────────────────────
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [sedes, setSedes]           = useState([]);
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [createForm]                = Form.useForm();
  const [creatingUser, setCreatingUser] = useState(false);
  const [lastTempPassword, setLastTempPassword] = useState(null);

  const [editModalOpen, setEditModalOpen]     = useState(false);
  const [editingUser, setEditingUser]         = useState(null);
  const [editInitialValues, setEditInitialValues] = useState(null);
  const [editForm]                            = Form.useForm();
  const [savingUser, setSavingUser]           = useState(false);
  const [togglingId, setTogglingId]           = useState(null);

  // ── Palette ────────────────────────────────────────────────
  const bg         = isDarkMode ? "rgba(31,41,55,0.88)" : "#fff";
  const surfaceLow = isDarkMode ? "rgba(22,27,34,0.80)" : "#f7f9ff";
  const onSurface  = isDarkMode ? "#f1f5f9" : DS.onSurface;
  const muted      = isDarkMode ? "rgba(241,245,249,0.45)" : "rgba(23,28,33,0.40)";

  // ── Search debounce ────────────────────────────────────────
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(search.trim()), 360);
    return () => clearTimeout(h);
  }, [search]);

  // ── Fetch sedes ────────────────────────────────────────────
  const fetchSedes = useCallback(async () => {
    try {
      const res = await axios.get("/api/sedes", { withCredentials: true });
      const data = res.data;
      setSedes(Array.isArray(data) ? data : data?.items || []);
    } catch { setSedes([]); }
  }, []);

  useEffect(() => { fetchSedes(); }, [fetchSedes]);

  const defaultSedeId = useMemo(() => {
    const a = sedes.find((s) => s?.isActive);
    return (a?._id && String(a._id)) || (sedes[0]?._id && String(sedes[0]._id)) || null;
  }, [sedes]);

  const sedeById = useMemo(() => {
    const m = {}; sedes.forEach((s) => { if (s?._id) m[String(s._id)] = s; }); return m;
  }, [sedes]);
  const sedeByKey = useMemo(() => {
    const m = {}; sedes.forEach((s) => { if (s?.key) m[String(s.key)] = s; }); return m;
  }, [sedes]);

  const resolveSede = useCallback((raw) => {
    let sedeId = null, sedeKey = null, sedeName = null;
    if (raw && typeof raw === "object") {
      if (raw._id) sedeId = String(raw._id);
      if (raw.key) sedeKey = String(raw.key);
      if (raw.name) sedeName = String(raw.name);
    } else if (typeof raw === "string") {
      if (isObjectId(raw)) { sedeId = raw; }
      else { sedeKey = raw; const f = sedeByKey[raw]; if (f?._id) { sedeId = String(f._id); sedeName = f.name; } }
    }
    if (!sedeId && defaultSedeId) sedeId = defaultSedeId;
    const label = sedeName || (sedeId && sedeById[sedeId]?.name) || (sedeKey && sedeByKey[sedeKey]?.name) || "Sin sede";
    return { sedeId, sedeKey, sedeLabel: String(label) };
  }, [sedeById, sedeByKey, defaultSedeId]);

  const sedeOptionsForForms = useMemo(() =>
    sedes.map((s) => ({ value: String(s._id), label: s.isActive ? s.name : `${s.name} (inactiva)`, disabled: !s.isActive })),
  [sedes]);

  // ── Fetch users ────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/users", {
        params: { limit: 50, offset: 0 },
        withCredentials: true,
      });
      const data = res.data;
      const list = Array.isArray(data) ? data : data?.items || data?.data || data?.docs || [];
      setUsers(list);
    } catch (err) {
      messageApi.error(err.response?.data?.message || "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Filtered list ──────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!debouncedSearch) return users;
    const q = debouncedSearch.toLowerCase();
    return users.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [users, debouncedSearch]);

  // ── Stats for permission density bars ─────────────────────
  const adminCount = users.filter((u) => u.role === "administrador").length;
  const staffCount = users.filter((u) => u.role === "staff").length;
  const total = users.length || 1;
  const adminPct = Math.round((adminCount / total) * 100);
  const staffPct = Math.round((staffCount / total) * 100);
  const activePct = Math.round((users.filter((u) => u.isActive !== false).length / total) * 100);

  // ── Create user ────────────────────────────────────────────
  const handleCreate = async (values) => {
    setCreatingUser(true);
    try {
      const { sedeId } = resolveSede(values.sede);
      const payload = {
        name: values.name?.trim(),
        email: values.email?.trim().toLowerCase(),
        role: values.role,
        permissions: values.permissions || [],
        sede: sedeId,
        ...(values.password ? { password: values.password } : {}),
      };
      const res = await axios.post("/api/users", payload, { withCredentials: true });
      const temp = res.data?.tempPassword || res.data?.data?.tempPassword || null;
      setLastTempPassword(temp);
      messageApi.success("Usuario creado correctamente.");
      createForm.resetFields();
      setCreatePanelOpen(false);
      fetchUsers();
    } catch (err) {
      messageApi.error(err.response?.data?.message || "No se pudo crear el usuario.");
    } finally {
      setCreatingUser(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────────
  const handleToggleActive = async (user) => {
    setTogglingId(user._id);
    try {
      await axios.patch(`/api/users/${user._id}/toggle-active`, {}, { withCredentials: true });
      fetchUsers();
    } catch (err) {
      messageApi.error(err.response?.data?.message || "No se pudo cambiar el estado.");
    } finally {
      setTogglingId(null);
    }
  };

  // ── Open edit modal ────────────────────────────────────────
  const openEdit = (user) => {
    const { sedeId } = resolveSede(user.sede);
    const rawPerms = user.permissions;
    const perms = Array.isArray(rawPerms) ? rawPerms
      : typeof rawPerms === "string" ? rawPerms.split(",").map((p) => p.trim()).filter(Boolean) : [];
    const initialValues = {
      name: user.name || "",
      email: user.email || "",
      role: user.role || "staff",
      permissions: perms,
      sede: sedeId || defaultSedeId || "",
    };
    setEditingUser(user);
    setEditInitialValues(initialValues);
    editForm.setFieldsValue(initialValues);
    setEditModalOpen(true);
  };

  // ── Save edit ──────────────────────────────────────────────
  const handleSaveEdit = async (values) => {
    if (!editingUser) return;
    setSavingUser(true);
    try {
      const { sedeId } = resolveSede(values.sede);
      const payload = {
        name: values.name?.trim(),
        email: values.email?.trim().toLowerCase(),
        role: values.role,
        permissions: values.permissions || [],
        sede: sedeId,
      };
      await axios.put(`/api/users/${editingUser._id}`, payload, { withCredentials: true });
      messageApi.success("Usuario actualizado.");
      setEditModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      messageApi.error(err.response?.data?.message || "No se pudo actualizar el usuario.");
    } finally {
      setSavingUser(false);
    }
  };

  // ── Role counts for bento ──────────────────────────────────
  const roleCounts = useMemo(() => ({
    administrador: users.filter((u) => u.role === "administrador").length,
    staff: users.filter((u) => u.role === "staff").length,
  }), [users]);

  // ── Surface styles ─────────────────────────────────────────
  const cardSurface = {
    background: isDarkMode ? "rgba(31,41,55,0.72)" : "rgba(255,255,255,0.96)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: isDarkMode ? "0 20px 40px rgba(0,0,0,0.22)" : "0 20px 40px rgba(23,28,33,0.05)",
  };

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif" }}>
      {contextHolder}

      {/* ── SECTION HEADER ─────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-end", flexWrap: "wrap", gap: 16,
        marginBottom: isMobile ? 28 : 48,
      }}>
        <div>
          <p style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.2em",
            textTransform: "uppercase", color: DS.tertiary,
            margin: "0 0 8px",
          }}>
            Acceso e Identidad
          </p>
          <h2 style={{
            fontFamily: "'Noto Serif', serif",
            fontSize: isMobile ? "1.8rem" : "2.6rem",
            fontWeight: 700, color: isDarkMode ? "#f1f5f9" : DS.primary,
            margin: "0 0 12px", lineHeight: 1.1, letterSpacing: "-0.4px",
          }}>
            Gestión de <br style={{ display: isMobile ? "none" : "block" }} />
            <span style={{ color: DS.secondary }}>Personal</span>
          </h2>
          <p style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 14, color: muted,
            maxWidth: 440, margin: 0, lineHeight: 1.7,
          }}>
            Administra el acceso digital de Hoteles Frida. Define arquetipos y asigna custodios para mantener los estándares de la experiencia.
          </p>
        </div>

        <button
          onClick={() => setCreatePanelOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            height: 44, padding: "0 24px",
            borderRadius: 999, border: "none", cursor: "pointer",
            background: `linear-gradient(135deg, ${DS.primaryContainer}, ${DS.primary})`,
            color: "#fff",
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 700, fontSize: 12, letterSpacing: "0.05em",
            boxShadow: "0 8px 24px rgba(0,59,65,0.28)",
            transition: "box-shadow 0.2s, transform 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,59,65,0.38)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,59,65,0.28)"; e.currentTarget.style.transform = "none"; }}
        >
          <SvgIcon d={ICONS.add} size={16} />
          Invitar nuevo curador
        </button>
      </div>

      {/* ── ROLE ARCHETYPES BENTO ──────────────────────────── */}
      <div style={{ marginBottom: isMobile ? 32 : 64 }}>
        <div style={{
          fontSize: 9, fontWeight: 800, letterSpacing: "0.25em",
          textTransform: "uppercase", color: DS.tertiary,
          marginBottom: 20, fontFamily: "'Manrope', sans-serif",
        }}>
          Arquetipos del sistema
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
          gap: 20,
        }}>
          {Object.entries(ROLES_CONFIG).map(([roleKey, cfg]) => (
            <div
              key={roleKey}
              style={{
                position: "relative", overflow: "hidden",
                borderRadius: 16, padding: "28px 28px 24px",
                background: cfg.containerBg(isDarkMode),
                ...cardSurface,
                transition: "box-shadow 0.4s, transform 0.4s",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = isDarkMode
                  ? "0 28px 48px rgba(0,0,0,0.32)"
                  : "0 28px 48px rgba(23,28,33,0.09)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = cardSurface.boxShadow;
              }}
            >
              {/* Bg icon watermark */}
              <div style={{
                position: "absolute", right: -10, top: -10,
                opacity: 0.06, color: cfg.color,
                pointerEvents: "none",
              }}>
                <SvgIcon d={ICONS[cfg.iconKey]} size={120} />
              </div>

              <div style={{ position: "relative", zIndex: 1 }}>
                {/* Icon chip */}
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: cfg.containerBg(isDarkMode),
                  border: `1.5px solid ${cfg.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: cfg.color, marginBottom: 18,
                }}>
                  <SvgIcon d={ICONS[cfg.iconKey]} size={20} />
                </div>

                {/* Title */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                  <h3 style={{
                    fontFamily: "'Noto Serif', serif",
                    fontSize: "1.5rem", fontWeight: 700,
                    color: cfg.color, margin: 0, letterSpacing: "-0.2px",
                  }}>
                    {cfg.label}
                  </h3>
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: "0.16em",
                    textTransform: "uppercase", color: cfg.color, opacity: 0.6,
                  }}>
                    {roleCounts[roleKey] ?? 0} miembro{roleCounts[roleKey] !== 1 ? "s" : ""}
                  </span>
                </div>

                <p style={{
                  fontSize: 13, color: muted, lineHeight: 1.65, margin: "0 0 18px",
                  maxWidth: 340,
                }}>
                  {cfg.desc}
                </p>

                {/* Perks */}
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {cfg.perks.map((perk) => (
                    <li key={perk} style={{
                      display: "flex", alignItems: "center", gap: 7,
                      fontSize: 11, fontWeight: 700, color: cfg.color,
                      letterSpacing: "0.02em",
                    }}>
                      <SvgIcon d={ICONS.check} size={14} style={{ flexShrink: 0 }} />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PERSONNEL DIRECTORY ────────────────────────────── */}
      <div style={{ marginBottom: isMobile ? 32 : 64 }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 12,
          marginBottom: 24,
        }}>
          <div style={{
            fontSize: 9, fontWeight: 800, letterSpacing: "0.25em",
            textTransform: "uppercase", color: DS.tertiary,
            fontFamily: "'Manrope', sans-serif",
          }}>
            Directorio de personal
          </div>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
              color: muted, pointerEvents: "none",
            }}>
              <SvgIcon d={ICONS.search} size={15} />
            </div>
            <input
              type="text"
              placeholder="Buscar personal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                paddingLeft: 22, paddingRight: 16, paddingTop: 7, paddingBottom: 7,
                background: "transparent",
                border: "none", borderBottom: `1px solid ${isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(208,194,208,0.30)"}`,
                outline: "none",
                fontFamily: "'Manrope', sans-serif",
                fontSize: 13, color: onSurface,
                width: isMobile ? "100%" : 220,
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => { e.target.style.borderBottomColor = DS.primary; }}
              onBlur={(e) => { e.target.style.borderBottomColor = isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(208,194,208,0.30)"; }}
            />
          </div>
        </div>

        {/* User list */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <Spin size="large" />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredUsers.length === 0 && (
              <div style={{
                padding: "32px", textAlign: "center",
                borderRadius: 12, color: muted, fontSize: 13,
                background: isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(23,28,33,0.03)",
              }}>
                {debouncedSearch ? "No se encontraron resultados." : "No hay usuarios registrados."}
              </div>
            )}

            {filteredUsers.map((user) => {
              const isActive = user.isActive !== false;
              const toggling = togglingId === user._id;
              const cfg = ROLES_CONFIG[user.role] || ROLES_CONFIG.staff;

              return (
                <div
                  key={user._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                    padding: isMobile ? "14px 16px" : "16px 20px",
                    borderRadius: 14,
                    background: isDarkMode ? "rgba(31,41,55,0.55)" : "rgba(255,255,255,0.96)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    boxShadow: isDarkMode
                      ? "0 2px 12px rgba(0,0,0,0.18)"
                      : "0 2px 12px rgba(23,28,33,0.04)",
                    opacity: isActive ? 1 : 0.55,
                    transition: "background 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDarkMode ? "rgba(31,41,55,0.75)" : "rgba(240,244,250,0.98)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isDarkMode ? "rgba(31,41,55,0.55)" : "rgba(255,255,255,0.96)";
                  }}
                >
                  {/* Left: avatar + info */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 0 }}>
                    <Avatar name={user.name} role={user.role} size={48} isDark={isDarkMode} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'Noto Serif', serif",
                        fontSize: isMobile ? 15 : 17, fontWeight: 600,
                        color: isDarkMode ? "#f1f5f9" : DS.primary,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {user.name || "Sin nombre"}
                      </div>
                      <div style={{
                        fontSize: 11, color: muted, fontWeight: 500,
                        marginTop: 2, letterSpacing: "0.01em",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {user.email || "—"}
                      </div>
                    </div>
                  </div>

                  {/* Right: role badge + last active + actions */}
                  <div style={{
                    display: "flex", alignItems: "center",
                    gap: isMobile ? 12 : 24,
                    flexShrink: 0,
                  }}>
                    <RoleBadge role={user.role} isDark={isDarkMode} />

                    {!isMobile && (
                      <div style={{ width: 100, flexShrink: 0 }}>
                        <div style={{
                          fontSize: 8, fontWeight: 800, letterSpacing: "0.18em",
                          textTransform: "uppercase", color: muted, marginBottom: 3,
                        }}>
                          Último acceso
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: onSurface }}>
                          {formatLastLogin(user.lastLogin)}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => openEdit(user)}
                        title="Editar usuario"
                        style={{
                          width: 32, height: 32, borderRadius: "50%", border: "none",
                          background: "none", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: muted, transition: "color 0.2s, background 0.2s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = DS.surfaceTint; e.currentTarget.style.background = isDarkMode ? "rgba(0,105,113,0.15)" : "rgba(0,105,113,0.08)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = muted; e.currentTarget.style.background = "none"; }}
                      >
                        <SvgIcon d={ICONS.edit} size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        disabled={toggling}
                        title={isActive ? "Desactivar" : "Activar"}
                        style={{
                          width: 32, height: 32, borderRadius: "50%", border: "none",
                          background: "none", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: isActive ? muted : DS.secondary,
                          opacity: toggling ? 0.5 : 1,
                          transition: "color 0.2s, background 0.2s",
                        }}
                        onMouseEnter={(e) => { if (!toggling) { e.currentTarget.style.color = "#e63950"; e.currentTarget.style.background = "rgba(230,57,80,0.08)"; } }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = isActive ? muted : DS.secondary; e.currentTarget.style.background = "none"; }}
                      >
                        <SvgIcon d={ICONS.cancel} size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── PERMISSION ANALYTICS ───────────────────────────── */}
      {!isMobile && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginBottom: 16,
        }}>
          {/* Density bars */}
          <div style={{
            background: `linear-gradient(135deg, ${DS.primary} 0%, ${DS.primaryContainer} 100%)`,
            borderRadius: 20, padding: "40px 40px 36px",
            position: "relative", overflow: "hidden",
          }}>
            {/* Bg icon */}
            <div style={{
              position: "absolute", right: -16, bottom: -16, opacity: 0.08,
              color: "#fff", pointerEvents: "none",
            }}>
              <SvgIcon d={ICONS.shield} size={200} />
            </div>

            <h3 style={{
              fontFamily: "'Noto Serif', serif",
              fontSize: "1.6rem", fontWeight: 700,
              color: "#fff", margin: "0 0 28px",
              letterSpacing: "-0.2px", position: "relative", zIndex: 1,
            }}>
              Densidad de permisos
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "relative", zIndex: 1 }}>
              {[
                { label: "Curadores (Admin)", pct: adminPct },
                { label: "Artesanos (Staff)",  pct: staffPct },
                { label: "Usuarios activos",   pct: activePct },
              ].map(({ label, pct }) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)" }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)" }}>
                      {pct}%
                    </span>
                  </div>
                  <div style={{ height: 3, borderRadius: 999, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${pct}%`,
                      background: DS.gold,
                      borderRadius: 999,
                      transition: "width 0.8s cubic-bezier(0.2,0.9,0.2,1)",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Editorial quote card */}
          <div style={{
            borderRadius: 20, padding: "40px 40px 36px",
            background: isDarkMode ? "rgba(31,41,55,0.72)" : "rgba(247,249,255,0.96)",
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            boxShadow: isDarkMode ? "0 20px 40px rgba(0,0,0,0.22)" : "0 20px 40px rgba(23,28,33,0.05)",
            display: "flex", flexDirection: "column", justifyContent: "center",
          }}>
            <p style={{
              fontFamily: "'Noto Serif', serif",
              fontSize: "1.05rem", fontStyle: "italic",
              color: DS.secondary, lineHeight: 1.7,
              margin: "0 0 16px",
            }}>
              "La verdadera curación no se trata de quién tiene acceso, sino de cómo lo usa para preservar el alma de la experiencia."
            </p>
            <p style={{ fontSize: 11, fontWeight: 700, color: muted, margin: 0, letterSpacing: "0.04em" }}>
              — Manifiesto de administración, v2.4
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
              {[DS.primary, DS.secondary, DS.gold].map((c) => (
                <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ─────────────────────────────────────────── */}
      <UsuariosCreatePanel
        open={createPanelOpen}
        onClose={() => setCreatePanelOpen(false)}
        form={createForm}
        onFinish={handleCreate}
        loading={creatingUser}
        sedeOptions={sedeOptionsForForms}
        lastTempPassword={lastTempPassword}
        onClearTempPassword={() => setLastTempPassword(null)}
        isDarkMode={isDarkMode}
        isMobile={isMobile}
      />

      <UsuarioEditModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditingUser(null); }}
        form={editForm}
        onFinish={handleSaveEdit}
        loading={savingUser}
        initialValues={editInitialValues}
        sedeOptions={sedeOptionsForForms}
        isDarkMode={isDarkMode}
        isMobile={isMobile}
      />
    </div>
  );
};

export default UsuariosViewEditorial;
