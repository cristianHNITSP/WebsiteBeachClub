// src/views/UsuariosView.jsx
import React, { useState } from "react";
import {
  Card,
  Row,
  Col,
  Alert,
  Space,
  Input,
  Select,
  List,
  Avatar,
  Tag,
  Typography,
  Button,
  Form,
  Modal,
  Popconfirm,
  message,
} from "antd";
import { SearchOutlined, TeamOutlined } from "@ant-design/icons";
import { beachColors, neutrals } from "../theme/beachTheme";

const { Text } = Typography;
const { Option } = Select;

/* =========================================================
   ROLES DISPONIBLES
   ========================================================= */

const ROLES = {
  manager: "Manager General",
  recepcion: "Recepción",
  reservas: "Reservas Online",
  marketing: "Marketing",
};

/* =========================================================
   DATOS INICIALES (SIMULACIÓN - LUEGO LOS PUEDES TRAER DE API)
   ========================================================= */

const initialUsers = [
  {
    key: "1",
    name: "Laura Sánchez",
    roleKey: "manager",
    role: ROLES.manager,
    email: "laura@beachclub.com",
    status: "Activo",
    lastAccess: "Hoy · 08:15",
    channels: ["PMS", "Email", "WhatsApp"],
  },
  {
    key: "2",
    name: "Carlos Pérez",
    roleKey: "recepcion",
    role: ROLES.recepcion,
    email: "carlos@beachclub.com",
    status: "Activo",
    lastAccess: "Hoy · 07:52",
    channels: ["PMS", "WhatsApp"],
  },
  {
    key: "3",
    name: "María Gómez",
    roleKey: "reservas",
    role: ROLES.reservas,
    email: "maria@beachclub.com",
    status: "Activo",
    lastAccess: "Ayer · 18:30",
    channels: ["PMS", "Email"],
  },
  {
    key: "4",
    name: "Andrés Ruiz",
    roleKey: "marketing",
    role: ROLES.marketing,
    email: "andres@beachclub.com",
    status: "Pendiente invitación",
    lastAccess: "-",
    channels: ["Email"],
  },
];

/* =========================================================
   COMPONENTE PRINCIPAL
   ========================================================= */

const UsuariosView = ({ isMobile }) => {
  const [users, setUsers] = useState(initialUsers);
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = crear
  const [form] = Form.useForm();

  /* ========== DERIVADOS ========== */

  const filteredUsers = users
    .filter((u) => userRoleFilter === "all" || u.roleKey === userRoleFilter)
    .filter((u) => {
      const q = userSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.role || "").toLowerCase().includes(q)
      );
    });

  const activos = users.filter((u) => u.status === "Activo").length;
  const pendientes = users.filter((u) =>
    u.status.includes("Pendiente")
  ).length;

  /* ========== HANDLERS MODAL ========== */

  const abrirModalCrear = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      status: "Pendiente invitación",
      roleKey: "recepcion",
      channels: ["PMS"],
    });
    setModalVisible(true);
  };

  const abrirModalEditar = (user) => {
    setEditingUser(user);
    form.resetFields();
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      roleKey: user.roleKey,
      status: user.status,
      channels: user.channels,
    });
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  const guardarUsuario = async () => {
    try {
      const values = await form.validateFields();
      const { name, email, roleKey, status, channels } = values;
      const roleLabel = ROLES[roleKey] || "Rol sin definir";

      if (editingUser) {
        // UPDATE
        setUsers((prev) =>
          prev.map((u) =>
            u.key === editingUser.key
              ? {
                  ...u,
                  name,
                  email,
                  roleKey,
                  role: roleLabel,
                  status,
                  channels: channels || [],
                }
              : u
          )
        );
        message.success("Usuario actualizado correctamente.");
      } else {
        // CREATE
        const nuevo = {
          key: String(Date.now()),
          name,
          email,
          roleKey,
          role: roleLabel,
          status: status || "Pendiente invitación",
          lastAccess: "-",
          channels: channels || [],
        };
        setUsers((prev) => [nuevo, ...prev]);
        message.success("Usuario invitado / creado correctamente.");
      }

      cerrarModal();
    } catch (err) {
      // Validación incompleta: no hacemos nada especial
    }
  };

  /* ========== ACCIONES RÁPIDAS ========== */

  const cambiarEstado = (user) => {
    let nextStatus = "Activo";

    if (user.status === "Activo") nextStatus = "Inactivo";
    else if (user.status === "Inactivo") nextStatus = "Activo";
    else if (user.status.includes("Pendiente")) nextStatus = "Activo";

    setUsers((prev) =>
      prev.map((u) =>
        u.key === user.key ? { ...u, status: nextStatus } : u
      )
    );
    message.success(`Estado actualizado a "${nextStatus}".`);
  };

  const eliminarUsuario = (user) => {
    setUsers((prev) => prev.filter((u) => u.key !== user.key));
    message.success("Usuario eliminado.");
  };

  /* ========== RENDER ========== */

  return (
    <>
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
            {pendientes > 0 && (
              <Tag
                color={beachColors.coral}
                style={{
                  borderRadius: 999,
                  fontSize: 10,
                  color: "#7f1d1d",
                }}
              >
                {pendientes} invitación pendiente
              </Tag>
            )}
          </Space>
        }
        extra={
          <Button
            type="primary"
            size="small"
            onClick={abrirModalCrear}
            style={{
              borderRadius: 999,
              paddingInline: 14,
              background: beachColors.teal,
              borderColor: beachColors.teal,
              fontSize: 11,
            }}
          >
            Invitar usuario
          </Button>
        }
      >
        {/* Filtros superiores */}
        <Row
          gutter={[12, 12]}
          style={{ marginBottom: 12 }}
          align="middle"
          justify="space-between"
        >
          <Col xs={24} md={12}>
            <Alert
              type="info"
              showIcon
              style={{ padding: "6px 10px", borderRadius: 8 }}
              message={
                <Text style={{ fontSize: 11 }}>
                  Gestiona accesos por rol. Usa este panel como fuente única de verdad
                  para quién puede entrar al sistema.
                </Text>
              }
            />
          </Col>
          <Col xs={24} md={12}>
            <Space
              size={8}
              style={{
                width: "100%",
                justifyContent: isMobile ? "flex-start" : "flex-end",
                flexWrap: "wrap",
              }}
            >
              <Input
                size="small"
                placeholder="Buscar por nombre, correo o rol..."
                prefix={<SearchOutlined />}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ width: isMobile ? "100%" : 220 }}
              />
              <Select
                size="small"
                value={userRoleFilter}
                onChange={setUserRoleFilter}
                style={{ width: isMobile ? "100%" : 170 }}
              >
                <Option value="all">Todos los roles</Option>
                <Option value="manager">Manager</Option>
                <Option value="recepcion">Recepción</Option>
                <Option value="reservas">Reservas</Option>
                <Option value="marketing">Marketing</Option>
              </Select>
            </Space>
          </Col>
        </Row>

        {/* LISTA DE USUARIOS */}
        <List
          dataSource={filteredUsers}
          split={false}
          locale={{
            emptyText: "No hay usuarios que coincidan con el filtro.",
          }}
          renderItem={(user) => (
            <List.Item
              style={{
                padding: "8px 6px",
                marginBottom: 4,
                borderRadius: 10,
                border: "1px solid #f1f5f9",
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {/* Info principal */}
              <List.Item.Meta
                avatar={
                  <Avatar
                    style={{
                      backgroundColor: beachColors.teal,
                      color: "#ffffff",
                      fontWeight: 600,
                    }}
                  >
                    {user.name.charAt(0)}
                  </Avatar>
                }
                title={
                  <Space size={6} wrap>
                    <Text style={{ fontWeight: 500 }}>
                      {user.name}
                    </Text>
                    <Tag
                      color={beachColors.sand}
                      style={{
                        borderRadius: 999,
                        fontSize: 9,
                        color: beachColors.deepBlue,
                      }}
                    >
                      {user.role}
                    </Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <Text
                      style={{
                        fontSize: 11,
                        color: neutrals.textMuted,
                      }}
                    >
                      {user.email}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: neutrals.textMuted,
                      }}
                    >
                      Accesos: {user.channels.join(" · ")}
                    </Text>
                  </Space>
                }
              />

              {/* Acciones y estado */}
              <Space
                direction="vertical"
                align="end"
                size={4}
                style={{
                  minWidth: isMobile ? "100%" : 180,
                  textAlign: "right",
                }}
              >
                <Tag
                  color={
                    user.status === "Activo"
                      ? beachColors.teal
                      : user.status.includes("Pendiente")
                      ? beachColors.coral
                      : "#9ca3af"
                  }
                  style={{
                    borderRadius: 999,
                    fontSize: 9,
                    color:
                      user.status === "Activo"
                        ? "#064e3b"
                        : user.status.includes("Pendiente")
                        ? "#7f1d1d"
                        : "#111827",
                  }}
                >
                  {user.status}
                </Tag>
                <Text
                  style={{
                    fontSize: 10,
                    color: neutrals.textMuted,
                  }}
                >
                  {user.lastAccess !== "-"
                    ? `Último acceso: ${user.lastAccess}`
                    : "Sin acceso registrado"}
                </Text>

                <Space
                  size={4}
                  wrap
                  style={{
                    justifyContent: isMobile ? "flex-end" : "flex-end",
                  }}
                >
                  <Button
                    type="link"
                    size="small"
                    onClick={() => abrirModalEditar(user)}
                    style={{ paddingInline: 4, fontSize: 10 }}
                  >
                    Editar
                  </Button>

                  <Button
                    type="link"
                    size="small"
                    onClick={() => cambiarEstado(user)}
                    style={{ paddingInline: 4, fontSize: 10 }}
                  >
                    {user.status === "Activo"
                      ? "Desactivar"
                      : "Activar"}
                  </Button>

                  <Popconfirm
                    title="Eliminar usuario"
                    description="Esta acción no afecta reservas, solo el acceso. ¿Confirmas?"
                    okText="Sí, eliminar"
                    cancelText="Cancelar"
                    onConfirm={() => eliminarUsuario(user)}
                  >
                    <Button
                      type="link"
                      size="small"
                      danger
                      style={{ paddingInline: 4, fontSize: 10 }}
                    >
                      Eliminar
                    </Button>
                  </Popconfirm>
                </Space>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      {/* MODAL CREAR / EDITAR USUARIO */}
      <Modal
        open={modalVisible}
        title={
          editingUser
            ? "Editar usuario"
            : "Invitar / crear usuario"
        }
        onOk={guardarUsuario}
        onCancel={cerrarModal}
        okText={editingUser ? "Guardar cambios" : "Crear usuario"}
        cancelText="Cancelar"
        centered
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            label="Nombre completo"
            name="name"
            rules={[
              { required: true, message: "Ingresa el nombre completo" },
            ]}
          >
            <Input placeholder="Ej: Juan Pérez" />
          </Form.Item>

          <Form.Item
            label="Correo"
            name="email"
            rules={[
              { required: true, message: "Ingresa el correo" },
              { type: "email", message: "Correo no válido" },
            ]}
          >
            <Input placeholder="nombre@hotel.com" />
          </Form.Item>

          <Form.Item
            label="Rol"
            name="roleKey"
            rules={[
              { required: true, message: "Selecciona el rol" },
            ]}
          >
            <Select placeholder="Selecciona un rol">
              <Option value="manager">Manager General</Option>
              <Option value="recepcion">Recepción</Option>
              <Option value="reservas">Reservas Online</Option>
              <Option value="marketing">Marketing</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Estado"
            name="status"
            rules={[
              { required: true, message: "Selecciona el estado" },
            ]}
          >
            <Select>
              <Option value="Activo">Activo</Option>
              <Option value="Pendiente invitación">
                Pendiente invitación
              </Option>
              <Option value="Inactivo">Inactivo</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Accesos a módulos" name="channels">
            <Select
              mode="multiple"
              placeholder="Selecciona los módulos a los que tiene acceso"
              allowClear
            >
              <Option value="PMS">PMS</Option>
              <Option value="Motor reservas">Motor de reservas</Option>
              <Option value="Email">Email</Option>
              <Option value="WhatsApp">WhatsApp</Option>
              <Option value="Reportes">Reportes</Option>
              <Option value="Marketing">Marketing</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default UsuariosView;
