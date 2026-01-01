import { Row, Col, Space, Input, Select, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { neutrals } from "../../theme/beachTheme";

const { Text } = Typography;

const UsuariosFiltersBar = ({
  isMobile,
  userSearch,
  setUserSearch,
  userRoleFilter,
  setUserRoleFilter,

  userSedeFilter,
  setUserSedeFilter,
  sedeOptions = [],
  sedesLoading = false,
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
            options={[
              { value: "all", label: "Todos los tipos de acceso" },
              { value: "administrador", label: "Administradores" },
              { value: "staff", label: "Staff" },
            ]}
          />

          <Select
            size="small"
            value={userSedeFilter}
            onChange={setUserSedeFilter}
            loading={sedesLoading}
            style={{ width: isMobile ? "100%" : 200 }}
            placeholder="Sede"
            options={[{ value: "all", label: "Todas las sedes" }, ...sedeOptions]}
            showSearch
            optionFilterProp="label"
          />
        </Space>
      </Col>

      <Col xs={24} md={10} style={{ textAlign: isMobile ? "left" : "right" }}>
        <Text style={{ fontSize: 10, color: neutrals.textMuted }}>
          Solo perfiles con acceso administrativo pueden crear nuevos usuarios
          o modificar los existentes.
        </Text>
      </Col>
    </Row>
  );
};

export default UsuariosFiltersBar;
