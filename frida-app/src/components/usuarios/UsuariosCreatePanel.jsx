import { Row, Col, Alert, Space, Form, Input, Select, Button, Tag, Typography } from "antd";
import { beachColors } from "../../theme/beachTheme";

const { Text } = Typography;

const EMAIL_DOMAIN = "beachclub.com";

const UsuariosCreatePanel = ({
  createPanelOpen,
  createForm,
  creatingUser,
  lastTempPassword,
  generarPasswordSegura,
  crearUsuario,

  sedeOptions = [],
  sedesLoading = false,
}) => {
  return (
    <div
      style={{
        maxHeight: createPanelOpen ? 400 : 0,
        opacity: createPanelOpen ? 1 : 0,
        marginBottom: createPanelOpen ? 12 : 0,
        overflow: "hidden",
        borderRadius: 12,
        border: createPanelOpen ? "1px solid #e5e7eb" : "1px solid transparent",
        background: "linear-gradient(to right, #eff6ff, #ecfdf5)",
        boxShadow: createPanelOpen ? "0 10px 25px rgba(15,23,42,0.12)" : "none",
        transform: createPanelOpen ? "translateY(0)" : "translateY(-8px)",
        transition: "all 0.25s ease",
      }}
    >
      {createPanelOpen && (
        <div style={{ padding: 12 }}>
          <Space size={6} style={{ marginBottom: 8, flexWrap: "wrap" }}>
            <Tag style={{ borderRadius: 999, fontSize: 10, background: "#fff", border: "none" }}>
              1. Datos básicos
            </Tag>
            <Tag style={{ borderRadius: 999, fontSize: 10, background: "#fff", border: "none" }}>
              2. Sede y acceso
            </Tag>
            <Tag style={{ borderRadius: 999, fontSize: 10, background: "#fff", border: "none" }}>
              3. Definir contraseña
            </Tag>
          </Space>

          <Row gutter={[12, 8]}>
            <Col xs={24} md={16}>
              <Form form={createForm} layout="vertical" preserve={false}>
                <Form.Item
                  label="Nombre de la persona"
                  name="name"
                  rules={[{ required: true, message: "Ingresa el nombre completo del usuario" }]}
                >
                  <Input placeholder="Ej: Laura Sánchez" />
                </Form.Item>

                <Form.Item
                  label="Usuario corporativo"
                  name="emailUser"
                  tooltip={`El correo que se creará será usuario@${EMAIL_DOMAIN}`}
                  rules={[{ required: true, message: "Ingresa el usuario corporativo" }]}
                >
                  <Input placeholder="ej: laura.sanchez" addonAfter={`@${EMAIL_DOMAIN}`} />
                </Form.Item>

                <Row gutter={8}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Sede"
                      name="sedeId"
                      rules={[{ required: true, message: "Selecciona la sede" }]}
                    >
                      <Select
                        placeholder="Selecciona la sede"
                        loading={sedesLoading}
                        options={sedeOptions}
                        showSearch
                        optionFilterProp="label"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Tipo de acceso"
                      name="role"
                      rules={[{ required: true, message: "Selecciona el tipo de acceso" }]}
                    >
                      <Select
                        placeholder="Selecciona una opción"
                        options={[
                          { value: "administrador", label: "Administrador (control total)" },
                          { value: "staff", label: "Staff (uso operativo)" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label="Contraseña"
                  name="password"
                  tooltip="Puedes escribir una contraseña manualmente o generar una segura desde aquí."
                  rules={[
                    { required: true, message: "Define una contraseña para esta persona" },
                    { min: 8, message: "La contraseña debe tener al menos 8 caracteres" },
                  ]}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Input.Password placeholder="Usa una contraseña fuerte" style={{ flex: 1 }} />
                    <Button size="small" onClick={generarPasswordSegura}>
                      Generar
                    </Button>
                  </div>
                </Form.Item>
              </Form>
            </Col>

            <Col xs={24} md={8}>
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 8 }}
                message={<Text style={{ fontSize: 11 }}>Alta rápida de acceso</Text>}
                description={
                  <Text style={{ fontSize: 11 }}>
                    Copia la contraseña y compártela solo con la persona correspondiente.
                  </Text>
                }
              />

              {lastTempPassword && (
                <Alert
                  type="success"
                  showIcon
                  style={{ marginTop: 4 }}
                  message={<Text style={{ fontSize: 11 }}>Contraseña preparada</Text>}
                  description={
                    <div style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                        Esta es la contraseña que se usará:
                      </Text>
                      <div
                        style={{
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
                        {lastTempPassword}
                      </div>
                    </div>
                  }
                />
              )}

              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                <Button
                  type="primary"
                  size="small"
                  onClick={crearUsuario}
                  loading={creatingUser}
                  style={{
                    borderRadius: 999,
                    paddingInline: 16,
                    background: beachColors.teal,
                    borderColor: beachColors.teal,
                    fontSize: 11,
                  }}
                >
                  Crear usuario
                </Button>
              </div>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
};

export default UsuariosCreatePanel;
