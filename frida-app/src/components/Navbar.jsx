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

  // Gradiente más sobrio (menos “glass”)
  const headerBg = isLight
    ? token.colorBgContainer
    : `linear-gradient(90deg, ${beachColors.oceanBlue}, ${beachColors.teal})`;

  const headerStyle = {
    height: TOKENS.h,
    paddingInline: padX,
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: headerBg,
    //backgroundImage: `linear-gradient(90deg, ${beachColors.oceanBlue}, ${beachColors.teal})`,
    borderBottom: isLight
      ? `1px solid ${token.colorBorderSecondary}`
      : "1px solid rgba(255,255,255,.10)",
    boxShadow: isLight ? "none" : "0 10px 30px rgba(15, 23, 42, .16)",
    overflow: "hidden",
  };

  const logoTextColor = isLight ? neutrals.textMain : "#fff";
  const subTextColor = isLight
    ? "rgba(15,23,42,.55)"
    : "rgba(255,255,255,.80)";

  // Botones más AntD “producto” (menos efecto iOS)
  const primaryBtnStyle = {
    fontWeight: 950,
    background: beachColors.coral,
    borderColor: beachColors.coral,
    boxShadow: "0 10px 22px rgba(251,113,133,.22)",
  };

  const secondaryBtnStyle = {
    fontWeight: 900,
    background: isLight ? token.colorBgElevated : "rgba(255,255,255,.10)",
    borderColor: isLight ? token.colorBorderSecondary : "rgba(255,255,255,.22)",
    color: isLight ? "rgba(15,23,42,.78)" : "rgba(255,255,255,.92)",
  };

  const brandWrapStyle = {
    borderRadius: 14,
    padding: "6px 10px",
    background: isLight ? "transparent" : "rgba(255,255,255,.08)",
    border: isLight ? "1px solid transparent" : "1px solid rgba(255,255,255,.14)",
  };

  return (
    <Header style={headerStyle}>
      {/* Material muy sutil: highlight arriba + leve sombra abajo (no iOS) */}
      {!isLight && (
        <>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: 1,
              background: "rgba(255,255,255,.14)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: -18,
              height: 30,
              background:
                "linear-gradient(180deg, rgba(15,23,42,0), rgba(15,23,42,.14))",
              pointerEvents: "none",
            }}
          />
        </>
      )}

      <Row
        align="middle"
        wrap={false}
        style={{ height: "100%", position: "relative" }}
      >
        {/* LEFT */}
        <Col flex="1 1 0" style={{ minWidth: 0 }}>
          <Button
            type="text"
            onClick={onGoHome}
            style={{
              padding: 0,
              height: "auto",
              borderRadius: 14,
              maxWidth: "100%",
            }}
          >
            <div style={brandWrapStyle}>
              <Space size={10} align="center" style={{ minWidth: 0 }}>
                <Avatar
                  size={TOKENS.mark}
                  style={{
                    background: `linear-gradient(135deg, ${beachColors.turquoise}, ${beachColors.oceanBlue})`,
                    boxShadow: "0 10px 18px rgba(14,165,233,.20)",
                    border: isLight
                      ? `1px solid ${token.colorBorderSecondary}`
                      : "1px solid rgba(255,255,255,.22)",
                  }}
                />

                <Space direction="vertical" size={0} style={{ minWidth: 0 }}>
                  {!isMobile && (
                    <Text
                      style={{
                        fontWeight: 950,
                        fontSize: 14,
                        lineHeight: 1.05,
                        color: logoTextColor,
                        letterSpacing: 0.2,
                      }}
                      ellipsis={{ tooltip: false }}
                    >
                      Hoteles Frida
                    </Text>
                  )}

                  <Space size={6} align="center">
                    {screens.md && (
                      <EnvironmentOutlined
                        style={{ fontSize: 12, color: subTextColor }}
                      />
                    )}
                    {screens.md && (
                      <Text
                        style={{
                          fontWeight: 800,
                          fontSize: 11,
                          color: subTextColor,
                        }}
                      >
                        Chelem · Chuburná
                      </Text>
                    )}
                  </Space>
                </Space>

                {screens.xl && (
                  <Tag
                    style={{
                      borderRadius: 999,
                      fontWeight: 900,
                      paddingInline: 10,
                      height: 26,
                      display: "inline-flex",
                      alignItems: "center",
                      marginInlineStart: 6,
                      background: isLight
                        ? "rgba(14,165,233,.10)"
                        : "rgba(255,255,255,.10)",
                      border: isLight
                        ? "1px solid rgba(14,165,233,.18)"
                        : "1px solid rgba(255,255,255,.16)",
                      color: isLight
                        ? "rgba(14,165,233,.95)"
                        : "rgba(255,255,255,.90)",
                    }}
                  >
                    Reservas directas
                  </Tag>
                )}
              </Space>
            </div>
          </Button>
        </Col>

        {/* CENTER GAP (para el NotchBar) */}
        <Col
          flex={`${notchW}px`}
          style={{ height: "100%", pointerEvents: "none" }}
          aria-hidden
        />

        {/* RIGHT */}
        <Col flex="1 1 0" style={{ minWidth: 0, textAlign: "right" }}>
          <Space size={10} align="center">
            <Tooltip title="Buscar disponibilidad y reservar">
              <Button
                type="primary"
                shape="round"
                icon={<SearchOutlined />}
                onClick={onGoSearch}
                style={primaryBtnStyle}
              >
                {screens.md ? "Reservar" : null}
              </Button>
            </Tooltip>

            <Tooltip title="Ver tus reservas">
              <Button
                shape="round"
                icon={<UserOutlined />}
                onClick={onGoAccount}
                style={secondaryBtnStyle}
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
