// src/components/website/SearchPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Typography,
  Select,
  DatePicker,
  Input,
  Slider,
  Collapse,
  Checkbox,
  Rate,
  Row,
  Col,
  Grid,
} from "antd";
import {
  SearchOutlined,
  EnvironmentOutlined,
  FilterOutlined,
  ArrowRightOutlined,
  HeartOutlined,
  HeartFilled,
} from "@ant-design/icons";
import { motion } from "framer-motion";
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

const ACCENT_COLORS = [DS.surfaceTint, "#f97316", "#e63950", DS.secondary, DS.gold];

function normalizeRooms(rooms) {
  return rooms.map((r, i) => {
    const mainImg = r.images?.[0] || r.img || r.image || null;
    const accent = r.accent || ACCENT_COLORS[i % ACCENT_COLORS.length];
    const basePrice = r.price ?? 0;
    const discounted =
      r.offer?.isSpecial && r.offer?.discountPercent
        ? Math.round(basePrice * (1 - r.offer.discountPercent / 100))
        : basePrice;
    const branchKey =
      hotelCodeToKey(r.hotelCode) || hotelCodeToKey(r.sedeKey) || "chelem";
    const rating = r.rating != null && r.rating > 0 ? r.rating : null;
    const reviews = r.favoritesCount > 0 ? r.favoritesCount : null;
    const tag = r.badge || r.tag || null;
    const tagColor = tag ? (r.tagColor || accent) : null;
    const desc = r.description || r.desc || r.location || null;
    return {
      id: r._id || r.id || `room-${i}`,
      key: r._id || r.id || `room-${i}`,
      title: r.title || `Habitación ${r.roomNumber || i + 1}`,
      location: branchKey,
      rating,
      reviews,
      desc,
      price: discounted,
      basePrice,
      img: mainImg,
      tag,
      tagColor,
      accent,
      amenities: r.amenities || [],
      size: r.size || null,
      roomType: r.roomType || null,
      hasDiscount: !!(r.offer?.isSpecial && r.offer?.discountPercent),
      discountPercent: r.offer?.discountPercent || null,
      _raw: r,
    };
  });
}

// ── Animation variants ─────────────────────────────────────────
const wrapVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const itemVariant = {
  hidden: { opacity: 0, y: 16, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.2, 0.9, 0.2, 1] } },
};

// ── Label helper ───────────────────────────────────────────────
function FieldLabel({ children }) {
  return (
    <div style={{
      fontFamily: "'Manrope', sans-serif",
      fontSize: 10, fontWeight: 700,
      letterSpacing: "0.1em", color: "rgba(23,28,33,0.42)",
      marginBottom: 6, textTransform: "uppercase",
    }}>
      {children}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────
function SearchSidebar({ filters, setFilters, isDarkMode, isSm, onApply, onClear, hasActive }) {
  const t = adaptiveText(isDarkMode);

  return (
    <div style={{
      ...glassCard(isDarkMode),
      borderRadius: 14,
      overflow: "hidden",
      position: isSm ? "sticky" : "relative",
      top: isSm ? 96 : "auto",
    }}>
      {/* Sidebar header */}
      <div style={{
        padding: "14px 20px",
        background: `linear-gradient(135deg, ${DS.secondary} 0%, ${DS.primary} 100%)`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: "#fff", fontSize: 13, letterSpacing: "0.08em" }}>
          FILTROS
        </span>
        <FilterOutlined style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }} />
      </div>

      <div style={{ padding: "18px 18px 20px" }}>
        {/* Sucursal */}
        <div style={{ marginBottom: 18 }}>
          <FieldLabel>Sucursal</FieldLabel>
          <Select
            value={filters.location}
            onChange={(v) => setFilters((s) => ({ ...s, location: v }))}
            placeholder="Todas las sucursales"
            suffixIcon={<EnvironmentOutlined style={{ color: DS.surfaceTint }} />}
            style={{ width: "100%" }}
            options={[
              { label: "Todas", value: "ALL" },
              ...SUCURSALES.map((d) => ({
                label: `${d.name} · ${d.subtitle}`,
                value: d.key,
              })),
            ]}
          />
        </div>

        {/* Fechas */}
        <div style={{ marginBottom: 18 }}>
          <FieldLabel>Fechas</FieldLabel>
          <DatePicker.RangePicker
            value={filters.range}
            onChange={(v) => setFilters((s) => ({ ...s, range: v }))}
            style={{ width: "100%" }}
            placeholder={["Check-in", "Check-out"]}
          />
        </div>

        {/* Divider via bg shift */}
        <div style={{ height: 1, background: isDarkMode ? "rgba(255,255,255,0.06)" : DS.surfaceContainerHighest, margin: "14px 0" }} />

        {/* Price range */}
        <div style={{ marginBottom: 18 }}>
          <FieldLabel>Precio por noche</FieldLabel>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{
              flex: 1, height: 30, borderRadius: 8,
              background: isDarkMode ? "rgba(255,255,255,0.06)" : DS.surfaceContainerLow,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 12, color: t.muted,
            }}>
              MIN ${filters.price[0]}
            </div>
            <div style={{
              flex: 1, height: 30, borderRadius: 8,
              background: isDarkMode ? "rgba(255,255,255,0.06)" : DS.surfaceContainerLow,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 12, color: t.muted,
            }}>
              MAX ${filters.price[1]}
            </div>
          </div>
          <Slider
            range min={0} max={5000} step={50}
            value={filters.price}
            onChange={(v) => setFilters((s) => ({ ...s, price: v }))}
          />
        </div>

        <div style={{ height: 1, background: isDarkMode ? "rgba(255,255,255,0.06)" : DS.surfaceContainerHighest, margin: "14px 0" }} />

        {/* Amenidades */}
        <div style={{ marginBottom: 18 }}>
          <FieldLabel>Amenidades</FieldLabel>
          <Checkbox.Group
            value={filters.amenities}
            onChange={(v) => setFilters((s) => ({ ...s, amenities: v }))}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
            options={[
              { label: "WiFi", value: "wifi" },
              { label: "A/C", value: "ac" },
              { label: "Estacionamiento", value: "parking" },
              { label: "Cocina", value: "kitchen" },
            ]}
          />
        </div>

        <div style={{ height: 1, background: isDarkMode ? "rgba(255,255,255,0.06)" : DS.surfaceContainerHighest, margin: "14px 0" }} />

        {/* Rating */}
        <div style={{ marginBottom: 18 }}>
          <FieldLabel>Calificación mínima</FieldLabel>
          <Slider
            min={1} max={5} step={0.5}
            value={filters.stars}
            onChange={(v) => setFilters((s) => ({ ...s, stars: v }))}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Rate allowHalf disabled value={filters.stars} style={{ fontSize: 13 }} />
            <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 12, color: t.muted }}>
              {filters.stars > 1 ? `${filters.stars}+` : "Todas"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={onApply}
          style={{
            width: "100%", height: 42, borderRadius: 999, border: "none", cursor: "pointer",
            background: DS.secondary, color: "#ffffff",
            fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.06em",
            marginBottom: hasActive ? 8 : 0,
          }}
        >
          APLICAR FILTROS
        </button>
        {hasActive && (
          <button
            onClick={onClear}
            style={{
              width: "100%", height: 38, borderRadius: 999, border: "none", cursor: "pointer",
              background: "transparent", color: t.muted,
              fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: 12,
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}

// ── Result Row ─────────────────────────────────────────────────
function SearchResultRow({ room, isDarkMode, onSelect, isFav, onToggleFav }) {
  const t = adaptiveText(isDarkMode);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

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
          cursor: "pointer",
        }}
        onClick={() => onSelect(room)}
      >
        {/* Image */}
        <div style={{
          position: "relative",
          width: isMobile ? "100%" : 250,
          height: isMobile ? 200 : "auto",
          minHeight: isMobile ? 200 : 190,
          flexShrink: 0,
          background: room.img
            ? undefined
            : isDarkMode
            ? `linear-gradient(135deg, ${DS.darkSurfaceContainer} 0%, ${DS.darkSurface} 100%)`
            : `linear-gradient(135deg, ${DS.surfaceContainerHighest} 0%, ${DS.surfaceContainerLow} 100%)`,
          backgroundImage: room.img ? `url('${room.img}')` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}>
          {room.tag && (
            <div style={{
              position: "absolute", top: 12, left: 12,
              background: room.tagColor || DS.surfaceTint,
              borderRadius: 999, padding: "3px 10px",
              fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 10,
              color: "#ffffff", letterSpacing: "0.05em",
            }}>
              {room.tag.toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: isMobile ? "18px 18px 16px" : "22px 26px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <h3 style={{
                fontFamily: "'Noto Serif', serif",
                fontSize: 19, fontWeight: 700,
                color: isDarkMode ? DS.darkOnSurface : DS.onSurface,
                margin: 0, lineHeight: 1.2,
              }}>
                {room.title}
              </h3>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleFav(room.key); }}
                aria-label={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
                style={{
                  width: 34, height: 34, borderRadius: "50%", border: "none",
                  background: isFav ? "rgba(230,57,80,0.10)" : "transparent",
                  cursor: "pointer", display: "grid", placeItems: "center",
                  color: isFav ? COLORS.rose : t.muted, fontSize: 16, flexShrink: 0,
                  transition: "all 0.18s ease",
                }}
              >
                {isFav ? <HeartFilled /> : <HeartOutlined />}
              </button>
            </div>

            <p style={{
              fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 600,
              color: DS.surfaceTint, letterSpacing: "0.08em", margin: "6px 0 0",
              textTransform: "uppercase",
            }}>
              <EnvironmentOutlined style={{ fontSize: 10 }} />{" "}
              {SUCURSALES.find((s) => s.key === room.location)?.name || room.location}
            </p>

            {room.rating != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, margin: "8px 0" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} style={{ fontSize: 12, color: room.rating >= star ? DS.gold : "rgba(23,28,33,0.18)" }}>★</span>
                ))}
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: t.muted, fontWeight: 600 }}>
                  {room.rating}{room.reviews ? ` (${room.reviews} reseñas)` : ""}
                </span>
              </div>
            )}

            <Paragraph
              style={{ fontFamily: "'Manrope', sans-serif", color: t.secondary, marginTop: 8, marginBottom: 0, fontSize: 13, lineHeight: 1.65 }}
              ellipsis={{ rows: 2 }}
            >
              {room.desc}
            </Paragraph>
          </div>

          {/* Price + CTA */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, flexWrap: "wrap", gap: 12 }}>
            <div>
              <span style={{ fontFamily: "'Noto Serif', serif", fontSize: 22, fontWeight: 700, color: isDarkMode ? DS.darkOnSurface : DS.onSurface }}>
                ${room.price.toLocaleString("es-MX")}
              </span>
              <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: t.muted, marginLeft: 4, fontWeight: 500 }}>
                / NOCHE
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(room); }}
              style={{
                height: 38, padding: "0 18px", borderRadius: 999, border: "none", cursor: "pointer",
                background: `linear-gradient(135deg, ${DS.primaryContainer} 0%, ${DS.primary} 100%)`,
                color: "#ffffff", fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 12,
                letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 7,
                boxShadow: "0 6px 20px rgba(0,59,65,0.22)",
                alignSelf: isMobile ? "stretch" : "center",
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

const PAGE_SIZE = 10;

// ── Main SearchPage ────────────────────────────────────────────
export default function SearchPage({
  isDarkMode,
  initialForm,
  onSelectRoom,
  favorites,
  onToggleFav,
}) {
  const screens = Grid.useBreakpoint();
  const isSm = !!screens.sm;
  const isMd = !!screens.md;
  const isLg = !!screens.lg;
  const t = adaptiveText(isDarkMode);

  const [query, setQuery] = useState("");
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [pendingFilters, setPendingFilters] = useState({
    location: initialForm?.branch || "ALL",
    range: initialForm?.range || null,
    price: [0, 5000],
    stars: 1,
    amenities: [],
  });
  const [activeFilters, setActiveFilters] = useState(() => {
    if (initialForm?.branch && initialForm.branch !== "ALL") {
      return {
        location: initialForm.branch,
        range: initialForm?.range || null,
        price: [0, 5000],
        stars: 1,
        amenities: [],
      };
    }
    return null;
  });

  const applyFilters = () => { setActiveFilters({ ...pendingFilters }); setPage(1); };
  const clearFilters = () => {
    setPendingFilters({ location: "ALL", range: null, price: [0, 5000], stars: 1, amenities: [] });
    setActiveFilters(null);
    setPage(1);
  };

  const [roomsKey, setRoomsKey] = useState(0);
  const reloadRooms = () => { setRoomsKey((k) => k + 1); };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios
      .get("/api/habitaciones/public", { params: { limit: 100 } })
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.items || data?.data || data?.docs || [];
        setRooms(normalizeRooms(list));
      })
      .catch(() => { if (!cancelled) setRooms([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [roomsKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rooms.filter((it) => {
      if (q && !it.title.toLowerCase().includes(q)) return false;
      if (!activeFilters) return true;
      if (activeFilters.location !== "ALL" && it.location !== activeFilters.location) return false;
      if (it.price < activeFilters.price[0] || it.price > activeFilters.price[1]) return false;
      if (it.rating < activeFilters.stars) return false;
      if (activeFilters.amenities.length) {
        if (!activeFilters.amenities.every((a) => (it.amenities || []).includes(a))) return false;
      }
      return true;
    });
  }, [query, activeFilters, rooms]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
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
            Buscar habitaciones
          </h1>
          <div style={accentLine} />
          <p style={{ fontFamily: "'Manrope', sans-serif", color: t.secondary, fontSize: 14, marginTop: 0 }}>
            Encuentra tu estancia ideal en la costa yucateca.
          </p>
        </div>

        <Row gutter={[20, 20]}>
          {/* Sidebar */}
          {isLg && (
            <Col lg={7}>
              <SearchSidebar
                filters={pendingFilters}
                setFilters={setPendingFilters}
                isDarkMode={isDarkMode}
                isSm={isSm}
                onApply={applyFilters}
                onClear={clearFilters}
                hasActive={!!activeFilters}
              />
            </Col>
          )}

          {/* Results */}
          <Col xs={24} lg={17}>
            {/* Search bar */}
            <div style={{
              ...glassCard(isDarkMode),
              borderRadius: 12,
              padding: "10px 14px",
              marginBottom: 14,
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}>
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder="Filtra por nombre de habitación..."
                prefix={<SearchOutlined style={{ color: t.muted }} />}
                style={{ flex: 1, borderRadius: 8, fontFamily: "'Manrope', sans-serif" }}
                allowClear
              />
              <Text style={{ fontFamily: "'Manrope', sans-serif", color: t.muted, fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>
                {loading ? "Cargando…" : `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}`}
              </Text>
              <button
                onClick={reloadRooms}
                disabled={loading}
                title="Recargar habitaciones"
                style={{
                  height: 34, width: 34, borderRadius: 999, border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  background: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,59,65,0.07)",
                  color: isDarkMode ? DS.darkOnSurface : DS.primary,
                  fontSize: 16, display: "grid", placeItems: "center",
                  flexShrink: 0, opacity: loading ? 0.5 : 1,
                  transition: "all 0.2s ease",
                }}
              >
                ↻
              </button>
            </div>

            {/* Mobile filters toggle */}
            {!isLg && (
              <Collapse
                ghost
                style={{ marginBottom: 14 }}
                items={[{
                  key: "filters",
                  label: (
                    <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: isDarkMode ? DS.darkOnSurface : DS.onSurface, fontSize: 13 }}>
                      <FilterOutlined /> Filtros{" "}
                      {activeFilters && (
                        <span style={{ background: DS.surfaceTint, color: "#fff", borderRadius: 999, padding: "1px 8px", fontSize: 10, fontWeight: 700, marginLeft: 6 }}>
                          Activos
                        </span>
                      )}
                    </span>
                  ),
                  children: (
                    <SearchSidebar
                      filters={pendingFilters}
                      setFilters={setPendingFilters}
                      isDarkMode={isDarkMode}
                      isSm={false}
                      onApply={applyFilters}
                      onClear={clearFilters}
                      hasActive={!!activeFilters}
                    />
                  ),
                }]}
              />
            )}

            {/* Results list */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 0", fontFamily: "'Manrope', sans-serif", color: t.muted, fontWeight: 600 }}>
                Cargando habitaciones…
              </div>
            ) : (
              <>
                <motion.div
                  variants={wrapVariants}
                  initial="hidden"
                  animate="show"
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  {paginated.map((room) => (
                    <SearchResultRow
                      key={room.key}
                      room={room}
                      isDarkMode={isDarkMode}
                      onSelect={onSelectRoom}
                      isFav={favorites.has(room.key)}
                      onToggleFav={onToggleFav}
                    />
                  ))}

                  {!filtered.length && (
                    <div style={{
                      ...glassCard(isDarkMode),
                      borderRadius: 14, padding: "40px 24px",
                      textAlign: "center", color: t.muted,
                      fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: 14,
                    }}>
                      <FilterOutlined style={{ fontSize: 28, marginBottom: 12, display: "block", opacity: 0.5 }} />
                      Sin resultados con los filtros actuales.
                    </div>
                  )}
                </motion.div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 28 }}>
                    <button
                      disabled={page <= 1}
                      onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      style={{
                        height: 38, padding: "0 18px", borderRadius: 999, cursor: page <= 1 ? "not-allowed" : "pointer",
                        border: `1.5px solid rgba(126,70,154,0.25)`,
                        background: "transparent", color: page <= 1 ? t.muted : (isDarkMode ? DS.darkOnSurface : DS.secondary),
                        fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 12, opacity: page <= 1 ? 0.4 : 1,
                      }}
                    >
                      ← Anterior
                    </button>
                    <span style={{ fontFamily: "'Manrope', sans-serif", color: t.secondary, fontWeight: 700, fontSize: 13 }}>
                      {page} / {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      style={{
                        height: 38, padding: "0 18px", borderRadius: 999, cursor: page >= totalPages ? "not-allowed" : "pointer",
                        border: `1.5px solid rgba(126,70,154,0.25)`,
                        background: "transparent", color: page >= totalPages ? t.muted : (isDarkMode ? DS.darkOnSurface : DS.secondary),
                        fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 12, opacity: page >= totalPages ? 0.4 : 1,
                      }}
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </>
            )}
          </Col>
        </Row>
      </div>
    </motion.section>
  );
}
