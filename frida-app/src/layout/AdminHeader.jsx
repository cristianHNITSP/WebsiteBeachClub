// src/layout/AdminHeader.jsx

import {
  Layout,
  Typography,
  Space,
  Badge,
  Button,
  Dropdown,
  Flex,
} from "antd";
import {
  BellOutlined,
  DownOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { beachColors } from "../theme/beachTheme";

const { Header } = Layout;
const { Text } = Typography;

const AdminHeader = ({ isMobile }) => {
  const managerMenu = {
    items: [
      { key: "profile", label: "Perfil" },
      { key: "settings", label: "Configuración" },
      { key: "logout", label: "Cerrar sesión" },
    ],
  };

  return (
    <Header
      style={{
        backgroundImage: `linear-gradient(90deg, ${beachColors.oceanBlue}, ${beachColors.teal})`,
        padding: isMobile ? "0 10px" : "0 40px",
        boxShadow: "0 4px 14px rgba(15,23,42,0.28)",
        zIndex: 50,
      }}
    >
      <Flex
        align="center"
        justify="space-between"
        style={{
          width: "100%",
          maxWidth: 1400,
          margin: "0 auto",
          padding: 10,
          gap: isMobile ? 8 : 16,
        }}
      >
        {/* Branding */}
        <Flex align="center" gap={10}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              background: beachColors.sand,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              color: beachColors.deepBlue,
              fontSize: 18,
              boxShadow: "0 4px 10px rgba(15,23,42,0.22)",
            }}
          >
            BC
          </div>
          <Flex vertical style={{ lineHeight: 1.1 }}>
            <Text
              style={{
                color: "#ffffff",
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              Beach Club
            </Text>
            {!isMobile && (
              <Text
                style={{
                  color: "rgba(255,255,255,0.78)",
                  fontSize: 11,
                }}
              >
                Panel de administración central
              </Text>
            )}
          </Flex>
        </Flex>

        {/* Acciones header */}
        <Space
          size={isMobile ? 6 : 14}
          align="center"
          style={{ flexShrink: 0 }}
        >
      

          <Dropdown menu={managerMenu} placement="bottomRight">
            <Button
              icon={<UserOutlined />}
              style={{
                borderRadius: 999,
                paddingInline: isMobile ? 8 : 16,
                height: isMobile ? 30 : 36,
                border: "none",
                background: beachColors.sand,
                color: beachColors.deepBlue,
                fontWeight: 500,
                boxShadow: "0 2px 8px rgba(15,23,42,0.25)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {!isMobile && "Manager Admin"}
              <DownOutlined style={{ fontSize: 10 }} />
            </Button>
          </Dropdown>
        </Space>
      </Flex>
    </Header>
  );
};

export default AdminHeader;
