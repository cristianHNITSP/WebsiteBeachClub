// src/components/habitaciones/HabitacionesHeader.jsx
import React from "react";
import { Row, Col, Space, Typography, Button } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { beachTheme, neutralsTheme as neutrals } from "./helpers";

const { Text, Title } = Typography;

const HabitacionesHeader = ({
  isMobile,
  currentUser,
  canManageRooms,
  onNueva,
  onRecargar,
  loading,
  onOpenSedes,
}) => {
  return (
    <Row gutter={[12, 12]} align="middle" justify="space-between">
      <Col xs={24} md={12}>
        <Space direction="vertical" size={2}>
          <Title
            level={5}
            style={{
              margin: 0,
              color: neutrals.textMain,
              fontWeight: 600,
            }}
          >
            Configuración de habitaciones
          </Title>
          <Text
            style={{
              fontSize: 11,
              color: neutrals.textMuted,
            }}
          >
            Administra el inventario físico de habitaciones para Casa Frida y
            Cabañas Frida. Esto no modifica reservas, solo la estructura
            disponible.
          </Text>
          {currentUser && (
            <Text
              style={{
                fontSize: 10,
                color: neutrals.textMuted,
              }}
            >
              Sesión: {currentUser.name || currentUser.email} · Rol:{" "}
              {currentUser.role || "—"}
            </Text>
          )}
        </Space>
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
          <Button
            size="small"
            icon={<ReloadOutlined spin={loading} />}
            onClick={onRecargar}
            loading={loading}
            style={{
              borderRadius: 999,
              fontSize: 11,
            }}
          >
            Recargar
          </Button>

          {canManageRooms && (
            <Button
              size="small"
              onClick={onOpenSedes}
              disabled={loading}
              style={{
                borderRadius: 999,
                fontSize: 11,
              }}
            >
              Gestionar sedes
            </Button>
          )}

          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={onNueva}
            disabled={!canManageRooms || loading}
            style={{
              borderRadius: 999,
              background: canManageRooms ? beachTheme.oceanBlue : "#9ca3af",
              borderColor: canManageRooms ? beachTheme.oceanBlue : "#9ca3af",
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            Nueva habitación
          </Button>
        </Space>
      </Col>
    </Row>
  );
};

export default HabitacionesHeader;
