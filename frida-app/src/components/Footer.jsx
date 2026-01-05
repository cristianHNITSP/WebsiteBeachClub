// src/components/Footer.jsx
import { Button, Flex, Typography, Tooltip, Grid, theme, Tag } from "antd";
import {
  HeartFilled,
  LockOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  CompassOutlined,
  WhatsAppOutlined,
  ArrowUpOutlined,
  FacebookOutlined,
  BookOutlined,
} from "@ant-design/icons";

const { Text } = Typography;
import { beachColors } from "../theme/beachTheme";

const BASE_URL = (import.meta?.env?.BASE_URL || "/").replace(/\/$/, "");
const PANEL_LOGIN_HREF = `${BASE_URL}/panel.web/login.panel.web`;

const RAW_WA = String(import.meta.env?.VITE_WHATSAPP_NUMBER || "").trim();
const WA_NUMBER = RAW_WA.replace(/[^\d]/g, "");

const footerLinks = [
  {
    nombre: "Casa Frida (Facebook)",
    path: "https://www.facebook.com/casafridachelem/",
    icon: <FacebookOutlined />,
    external: true,
  },
  {
    nombre: "Casa Frida (Booking)",
    path: "https://www.booking.com/hotel/mx/casa-frida-chelem.es.html?aid=356980&label=gog235jc-10CAsooAFCEWNhc2EtZnJpZGEtY2hlbGVtSFJYA2igAYgBAZgBM7gBGcgBD9gBA-gBAfgBAYgCAagCAbgC_oDsygbAAgHSAiRmOTQ4MjMyMi0zZjBmLTRiNzUtOTA3MC1jYTMzZWQ5NTdkMWbYAgHgAgE&sid=8c9a5c1b43a2badf87933679ca1701d6&dist=0&keep_landing=1&sb_price_type=total&type=total&chal_t=1767571582517&force_referer=https%3A%2F%2Fwww.google.com%2F",
    icon: <BookOutlined />,
    external: true,
  },
  {
    nombre: "Cabañas Frida (Facebook)",
    path: "https://www.facebook.com/cabanasfridachelem/",
    icon: <FacebookOutlined />,
    external: true,
  },
  {
    nombre: "Cabañas Frida (Booking)",
    path: "https://www.booking.com/hotel/mx/cabanas-frida.es.html?aid=356980&label=gog235jc-10CAsooAFCDWNhYmFuYXMtZnJpZGFIUlgDaKABiAEBmAEzuAEZyAEP2AED6AEB-AEBiAIBqAIBuALVgezKBsACAdICJGQ5OGNkN2NhLWExOWItNDNlOC1iNDYxLWQxMDJhOTE4ZGEzNNgCAeACAQ&sid=8c9a5c1b43a2badf87933679ca1701d6&dist=0&keep_landing=1&sb_price_type=total&type=total&",
    icon: <BookOutlined />,
    external: true,
  },
  {
    nombre: "Acceso a staff",
    path: PANEL_LOGIN_HREF,
    icon: <LockOutlined />,
    external: false,
  },
];

const Footer = () => {
  const waDisabled = !WA_NUMBER;
  const screens = Grid.useBreakpoint();
  const { token } = theme.useToken();

  const padY = screens.md ? 30 : 24;

  return (
    <footer
      style={{
        padding: `${padY}px 14px 22px`,
        background: `linear-gradient(135deg, ${beachColors.deepBlue}, ${beachColors.oceanBlue})`,
        color: "white",
        position: "relative",
        overflow: "hidden",
        borderTop: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      {/* capas de luz para quitar lo plano */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(1000px 260px at 18% 0%, rgba(255,255,255,0.20), transparent 62%), radial-gradient(780px 300px at 86% 10%, rgba(45,212,191,0.14), transparent 58%), radial-gradient(700px 280px at 88% 65%, rgba(251,113,133,0.10), transparent 60%)",
          pointerEvents: "none",
        }}
      />

      {/* highlight superior finito */}
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

      <Flex
        vertical
        gap={14}
        style={{
          position: "relative",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <Flex
          justify="space-between"
          align="flex-start"
          wrap
          gap={16}
          style={{
            padding: screens.md ? "18px 18px" : "16px 14px",
            borderRadius: 20,
            background: "rgba(255,255,255,0.09)",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow:
              "0 22px 56px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.14)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* Marca */}
          <Flex vertical gap={10} style={{ minWidth: 260, flex: "1 1 330px" }}>
            <Flex align="center" gap={10}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 14,
                  background: `linear-gradient(135deg, rgba(45,212,191,0.22), rgba(14,165,233,0.20))`,
                  border: "1px solid rgba(255,255,255,0.20)",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 12px 24px rgba(0,0,0,0.18)",
                }}
                aria-hidden
              >
                <span style={{ fontWeight: 950, fontSize: 13, letterSpacing: 0.4 }}>
                  HF
                </span>
              </div>

              <div style={{ lineHeight: 1.1 }}>
                <Text style={{ color: "#fff", fontWeight: 900, fontSize: 14 }}>
                  Hoteles Frida
                </Text>
                <div>
                  <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 11 }}>
                    Reservas directas · Atención personalizada
                  </Text>
                </div>
              </div>

              <Tag
                style={{
                  marginLeft: 8,
                  borderRadius: 999,
                  fontWeight: 900,
                  paddingInline: 10,
                  height: 26,
                  display: screens.md ? "inline-flex" : "none",
                  alignItems: "center",
                  color: "rgba(255,255,255,0.92)",
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                Costa Yucatán
              </Tag>
            </Flex>

            <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, lineHeight: 1.45 }}>
              Encuentra tu estancia ideal en la costa. Precios claros, trato cercano y confirmación rápida.
            </Text>

            <Flex wrap gap={8}>
              <span
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  background: "rgba(45,212,191,0.18)",
                  border: "1px solid rgba(45,212,191,0.32)",
                  color: "#ecfeff",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <SafetyCertificateOutlined style={{ fontSize: 12 }} />
                Reservas seguras
              </span>

              <span
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "rgba(255,255,255,0.92)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <ThunderboltOutlined style={{ fontSize: 12 }} />
                Respuesta rápida
              </span>

              <span
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  background: "rgba(245,158,11,0.16)",
                  border: "1px solid rgba(245,158,11,0.28)",
                  color: "#fff7ed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <CompassOutlined style={{ fontSize: 12 }} />
                Experiencias únicas
              </span>
            </Flex>
          </Flex>

          {/* Links */}
          <Flex vertical gap={10} style={{ minWidth: 220, flex: "0 1 320px" }}>
            <Text style={{ color: "#fff", fontWeight: 900, fontSize: 12 }}>
              Enlaces
            </Text>

            <Flex vertical gap={6}>
              {footerLinks.map((link, i) => (
                <Button
                  key={i}
                  type="text"
                  href={link.path}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  style={{
                    justifyContent: "flex-start",
                    paddingInline: 10,
                    height: 36,
                    borderRadius: 12,
                    color: "rgba(255,255,255,0.82)",
                    background: "transparent",
                    border: "1px solid transparent",
                    transition: "all 160ms ease",
                  }}
                  icon={
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 10,
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(255,255,255,0.10)",
                        border: "1px solid rgba(255,255,255,0.16)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                      }}
                    >
                      {link.icon}
                    </span>
                  }
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    el.style.background = "rgba(255,255,255,0.10)";
                    el.style.borderColor = "rgba(255,255,255,0.18)";
                    el.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.background = "transparent";
                    el.style.borderColor = "transparent";
                    el.style.color = "rgba(255,255,255,0.82)";
                  }}
                >
                  {link.nombre}
                </Button>
              ))}
            </Flex>
          </Flex>

          {/* CTA */}
          <Flex vertical gap={10} style={{ minWidth: 220, flex: "0 1 260px" }}>
            <Text style={{ color: "#fff", fontWeight: 900, fontSize: 12 }}>
              ¿Necesitas ayuda?
            </Text>

            <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 12, lineHeight: 1.45 }}>
              Escríbenos y te asesoramos con disponibilidad y recomendaciones.
            </Text>

            <Flex gap={10} wrap>
              <Tooltip
                title={
                  waDisabled
                    ? "Configura VITE_WHATSAPP_NUMBER en frida-app/.env"
                    : "Escríbenos por WhatsApp"
                }
              >
                <Button
                  size="small"
                  type="primary"
                  icon={<WhatsAppOutlined />}
                  disabled={waDisabled}
                  style={{
                    borderRadius: 999,
                    height: 36,
                    paddingInline: 14,
                    fontWeight: 950,
                    background: `linear-gradient(90deg, ${beachColors.turquoise}, ${beachColors.teal})`,
                    border: "none",
                    boxShadow: "0 12px 26px rgba(45,212,191,0.28)",
                    opacity: waDisabled ? 0.6 : 1,
                  }}
                  onClick={() => {
                    const texto =
                      "Hola, quiero ayuda para reservar en Hoteles Frida.";
                    window.open(
                      `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(texto)}`,
                      "_blank",
                      "noopener,noreferrer"
                    );
                  }}
                >
                  WhatsApp
                </Button>
              </Tooltip>

              <Button
                size="small"
                icon={<ArrowUpOutlined />}
                style={{
                  borderRadius: 999,
                  height: 36,
                  paddingInline: 14,
                  fontWeight: 950,
                  color: "#fff",
                  background: "rgba(255,255,255,0.10)",
                  borderColor: "rgba(255,255,255,0.22)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                }}
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Volver arriba
              </Button>
            </Flex>
          </Flex>
        </Flex>

        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.14)",
            marginTop: 2,
          }}
        />

        <Flex
          justify="space-between"
          align="center"
          wrap
          gap={10}
          style={{ paddingInline: 6 }}
        >
          <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 12 }}>
            © {new Date().getFullYear()} Hoteles Frida. Todos los derechos reservados.
          </Text>

          <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 11 }}>
            Hecho con <HeartFilled style={{ fontSize: 12 }} /> en Yucatán
          </Text>
        </Flex>
      </Flex>
    </footer>
  );
};

export default Footer;
