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
  Tabs,
  Switch,
  Segmented,
} from "antd";
import axios from "@api/axios";
import {
  loadAccessibilityPrefs,
  saveAccessibilityPrefs,
} from "../../utils/accessibilityDOM";

const { Text } = Typography;

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

  // 🔶 Accesibilidad
  const [accessPrefs, setAccessPrefs] = useState(() =>
    loadAccessibilityPrefs()
  );
  const [savingAccess, setSavingAccess] = useState(false);

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

    profileForm.setFieldsValue(initial);
    passwordForm.resetFields();

    // refrescar accesibilidad por si cambió desde otro lado
    setAccessPrefs(loadAccessibilityPrefs());
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

  // ========= ACCESIBILIDAD =========
  const handleUpdateAccessPrefs = (patch) => {
    const next = { ...accessPrefs, ...patch };
    setAccessPrefs(next);
    setSavingAccess(true);
    try {
      saveAccessibilityPrefs(next);
      message.success({
        content: "Preferencias de accesibilidad actualizadas.",
        key: "access",
        duration: 1.5,
      });
    } catch (e) {
      console.error("[ConfigModal] error guardando accesibilidad:", e);
      message.error(
        "No se pudieron guardar las preferencias de accesibilidad."
      );
    } finally {
      setSavingAccess(false);
    }
  };

  const tabItems = [
    {
      key: "profile",
      label: "Información personal",
      children: (
        <>
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
              rules={[
                { required: true, message: "Ingresa tu nombre completo" },
              ]}
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
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 4,
              }}
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
        </>
      ),
    },
    {
      key: "password",
      label: "Cambiar contraseña",
      children: (
        <>
          <Divider orientation="left" style={{ margin: "8px 0 10px" }}>
            <Text style={{ fontSize: 12 }}>Seguridad y acceso</Text>
          </Divider>

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

            <Space style={{ display: "flex", justifyContent: "flex-end" }} wrap>
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
        </>
      ),
    },
    {
      key: "accessibility",
      label: "Accesibilidad (Demo)",
      children: (
        <>
          <Divider orientation="left" style={{ margin: "8px 0 10px" }}>
            <Text style={{ fontSize: 12 }}>Preferencias de accesibilidad</Text>
          </Divider>

          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 10 }}
            message={<Text style={{ fontSize: 11 }}>Ajustes visuales</Text>}
            description={
              <Text style={{ fontSize: 11 }}>
                Estas opciones estan en fase de prueba. Puedes cambiar la
                apariencia y comportamiento de la interfaz para adaptarla a tus
                necesidades.
              </Text>
            }
          />

          <Space
            direction="vertical"
            size={12}
            style={{ width: "100%", marginTop: 4 }}
          >
            {/* Reducir animaciones */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ maxWidth: 420 }}>
                <Text strong style={{ fontSize: 12 }}>
                  Reducir animaciones y efectos
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Desactiva la mayoría de transiciones y animaciones para una
                  experiencia más tranquila o en dispositivos lentos.
                </Text>
              </div>

              <Switch
                checked={accessPrefs.reducedMotion}
                loading={savingAccess}
                onChange={(checked) =>
                  handleUpdateAccessPrefs({ reducedMotion: checked })
                }
              />
            </div>

            {/* Tema claro / oscuro */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ maxWidth: 420 }}>
                <Text strong style={{ fontSize: 12 }}>
                  Tema de la aplicación
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Cambia entre modo claro y oscuro. Afecta a todos los
                  componentes de Ant Design y la mayor parte de la interfaz.
                </Text>
              </div>

              <Segmented
                size="small"
                options={[
                  { label: "Claro", value: false },
                  { label: "Oscuro", value: true },
                ]}
                value={accessPrefs.darkMode}
                onChange={(val) => handleUpdateAccessPrefs({ darkMode: !!val })}
              />
            </div>

            {/* Contraste */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ maxWidth: 420 }}>
                <Text strong style={{ fontSize: 12 }}>
                  Contraste
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Usa un contraste más fuerte para mejorar la legibilidad de
                  textos y controles.
                </Text>
              </div>

              <Segmented
                size="small"
                options={[
                  { label: "Normal", value: false },
                  { label: "Alto contraste", value: true },
                ]}
                value={accessPrefs.highContrast}
                onChange={(val) =>
                  handleUpdateAccessPrefs({ highContrast: !!val })
                }
              />
            </div>

            {/* Tamaño de fuente base */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ maxWidth: 420 }}>
                <Text strong style={{ fontSize: 12 }}>
                  Tamaño de texto
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Aumenta ligeramente el tamaño base de la tipografía en todo el
                  sistema.
                </Text>
              </div>

              <Segmented
                size="small"
                options={[
                  { label: "Normal", value: false },
                  { label: "Grande", value: true },
                ]}
                value={accessPrefs.largeFonts}
                onChange={(val) =>
                  handleUpdateAccessPrefs({ largeFonts: !!val })
                }
              />
            </div>
          </Space>
        </>
      ),
    },
  ];

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
            Usa las pestañas para editar tus datos de perfil, actualizar tu
            contraseña o ajustar accesibilidad visual. La sede y el rol son
            informativos y solo pueden ser cambiados por un administrador.
          </Text>
        }
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
      />

      <Tabs defaultActiveKey="profile" size="small" items={tabItems} animated />

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
