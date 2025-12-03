// src/components/usuarios/UsuariosSummaryBar.jsx
import { Row, Col, Alert, Space, Tag, Typography } from "antd";
import { neutrals } from "../../theme/beachTheme";

const { Text } = Typography;

const UsuariosSummaryBar = ({
  total,
  adminsCount,
  staffCount,
  isMobile,
}) => {
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 6 }}>
      <Col xs={24} md={16}>
        <Alert
          type="info"
          showIcon
          style={{ padding: "6px 10px", borderRadius: 8 }}
          message={
            <Text style={{ fontSize: 11 }}>
              Gestiona quién puede acceder al panel y con qué alcance. Este
              módulo está pensado para responsables de sistemas o
              administración.
            </Text>
          }
        />
      </Col>
      <Col xs={24} md={8}>
        <Space
          size={6}
          style={{
            width: "100%",
            justifyContent: isMobile ? "flex-start" : "flex-end",
            flexWrap: "wrap",
          }}
        >
          <Tag
            style={{
              borderRadius: 999,
              fontSize: 10,
              background: "#eff6ff",
              border: "none",
              color: "#1d4ed8",
            }}
          >
            Total: {total}
          </Tag>
          <Tag
            style={{
              borderRadius: 999,
              fontSize: 10,
              background: "#ecfdf5",
              border: "none",
              color: "#047857",
            }}
          >
            Admins: {adminsCount}
          </Tag>
          <Tag
            style={{
              borderRadius: 999,
              fontSize: 10,
              background: "#f9fafb",
              border: "none",
              color: "#374151",
            }}
          >
            Staff: {staffCount}
          </Tag>
        </Space>
      </Col>
    </Row>
  );
};

export default UsuariosSummaryBar;
