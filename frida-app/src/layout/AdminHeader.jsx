// src/layout/AdminHeader.jsx
import {
  Layout,
  Typography,
  Space,
  Button,
  Dropdown,
  Flex,
  message,
} from "antd";

import { DownOutlined, UserOutlined, HomeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { beachColors } from "../theme/beachTheme";

const { Header } = Layout;
const { Text } = Typography;

const AdminHeader = ({ isMobile, currentUser }) => {
  const navigate = useNavigate();

  const handleMenuClick = async ({ key }) => {
    switch (key) {
      case "profile":
        message.info("Vista de perfil en construcción.");
        break;

      case "settings":
        message.info("Configuración en construcción.");
        break;

      case "logout":
        try {
          await axios.post("/api/auth/logout", {}, { withCredentials: true });

          window.localStorage.removeItem("panelAdminActiveTab");

          message.success("Sesión cerrada correctamente.");

          navigate("/panel.web/login.panel.web", { replace: true });
        } catch (err) {
          console.error("[logout] Error:", err);
          message.error("No se pudo cerrar la sesión. Intenta de nuevo.");
        }
        break;

      default:
        break;
    }
  };

  const managerMenu = {
    items: [
      { key: "profile", label: "Perfil" },
      { key: "settings", label: "Configuración" },
      { key: "logout", label: "Cerrar sesión" },
    ],
    onClick: handleMenuClick,
  };

  const displayName = currentUser?.name || "Manager Admin";

  const goToPublicSite = () => {
    // Si hay currentUser, lo mandamos en el state; si no, navegamos limpio
    if (currentUser) {
      navigate("/", { state: { currentUser } });
    } else {
      navigate("/");
    }
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
          {/* 👇 Botón para ir al sitio público "/" heredando currentUser */}
          <Button
            size={isMobile ? "small" : "middle"}
            icon={<HomeOutlined />}
            onClick={goToPublicSite}
            style={{
              borderRadius: 999,
              paddingInline: isMobile ? 10 : 16,
              height: isMobile ? 30 : 36,
              background: "rgba(255,255,255,0.12)",
              borderColor: "rgba(255,255,255,0.45)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: 6,
              backdropFilter: "blur(4px)",
            }}
          >
            {!isMobile && "Ver sitio"}
          </Button>

          <Dropdown
            menu={managerMenu}
            trigger={["click"]}
            placement="bottomRight"
          >
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
              {!isMobile && displayName}
              <DownOutlined style={{ fontSize: 10 }} />
            </Button>
          </Dropdown>
        </Space>
      </Flex>
    </Header>
  );
};

export default AdminHeader;
