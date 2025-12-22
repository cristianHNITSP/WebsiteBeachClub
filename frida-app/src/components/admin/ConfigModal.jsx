// src/components/admin/ConfigModal.jsx
import { useEffect, useState } from "react";
import {
  Modal,
  Button,
  Space,
  Typography,
  Divider,
  Alert,
  Form,
  Input,
  Tag,
  message,
  Popconfirm,
  Collapse,
} from "antd";
import axios from "@api/axios";

const { Text } = Typography;
const { Panel } = Collapse;

const SEDE_LABELS = {
  "casa-frida": "Casa Frida",
  "cabanas-frida": "Cabañas Frida",
};

const ROLE_LABELS = {
  administrador: "Administrador",
  staff: "Staff",
};

const ConfigModal = ({ open, onClose, currentUser, onUserUpdated }) => {
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const [profileInitialValues, setProfileInitialValues] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // ========= CARGAR DATOS AL ABRIR =========
  useEffect(() => {
    if (!open || !currentUser) return;

    const email = String(currentUser.email || "");
    const [localPart] = email.split("@");

    const resolvedName =
      currentUser.name || currentUser.displayName || localPart || "";

    const initial = {
      name: resolvedName,
    };

    setProfileInitialValues(initial);

    // 🔥 Importante: establecemos los valores del form explícitamente
    profileForm.setFieldsValue(initial);
    passwordForm.resetFields();
  }, [open, currentUser, profileForm, passwordForm]);

  if (!currentUser) {
    return (
      <Modal
        open={open}
        title="Configuración de mi cuenta"
        onCancel={onClose}
        footer={null}
        width={640}
        destroyOnClose
      >
        <Alert
          type="warning"
          showIcon
          message="No se pudo cargar la información de tu usuario."
          description={
            <Text style={{ fontSize: 11 }}>
              Vuelve a iniciar sesión o recarga la página si el problema
              persiste.
            </Text>
          }
        />
      </Modal>
    );
  }

  const roleLabel =
    ROLE_LABELS[currentUser.role] || currentUser.role || "Sin rol";
  const sedeLabel = currentUser.sede
    ? SEDE_LABELS[currentUser.sede] || currentUser.sede
    : "No asignada";

  // ========= GUARDAR PERFIL (solo nombre / sede) =========
  const handleSaveProfile = async () => {
    try {
      const values = await profileForm.validateFields();
      console.log("[ConfigModal] values del form perfil:", values);

      const currentNameRaw =
        currentUser.name ||
        currentUser.displayName ||
        currentUser.email?.split("@")[0] ||
        "";

      const currentName = currentNameRaw.trim();
      const formName = (values.name || "").trim();

      if (!formName) {
        message.error("Ingresa tu nombre completo (no puede estar vacío).");
        return;
      }

      const payload = {};

      if (formName !== currentName) {
        payload.name = formName;
      }

      console.log("[ConfigModal] currentName:", currentName);
      console.log("[ConfigModal] formName:", formName);
      console.log(
        "[ConfigModal] payload que se enviará a /api/users/me:",
        payload
      );

      if (Object.keys(payload).length === 0) {
        message.info("No hay cambios para guardar.");
        return;
      }

      setSavingProfile(true);
      message.loading({
        content: "Enviando cambios de perfil...",
        key: "saveProfile",
      });

      const res = await axios.put("/api/users/me", payload, {
        withCredentials: true,
      });

      const updatedUser = res.data?.user || res.data;
      console.log("[ConfigModal] respuesta de /api/users/me:", updatedUser);

      message.success({
        content: "Tu perfil se actualizó correctamente.",
        key: "saveProfile",
      });

      // 🔥 Notificamos hacia arriba para que actualicen currentUser en el estado global
      if (onUserUpdated) onUserUpdated(updatedUser);

      onClose();
    } catch (err) {
      console.error("Error al actualizar perfil:", err);
      message.destroy("saveProfile");

      if (err?.response?.data?.details) {
        console.error(
          "[ConfigModal] detalles VALIDATION_ERROR:",
          err.response.data.details
        );
      }

      message.error(
        err?.response?.data?.message ||
          "No se pudieron aplicar los cambios a tu perfil."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // ========= CAMBIAR CONTRASEÑA =========
  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields();

      if (values.newPassword !== values.confirmPassword) {
        message.error("La nueva contraseña y su confirmación no coinciden.");
        return;
      }

      setChangingPassword(true);
      message.loading({
        content: "Actualizando contraseña...",
        key: "changePassword",
      });

      await axios.post(
        "/api/users/me/password",
        {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
        { withCredentials: true }
      );

      message.success({
        content: "Tu contraseña se actualizó correctamente.",
        key: "changePassword",
      });

      passwordForm.resetFields();
    } catch (err) {
      console.error("Error al cambiar contraseña:", err);
      message.destroy("changePassword");
      message.error(
        err?.response?.data?.message || "No se pudo cambiar la contraseña."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Configuración de mi cuenta"
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnClose
    >
      <Alert
        message="Configuración personal"
        description={
          <Text style={{ fontSize: 12 }}>
            Ajusta tu nombre y revisa tus datos de acceso. La sede y el rol son
            solo informativos y no se pueden modificar desde aquí. Si lo
            necesitas, también puedes cambiar tu contraseña.
          </Text>
        }
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
      />

      {/* === BLOQUE: DATOS BÁSICOS === */}
      <Divider orientation="left" style={{ margin: "8px 0 10px" }}>
        <Text style={{ fontSize: 12 }}>Datos de perfil</Text>
      </Divider>

      <Form
        form={profileForm}
        layout="vertical"
        preserve={false}
        initialValues={profileInitialValues}
      >
        <Form.Item
          label="Nombre completo"
          name="name"
          rules={[{ required: true, message: "Ingresa tu nombre completo" }]}
        >
          <Input placeholder="Ej: Juan Pérez" />
        </Form.Item>

        <Form.Item label="Correo corporativo">
          <Input disabled value={currentUser.email || ""} />
        </Form.Item>

        <Form.Item label="Rol en el sistema">
          <Input disabled value={roleLabel} />
        </Form.Item>

        <Form.Item label="Sede asignada">
          <Input disabled value={sedeLabel} />
        </Form.Item>

        <Space
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}
          wrap
        >
          <Button onClick={onClose}>Cancelar</Button>

          <Popconfirm
            title="Confirmar cambios en tu perfil"
            description="¿Quieres aplicar los cambios en tu perfil?"
            okText="Sí, aplicar"
            cancelText="Cancelar"
            placement="topRight"
            onConfirm={handleSaveProfile}
            disabled={savingProfile}
          >
            <Button type="primary" loading={savingProfile}>
              Enviar cambios
            </Button>
          </Popconfirm>
        </Space>
      </Form>

      {/* === BLOQUE: CONTRASEÑA (COLAPSABLE) === */}
      <Divider style={{ margin: "14px 0 8px" }} />

      <Collapse
        bordered={false}
        defaultActiveKey={[]}
        style={{ background: "#f9fafb", borderRadius: 8 }}
      >
        <Panel
          key="password"
          header={
            <Space size={6}>
              <Text style={{ fontSize: 12, fontWeight: 500 }}>
                Cambiar contraseña (opcional)
              </Text>
            </Space>
          }
        >
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 8 }}
            message={<Text style={{ fontSize: 11 }}>Cambio de contraseña</Text>}
            description={
              <Text style={{ fontSize: 11 }}>
                Esta acción es sensible. No compartas tu nueva contraseña con
                nadie.
              </Text>
            }
          />

          <Form
            form={passwordForm}
            layout="vertical"
            preserve={false}
            style={{ marginTop: 4 }}
          >
            <Form.Item
              label="Contraseña actual"
              name="currentPassword"
              rules={[
                {
                  required: true,
                  message: "Ingresa tu contraseña actual",
                },
              ]}
            >
              <Input.Password placeholder="Contraseña actual" />
            </Form.Item>

            <Form.Item
              label="Nueva contraseña"
              name="newPassword"
              rules={[
                {
                  required: true,
                  message: "Ingresa la nueva contraseña",
                },
                {
                  min: 8,
                  message:
                    "La nueva contraseña debe tener al menos 8 caracteres",
                },
              ]}
            >
              <Input.Password placeholder="Mínimo 8 caracteres" />
            </Form.Item>

            <Form.Item
              label="Confirmar nueva contraseña"
              name="confirmPassword"
              rules={[
                {
                  required: true,
                  message: "Confirma la nueva contraseña",
                },
              ]}
            >
              <Input.Password placeholder="Repite la nueva contraseña" />
            </Form.Item>

            <Space
              style={{ display: "flex", justifyContent: "flex-end" }}
              wrap
            >
              <Popconfirm
                title="Confirmar cambio de contraseña"
                description="¿Seguro que quieres actualizar tu contraseña?"
                okText="Sí, cambiar"
                cancelText="Cancelar"
                placement="topRight"
                onConfirm={handleChangePassword}
                disabled={changingPassword}
              >
                <Button danger loading={changingPassword}>
                  Cambiar contraseña
                </Button>
              </Popconfirm>
            </Space>
          </Form>
        </Panel>
      </Collapse>

      {/* Etiquetas informativas abajo */}
      <Divider style={{ margin: "12px 0 6px" }} />
      <Space size={6} wrap>
        <Tag color="default" style={{ fontSize: 10 }}>
          Sesión: {currentUser.email || "—"}
        </Tag>
        {currentUser.sede && (
          <Tag color="processing" style={{ fontSize: 10 }}>
            Sede actual: {sedeLabel}
          </Tag>
        )}
      </Space>
    </Modal>
  );
};

export default ConfigModal;
