// src/components/website/AccountPage.jsx
import { useState } from "react";
import {
  Typography,
  Rate,
  Grid,
} from "antd";
import {
  ArrowRightOutlined,
  HeartFilled,
  CalendarOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  DS,
  glassCard,
  adaptiveText,
  sectionPadding,
  COLORS,
  sectionTitleAccent,
} from "./glassStyles";

const { Text } = Typography;

const STATUS_STYLES = {
  turquoise: { bg: DS.surfaceTint,    label: "Confirmada" },
  oceanBlue: { bg: DS.primary,        label: "Próxima" },
  coral:     { bg: COLORS.rose,       label: "Cancelada" },
  teal:      { bg: DS.surfaceTint,    label: "Próxima" },
  sunset:    { bg: COLORS.orange,     label: "Pendiente" },
  deepBlue:  { bg: DS.primary,        label: "Completada" },
};

const wrapVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const itemVariant = {
  hidden: { opacity: 0, y: 16, scale: 0.985 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.55, ease: [0.2, 0.9, 0.2, 1] } },
};

// ── Booking Card ───────────────────────────────────────────────
function BookingCard({ booking, isDarkMode, onOpenDetail }) {
  const t = adaptiveText(isDarkMode);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const statusStyle = STATUS_STYLES[booking.status?.color] || STATUS_STYLES.teal;

  return (
    <motion.div variants={itemVariant}>
      <motion.div
        whileHover={{ y: -3 }}
        transition={{ duration: 0.2 }}
        style={{
          ...glassCard(isDarkMode),
          borderRadius: 14,
          overflow: "hidden",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        {/* Thumbnail */}
        <div style={{
          position: "relative",
          width: isMobile ? "100%" : 180,
          height: isMobile ? 160 : "auto",
          minHeight: isMobile ? 160 : 120,
          flexShrink: 0,
          backgroundImage: `url('${booking.img}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}>
          {/* Status badge */}
          <div style={{
            position: "absolute", top: 12, left: 12,
            background: statusStyle.bg, borderRadius: 999,
            padding: "3px 10px",
            fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 10,
            color: "#ffffff", letterSpacing: "0.05em",
          }}>
            {booking.status?.text || statusStyle.label}
          </div>
        </div>

        {/* Info */}
        <div style={{
          flex: 1,
          padding: isMobile ? "18px 18px 16px" : "20px 24px 18px",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}>
          <div>
            <h3 style={{
              fontFamily: "'Noto Serif', serif",
              fontSize: 18, fontWeight: 700,
              color: isDarkMode ? DS.darkOnSurface : DS.onSurface,
              margin: "0 0 6px", lineHeight: 1.2,
            }}>
              {booking.title}
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Rate disabled value={booking.stars} style={{ fontSize: 13 }} />
              <Text style={{ fontFamily: "'Manrope', sans-serif", color: t.muted, fontWeight: 600, fontSize: 12 }}>
                {booking.details}
              </Text>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button
              onClick={() => onOpenDetail(booking)}
              style={{
                height: 36, padding: "0 16px", borderRadius: 999, border: "none", cursor: "pointer",
                background: `linear-gradient(135deg, ${DS.primaryContainer} 0%, ${DS.primary} 100%)`,
                color: "#ffffff", fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 12,
                letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 7,
                alignSelf: isMobile ? "stretch" : "auto",
                justifyContent: "center",
              }}
            >
              VER DETALLE <ArrowRightOutlined style={{ fontSize: 11 }} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Tab bar ────────────────────────────────────────────────────
function TabBar({ tabs, active, onChange, isDarkMode }) {
  const t = adaptiveText(isDarkMode);
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${isDarkMode ? "rgba(255,255,255,0.06)" : DS.surfaceContainerHighest}`, marginBottom: 20 }}>
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.08em",
            padding: "12px 20px",
            color: active === key ? (isDarkMode ? DS.darkOnSurface : DS.onSurface) : t.muted,
            borderBottom: active === key ? `2px solid ${DS.surfaceTint}` : "2px solid transparent",
            transition: "all 0.18s ease",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── AccountPage ───────────────────────────────────────────────
export default function AccountPage({ isDarkMode, bookings, favoritesCount, onOpenDetail }) {
  const screens = Grid.useBreakpoint();
  const isSm = !!screens.sm;
  const isMd = !!screens.md;
  const t = adaptiveText(isDarkMode);
  const [activeTab, setActiveTab] = useState("mis");

  const hasBookings = bookings.length > 0;
  const accentLine = sectionTitleAccent(isDarkMode);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.9, 0.2, 1] }}
      style={{ padding: "100px 0 72px", background: isDarkMode ? DS.darkSurface : DS.surface, minHeight: "100vh" }}
    >
      <div style={sectionPadding(isSm)}>
        {/* Page heading */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontFamily: "'Noto Serif', serif",
            fontSize: isMd ? "2.1rem" : "1.65rem",
            fontWeight: 700,
            color: isDarkMode ? DS.darkOnSurface : DS.onSurface,
            margin: 0, letterSpacing: "-0.3px",
          }}>
            Mis Reservas
          </h1>
          <div style={accentLine} />
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
          {[
            { icon: <CalendarOutlined />, label: "Reservas",  value: bookings.length,                                                  color: DS.surfaceTint },
            { icon: <HeartFilled />,      label: "Favoritos", value: favoritesCount,                                                   color: COLORS.rose },
            { icon: <ClockCircleOutlined />, label: "Próximas", value: bookings.filter((b) => b.status?.text === "Próxima").length, color: DS.secondary },
          ].map(({ icon, label, value, color }) => (
            <div
              key={label}
              style={{
                ...glassCard(isDarkMode),
                borderRadius: 12,
                padding: "16px 22px",
                flex: "1 1 150px",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                display: "grid", placeItems: "center",
                background: `${color}14`,
                color, fontSize: 18,
              }}>
                {icon}
              </div>
              <div>
                <div style={{ fontFamily: "'Noto Serif', serif", fontWeight: 700, fontSize: 22, color: isDarkMode ? DS.darkOnSurface : DS.onSurface, lineHeight: 1 }}>
                  {value}
                </div>
                <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: 11, color: t.muted, letterSpacing: "0.06em", marginTop: 2 }}>
                  {label.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + content */}
        <div style={{ ...glassCard(isDarkMode), borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "0 20px" }}>
            <TabBar
              isDarkMode={isDarkMode}
              active={activeTab}
              onChange={setActiveTab}
              tabs={[
                { key: "mis", label: "PRÓXIMAS" },
                { key: "fav", label: `FAVORITOS (${favoritesCount})` },
                { key: "msg", label: "MENSAJES" },
              ]}
            />
          </div>

          <div style={{ padding: "4px 18px 20px" }}>
            {/* Bookings tab */}
            {activeTab === "mis" && (
              <motion.div
                variants={wrapVariants} initial="hidden" animate="show"
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {hasBookings ? (
                  bookings.map((b) => (
                    <BookingCard key={b.key} booking={b} isDarkMode={isDarkMode} onOpenDetail={onOpenDetail} />
                  ))
                ) : (
                  <div style={{
                    padding: "40px 24px", textAlign: "center",
                    borderRadius: 12,
                    background: isDarkMode ? "rgba(255,255,255,0.03)" : DS.surfaceContainerLow,
                    color: t.muted,
                  }}>
                    <CalendarOutlined style={{ fontSize: 36, marginBottom: 12, display: "block", opacity: 0.4 }} />
                    <div style={{ fontFamily: "'Noto Serif', serif", fontWeight: 600, fontSize: 16, color: isDarkMode ? DS.darkOnSurface : DS.onSurface }}>
                      Aún no tienes reservas
                    </div>
                    <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400, fontSize: 13, marginTop: 6, color: t.muted }}>
                      Haz una búsqueda y confirma una estancia.
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Favorites tab */}
            {activeTab === "fav" && (
              <div style={{ padding: "28px 8px", textAlign: "center", color: t.muted }}>
                <HeartFilled style={{ fontSize: 36, marginBottom: 12, display: "block", opacity: 0.5, color: COLORS.rose }} />
                <div style={{ fontFamily: "'Noto Serif', serif", fontWeight: 600, fontSize: 16, color: isDarkMode ? DS.darkOnSurface : DS.onSurface }}>
                  {favoritesCount > 0
                    ? `Tienes ${favoritesCount} habitación${favoritesCount !== 1 ? "es" : ""} guardada${favoritesCount !== 1 ? "s" : ""}`
                    : "Aún no tienes favoritos"}
                </div>
                <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400, fontSize: 13, marginTop: 6 }}>
                  Marca habitaciones con el corazón para verlas aquí.
                </div>
              </div>
            )}

            {/* Messages tab */}
            {activeTab === "msg" && (
              <div style={{ padding: "28px 8px", textAlign: "center", color: t.muted }}>
                <UserOutlined style={{ fontSize: 36, marginBottom: 12, display: "block", opacity: 0.4 }} />
                <div style={{ fontFamily: "'Noto Serif', serif", fontWeight: 600, fontSize: 16, color: isDarkMode ? DS.darkOnSurface : DS.onSurface }}>
                  Sin mensajes
                </div>
                <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400, fontSize: 13, marginTop: 6 }}>
                  Aquí aparecerán tus conversaciones con el equipo.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
