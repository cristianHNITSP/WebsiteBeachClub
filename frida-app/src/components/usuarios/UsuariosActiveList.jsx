// src/components/usuarios/UsuariosActiveList.jsx
import { List, Avatar, Tag, Typography, Space, Button, Popconfirm } from "antd";
import { beachColors, neutrals } from "../../theme/beachTheme";

const { Text } = Typography;

const UsuariosActiveList = ({
  filteredActiveUsers,
  loading,
  isMobile,
  fadingId,
  togglingId,
  abrirModalEditar,
  cambiarEstado,
}) => {
  return (
    <List
      dataSource={filteredActiveUsers}
      split={false}
      loading={loading}
      locale={{
        emptyText: "No hay usuarios activos que coincidan con el filtro.",
      }}
      renderItem={(user) => {
        const isFading = fadingId === user.id;

        return (
          <List.Item
            style={{
              padding: isFading ? "0 6px" : "8px 6px",
              marginBottom: isFading ? 0 : 4,
              borderRadius: 10,
              border: "1px solid #f1f5f9",
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              justifyContent: "space-between",
              opacity: isFading ? 0 : 1,
              maxHeight: isFading ? 0 : 80,
              overflow: "hidden",
              transform: isFading ? "translateX(12px)" : "translateX(0)",
              transition: "all 0.22s ease",
            }}
          >
            <List.Item.Meta
              avatar={
                <Avatar
                  style={{
                    backgroundColor:
                      user.role === "administrador"
                        ? beachColors.teal
                        : beachColors.oceanBlue,
                    color: "#ffffff",
                    fontWeight: 600,
                  }}
                >
                  {user.name.charAt(0)}
                </Avatar>
              }
              title={
                <Space size={6} wrap>
                  <Text style={{ fontWeight: 500 }}>{user.name}</Text>
                  <Tag
                    color={beachColors.sand}
                    style={{
                      borderRadius: 999,
                      fontSize: 9,
                      color: beachColors.deepBlue,
                    }}
                  >
                    {user.roleLabel}
                    {user.isSelf ? " · Tú" : ""}
                  </Tag>
                </Space>
              }
              description={
                <Space direction="vertical" size={0}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: neutrals.textMuted,
                    }}
                  >
                    {user.email}
                  </Text>

                  <Text
                    style={{
                      fontSize: 10,
                      color: neutrals.textMuted,
                    }}
                  >
                    Alta en el sistema:{" "}
                    {new Date(user.createdAt).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </Text>
                </Space>
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
                color={beachColors.teal}
                style={{
                  borderRadius: 999,
                  fontSize: 9,
                  color: "#064e3b",
                }}
              >
                Activo
              </Tag>
              <Text
                style={{
                  fontSize: 10,
                  color: neutrals.textMuted,
                }}
              >
                {user.lastAccess}
              </Text>

              {!user.isSelf ? (
                <Space
                  size={4}
                  wrap
                  style={{
                    justifyContent: isMobile ? "flex-end" : "flex-end",
                  }}
                >
                  <Button
                    type="link"
                    size="small"
                    onClick={() => abrirModalEditar(user)}
                    style={{ paddingInline: 4, fontSize: 10 }}
                  >
                    Editar datos
                  </Button>

                  <Popconfirm
                    title="Enviar a papelera"
                    description="Este usuario no podrá iniciar sesión hasta que lo restaures."
                    okText="Sí, enviar"
                    cancelText="Cancelar"
                    placement="left"
                    onConfirm={() => cambiarEstado(user)}
                  >
                    <Button
                      type="link"
                      size="small"
                      loading={togglingId === user.id}
                      style={{ paddingInline: 4, fontSize: 10 }}
                    >
                      Enviar a papelera
                    </Button>
                  </Popconfirm>
                </Space>
              ) : (
                <Text
                  style={{
                    fontSize: 10,
                    color: neutrals.textMuted,
                  }}
                >
                  Este es tu usuario actual (no editable aquí).
                </Text>
              )}
            </Space>
          </List.Item>
        );
      }}
    />
  );
};

export default UsuariosActiveList;
