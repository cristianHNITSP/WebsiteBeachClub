// src/components/website/DetailPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Typography,
  DatePicker,
  InputNumber,
  Row,
  Col,
  Grid,
  message,
} from "antd";
import {
  CalendarOutlined,
  EnvironmentOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  WifiOutlined,
  CarOutlined,
  StarFilled,
  TeamOutlined,
  DollarOutlined,
  TagOutlined,
} from "@ant-design/icons";
import { motion, useAnimation } from "framer-motion";
import {
  DS,
  glassCard,
  adaptiveText,
  sectionPadding,
  COLORS,
  SUCURSALES,
  hotelCodeToKey,
  sectionTitleAccent,
} from "./glassStyles";
import axios from "../../api/axios";

const { Text, Paragraph } = Typography;

const AMENITY_ICONS = {
  wifi:    { icon: <WifiOutlined />, label: "WiFi" },
  ac:      { icon: "❄️",             label: "A/C" },
  parking: { icon: <CarOutlined />,  label: "Estacionamiento" },
  kitchen: { icon: "🍳",             label: "Cocina" },
};

const NAVBAR_HEIGHT = 72;
const STICKY_TOP    = NAVBAR_HEIGHT + 12;

export default function DetailPage({
  isDarkMode,
  selectedRoom,
  initialForm,
  onConfirm,
  onGoBack,
}) {
  const screens = Grid.useBreakpoint();
  const isSm = !!screens.sm;
  const isMd = !!screens.md;
  const isLg = !!screens.lg;
  const t = adaptiveText(isDarkMode);

  const [range, setRange] = useState(initialForm?.range || null);
  const branch = (() => {
    if (initialForm?.branch) return initialForm.branch;
    const loc = selectedRoom?.location;
    if (loc && SUCURSALES.some((s) => s.key === loc)) return loc;
    const raw = selectedRoom?._raw;
    return hotelCodeToKey(raw?.hotelCode) || hotelCodeToKey(raw?.sedeKey) || "chelem";
  })();
  const [people, setPeople] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  const pricePerNight = selectedRoom?.price ?? 1500;
  const nights = useMemo(() => {
    if (!range?.[0] || !range?.[1]) return 0;
    return Math.max(1, range[1].diff(range[0], "day") || 0);
  }, [range]);
  const total = pricePerNight * (nights || 1);

  const branchLabel = useMemo(() => {
    const s = SUCURSALES.find((x) => x.key === branch);
    return s ? `${s.name} · ${s.subtitle}` : "Sucursal";
  }, [branch]);

  // Availability check
  const [availability, setAvailability] = useState(null);
  useEffect(() => {
    if (!range?.[0] || !range?.[1] || !selectedRoom?.key) { setAvailability(null); return; }
    axios
      .get(`/api/public/habitaciones/${selectedRoom.key}/availability`, {
        params: { checkIn: range[0].toISOString(), checkOut: range[1].toISOString() },
      })
      .then(({ data }) => setAvailability(data))
      .catch(() => setAvailability(null));
  }, [range, selectedRoom?.key]);

  // Submit booking
  const handleConfirm = async () => {
    if (!range?.[0] || !range?.[1]) { message.warning("Selecciona fechas para continuar"); return; }
    const payload = { range, branch, people, total, pricePerNight, nights };
    setSubmitting(true);
    try {
      await axios.post("/api/public/reservas", {
        habitacionId: selectedRoom?.key || selectedRoom?._raw?._id,
        checkIn:   range[0].toISOString(),
        checkOut:  range[1].toISOString(),
        sucursal:  branch,
        huespedes: people,
        total,
      });
      onConfirm(payload);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error;
      if (msg) message.error(msg);
      else onConfirm(payload);
    } finally {
      setSubmitting(false);
    }
  };

  // Sticky snap animation
  const sentinelRef = useRef(null);
  const summaryControls = useAnimation();
  const isStuckRef = useRef(false);

  useEffect(() => {
    if (!isLg) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const nowStuck = !entry.isIntersecting;
        if (nowStuck && !isStuckRef.current) {
          isStuckRef.current = true;
          summaryControls.start({ y: [0, -10, 5, -2, 0], scaleY: [1, 1.04, 0.97, 1.015, 1], scaleX: [1, 0.97, 1.02, 0.99, 1], transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } });
        } else if (!nowStuck) { isStuckRef.current = false; }
      },
      { threshold: 0, rootMargin: `-${STICKY_TOP}px 0px 0px 0px` }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLg, summaryControls]);

  const room = selectedRoom || {};
  const accentLine = sectionTitleAccent(isDarkMode);

  const quickInfoItems = useMemo(() => {
    const items = [];
    if (room.rating != null) {
      items.push({ icon: <StarFilled style={{ color: DS.gold }} />, text: `${room.rating} estrellas${room.reviews != null ? ` · ${room.reviews} favoritos` : ""}` });
    }
    if (room.amenities?.length > 0) {
      const labels = room.amenities.slice(0, 3).map((a) => AMENITY_ICONS[a]?.label || a).join(", ");
      items.push({ icon: <CheckCircleOutlined style={{ color: DS.surfaceTint }} />, text: `Incluye: ${labels}` });
    }
    const capacity = room.size || room._raw?.size;
    items.push({ icon: <TeamOutlined style={{ color: DS.primary }} />, text: capacity ? `Capacidad: ${capacity} persona${capacity !== 1 ? "s" : ""}` : `Huéspedes seleccionados: ${people}` });
    if (room.hasDiscount && room.discountPercent) {
      items.push({ icon: <TagOutlined style={{ color: COLORS.rose }} />, text: `Promo −${room.discountPercent}% · precio ya aplicado` });
    } else {
      items.push({ icon: <DollarOutlined style={{ color: DS.surfaceTint }} />, text: `$${pricePerNight.toLocaleString("es-MX")}/noche · precio transparente` });
    }
    return items;
  }, [room.rating, room.reviews, room.amenities, room.size, room.hasDiscount, room.discountPercent, people, pricePerNight]);

  // ── Shared label ────────────────────────────────────────────
  const FieldLabel = ({ children }) => (
    <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: t.muted, marginBottom: 6 }}>
      {children}
    </div>
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.9, 0.2, 1] }}
      style={{ padding: "100px 0 72px", background: isDarkMode ? DS.darkSurface : DS.surface, minHeight: "100vh" }}
    >
      <div style={sectionPadding(isSm)}>
        {/* Back */}
        <button
          onClick={onGoBack}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 13,
            color: isDarkMode ? DS.darkOnSurface : DS.secondary,
            marginBottom: 20, padding: "4px 0",
          }}
        >
          <ArrowLeftOutlined style={{ fontSize: 13 }} /> Volver a búsqueda
        </button>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontFamily: "'Noto Serif', serif",
            fontSize: isMd ? "2.1rem" : "1.65rem",
            fontWeight: 700,
            color: isDarkMode ? DS.darkOnSurface : DS.onSurface,
            margin: 0, letterSpacing: "-0.3px",
          }}>
            {room.title || "Detalle de habitación"}
          </h1>
          <div style={accentLine} />
        </div>

        <Row gutter={[20, 20]}>
          {/* Main content */}
          <Col xs={24} lg={15}>
            {/* Hero image */}
            <motion.div
              whileHover={{ scale: 1.005 }}
              transition={{ duration: 0.4 }}
              style={{
                position: "relative",
                borderRadius: 16,
                overflow: "hidden",
                height: isMd ? 400 : 260,
                boxShadow: "0 20px 40px rgba(23,28,33,0.10)",
              }}
            >
              {room.img ? (
                <img src={room.img} alt={room.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  background: isDarkMode
                    ? `linear-gradient(135deg, ${DS.darkSurfaceContainer}, ${DS.darkSurface})`
                    : `linear-gradient(135deg, ${DS.surfaceContainerHighest}, ${DS.surfaceContainerLow})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 48, opacity: 0.25 }}>🏨</span>
                </div>
              )}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.42) 0%, transparent 55%)" }} />
              {room.tag && (
                <div style={{
                  position: "absolute", top: 16, left: 16,
                  background: room.tagColor || DS.surfaceTint,
                  borderRadius: 999, padding: "4px 12px",
                  fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 11,
                  color: "#ffffff", letterSpacing: "0.05em",
                }}>
                  {room.tag.toUpperCase()}
                </div>
              )}
              <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <Text style={{ fontFamily: "'Manrope', sans-serif", color: "rgba(255,255,255,0.88)", fontWeight: 600, fontSize: 13 }}>
                  <EnvironmentOutlined style={{ fontSize: 11 }} /> {branchLabel}
                </Text>
                <div>
                  <span style={{ fontFamily: "'Noto Serif', serif", fontSize: 26, fontWeight: 700, color: "#ffffff" }}>${pricePerNight.toLocaleString("es-MX")}</span>
                  <span style={{ fontFamily: "'Manrope', sans-serif", color: "rgba(255,255,255,0.70)", fontWeight: 600, fontSize: 12 }}>/noche</span>
                </div>
              </div>
            </motion.div>

            {/* Description + amenities */}
            <div style={{ ...glassCard(isDarkMode), borderRadius: 14, padding: "22px 24px", marginTop: 16 }}>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: t.muted, margin: "0 0 8px" }}>DESCRIPCIÓN</p>
              <Paragraph style={{ fontFamily: "'Manrope', sans-serif", color: t.secondary, marginBottom: 18, fontSize: 14, lineHeight: 1.75 }}>
                {room.desc || room.description || `${room.roomType || "Habitación"} en la costa yucateca.`}
              </Paragraph>

              {room.amenities?.length > 0 && (
                <>
                  <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: t.muted, margin: "0 0 12px" }}>AMENIDADES</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {room.amenities.map((a) => {
                      const info = AMENITY_ICONS[a] || { icon: "•", label: a };
                      return (
                        <div key={a} style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "6px 14px", borderRadius: 999,
                          background: isDarkMode ? `${DS.surfaceTint}14` : `${DS.surfaceTint}10`,
                          border: `1px solid ${DS.surfaceTint}28`,
                          color: isDarkMode ? "rgba(255,255,255,0.85)" : DS.primary,
                          fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 12,
                        }}>
                          {info.icon} {info.label}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {room.rating != null && (
                <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8 }}>
                  {[1,2,3,4,5].map((s) => (
                    <span key={s} style={{ fontSize: 16, color: room.rating >= s ? DS.gold : "rgba(23,28,33,0.18)" }}>★</span>
                  ))}
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 14, color: isDarkMode ? DS.darkOnSurface : DS.onSurface }}>
                    {room.rating}
                  </span>
                  {room.reviews != null && (
                    <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: 13, color: t.muted }}>
                      ({room.reviews} favoritos)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Booking form */}
            <div style={{ ...glassCard(isDarkMode), borderRadius: 14, padding: "22px 24px", marginTop: 16 }}>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: t.muted, margin: "0 0 16px" }}>CONFIGURA TU ESTANCIA</p>

              <Row gutter={[14, 14]}>
                <Col xs={24} md={12}>
                  <FieldLabel>Fechas</FieldLabel>
                  <DatePicker.RangePicker
                    value={range}
                    onChange={setRange}
                    style={{ width: "100%" }}
                    placeholder={["Check-in", "Check-out"]}
                    suffixIcon={<CalendarOutlined />}
                  />
                </Col>

                <Col xs={24} md={12}>
                  <FieldLabel>Sucursal</FieldLabel>
                  <div style={{
                    height: 32, borderRadius: 8, padding: "0 11px",
                    display: "flex", alignItems: "center", gap: 8,
                    background: isDarkMode ? "rgba(255,255,255,0.06)" : DS.surfaceContainerLow,
                    border: `1px solid rgba(208,194,208,0.18)`,
                    fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 13,
                    color: isDarkMode ? DS.darkOnSurface : DS.onSurface,
                  }}>
                    <EnvironmentOutlined style={{ color: DS.surfaceTint, fontSize: 12 }} />
                    {branchLabel}
                  </div>
                </Col>

                <Col xs={24} md={12}>
                  <FieldLabel>Huéspedes</FieldLabel>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <InputNumber
                      min={1} max={10} value={people}
                      onChange={(v) => setPeople(v || 1)}
                      style={{ flex: 1 }}
                    />
                    <div style={{
                      display: "flex", alignItems: "center",
                      border: `1px solid rgba(208,194,208,0.18)`,
                      borderRadius: 10, background: isDarkMode ? "rgba(255,255,255,0.06)" : DS.surfaceContainerLow,
                      overflow: "hidden", height: 36,
                    }}>
                      {[
                        { label: "−", fn: () => setPeople((p) => Math.max(1, (p || 1) - 1)) },
                        null,
                        { label: "+", fn: () => setPeople((p) => Math.min(10, (p || 1) + 1)) },
                      ].map((btn, i) =>
                        btn ? (
                          <button key={i} type="button" onClick={btn.fn} style={{
                            width: 38, height: 36, border: "none", background: "transparent",
                            fontWeight: 900, cursor: "pointer",
                            color: isDarkMode ? DS.darkOnSurface : DS.onSurface, fontSize: 16,
                          }}>
                            {btn.label}
                          </button>
                        ) : (
                          <div key={i} style={{ width: 36, textAlign: "center", fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: isDarkMode ? DS.darkOnSurface : DS.onSurface }}>
                            {people}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </Col>
              </Row>

              <div style={{ marginTop: 14 }}>
                <span style={{ fontFamily: "'Manrope', sans-serif", color: t.muted, fontWeight: 700, fontSize: 12 }}>
                  {branchLabel} · {nights ? `${nights} noche(s)` : "Selecciona fechas"} · ${pricePerNight.toLocaleString("es-MX")}/noche
                </span>
              </div>
            </div>
          </Col>

          {/* Sidebar */}
          <Col xs={24} lg={9}>
            <div ref={sentinelRef} style={{ height: 1, marginBottom: -1 }} aria-hidden="true" />

            {/* Summary card */}
            <motion.div
              animate={summaryControls}
              style={{
                ...glassCard(isDarkMode),
                borderRadius: 14,
                padding: "22px 22px",
                position: isLg ? "sticky" : "relative",
                top: isLg ? STICKY_TOP : "auto",
                zIndex: 1,
              }}
            >
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: t.muted, margin: "0 0 16px" }}>RESUMEN</p>

              {[
                { label: "Fechas", value: range?.[0] && range?.[1] ? `${range[0].format("DD/MM")} – ${range[1].format("DD/MM")}` : "—" },
                { label: "Sucursal", value: branchLabel },
                { label: "Huéspedes", value: people },
                { label: "Noches", value: nights || "—" },
                ...(availability?.available === false ? [{ label: "Disponibilidad", value: "No disponible" }] : []),
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", padding: "10px 0",
                  borderBottom: `1px solid ${isDarkMode ? "rgba(255,255,255,0.06)" : DS.surfaceContainerHighest}`,
                }}>
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, color: t.secondary, fontWeight: 600 }}>{label}</span>
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, color: isDarkMode ? DS.darkOnSurface : DS.onSurface, fontWeight: 700 }}>{value}</span>
                </div>
              ))}

              {/* Total */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, paddingTop: 18, borderTop: `1px solid ${isDarkMode ? "rgba(255,255,255,0.06)" : DS.surfaceContainerHighest}` }}>
                <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 14, color: t.secondary }}>TOTAL ESTANCIA</span>
                <span style={{ fontFamily: "'Noto Serif', serif", fontSize: 24, fontWeight: 700, color: isDarkMode ? DS.darkOnSurface : DS.onSurface }}>
                  ${total.toLocaleString("es-MX")}
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: t.muted, fontWeight: 500 }}> MXN</span>
                </span>
              </div>

              <button
                onClick={handleConfirm}
                disabled={!range?.[0] || !range?.[1] || submitting}
                style={{
                  width: "100%", height: 48, marginTop: 18, borderRadius: 999, border: "none",
                  cursor: (!range?.[0] || !range?.[1] || submitting) ? "not-allowed" : "pointer",
                  background: (!range?.[0] || !range?.[1]) ? (isDarkMode ? "rgba(255,255,255,0.08)" : DS.surfaceContainerHighest) : `linear-gradient(135deg, ${DS.primaryContainer} 0%, ${DS.primary} 100%)`,
                  color: (!range?.[0] || !range?.[1]) ? t.muted : "#ffffff",
                  fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.06em",
                  boxShadow: range?.[0] && range?.[1] ? "0 10px 28px rgba(0,59,65,0.28)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                {submitting ? "Confirmando…" : "CONFIRMAR RESERVA"}
              </button>
            </motion.div>

            {/* Quick info */}
            <div style={{ ...glassCard(isDarkMode), borderRadius: 14, overflow: "hidden", marginTop: 16 }}>
              <div style={{
                padding: "12px 18px", fontFamily: "'Manrope', sans-serif",
                fontWeight: 700, color: "#fff", fontSize: 11, letterSpacing: "0.08em",
                background: `linear-gradient(135deg, ${DS.secondary} 0%, ${DS.primary} 100%)`,
              }}>
                INFO RÁPIDA
              </div>
              <div style={{ padding: "16px 18px" }}>
                {quickInfoItems.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: i > 0 ? 12 : 0 }}>
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ fontFamily: "'Manrope', sans-serif", color: t.secondary, fontWeight: 600, fontSize: 13 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </motion.section>
  );
}
