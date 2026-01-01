import { useEffect, useState, useMemo, useCallback } from "react";
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

const ROLE_LABELS = {
  administrador: "Administrador",
  staff: "Staff",
};

const isObjectId = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

// Humaniza "cabanas-frida" -> "Cabanas Frida" (fallback legacy)
const humanizeKey = (k) => {
  const s = String(k || "")
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
  if (!s) return "";
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
};

// ✅ Nunca expone key. Solo intenta mostrar name.
const resolveSedeLabel = (sede) => {
  if (!sede) return "No asignada";

  // populado: { _id, key, name }
  if (typeof sede === "object") {
    const name = String(sede.name || "").trim();
    if (name) return name;
    return "Sede asignada";
  }

  // string: puede ser objectId o legacy key
  if (typeof sede === "string") {
    if (isObjectId(sede)) return "Sede asignada";
    const friendly = humanizeKey(sede);
    return friendly || "Sede asignada";
  }

  return "No asignada";
};

const ConfigModal = ({ open, onClose, currentUser, onUserUpdated }) => {
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  // ✅ usuario “vivo” para renderizar dentro del modal
  const [liveUser, setLiveUser] = useState(currentUser || null);

  const [profileInitialValues, setProfileInitialValues] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // 🔶 Accesibilidad
  const [accessPrefs, setAccessPrefs] = useState(() => loadAccessibilityPrefs());
  const [savingAccess, setSavingAccess] = useState(false);

  const roleLabel = useMemo(() => {
    return ROLE_LABELS[liveUser?.role] || liveUser?.role || "Sin rol";
  }, [liveUser?.role]);

  const sedeLabel = useMemo(() => {
    return resolveSedeLabel(liveUser?.sede);
  }, [liveUser?.sede]);

  const fillProfileFormFromUser = useCallback(
    (u) => {
      if (!u) return;
      const email = String(u.email || "");
      const [localPart] = email.split("@");

      const resolvedName = u.name || u.displayName || localPart || "";
      const initial = { name: resolvedName };

      setProfileInitialValues(initial);

      // no pisar si ya está escribiendo
      const touched = profileForm.isFieldsTouched(["name"], true);
      if (!touched) profileForm.setFieldsValue(initial);
    },
    [profileForm]
  );

  // ========= AL ABRIR: setea con currentUser y luego sincroniza con /api/auth/me =========
  useEffect(() => {
    if (!open) return;

    // 1) base inmediato con el prop
    setLiveUser(currentUser || null);
    fillProfileFormFromUser(currentUser || null);

    passwordForm.resetFields();
    setAccessPrefs(loadAccessibilityPrefs());

    // 2) sync: trae user fresh (sede poblada con name actualizado)
    let mounted = true;

    const syncMe = async () => {
      try {
        const { data } = await axios.get("/api/auth/me", {
          withCredentials: true,
        });

        if (!mounted) return;

        setLiveUser(data);
        fillProfileFormFromUser(data);

        // 🔥 importantísimo: sube el user al state global del panel
        onUserUpdated?.(data);
      } catch (err) {
        // si falla, nos quedamos con el currentUser actual sin romper el modal
        console.warn("[ConfigModal] No se pudo sincronizar /api/auth/me:", err?.message);
      }
    };

    syncMe();

    return () => {
      mounted = false;
    };
  }, [open, currentUser, fillProfileFormFromUser, passwordForm, onUserUpdated]);

  if (!liveUser) {
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
              Vuelve a iniciar sesión o recarga la página si el problema persiste.
            </Text>
          }
        />
      </Modal>
    );
  }

  // ========= GUARDAR PERFIL (solo nombre) =========
  const handleSaveProfile = async () => {
    try {
      const values = await profileForm.validateFields();

      const currentNameRaw =
        liveUser.name ||
        liveUser.displayName ||
        liveUser.email?.split("@")[0] ||
        "";

      const currentName = String(currentNameRaw).trim();
      const formName = String(values.name || "").trim();

      if (!formName) {
        message.error("Ingresa tu nombre completo (no puede estar vacío).");
        return;
      }

      const payload = {};
      if (formName !== currentName) payload.name = formName;

      if (Object.keys(payload).length === 0) {
        message.info("No hay cambios para guardar.");
        return;
      }

      setSavingProfile(true);
      message.loading({ content: "Enviando cambios de perfil...", key: "saveProfile" });

      const res = await axios.put("/api/users/me", payload, { withCredentials: true });
      const updatedUser = res.data?.user || res.data;

      message.success({
        content: "Tu perfil se actualizó correctamente.",
        key: "saveProfile",
      });

      // actualiza modal + state global
      setLiveUser((prev) => ({ ...(prev || {}), ...(updatedUser || {}) }));
      onUserUpdated?.(updatedUser);

      onClose();
    } catch (err) {
      console.error("Error al actualizar perfil:", err);
      message.destroy("saveProfile");
      message.error(
        err?.response?.data?.message || "No se pudieron aplicar los cambios a tu perfil."
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
      message.loading({ content: "Actualizando contraseña...", key: "changePassword" });

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
      message.error(err?.response?.data?.message || "No se pudo cambiar la contraseña.");
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
      message.error("No se pudieron guardar las preferencias de accesibilidad.");
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
              rules={[{ required: true, message: "Ingresa tu nombre completo" }]}
            >
              <Input placeholder="Ej: Juan Pérez" />
            </Form.Item>

            <Form.Item label="Correo corporativo">
              <Input disabled value={liveUser.email || ""} />
            </Form.Item>

            <Form.Item label="Rol en el sistema">
              <Input disabled value={roleLabel} />
            </Form.Item>

            <Form.Item label="Sede asignada">
              <Input disabled value={sedeLabel} />
            </Form.Item>

            <Space style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }} wrap>
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
                Esta acción es sensible. No compartas tu nueva contraseña con nadie.
              </Text>
            }
          />

          <Form form={passwordForm} layout="vertical" preserve={false} style={{ marginTop: 4 }}>
            <Form.Item
              label="Contraseña actual"
              name="currentPassword"
              rules={[{ required: true, message: "Ingresa tu contraseña actual" }]}
            >
              <Input.Password placeholder="Contraseña actual" />
            </Form.Item>

            <Form.Item
              label="Nueva contraseña"
              name="newPassword"
              rules={[
                { required: true, message: "Ingresa la nueva contraseña" },
                { min: 8, message: "La nueva contraseña debe tener al menos 8 caracteres" },
              ]}
            >
              <Input.Password placeholder="Mínimo 8 caracteres" />
            </Form.Item>

            <Form.Item
              label="Confirmar nueva contraseña"
              name="confirmPassword"
              rules={[{ required: true, message: "Confirma la nueva contraseña" }]}
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
                Estas opciones están en fase de prueba.
              </Text>
            }
          />

          <Space direction="vertical" size={12} style={{ width: "100%", marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ maxWidth: 420 }}>
                <Text strong style={{ fontSize: 12 }}>Reducir animaciones y efectos</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Desactiva transiciones y animaciones.
                </Text>
              </div>
              <Switch
                checked={accessPrefs.reducedMotion}
                loading={savingAccess}
                onChange={(checked) => handleUpdateAccessPrefs({ reducedMotion: checked })}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ maxWidth: 420 }}>
                <Text strong style={{ fontSize: 12 }}>Tema de la aplicación</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Claro u oscuro.
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

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ maxWidth: 420 }}>
                <Text strong style={{ fontSize: 12 }}>Contraste</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Normal o alto contraste.
                </Text>
              </div>
              <Segmented
                size="small"
                options={[
                  { label: "Normal", value: false },
                  { label: "Alto contraste", value: true },
                ]}
                value={accessPrefs.highContrast}
                onChange={(val) => handleUpdateAccessPrefs({ highContrast: !!val })}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ maxWidth: 420 }}>
                <Text strong style={{ fontSize: 12 }}>Tamaño de texto</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Normal o grande.
                </Text>
              </div>
              <Segmented
                size="small"
                options={[
                  { label: "Normal", value: false },
                  { label: "Grande", value: true },
                ]}
                value={accessPrefs.largeFonts}
                onChange={(val) => handleUpdateAccessPrefs({ largeFonts: !!val })}
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
            La sede y el rol son informativos y solo pueden ser cambiados por un administrador.
          </Text>
        }
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
      />

      <Tabs defaultActiveKey="profile" size="small" items={tabItems} animated />

      <Divider style={{ margin: "12px 0 6px" }} />
      <Space size={6} wrap>
        <Tag color="default" style={{ fontSize: 10 }}>
          Sesión: {liveUser.email || "—"}
        </Tag>

        {!!liveUser.sede && (
          <Tag color="processing" style={{ fontSize: 10 }}>
            Sede actual: {sedeLabel}
          </Tag>
        )}
      </Space>
    </Modal>
  );
};

export default ConfigModal;
