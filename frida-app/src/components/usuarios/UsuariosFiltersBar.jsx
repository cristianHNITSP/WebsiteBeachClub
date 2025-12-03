// src/components/usuarios/UsuariosFiltersBar.jsx
import { Row, Col, Space, Input, Select, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { neutrals } from "../../theme/beachTheme";

const { Text } = Typography;
const { Option } = Select;

const UsuariosFiltersBar = ({
  isMobile,
  userSearch,
  setUserSearch,
  userRoleFilter,
  setUserRoleFilter,
}) => {
  return (
    <Row
      gutter={[12, 12]}
      style={{ marginBottom: 12, marginTop: 4 }}
      align="middle"
      justify="space-between"
    >
      <Col xs={24} md={14}>
        <Space
          size={8}
          style={{
            width: "100%",
            justifyContent: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <Input
            size="small"
            placeholder="Buscar por nombre, correo o tipo de acceso..."
            prefix={<SearchOutlined />}
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            style={{ width: isMobile ? "100%" : 260 }}
          />
          <Select
            size="small"
            value={userRoleFilter}
            onChange={setUserRoleFilter}
            style={{ width: isMobile ? "100%" : 180 }}
          >
            <Option value="all">Todos los tipos de acceso</Option>
            <Option value="administrador">Administradores</Option>
            <Option value="staff">Staff</Option>
          </Select>
        </Space>
      </Col>
      <Col
        xs={24}
        md={10}
        style={{
          textAlign: isMobile ? "left" : "right",
        }}
      >
        <Text
          style={{
            fontSize: 10,
            color: neutrals.textMuted,
          }}
        >
          Solo perfiles con acceso administrativo pueden crear nuevos usuarios
          o modificar los existentes.
        </Text>
      </Col>
    </Row>
  );
};

export default UsuariosFiltersBar;
