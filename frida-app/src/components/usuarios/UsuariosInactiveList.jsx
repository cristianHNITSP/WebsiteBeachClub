// src/components/usuarios/UsuariosInactiveList.jsx
import {
  Collapse,
  List,
  Avatar,
  Tag,
  Typography,
  Space,
  Button,
  Popconfirm,
} from "antd";
import { neutrals } from "../../theme/beachTheme";

const { Text } = Typography;
const { Panel } = Collapse;

const UsuariosInactiveList = ({
  filteredInactiveUsers,
  isMobile,
  togglingId,
  cambiarEstado,
}) => {
  if (filteredInactiveUsers.length === 0) return null;

  return (
    <>
      <Collapse
        bordered={false}
        defaultActiveKey={[]}
        style={{ background: "transparent", marginTop: 14 }}
      >
        <Panel
          key="trash"
          header={
            <Space size={6}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: neutrals.textMain,
                }}
              >
                Usuarios inactivos (papelera interna)
              </Text>
              <Tag
                style={{
                  borderRadius: 999,
                  fontSize: 10,
                  background: "#f9fafb",
                  border: "none",
                  color: "#6b7280",
                }}
              >
                {filteredInactiveUsers.length}
              </Tag>
            </Space>
          }
          style={{
            background: "#f9fafb",
            borderRadius: 10,
            border: "1px dashed #e5e7eb",
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: neutrals.textMuted,
              display: "block",
              marginBottom: 6,
            }}
          >
            Los usuarios inactivos no pueden acceder al sistema, pero se
            conservan para historial. Puedes restaurarlos cuando lo necesites.
          </Text>

          <List
            dataSource={filteredInactiveUsers}
            split={false}
            renderItem={(user) => (
              <List.Item
                style={{
                  padding: "6px 6px",
                  marginBottom: 4,
                  borderRadius: 10,
                  border: "1px dashed #e5e7eb",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#fefefe",
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      style={{
                        backgroundColor: "#9ca3af",
                        color: "#ffffff",
                        fontWeight: 600,
                      }}
                    >
                      {user.name.charAt(0)}
                    </Avatar>
                  }
                  title={
                    <Space size={6} wrap>
                      <Text
                        style={{
                          fontWeight: 500,
                          color: "#4b5563",
                        }}
                      >
                        {user.name}
                      </Text>
                      <Tag
                        style={{
                          borderRadius: 999,
                          fontSize: 9,
                          background: "#f3f4f6",
                          border: "none",
                          color: "#374151",
                        }}
                      >
                        {user.roleLabel}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Text
                      style={{
                        fontSize: 11,
                        color: neutrals.textMuted,
                      }}
                    >
                      {user.email}
                    </Text>
                  }
                />

                <Space
                  direction="vertical"
                  align="end"
                  size={4}
                  style={{
                    minWidth: isMobile ? "100%" : 190,
                    textAlign: "right",
                  }}
                >
                  <Tag
                    color="#9ca3af"
                    style={{
                      borderRadius: 999,
                      fontSize: 9,
                      color: "#111827",
                    }}
                  >
                    Inactivo (en papelera)
                  </Tag>
                  <Text
                    style={{
                      fontSize: 10,
                      color: neutrals.textMuted,
                    }}
                  >
                    Último acceso: {user.lastAccess}
                  </Text>

                  <Space
                    size={4}
                    wrap
                    style={{
                      justifyContent: isMobile ? "flex-end" : "flex-end",
                    }}
                  >
                    <Popconfirm
                      title="Restaurar usuario"
                      description="El usuario volverá a poder iniciar sesión en el panel."
                      okText="Restaurar"
                      cancelText="Cancelar"
                      placement={isMobile ? "top" : "left"}
                      overlayStyle={{
                        maxWidth: 320,
                        whiteSpace: "normal",
                      }}
                      onConfirm={() => cambiarEstado(user)}
                    >
                      <Button
                        type="link"
                        size="small"
                        loading={togglingId === user.id}
                        style={{ paddingInline: 4, fontSize: 10 }}
                      >
                        Restaurar
                      </Button>
                    </Popconfirm>
                  </Space>
                </Space>
              </List.Item>
            )}
          />
        </Panel>
      </Collapse>
    </>
  );
};

export default UsuariosInactiveList;
