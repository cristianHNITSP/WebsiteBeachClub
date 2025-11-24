// src/views/UsuariosView.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  Row,
  Col,
  Alert,
  Space,
  Input,
  Select,
  Tag,
  Typography,
  Button,
  Form,
  Modal,
  message,
  Divider,
} from "antd";
import {
  SearchOutlined,
  TeamOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { beachColors, neutrals } from "../theme/beachTheme";

import UsuariosCreatePanel from "../components/usuarios/UsuariosCreatePanel";
import UsuariosSummaryBar from "../components/usuarios/UsuariosSummaryBar";
import UsuariosFiltersBar from "../components/usuarios/UsuariosFiltersBar";
import UsuariosActiveList from "../components/usuarios/UsuariosActiveList";
import UsuariosInactiveList from "../components/usuarios/UsuariosInactiveList";
import UsuarioEditModal from "../components/usuarios/UsuarioEditModal";

const { Text } = Typography;
const { Option } = Select;

/* =========================================================
   ROLES DISPONIBLES (BACKEND: administrador | staff)
   ========================================================= */
const ROLE_LABELS = {
  administrador: "Administrador",
  staff: "Staff",
};

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

  const time = d.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isSameDay(d, now)) return `Hoy · ${time}`;
  if (isSameDay(d, yesterday)) return `Ayer · ${time}`;

  const datePart = d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${datePart} · ${time}`;
};

const mapUserFromApi = (apiUser, currentUser) => {
  const role = apiUser.role || "staff";
  return {
    id: apiUser._id,
    name: apiUser.name,
    email: apiUser.email,
    role,
    roleLabel: ROLE_LABELS[role] || role,
    isActive: apiUser.isActive,
    lastAccess: formatLastLogin(apiUser.lastLogin),
    createdAt: apiUser.createdAt,
    updatedAt: apiUser.updatedAt,
    isSelf:
      !!currentUser &&
      (currentUser.id === apiUser._id ||
        currentUser.email === apiUser.email),
    channels: [],
  };
};

/* =========================================================
   COMPONENTE PRINCIPAL
   ========================================================= */

const UsuariosView = ({ isMobile, currentUser }) => {
  // Hook de mensajes globales
  const [messageApi, contextHolder] = message.useMessage();

  const [users, setUsers] = useState([]);

  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  // Panel de creación
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creatingUser, setCreatingUser] = useState(false);
  const [lastTempPassword, setLastTempPassword] = useState(null);

  // Carga inicial / paginación
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [fadingId, setFadingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [offset, setOffset] = useState(0);
  const [limit] = useState(5); // 5 en 5
  const [hasMore, setHasMore] = useState(true);

  const [savingUser, setSavingUser] = useState(false);

  /* ========== CARGAR LISTA DESDE API (paginada) ========== */

  useEffect(() => {
    fetchUsers({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async ({ reset = false } = {}) => {
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

      const res = await axios.get("/api/users", {
        withCredentials: true,
        params: {
          offset: currentOffset,
          limit,
        },
      });

      const api = res.data;
      const apiUsers = Array.isArray(api) ? api : api.items || [];
      const mapped = apiUsers.map((u) => mapUserFromApi(u, currentUser));

      setUsers((prev) =>
        reset
          ? mapped
          : [
              ...prev,
              ...mapped.filter((nu) => !prev.some((p) => p.id === nu.id)),
            ]
      );

      const nextOffset = currentOffset + apiUsers.length;
      setOffset(nextOffset);

      if (!Array.isArray(api) && typeof api.hasMore === "boolean") {
        setHasMore(api.hasMore);
      } else {
        setHasMore(false);
      }

      if (reset) {
        messageApi.success("Usuarios cargados correctamente.");
      }
    } catch (err) {
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
  };

  /* ========== DERIVADOS ========== */

  const baseFiltered = users
    .filter(
      (u) => userRoleFilter === "all" || u.role === userRoleFilter
    )
    .filter((u) => {
      const q = userSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.roleLabel || "").toLowerCase().includes(q)
      );
    });

  const filteredActiveUsers = baseFiltered.filter((u) => u.isActive);
  const filteredInactiveUsers = baseFiltered.filter((u) => !u.isActive);

  const activos = users.filter((u) => u.isActive).length;
  const inactivos = users.filter((u) => !u.isActive).length;
  const total = users.length;
  const adminsCount = users.filter((u) => u.role === "administrador").length;
  const staffCount = users.filter((u) => u.role === "staff").length;

  const loadingActiveList = loadingUsers && users.length === 0;

  /* ========== CREAR NUEVO USUARIO (panel dinámico) ========== */

  const toggleCreatePanel = () => {
    setCreatePanelOpen((prev) => !prev);
    if (!createPanelOpen) {
      setLastTempPassword(null);
      createForm.resetFields();
      createForm.setFieldsValue({
        role: "staff",
      });
      messageApi.info(
        "Completa los datos para dar de alta a un nuevo usuario."
      );
    }
  };

  const generarPasswordSegura = () => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@$%&*?";
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
      const { name, email, role, password } = values;

      setCreatingUser(true);
      messageApi.loading({
        content: "Creando usuario...",
        key: "creatingUser",
      });

      const res = await axios.post(
        "/api/users",
        {
          name,
          email,
          role,
          password, // el backend la encripta
        },
        { withCredentials: true }
      );

      const apiUser = res.data?.user || res.data;
      const mapped = mapUserFromApi(apiUser, currentUser);

      // Añadimos el nuevo usuario a la lista
      setUsers((prev) => [mapped, ...prev]);

      // Cerramos el panel de creación y limpiamos formulario/estado
      setCreatePanelOpen(false);
      createForm.resetFields();
      setLastTempPassword(null);

      messageApi.success({
        content: "Usuario creado correctamente.",
        key: "creatingUser",
      });

      // Feedback visual con credenciales
      Modal.success({
        title: "Usuario creado correctamente",
        content: (
          <div style={{ marginTop: 8 }}>
            <p>
              Se creó el usuario <strong>{name}</strong> ({email}).
            </p>
            <p style={{ marginTop: 6 }}>
              Comparte estas credenciales iniciales con la persona:
            </p>
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
            <p
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "#6b7280",
              }}
            >
              Recomienda cambiar la contraseña en su primer inicio de sesión.
            </p>
          </div>
        ),
        okText: "Entendido",
        centered: true,
      });
    } catch (err) {
      console.error("Error al crear usuario:", err);
      messageApi.destroy("creatingUser");
      if (
        err.response?.data?.error === "EMAIL_IN_USE" &&
        err.response?.data?.message
      ) {
        messageApi.error(err.response.data.message);
      } else if (err.response?.data?.message) {
        messageApi.error(err.response.data.message);
      } else if (err.name === "Error") {
        // validación de AntD ya muestra sus mensajes
      } else {
        messageApi.error("No se pudo crear el usuario.");
      }
    } finally {
      setCreatingUser(false);
    }
  };

  /* ========== MODAL EDITAR (sin estado) ========== */

  const abrirModalEditar = (user) => {
    if (user.isSelf) {
      messageApi.info(
        "No puedes editar tu propio usuario desde este panel."
      );
      return;
    }

    setEditingUser(user);
    form.resetFields();
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      role: user.role,
    });
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  const guardarUsuario = async () => {
    if (!editingUser) return;

    const values = await form.validateFields();
    const { name, email, role } = values;

    const payload = {
      name,
      email,
      role,
    };

    setSavingUser(true);
    messageApi.loading({
      content: "Guardando cambios...",
      key: "savingUser",
    });
    try {
      const res = await axios.put(
        `/api/users/${editingUser.id}`,
        payload,
        { withCredentials: true }
      );

      const updatedApiUser = res.data?.user || res.data;
      const updated = mapUserFromApi(updatedApiUser, currentUser);

      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u))
      );

      messageApi.success({
        content: "Usuario actualizado correctamente.",
        key: "savingUser",
      });
      cerrarModal();
    } catch (err) {
      console.error("Error al actualizar usuario:", err);
      messageApi.destroy("savingUser");
      if (
        err.response?.data?.error === "EMAIL_IN_USE" &&
        err.response?.data?.message
      ) {
        messageApi.error(err.response.data.message);
      } else {
        messageApi.error(
          err.response?.data?.message || "No se pudo guardar el usuario."
        );
      }
    } finally {
      setSavingUser(false);
    }
  };

  /* ========== ACCIÓN RÁPIDA: ACTIVAR / DESACTIVAR ========== */

  const hacerToggleEstado = async (user, nextIsActive) => {
    setTogglingId(user.id);
    messageApi.loading({
      content: nextIsActive
        ? "Restaurando usuario..."
        : "Enviando usuario a la papelera...",
      key: `toggle-${user.id}`,
    });

    try {
      const res = await axios.patch(
        `/api/users/${user.id}/status`,
        { isActive: nextIsActive },
        { withCredentials: true }
      );

      const updatedApiUser = res.data?.user || res.data;
      const updated = mapUserFromApi(updatedApiUser, currentUser);

      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? updated : u))
      );

      messageApi.success({
        content: nextIsActive
          ? "Usuario activado y restaurado desde la papelera."
          : "Usuario enviado a la papelera (inactivo).",
        key: `toggle-${user.id}`,
      });
    } catch (err) {
      console.error("Error al cambiar estado de usuario:", err);
      messageApi.error(
        err.response?.data?.message ||
          "No se pudo actualizar el estado del usuario."
      );
    } finally {
      setTogglingId(null);
      setFadingId(null);
    }
  };

  const cambiarEstado = (user) => {
    if (user.isSelf) {
      messageApi.info(
        "No puedes cambiar el estado de tu propio usuario desde aquí."
      );
      return;
    }

    const nextIsActive = !user.isActive;

    if (!nextIsActive) {
      setFadingId(user.id);
      setTimeout(() => {
        hacerToggleEstado(user, nextIsActive);
      }, 220);
    } else {
      hacerToggleEstado(user, nextIsActive);
    }
  };

  /* ========== RENDER ========== */

  return (
    <>
      {contextHolder}

      <Card
        bordered={false}
        style={{
          marginTop: 4,
          borderRadius: 16,
          background: "#ffffff",
          boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
        }}
        title={
          <Space size={8} wrap>
            <TeamOutlined
              style={{ color: beachColors.teal, fontSize: 16 }}
            />
            <Text
              style={{
                fontWeight: 600,
                color: neutrals.textMain,
                fontSize: 15,
              }}
            >
              Usuarios y permisos
            </Text>
            <Tag
              color={beachColors.teal}
              style={{
                borderRadius: 999,
                fontSize: 10,
                color: "#064e3b",
              }}
            >
              {activos} activos
            </Tag>
            {inactivos > 0 && (
              <Tag
                color="#e5e7eb"
                style={{
                  borderRadius: 999,
                  fontSize: 10,
                  color: "#111827",
                }}
              >
                {inactivos} en papelera
              </Tag>
            )}
          </Space>
        }
        extra={
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
        }
      >
        {errorMsg && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message={errorMsg}
          />
        )}

        {/* Panel de creación */}
        <UsuariosCreatePanel
          createPanelOpen={createPanelOpen}
          createForm={createForm}
          creatingUser={creatingUser}
          lastTempPassword={lastTempPassword}
          generarPasswordSegura={generarPasswordSegura}
          crearUsuario={crearUsuario}
        />

        {/* Resumen superior */}
        <UsuariosSummaryBar
          total={total}
          adminsCount={adminsCount}
          staffCount={staffCount}
          isMobile={isMobile}
        />

        {/* Filtros */}
        <UsuariosFiltersBar
          isMobile={isMobile}
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          userRoleFilter={userRoleFilter}
          setUserRoleFilter={setUserRoleFilter}
        />

        <Divider style={{ margin: "8px 0 12px" }} />

        {/* LISTA: ACTIVOS */}
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

        {/* Botón “Cargar más” */}
        {hasMore && (
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <Button
              size="small"
              onClick={() => fetchUsers({ reset: false })}
              loading={loadingMore}
            >
              Cargar más usuarios
            </Button>
          </div>
        )}

        {/* PAPELERA */}
        <UsuariosInactiveList
          filteredInactiveUsers={filteredInactiveUsers}
          isMobile={isMobile}
          togglingId={togglingId}
          cambiarEstado={cambiarEstado}
        />
      </Card>

      {/* MODAL EDITAR */}
      <UsuarioEditModal
        modalVisible={modalVisible}
        guardarUsuario={guardarUsuario}
        savingUser={savingUser}
        cerrarModal={cerrarModal}
        form={form}
      />
    </>
  );
};

export default UsuariosView;
