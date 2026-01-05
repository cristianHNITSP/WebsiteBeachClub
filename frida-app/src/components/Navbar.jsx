// src/components/Navbar.jsx
import {
  Layout,
  Button,
  Typography,
  Space,
  Row,
  Col,
  Avatar,
  Tag,
  Tooltip,
  Grid,
  theme,
} from "antd";
import {
  SearchOutlined,
  UserOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";

import { beachColors, neutrals } from "../theme/beachTheme";

const { Header } = Layout;
const { Text } = Typography;

const TOKENS = {
  h: 58,
  padX: 18,
  padXMobile: 12,

  mark: 28,

  // espacio reservado al centro para el NotchBar (responsivo)
  notchXL: 260,
  notchLG: 240,
  notchMD: 210,
  notchSM: 170,
  notchXS: 130,
};

const Navbar = ({
  variant = "gradient",
  onGoSearch,
  onGoAccount,
  onGoHome,
}) => {
  const isLight = variant === "light";
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();

  const isMobile = !screens.md;
  const padX = isMobile ? TOKENS.padXMobile : TOKENS.padX;

  const notchW = screens.xl
    ? TOKENS.notchXL
    : screens.lg
    ? TOKENS.notchLG
    : screens.md
    ? TOKENS.notchMD
    : screens.sm
    ? TOKENS.notchSM
    : TOKENS.notchXS;

  const headerBg = isLight
    ? token.colorBgContainer
    : `linear-gradient(180deg, ${beachColors.deepBlue} 0%, rgba(14,165,233,.92) 100%)`;

  const headerStyle = {
    height: TOKENS.h,
    paddingInline: padX,
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: headerBg,
    borderBottom: isLight ? `1px solid ${token.colorBorderSecondary}` : "none",
    boxShadow: isLight ? "none" : "0 18px 50px rgba(15, 23, 42, .10)",
    overflow: "hidden",
  };

  const logoTextColor = isLight ? neutrals.textMain : "#fff";
  const subTextColor = isLight ? "rgba(15,23,42,.55)" : "rgba(255,255,255,.78)";

  return (
    <Header style={headerStyle}>
      {/* glow “gratis” (sin CSS externo) */}
      {!isLight && (
        <div
          style={{
            position: "absolute",
            inset: -120,
            background:
              "radial-gradient(circle at 25% 25%, rgba(255,255,255,.16), rgba(255,255,255,0) 55%)",
            pointerEvents: "none",
          }}
        />
      )}

      <Row align="middle" wrap={false} style={{ height: "100%", position: "relative" }}>
        {/* LEFT */}
        <Col flex="1 1 0" style={{ minWidth: 0 }}>
          <Button
            type="text"
            onClick={onGoHome}
            style={{
              padding: 0,
              height: "auto",
              color: logoTextColor,
              borderRadius: 999,
              maxWidth: "100%",
            }}
          >
            <Space size={10} align="center" style={{ minWidth: 0 }}>
              <Avatar
                size={TOKENS.mark}
                style={{
                  background: `linear-gradient(135deg, ${beachColors.turquoise}, ${beachColors.oceanBlue})`,
                  boxShadow: "0 14px 28px rgba(14,165,233,.30)",
                }}
              />

              <Space direction="vertical" size={0} style={{ minWidth: 0 }}>
                {!isMobile && (
                  <Text
                    style={{ fontWeight: 900, fontSize: 14, lineHeight: 1.1, color: logoTextColor }}
                    ellipsis={{ tooltip: false }}
                  >
                    Hoteles Frida
                  </Text>
                )}

                <Space size={6} align="center">
                  {screens.md && (
                    <EnvironmentOutlined style={{ fontSize: 12, color: subTextColor }} />
                  )}
                  {screens.md && (
                    <Text style={{ fontWeight: 800, fontSize: 11, color: subTextColor }}>
                      Chelem · Chuburná
                    </Text>
                  )}
                </Space>
              </Space>

              {screens.xl && (
                <Tag color={isLight ? "blue" : "geekblue"} style={{ borderRadius: 999, fontWeight: 900 }}>
                  Reservas directas
                </Tag>
              )}
            </Space>
          </Button>
        </Col>

        {/* CENTER GAP (para el NotchBar) */}
        <Col flex={`${notchW}px`} style={{ height: "100%", pointerEvents: "none" }} aria-hidden />

        {/* RIGHT */}
        <Col flex="1 1 0" style={{ minWidth: 0, textAlign: "right" }}>
          <Space size={10} align="center">
            <Tooltip title="Buscar disponibilidad y reservar">
              <Button
                type="primary"
                shape="round"
                icon={<SearchOutlined />}
                onClick={onGoSearch}
                style={{
                  fontWeight: 900,
                  background: isLight ? beachColors.oceanBlue : beachColors.coral,
                  borderColor: isLight ? beachColors.oceanBlue : beachColors.coral,
                  boxShadow: isLight
                    ? "0 16px 34px rgba(14,165,233,.22)"
                    : "0 16px 34px rgba(251,113,133,.22)",
                }}
              >
                {screens.md ? "Reservar" : null}
              </Button>
            </Tooltip>

            <Tooltip title="Ver tus reservas">
              <Button
                shape="round"
                icon={<UserOutlined />}
                onClick={onGoAccount}
                style={{
                  fontWeight: 900,
                  background: isLight ? "rgba(243,246,251,.85)" : "rgba(255,255,255,.12)",
                  borderColor: isLight ? token.colorBorderSecondary : "rgba(255,255,255,.25)",
                  color: isLight ? "rgba(15,23,42,.76)" : "rgba(255,255,255,.92)",
                }}
              >
                {screens.md ? "Mis reservas" : null}
              </Button>
            </Tooltip>
          </Space>
        </Col>
      </Row>
    </Header>
  );
};

export default Navbar;
