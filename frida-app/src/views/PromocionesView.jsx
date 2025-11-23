// src/views/PromocionesView.jsx
import React from "react";
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Typography,
  Button,
  Space,
  Alert,
} from "antd";
import { beachColors, neutrals } from "../theme/beachTheme";

const { Text } = Typography;

const promos = [
  { nombre: "Hotel Beach Club #25", canal: "Email", fecha: "20/04/2025" },
  { nombre: "Pool Weekend Promo", canal: "WhatsApp", fecha: "18/04/2025" },
  { nombre: "Family Spring Offer", canal: "Facebook Ads", fecha: "10/04/2025" },
];

const promoTableData = promos.map((p, index) => ({
  key: index,
  nombre: p.nombre,
  canal: p.canal,
  fecha: p.fecha,
  performance: 70 - index * 12,
}));

const promoTableColumns = [
  {
    title: "Nombre campaña",
    dataIndex: "nombre",
    key: "nombre",
    render: (text) => (
      <Text style={{ fontSize: 13, fontWeight: 500 }}>{text}</Text>
    ),
  },
  {
    title: "Canal",
    dataIndex: "canal",
    key: "canal",
    width: 140,
    render: (canal) => {
      let color = beachColors.teal;
      if (canal.includes("WhatsApp")) color = beachColors.turquoise;
      if (canal.includes("Facebook")) color = beachColors.oceanBlue;
      if (canal.includes("Email")) color = beachColors.deepBlue;
      return (
        <Tag
          color={color}
          style={{ color: "#ffffff", borderRadius: 999, fontSize: 10 }}
        >
          {canal}
        </Tag>
      );
    },
  },
  {
    title: "Fecha envío",
    dataIndex: "fecha",
    key: "fecha",
    width: 120,
    render: (fecha) => (
      <Text style={{ fontSize: 12, color: neutrals.textMuted }}>{fecha}</Text>
    ),
  },
  {
    title: "Rendimiento",
    dataIndex: "performance",
    key: "performance",
    width: 180,
    render: (value) => (
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "#e5e7eb",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            background: beachColors.teal,
          }}
        />
      </div>
    ),
  },
];

const PromocionesView = ({ isMobile, isTablet }) => {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={14}>
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
              <Text
                style={{
                  fontWeight: 600,
                  color: neutrals.textMain,
                  fontSize: 15,
                }}
              >
                Campañas activas
              </Text>
              <Tag
                color={beachColors.turquoise}
                style={{
                  borderRadius: 999,
                  fontSize: 10,
                  color: "#064e3b",
                }}
              >
                Marketing
              </Tag>
            </Space>
          }
          extra={
            <Button
              size="small"
              type="primary"
              style={{
                background: beachColors.oceanBlue,
                borderColor: beachColors.oceanBlue,
              }}
            >
              Crear campaña
            </Button>
          }
        >
          <Table
            size="small"
            columns={promoTableColumns}
            dataSource={promoTableData}
            pagination={false}
            scroll={isMobile || isTablet ? { x: 480 } : undefined}
          />
        </Card>
      </Col>

      <Col xs={24} md={10}>
        <Card
          bordered={false}
          style={{
            marginTop: 4,
            borderRadius: 16,
            background: "#ffffff",
            boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
          }}
          title={
            <Text
              style={{
                fontWeight: 600,
                color: neutrals.textMain,
                fontSize: 15,
              }}
            >
              Estado de integraciones
            </Text>
          }
        >
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <Alert
              type="success"
              showIcon
              message="Motor de reservas conectado"
              description="Sincronización OK · Actualizado hace 2 minutos."
            />
            <Alert
              type="success"
              showIcon
              message="WhatsApp Business conectado"
              description="Notificaciones y respuestas automáticas activas."
            />
            <Alert
              type="info"
              showIcon
              message="Facebook Ads / Email"
              description="Seguimiento de conversiones habilitado."
            />
          </Space>
        </Card>
      </Col>
    </Row>
  );
};

export default PromocionesView;
