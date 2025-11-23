// src/views/InicioSesionApp.jsx
import React, { useState } from "react";
import {
  ConfigProvider,
  Layout,
  Card,
  Row,
  Col,
  Typography,
  Form,
  Input,
  Button,
  Checkbox,
  Space,
  Alert,
  Flex,
  Tag,
  Grid,
} from "antd";
import {
  MailOutlined,
  LockOutlined,
  CheckCircleTwoTone,
  SafetyCertificateOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { beachColors, neutrals } from "../theme/beachTheme";

const { Content } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const InicioSesionApp = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const screens = useBreakpoint();
  const isMobile = !screens.md; // < md
  const isTablet = screens.md && !screens.lg;

  const onFinish = (values) => {
    setErrorMsg("");
    setLoading(true);

    // Aquí va tu lógica real de autenticación
    setTimeout(() => {
      setLoading(false);
      if (onLogin) onLogin(values);
    }, 900);
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: beachColors.oceanBlue,
          colorLink: beachColors.oceanBlue,
          borderRadius: 10,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, system-ui, "SF Pro Text", sans-serif',
        },
        components: {
          Button: {
            borderRadius: 12,
            fontWeight: 600,
          },
          Input: {
            borderRadius: 10,
          },
          Card: {
            borderRadius: 20,
          },
        },
      }}
    >
      <Layout
        style={{
          minHeight: "100vh",
          background: neutrals.bg,
        }}
      >
        <Content
          style={{
            minHeight: "100vh",
            padding: isMobile ? "16px 12px 24px" : "32px",
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "center",
          }}
        >
          <Row
            gutter={0}
            style={{
              width: "100%",
              maxWidth: isMobile ? 480 : 1040,
              margin: "0 auto",
              borderRadius: isMobile ? 18 : 26,
              overflow: "hidden",
              boxShadow: isMobile
                ? "0 14px 40px rgba(15,23,42,0.18)"
                : "0 24px 70px rgba(15,23,42,0.22)",
              background: "#ffffff",
            }}
          >
            {/* PANEL IZQUIERDO: BRANDING / MENSAJE (solo md+) */}
            <Col
              xs={0}
              md={11}
              style={{
                backgroundImage: `linear-gradient(180deg, ${beachColors.oceanBlue}, ${beachColors.teal})`,
                padding: 26,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                color: "#ffffff",
              }}
            >
              <div>
                {/* Logo + título */}
                <Flex align="center" gap={12}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 16,
                      background: beachColors.sand,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      color: beachColors.deepBlue,
                      fontSize: 18,
                      boxShadow: "0 4px 10px rgba(15,23,42,0.25)",
                    }}
                  >
                    HB
                  </div>
                  <div style={{ lineHeight: 1.1 }}>
                    <Text
                      style={{
                        color: "#ffffff",
                        fontSize: 18,
                        fontWeight: 600,
                      }}
                    >
                      Hotel Beach Club
                    </Text>
                    <Text
                      style={{
                        display: "block",
                        color: "rgba(241,245,249,0.9)",
                        fontSize: 11,
                      }}
                    >
                      Acceso privado al panel de administración
                    </Text>
                  </div>
                </Flex>

                {/* Mensaje principal */}
                <div style={{ marginTop: 32 }}>
                  <Title
                    level={3}
                    style={{
                      color: "#ffffff",
                      margin: 0,
                      marginBottom: 10,
                      fontWeight: 600,
                    }}
                  >
                    Una plataforma hecha a la medida de tu equipo.
                  </Title>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "rgba(241,245,249,0.9)",
                    }}
                  >
                    Accede a tu panel centralizado para consultar información
                    clave, supervisar la operación diaria y trabajar con tu
                    equipo de forma segura.
                  </Text>
                </div>

                {/* Bullets */}
                <Space direction="vertical" size={8} style={{ marginTop: 22 }}>
                  <Space size={8}>
                    <CheckCircleTwoTone twoToneColor={beachColors.sand} />
                    <Text
                      style={{
                        fontSize: 12,
                        color: "rgba(241,245,249,0.96)",
                      }}
                    >
                      Acceso exclusivo para personal autorizado.
                    </Text>
                  </Space>
                  <Space size={8}>
                    <CheckCircleTwoTone twoToneColor={beachColors.sand} />
                    <Text
                      style={{
                        fontSize: 12,
                        color: "rgba(241,245,249,0.96)",
                      }}
                    >
                      Información clara y actualizada en un solo lugar.
                    </Text>
                  </Space>
                  <Space size={8}>
                    <CheckCircleTwoTone twoToneColor={beachColors.sand} />
                    <Text
                      style={{
                        fontSize: 12,
                        color: "rgba(241,245,249,0.96)",
                      }}
                    >
                      Configuración y acompañamiento adaptados a tu operación.
                    </Text>
                  </Space>
                </Space>
              </div>

              {/* Pie: seguridad + soporte */}
              <div
                style={{
                  marginTop: 24,
                  padding: 12,
                  borderRadius: 14,
                  background: "rgba(15,23,42,0.18)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(148,163,253,0.18)",
                }}
              >
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <Space size={8}>
                    <SafetyCertificateOutlined />
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#e5e7eb",
                      }}
                    >
                      Entorno protegido · Accesos controlados por usuario.
                    </Text>
                  </Space>
                  <Text
                    style={{
                      fontSize: 10,
                      color: "rgba(209,213,219,0.95)",
                    }}
                  >
                    Ante cualquier duda sobre tu acceso, contacta con el
                    administrador del sistema.
                  </Text>
                </Space>
              </div>
            </Col>

            {/* PANEL DERECHO: LOGIN (full width en mobile) */}
            <Col
              xs={24}
              md={13}
              style={{
                padding: isMobile ? 18 : 28,
                background: "#ffffff",
                display: "flex",
                alignItems: isMobile ? "stretch" : "center",
                justifyContent: "center",
              }}
            >
              <Card
                bordered={false}
                style={{
                  width: "100%",
                  maxWidth: isMobile ? "100%" : 420,
                  boxShadow: isMobile
                    ? "0 8px 20px rgba(15,23,42,0.08)"
                    : "0 12px 30px rgba(15,23,42,0.08)",
                  borderRadius: isMobile ? 16 : 22,
                  padding: 4,
                  transition: "all 0.25s ease",
                }}
                bodyStyle={{
                  padding: isMobile ? 16 : 22,
                }}
              >
                <Flex vertical gap={12}>
                  {/* Encabezado compacto */}
                  <Flex
                    align="center"
                    gap={10}
                    justify="space-between"
                    style={{ marginBottom: 6 }}
                  >
                    <Flex align="center" gap={10}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          background: beachColors.sand,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          color: beachColors.deepBlue,
                          fontSize: 16,
                        }}
                      >
                        HB
                      </div>
                      <div style={{ lineHeight: 1.1 }}>
                        <Text
                          style={{
                            fontWeight: 600,
                            color: neutrals.textMain,
                            fontSize: 14,
                          }}
                        >
                          Hotel Beach Club
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            color: neutrals.textMuted,
                          }}
                        >
                          Acceso del equipo
                        </Text>
                      </div>
                    </Flex>
                    <Tag
                      color={beachColors.turquoise}
                      style={{
                        borderRadius: 999,
                        fontSize: 9,
                        color: "#065f46",
                      }}
                    >
                      Uso interno
                    </Tag>
                  </Flex>

                  <Title
                    level={3}
                    style={{
                      margin: 0,
                      marginTop: 4,
                      color: neutrals.textMain,
                      fontWeight: 600,
                      fontSize: isMobile ? 20 : 24,
                    }}
                  >
                    Inicia sesión
                  </Title>
                  <Text
                    style={{
                      fontSize: 12,
                      color: neutrals.textMuted,
                    }}
                  >
                    Introduce tus credenciales asignadas para continuar.
                  </Text>

                  {/* Mensaje seguridad */}
                  <Space
                    size={6}
                    align="center"
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      background: "#f9fafb",
                      border: "1px solid #eef2ff",
                      marginTop: 4,
                    }}
                  >
                    <BulbOutlined
                      style={{ color: beachColors.sunset, fontSize: 14 }}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        color: neutrals.textMuted,
                      }}
                    >
                      No compartas tus datos. Si necesitas acceso, pide ayuda al
                      responsable.
                    </Text>
                  </Space>

                  {errorMsg && (
                    <Alert
                      type="error"
                      showIcon
                      message="No se pudo iniciar sesión"
                      description={errorMsg}
                      style={{ marginTop: 4 }}
                    />
                  )}

                  {/* FORM */}
                  <Form
                    layout="vertical"
                    style={{ width: "100%", marginTop: 8 }}
                    onFinish={onFinish}
                    requiredMark={false}
                  >
                    <Form.Item
                      label="Usuario o correo"
                      name="email"
                      rules={[
                        {
                          required: true,
                          message: "Ingresa tu correo corporativo",
                        },
                        {
                          type: "email",
                          message: "Formato de correo no válido",
                        },
                      ]}
                    >
                      <Input
                        size="large"
                        placeholder="usuario@tuequipo.com"
                        prefix={
                          <MailOutlined
                            style={{ color: beachColors.oceanBlue }}
                          />
                        }
                        allowClear
                      />
                    </Form.Item>

                    <Form.Item
                      label="Contraseña"
                      name="password"
                      rules={[
                        {
                          required: true,
                          message: "Ingresa tu contraseña",
                        },
                      ]}
                    >
                      <Input.Password
                        size="large"
                        placeholder="••••••••"
                        prefix={
                          <LockOutlined
                            style={{ color: beachColors.teal }}
                          />
                        }
                      />
                    </Form.Item>

                    <Flex
                      justify="space-between"
                      align="center"
                      style={{
                        marginBottom: 10,
                        marginTop: 4,
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <Checkbox defaultChecked>
                        Mantener sesión iniciada
                      </Checkbox>
                      <Button type="link" size="small" style={{ padding: 0 }}>
                        Olvidé mi contraseña
                      </Button>
                    </Flex>

                    <Button
                      htmlType="submit"
                      type="primary"
                      size="large"
                      block
                      loading={loading}
                      style={{
                        background: `linear-gradient(90deg, ${beachColors.oceanBlue}, ${beachColors.teal})`,
                        border: "none",
                        borderRadius: 12,
                        boxShadow: "0 10px 20px rgba(14,165,233,0.30)",
                        marginTop: 4,
                        marginBottom: 4,
                      }}
                    >
                      Acceder al panel
                    </Button>
                  </Form>

                  {/* Pie */}
                  <Flex
                    justify={isMobile ? "flex-start" : "space-between"}
                    align="center"
                    wrap
                    style={{ marginTop: 6, gap: 6 }}
                  >
                    <Space size={6}>
                      <CheckCircleTwoTone twoToneColor={beachColors.teal} />
                      <Text
                        style={{
                          fontSize: 10,
                          color: neutrals.textMuted,
                        }}
                      >
                        Acceso protegido. Solo personal autorizado.
                      </Text>
                    </Space>
                    <Text
                      style={{
                        fontSize: 9,
                        color: neutrals.textMuted,
                      }}
                    >
                      © {new Date().getFullYear()} Hotel Beach Club
                    </Text>
                  </Flex>
                </Flex>
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

export default InicioSesionApp;
