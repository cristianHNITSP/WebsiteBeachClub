import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "@api/axios";
import {
  Card,
  Alert,
  Space,
  Tag,
  Typography,
  Button,
  Form,
  Modal,
  message,
  Divider,
  Spin,
} from "antd";
import { TeamOutlined, PlusOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { beachColors, neutrals } from "../theme/beachTheme";

import UsuariosCreatePanel from "../components/usuarios/UsuariosCreatePanel";
import UsuariosSummaryBar from "../components/usuarios/UsuariosSummaryBar";
import UsuariosFiltersBar from "../components/usuarios/UsuariosFiltersBar";
import UsuariosActiveList from "../components/usuarios/UsuariosActiveList";
import UsuariosInactiveList from "../components/usuarios/UsuariosInactiveList";
import UsuarioEditModal from "../components/usuarios/UsuarioEditModal";
import SedesManagerPanel from "../components/usuarios/SedesManagerPanel";

const { Text } = Typography;

const ROLE_LABELS = {
  administrador: "Administrador",
  staff: "Staff",
};

const EMAIL_DOMAIN = "beachclub.com";

const isObjectId = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

/* =========================================================
   HELPERS
   ========================================================= */

const formatLastLogin = (iso) => {
  if (!iso) return "Sin acceso registrado";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Sin acceso registrado";

  const now = new Date();
  const isSameDay = (a, b) => a.toDateString() === b.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  if (isSameDay(d, now)) return `Hoy · ${time}`;
  if (isSameDay(d, yesterday)) return `Ayer · ${time}`;

  const datePart = d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${datePart} · ${time}`;
};

/* =========================================================
   COMPONENTE PRINCIPAL
   ========================================================= */

const UsuariosView = ({ isMobile, currentUser }) => {
  const [messageApi, contextHolder] = message.useMessage();

  const [users, setUsers] = useState([]);

  // SEDES (catálogo)
  const [sedes, setSedes] = useState([]);
  const [sedesLoading, setSedesLoading] = useState(false);
  const [sedesPanelOpen, setSedesPanelOpen] = useState(false);

  // filtros
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userSedeFilter, setUserSedeFilter] = useState("all"); // _id
  const [userSearch, setUserSearch] = useState("");

  // Edit modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editInitialValues, setEditInitialValues] = useState(null);
  const [form] = Form.useForm();

  // Create panel
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creatingUser, setCreatingUser] = useState(false);
  const [lastTempPassword, setLastTempPassword] = useState(null);

  // Load/pagination
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [fadingId, setFadingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [offset, setOffset] = useState(0);
  const [limit] = useState(5);
  const [hasMore, setHasMore] = useState(true);

  const [savingUser, setSavingUser] = useState(false);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(userSearch.trim()), 400);
    return () => clearTimeout(handler);
  }, [userSearch]);

  // Request optimization
  const abortRef = useRef(null);
  const reqSeqRef = useRef(0);
  const skipFirstFiltersEffectRef = useRef(true);
  const lastResetKeyRef = useRef("");

  /* =========================================================
     SEDES: cargar catálogo del backend
     GET /api/sedes
     ========================================================= */
  const fetchSedes = useCallback(async () => {
    try {
      setSedesLoading(true);
      const res = await axios.get("/api/sedes", { withCredentials: true });
      const data = res.data;
      const items = Array.isArray(data) ? data : data?.items || [];
      setSedes(items);
    } catch (err) {
      console.error("Error al obtener sedes:", err);
      messageApi.error(
        err.response?.data?.message || "No se pudieron cargar las sedes. Revisa /api/sedes."
      );
      setSedes([]);
    } finally {
      setSedesLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    fetchSedes();
  }, [fetchSedes]);

  const sedeById = useMemo(() => {
    const m = {};
    for (const s of sedes) if (s?._id) m[String(s._id)] = s;
    return m;
  }, [sedes]);

  const sedeByKey = useMemo(() => {
    const m = {};
    for (const s of sedes) if (s?.key) m[String(s.key)] = s;
    return m;
  }, [sedes]);

  const defaultSedeId = useMemo(() => {
    const firstActive = sedes.find((s) => s?.isActive);
    return (
      (firstActive?._id && String(firstActive._id)) ||
      (sedes[0]?._id && String(sedes[0]._id)) ||
      null
    );
  }, [sedes]);

  const sedeOptionsForForms = useMemo(() => {
    return sedes.map((s) => ({
      value: String(s._id),
      label: s.isActive ? s.name : `${s.name} (inactiva)`,
      disabled: !s.isActive,
    }));
  }, [sedes]);

  const sedeOptionsForFilter = useMemo(() => {
    return sedes.map((s) => ({
      value: String(s._id),
      label: s.name,
      disabled: false,
    }));
  }, [sedes]);

  const resolveSede = useCallback(
    (raw) => {
      // raw puede ser:
      // - ObjectId string "65f..."
      // - populated object { _id, key, name }
      // - legacy key string "casa-frida"
      let sedeId = null;
      let sedeKey = null;
      let sedeName = null;

      if (raw && typeof raw === "object") {
        if (raw._id) sedeId = String(raw._id);
        if (raw.key) sedeKey = String(raw.key);
        if (raw.name) sedeName = String(raw.name);
      } else if (typeof raw === "string") {
        if (isObjectId(raw)) {
          sedeId = raw;
        } else {
          sedeKey = raw;
          const found = sedeByKey[raw];
          if (found?._id) {
            sedeId = String(found._id);
            sedeName = found.name;
          }
        }
      }

      if (!sedeId && defaultSedeId) sedeId = defaultSedeId;

      const label =
        sedeName ||
        (sedeId && sedeById[sedeId]?.name) ||
        (sedeKey && sedeByKey[sedeKey]?.name) ||
        "Sin sede";

      return { sedeId, sedeKey, sedeLabel: String(label) };
    },
    [defaultSedeId, sedeById, sedeByKey]
  );

  /* =========================================================
     mapUserFromApi (safe con populated)
     ========================================================= */
  const mapUserFromApi = useCallback(
    (apiUser) => {
      const role = apiUser.role || "staff";
      const sedeResolved = resolveSede(apiUser.sede);

      return {
        id: String(apiUser._id),
        name: apiUser.name,
        email: apiUser.email,
        role,
        roleLabel: ROLE_LABELS[role] || role,
        isActive: !!apiUser.isActive,
        lastAccess: formatLastLogin(apiUser.lastLogin),
        createdAt: apiUser.createdAt,
        updatedAt: apiUser.updatedAt,
        isSelf:
          !!currentUser &&
          (String(currentUser.id) === String(apiUser._id) || currentUser.email === apiUser.email),

        // ✅ usamos sedeId (alineado a backend)
        sedeId: sedeResolved.sedeId,
        sedeKey: sedeResolved.sedeKey,
        sedeLabel: sedeResolved.sedeLabel,
      };
    },
    [currentUser, resolveSede]
  );

  // si cambian sedes (CRUD), refresca labels
  useEffect(() => {
    setUsers((prev) =>
      prev.map((u) => {
        const { sedeLabel } = resolveSede(u.sedeId || u.sedeKey);
        return { ...u, sedeLabel };
      })
    );
  }, [resolveSede]);

  /* =========================================================
     FETCH USERS
     ========================================================= */
  const fetchUsers = useCallback(
    async ({ reset = false } = {}) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const mySeq = ++reqSeqRef.current;

      if (reset) {
        setLoadingUsers(true);
        setOffset(0);
        setHasMore(true);
        setUsers([]);
      } else {
        if (!hasMore) {
          messageApi.info("Ya no hay más usuarios para cargar.");
          return;
        }
        setLoadingMore(true);
      }

      setErrorMsg("");

      try {
        const currentOffset = reset ? 0 : offset;

        const params = {
          offset: currentOffset,
          limit,
        };

        if (userRoleFilter !== "all") params.role = userRoleFilter;

        // ✅ filtro sedeId (backend)
        if (userSedeFilter !== "all") params.sedeId = userSedeFilter;

        if (debouncedSearch) params.q = debouncedSearch;

        const res = await axios.get("/api/users", {
          withCredentials: true,
          params,
          signal: controller.signal,
        });

        if (mySeq !== reqSeqRef.current) return;

        const api = res.data;
        const apiUsers = Array.isArray(api) ? api : api.items || [];

        const mapped = apiUsers.map((u) => mapUserFromApi(u));

        setUsers((prev) =>
          reset
            ? mapped
            : [...prev, ...mapped.filter((nu) => !prev.some((p) => p.id === nu.id))]
        );

        const nextOffset = currentOffset + apiUsers.length;
        setOffset(nextOffset);

        if (!Array.isArray(api) && typeof api.hasMore === "boolean") {
          setHasMore(api.hasMore);
        } else {
          setHasMore(false);
        }

        if (reset) {
          const resetKey = `${userRoleFilter}::${userSedeFilter}::${debouncedSearch}`;
          if (lastResetKeyRef.current !== resetKey) {
            lastResetKeyRef.current = resetKey;
            messageApi.success("Usuarios cargados correctamente.");
          }
        }
      } catch (err) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;

        console.error("Error al obtener usuarios:", err);
        const msg =
          err.response?.data?.message ||
          "No se pudieron cargar los usuarios. Inténtalo de nuevo más tarde.";
        setErrorMsg(msg);
        messageApi.error(msg);
      } finally {
        setLoadingUsers(false);
        setLoadingMore(false);
      }
    },
    [
      hasMore,
      offset,
      limit,
      userRoleFilter,
      userSedeFilter,
      debouncedSearch,
      mapUserFromApi,
      messageApi,
    ]
  );

  useEffect(() => {
    fetchUsers({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (skipFirstFiltersEffectRef.current) {
      skipFirstFiltersEffectRef.current = false;
      return;
    }
    fetchUsers({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRoleFilter, userSedeFilter, debouncedSearch]);

  /* ========== DERIVADOS ========== */
  const filteredActiveUsers = users.filter((u) => u.isActive);
  const filteredInactiveUsers = users.filter((u) => !u.isActive);

  const activos = filteredActiveUsers.length;
  const inactivos = filteredInactiveUsers.length;
  const total = users.length;
  const adminsCount = users.filter((u) => u.role === "administrador").length;
  const staffCount = users.filter((u) => u.role === "staff").length;

  const loadingActiveList = loadingUsers && users.length === 0;

  /* ========== CREATE USER ========== */
  const toggleCreatePanel = () => {
    setCreatePanelOpen((prev) => !prev);

    if (!createPanelOpen) {
      setLastTempPassword(null);
      createForm.resetFields();
      createForm.setFieldsValue({
        role: "staff",
        sedeId: defaultSedeId || undefined, // ✅ sedeId
      });
      messageApi.info("Completa los datos para dar de alta a un nuevo usuario.");
    }
  };

  const generarPasswordSegura = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@$%&*?";
    let pwd = "";
    for (let i = 0; i < 12; i += 1) {
      const idx = Math.floor(Math.random() * chars.length);
      pwd += chars.charAt(idx);
    }
    createForm.setFieldsValue({ password: pwd });
    setLastTempPassword(pwd);
    messageApi.success("Contraseña segura generada.");
  };

  const crearUsuario = async () => {
    try {
      const values = await createForm.validateFields();
      const { name, emailUser, role, password, sedeId } = values;

      const username = String(emailUser || "")
        .toLowerCase()
        .trim()
        .replace(`@${EMAIL_DOMAIN}`, "")
        .split("@")[0];

      if (!username) {
        messageApi.error("Ingresa el usuario del correo corporativo.");
        return;
      }

      const email = `${username}@${EMAIL_DOMAIN}`;

      setCreatingUser(true);
      messageApi.loading({ content: "Creando usuario...", key: "creatingUser" });

      // ✅ backend espera sedeId
      const res = await axios.post(
        "/api/users",
        { name, email, role, password, sedeId },
        { withCredentials: true }
      );

      const apiUser = res.data?.user || res.data;
      const mapped = mapUserFromApi(apiUser);

      setUsers((prev) => [mapped, ...prev]);

      setCreatePanelOpen(false);
      createForm.resetFields();
      setLastTempPassword(null);

      messageApi.success({ content: "Usuario creado correctamente.", key: "creatingUser" });

      Modal.success({
        title: "Usuario creado correctamente",
        centered: true,
        okText: "Entendido",
        content: (
          <div style={{ marginTop: 8 }}>
            <p>
              Se creó el usuario <strong>{name}</strong> ({email}).
            </p>
            <p style={{ marginTop: 6 }}>Comparte estas credenciales iniciales con la persona:</p>
            <div
              style={{
                marginTop: 6,
                padding: "6px 8px",
                borderRadius: 8,
                background: "#111827",
                color: "#f9fafb",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                fontSize: 12,
                wordBreak: "break-all",
              }}
            >
              <div>
                <strong>Correo:&nbsp;</strong>
                {email}
              </div>
              <div>
                <strong>Contraseña:&nbsp;</strong>
                {password}
              </div>
            </div>
            <p style={{ marginTop: 8, fontSize: 11, color: "#6b7280" }}>
              Recomienda cambiar la contraseña en su primer inicio de sesión.
            </p>
          </div>
        ),
      });
    } catch (err) {
      console.error("Error al crear usuario:", err);
      messageApi.destroy("creatingUser");
      if (err?.response?.data?.error === "EMAIL_IN_USE" && err?.response?.data?.message) {
        messageApi.error(err.response.data.message);
      } else if (err?.response?.data?.message) {
        messageApi.error(err.response.data.message);
      } else {
        messageApi.error("No se pudo crear el usuario.");
      }
    } finally {
      setCreatingUser(false);
    }
  };

  /* ========== EDIT MODAL ========== */
  const abrirModalEditar = (user) => {
    if (!user || !user.id) return;

    if (user.isSelf) {
      messageApi.info("No puedes editar tu propio usuario desde este panel.");
      return;
    }

    setEditingUser(user);

    const [userPart] = String(user.email || "").split("@");

    const initial = {
      name: user.name || "",
      emailUser: userPart || "",
      role: user.role || "staff",
      sedeId: user.sedeId || defaultSedeId || undefined, // ✅ sedeId
    };

    setEditInitialValues(initial);
    form.resetFields();
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setEditingUser(null);
    setEditInitialValues(null);
    form.resetFields();
  };

  const guardarUsuario = async () => {
    if (!editingUser) return;

    const values = await form.validateFields();
    const { name, emailUser, role, sedeId } = values;

    const username = String(emailUser || "")
      .toLowerCase()
      .trim()
      .replace(`@${EMAIL_DOMAIN}`, "")
      .split("@")[0];

    if (!username) {
      messageApi.error("Ingresa el usuario del correo corporativo.");
      return;
    }

    const email = `${username}@${EMAIL_DOMAIN}`;

    // ✅ backend espera sedeId
    const payload = { name, email, role, sedeId };

    setSavingUser(true);
    messageApi.loading({ content: "Guardando cambios...", key: "savingUser" });

    try {
      const res = await axios.put(`/api/users/${editingUser.id}`, payload, {
        withCredentials: true,
      });

      const updatedApiUser = res.data?.user || res.data;
      const updated = mapUserFromApi(updatedApiUser);

      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

      messageApi.success({ content: "Usuario actualizado correctamente.", key: "savingUser" });
      cerrarModal();
    } catch (err) {
      console.error("Error al actualizar usuario:", err);
      messageApi.destroy("savingUser");
      if (err.response?.data?.error === "EMAIL_IN_USE" && err.response?.data?.message) {
        messageApi.error(err.response.data.message);
      } else {
        messageApi.error(err.response?.data?.message || "No se pudo guardar el usuario.");
      }
    } finally {
      setSavingUser(false);
    }
  };

  /* ========== TOGGLE ACTIVE ========== */
  const hacerToggleEstado = async (user, nextIsActive) => {
    setTogglingId(user.id);
    messageApi.loading({
      content: nextIsActive ? "Restaurando usuario..." : "Enviando usuario a la papelera...",
      key: `toggle-${user.id}`,
    });

    try {
      const res = await axios.patch(
        `/api/users/${user.id}/status`,
        { isActive: nextIsActive },
        { withCredentials: true }
      );

      const updatedApiUser = res.data?.user || res.data;
      const updated = mapUserFromApi(updatedApiUser);

      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

      messageApi.success({
        content: nextIsActive
          ? "Usuario activado y restaurado desde la papelera."
          : "Usuario enviado a la papelera (inactivo).",
        key: `toggle-${user.id}`,
      });
    } catch (err) {
      console.error("Error al cambiar estado de usuario:", err);
      messageApi.error(err.response?.data?.message || "No se pudo actualizar el estado del usuario.");
    } finally {
      setTogglingId(null);
      setFadingId(null);
    }
  };

  const cambiarEstado = (user) => {
    if (user.isSelf) {
      messageApi.info("No puedes cambiar el estado de tu propio usuario desde aquí.");
      return;
    }

    const nextIsActive = !user.isActive;

    if (!nextIsActive) {
      setFadingId(user.id);
      setTimeout(() => hacerToggleEstado(user, nextIsActive), 220);
    } else {
      hacerToggleEstado(user, nextIsActive);
    }
  };

  /* ========== RENDER ========== */
  return (
    <>
      {contextHolder}

      <Card
        variant="borderless"
        style={{
          marginTop: 4,
          borderRadius: 16,
          background: "#ffffff",
          boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
        }}
        title={
          <Space size={8} wrap>
            <TeamOutlined style={{ color: beachColors.teal, fontSize: 16 }} />
            <Text style={{ fontWeight: 600, color: neutrals.textMain, fontSize: 15 }}>
              Usuarios y permisos
            </Text>

            <Tag
              color={beachColors.teal}
              style={{ borderRadius: 999, fontSize: 10, color: "#064e3b" }}
            >
              {activos} activos
            </Tag>

            {inactivos > 0 && (
              <Tag
                color="#e5e7eb"
                style={{ borderRadius: 999, fontSize: 10, color: "#111827" }}
              >
                {inactivos} en papelera
              </Tag>
            )}

            <Tag
              color="#eef2ff"
              style={{ borderRadius: 999, fontSize: 10, color: "#4338ca" }}
            >
              {sedesLoading ? "Sedes..." : `${sedes.length} sedes`}
            </Tag>
          </Space>
        }
        extra={
          <Space size={8} wrap>
            <Button
              size="small"
              onClick={() => {
                setSedesPanelOpen((v) => !v);
                fetchSedes();
              }}
              icon={<EnvironmentOutlined />}
              style={{
                borderRadius: 999,
                paddingInline: 12,
                fontSize: 11,
                background: "#ffffff",
                borderColor: "#c7d2fe",
                color: "#4338ca",
              }}
            >
              {sedesPanelOpen ? "Cerrar sedes" : "Sedes"}
            </Button>

            <Button
              type={createPanelOpen ? "default" : "primary"}
              size="small"
              icon={<PlusOutlined />}
              onClick={toggleCreatePanel}
              style={{
                borderRadius: 999,
                paddingInline: 14,
                fontSize: 11,
                background: createPanelOpen ? "#ffffff" : beachColors.teal,
                borderColor: beachColors.teal,
                color: createPanelOpen ? beachColors.teal : "#ffffff",
              }}
            >
              {createPanelOpen ? "Cerrar alta rápida" : "Nuevo usuario"}
            </Button>
          </Space>
        }
      >
        {errorMsg && (
          <Alert type="error" showIcon style={{ marginBottom: 12 }} message={errorMsg} />
        )}

        {loadingUsers && users.length === 0 && (
          <div style={{ width: "100%", display: "flex", gap: 8, justifyContent: "center" }}>
            <Spin size="small" />
            <Text style={{ fontSize: 12, color: neutrals.textMuted }}>Cargando usuarios...</Text>
          </div>
        )}

        <UsuariosCreatePanel
          createPanelOpen={createPanelOpen}
          createForm={createForm}
          creatingUser={creatingUser}
          lastTempPassword={lastTempPassword}
          generarPasswordSegura={generarPasswordSegura}
          crearUsuario={crearUsuario}
          sedeOptions={sedeOptionsForForms}
          sedesLoading={sedesLoading}
        />

        <SedesManagerPanel
          open={sedesPanelOpen}
          sedes={sedes}
          loading={sedesLoading}
          reload={fetchSedes}
          onSedesChanged={() => fetchSedes()}
        />

        <UsuariosSummaryBar total={total} adminsCount={adminsCount} staffCount={staffCount} isMobile={isMobile} />

        <UsuariosFiltersBar
          isMobile={isMobile}
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          userRoleFilter={userRoleFilter}
          setUserRoleFilter={setUserRoleFilter}
          userSedeFilter={userSedeFilter}
          setUserSedeFilter={setUserSedeFilter}
          sedeOptions={sedeOptionsForFilter}
          sedesLoading={sedesLoading}
        />

        <Divider style={{ margin: "8px 0 12px" }} />

        <Text
          style={{
            fontSize: 11,
            color: neutrals.textMuted,
            display: "block",
            marginBottom: 6,
          }}
        >
          Usuarios activos (pueden iniciar sesión en el panel).
        </Text>

        <UsuariosActiveList
          filteredActiveUsers={filteredActiveUsers}
          loading={loadingActiveList}
          isMobile={isMobile}
          fadingId={fadingId}
          togglingId={togglingId}
          abrirModalEditar={abrirModalEditar}
          cambiarEstado={cambiarEstado}
        />

        {hasMore && (
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <Button size="small" onClick={() => fetchUsers({ reset: false })} loading={loadingMore}>
              Cargar más usuarios
            </Button>
          </div>
        )}

        <UsuariosInactiveList
          filteredInactiveUsers={filteredInactiveUsers}
          isMobile={isMobile}
          togglingId={togglingId}
          cambiarEstado={cambiarEstado}
        />
      </Card>

      <UsuarioEditModal
        modalVisible={modalVisible}
        guardarUsuario={guardarUsuario}
        savingUser={savingUser}
        cerrarModal={cerrarModal}
        form={form}
        initialValues={editInitialValues}
        editingUserId={editingUser?.id || null}
        sedeOptions={sedeOptionsForForms}
        sedesLoading={sedesLoading}
      />
    </>
  );
};

export default UsuariosView;
