// src/views/DashboardView.jsx
import React from "react";
import {
  Card,
  Row,
  Col,
  List,
  Space,
  Statistic,
  Tag,
  Badge,
  Tooltip,
  Typography,
} from "antd";
import {
  ThunderboltOutlined,
  CheckCircleTwoTone,
  WarningTwoTone,
} from "@ant-design/icons";
import { beachColors, neutrals } from "../theme/beachTheme";

const { Text, Title } = Typography;

const hoy = {
  reservas: 12,
  checkins: 5,
  ocupacion: 86,
  ingresos: 18450,
};

const promos = [
  { nombre: "Hotel Beach Club #25", canal: "Email", fecha: "20/04/2025" },
  { nombre: "Pool Weekend Promo", canal: "WhatsApp", fecha: "18/04/2025" },
  { nombre: "Family Spring Offer", canal: "Facebook Ads", fecha: "10/04/2025" },
];

const notificacionesSSE = [
  {
    tipo: "success",
    texto:
      "Nueva solicitud WhatsApp · Cliente: Ana G. · Hab. 204 · Llegada 22/04",
  },
  {
    tipo: "success",
    texto:
      "Nueva solicitud WhatsApp · Cliente: Luis Q. · Hab. 102 · Llegada 23/04",
  },
  {
    tipo: "warning",
    texto: "Habitación 101 liberada · Lista para nueva asignación",
  },
];

const disponibilidad = [
  { label: "Ocupadas", porcentaje: 60, color: beachColors.oceanBlue },
  { label: "Disponibles", porcentaje: 25, color: beachColors.teal },
  { label: "Limpieza", porcentaje: 10, color: beachColors.sunset },
  { label: "Limpias", porcentaje: 5, color: "#9ca3af" },
];

const DashboardView = ({ isMobile }) => {
  return (
    <>
      {/* Resumen + Promos */}
      <Row gutter={[16, 16]}>
        {/* Resumen de Hoy */}
        <Col xs={24} md={10}>
          <Card
            hoverable
            bordered={false}
            style={{
              borderRadius: 16,
              background: `linear-gradient(135deg, ${beachColors.oceanBlue}, ${beachColors.teal})`,
              boxShadow: "0 12px 26px rgba(15,23,42,0.20)",
            }}
            bodyStyle={{ padding: isMobile ? 16 : 20 }}
          >
            <Space
              direction="vertical"
              size={8}
              style={{ width: "100%", color: "#fff" }}
            >
              <Text
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: "rgba(255,255,255,0.82)",
                }}
              >
                Resumen de hoy
              </Text>
              <Title
                level={3}
                style={{
                  margin: 0,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: isMobile ? 20 : 24,
                }}
              >
                Hotel Beach Club
              </Title>
              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col span={12}>
                  <Statistic
                    title={
                      <Text style={{ color: "#e5e7eb", fontSize: 11 }}>
                        Reservas del día
                      </Text>
                    }
                    value={hoy.reservas}
                    valueStyle={{
                      color: "#fff",
                      fontSize: isMobile ? 24 : 30,
                      fontWeight: 700,
                    }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={
                      <Text style={{ color: "#e5e7eb", fontSize: 11 }}>
                        Check-ins previstos
                      </Text>
                    }
                    value={hoy.checkins}
                    valueStyle={{
                      color: "#fff",
                      fontSize: isMobile ? 24 : 30,
                      fontWeight: 700,
                    }}
                  />
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title={
                      <Text style={{ color: "#e5e7eb", fontSize: 10 }}>
                        Ocupación actual
                      </Text>
                    }
                    value={hoy.ocupacion}
                    suffix="%"
                    valueStyle={{
                      color: beachColors.sand,
                      fontSize: isMobile ? 16 : 20,
                      fontWeight: 600,
                    }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={
                      <Text style={{ color: "#e5e7eb", fontSize: 10 }}>
                        Ingresos estimados hoy
                      </Text>
                    }
                    prefix="$"
                    value={hoy.ingresos}
                    precision={0}
                    valueStyle={{
                      color: "#fff",
                      fontSize: isMobile ? 16 : 18,
                      fontWeight: 500,
                    }}
                  />
                </Col>
              </Row>
            </Space>
          </Card>
        </Col>

        {/* Últimas promociones */}
        <Col xs={24} md={14}>
          <Card
            hoverable
            bordered={false}
            title={
              <Text
                style={{
                  fontWeight: 600,
                  color: neutrals.textMain,
                  fontSize: 15,
                }}
              >
                Últimas promociones enviadas
              </Text>
            }
            extra={
              <Text
                style={{
                  padding: 0,
                  fontSize: 12,
                  color: beachColors.oceanBlue,
                  cursor: "pointer",
                }}
              >
                Ver historial
              </Text>
            }
            style={{
              borderRadius: 16,
              background: "#fff",
              boxShadow: "0 8px 18px rgba(15,23,42,0.08)",
            }}
            bodyStyle={{ padding: isMobile ? 8 : 10 }}
          >
            <List
              itemLayout="horizontal"
              dataSource={promos}
              split={false}
              renderItem={(item, index) => (
                <List.Item
                  style={{
                    padding: "6px 8px",
                    marginBottom: 2,
                    borderRadius: 10,
                    background:
                      index === 0 ? "rgba(46,196,182,0.04)" : "transparent",
                  }}
                >
                  <List.Item.Meta
                    title={
                      <Text
                        style={{
                          fontWeight: 500,
                          color: neutrals.textMain,
                          fontSize: 13,
                        }}
                      >
                        {item.nombre}
                      </Text>
                    }
                    description={
                      <Space size={10}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {item.canal}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {item.fecha}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Disponibilidad + Notificaciones */}
      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        {/* Disponibilidad */}
        <Col xs={24} md={14}>
          <Card
            hoverable
            bordered={false}
            title={
              <Space size={8} wrap>
                <Text
                  style={{
                    fontWeight: 600,
                    color: neutrals.textMain,
                    fontSize: 15,
                  }}
                >
                  Disponibilidad de habitaciones
                </Text>
                <Tag
                  color={beachColors.turquoise}
                  style={{
                    borderRadius: 999,
                    fontSize: 10,
                    color: "#064e3b",
                  }}
                >
                  Ocupación {hoy.ocupacion}%
                </Tag>
              </Space>
            }
            style={{
              borderRadius: 16,
              background: "#fff",
              boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
            }}
            bodyStyle={{ padding: isMobile ? 12 : 16, paddingTop: 10 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: isMobile ? 14 : 24,
                height: isMobile ? 120 : 140,
              }}
            >
              {disponibilidad.map((item) => (
                <div
                  key={item.label}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      width: isMobile ? 22 : 32,
                      height:
                        (item.porcentaje / 100) *
                        (isMobile ? 90 : 120),
                      borderRadius: 10,
                      background: item.color,
                    }}
                  />
                  <Text
                    style={{ fontSize: 10, color: neutrals.textMuted }}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={{ fontSize: 9, color: neutrals.textMuted }}
                  >
                    {item.porcentaje}%
                  </Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* Notificaciones SSE */}
        <Col xs={24} md={10}>
          <Card
            hoverable
            bordered={false}
            title={
              <Space size={8} wrap>
                <Text
                  style={{
                    fontWeight: 600,
                    color: neutrals.textMain,
                    fontSize: 15,
                  }}
                >
                  Notificaciones en tiempo real (SSE)
                </Text>
                <Badge
                  color={beachColors.teal}
                  text={
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: beachColors.teal,
                        textTransform: "uppercase",
                      }}
                    >
                      Live
                    </span>
                  }
                />
              </Space>
            }
            extra={
              <Tooltip title="Actualizado desde PMS, recepción y WhatsApp Business">
                <ThunderboltOutlined
                  style={{ color: beachColors.sunset, fontSize: 16 }}
                />
              </Tooltip>
            }
            style={{
              borderRadius: 16,
              background: "#fff",
              boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
            }}
            bodyStyle={{ padding: isMobile ? 8 : 10 }}
          >
            <List
              size="small"
              dataSource={notificacionesSSE}
              split={false}
              renderItem={(n, index) => (
                <List.Item
                  style={{
                    padding: "6px 6px",
                    marginBottom:
                      index === notificacionesSSE.length - 1 ? 0 : 4,
                    borderRadius: 8,
                    background:
                      n.tipo === "warning"
                        ? "rgba(245,158,11,0.06)"
                        : "rgba(14,165,233,0.03)",
                  }}
                >
                  <Space align="start" size={10}>
                    {n.tipo === "warning" ? (
                      <WarningTwoTone twoToneColor={beachColors.sunset} />
                    ) : (
                      <CheckCircleTwoTone twoToneColor={beachColors.teal} />
                    )}
                    <Text
                      style={{
                        fontSize: 11,
                        color:
                          n.tipo === "warning"
                            ? neutrals.textMain
                            : neutrals.textMuted,
                      }}
                    >
                      {n.texto}
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default DashboardView;
