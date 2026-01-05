import { Button, Flex, Typography, Tooltip } from "antd";
import {
  HeartFilled,
  FileTextOutlined,
  LockOutlined,
  PhoneOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  CompassOutlined,
  WhatsAppOutlined,
  ArrowUpOutlined,
  FacebookOutlined,
  BookOutlined,
  GlobalOutlined,
} from "@ant-design/icons";

const { Text } = Typography;
import { beachColors } from "../theme/beachTheme";

// URL interna (respeta Vite base y tu basename)
const BASE_URL = (import.meta?.env?.BASE_URL || "/").replace(/\/$/, "");
const PANEL_LOGIN_HREF = `${BASE_URL}/panel.web/login.panel.web`;

//  WhatsApp desde env (acepta +, espacios, etc. y lo convierte a solo dígitos)
const RAW_WA = String(import.meta.env?.VITE_WHATSAPP_NUMBER || "").trim();
const WA_NUMBER = RAW_WA.replace(/[^\d]/g, ""); // "+57 316..." -> "57316..."

const footerLinks = [
  // Casa Frida
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

  // Panel interno
  {
    nombre: "Acceso a staff",
    path: PANEL_LOGIN_HREF,
    icon: <LockOutlined />,
    external: false,
  },

  // (si luego reactivas legales)
  // { nombre: "Términos", path: "#", icon: <FileTextOutlined />, external: false },
  // { nombre: "Privacidad", path: "#", icon: <LockOutlined />, external: false },
  // { nombre: "Contacto", path: "#", icon: <PhoneOutlined />, external: false },
  // { nombre: "Nosotros", path: "#", icon: <InfoCircleOutlined />, external: false },
];

const Footer = () => {
  const waDisabled = !WA_NUMBER;

  return (
    <footer
      style={{
        padding: "28px 14px 22px",
        background: `linear-gradient(135deg, ${beachColors.deepBlue}, ${beachColors.oceanBlue})`,
        color: "white",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(900px 220px at 20% 0%, rgba(255,255,255,0.18), transparent 60%), radial-gradient(700px 240px at 85% 10%, rgba(45,212,191,0.14), transparent 55%)",
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
            padding: "14px 16px",
            borderRadius: 18,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.16)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
          }}
        >
          {/* Marca */}
          <Flex vertical gap={8} style={{ minWidth: 260, flex: "1 1 320px" }}>
            <Flex align="center" gap={10}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 10px 20px rgba(0,0,0,0.18)",
                }}
                aria-hidden
              >
                <span style={{ fontWeight: 800, fontSize: 14 }}>HF</span>
              </div>

              <div style={{ lineHeight: 1.1 }}>
                <Text style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
                  Hoteles Frida
                </Text>
                <div>
                  <Text
                    style={{ color: "rgba(255,255,255,0.78)", fontSize: 11 }}
                  >
                    Reservas directas · Atención personalizada
                  </Text>
                </div>
              </div>
            </Flex>

            <Text style={{ color: "rgba(255,255,255,0.80)", fontSize: 12 }}>
              Encuentra tu estancia ideal en la costa. Precios claros, trato
              cercano y confirmación rápida.
            </Text>

            <Flex wrap gap={8}>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  background: "rgba(45,212,191,0.18)",
                  border: "1px solid rgba(45,212,191,0.30)",
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
                  padding: "4px 10px",
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
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  background: "rgba(251,146,60,0.16)",
                  border: "1px solid rgba(251,146,60,0.28)",
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
          <Flex vertical gap={8} style={{ minWidth: 220, flex: "0 1 320px" }}>
            <Text style={{ color: "#fff", fontWeight: 700, fontSize: 12 }}>
              Enlaces
            </Text>

            <Flex vertical gap={6}>
              {footerLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.path}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  style={{
                    color: "rgba(255,255,255,0.80)",
                    fontSize: 12,
                    textDecoration: "none",
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid transparent",
                    transition: "all 160ms ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#ffffff";
                    e.currentTarget.style.background = "rgba(255,255,255,0.10)";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.18)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.80)";
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                >
                  <span style={{ display: "inline-flex" }}>{link.icon}</span>
                  {link.nombre}
                </a>
              ))}
            </Flex>
          </Flex>

          {/* CTA */}
          <Flex vertical gap={10} style={{ minWidth: 220, flex: "0 1 260px" }}>
            <Text style={{ color: "#fff", fontWeight: 700, fontSize: 12 }}>
              ¿Necesitas ayuda?
            </Text>

            <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 12 }}>
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
                    height: 34,
                    paddingInline: 14,
                    fontWeight: 900,
                    background: `linear-gradient(90deg, ${beachColors.turquoise}, ${beachColors.teal})`,
                    border: "none",
                    boxShadow: "0 10px 22px rgba(45,212,191,0.28)",
                    opacity: waDisabled ? 0.6 : 1,
                  }}
                  onClick={() => {
                    const texto =
                      "Hola, quiero ayuda para reservar en Hoteles Frida.";
                    window.open(
                      `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
                        texto
                      )}`,
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
                ghost
                icon={<ArrowUpOutlined />}
                style={{
                  borderRadius: 999,
                  height: 34,
                  paddingInline: 14,
                  fontWeight: 900,
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.35)",
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
          <Text style={{ color: "rgba(255,255,255,0.80)", fontSize: 12 }}>
            © {new Date().getFullYear()} Hoteles Frida. Todos los derechos
            reservados.
          </Text>

          <Text style={{ color: "rgba(255,255,255,0.70)", fontSize: 11 }}>
            Hecho con <HeartFilled style={{ fontSize: 12 }} /> en Yucatán
          </Text>
        </Flex>
      </Flex>
    </footer>
  );
};

export default Footer;
