import {
  Card,
  Rate,
  Tag,
  Typography,
  Row,
  Col,
  Space,
  Button,
  Flex,
  Skeleton,
  Tooltip,
  message,
  Dropdown,
  Popover,
  Pagination,
  Grid,
} from "antd";
import {
  EnvironmentOutlined,
  HeartOutlined,
  FireFilled,
  DownOutlined,
  TeamOutlined,
  StarFilled,
  CalendarOutlined,
} from "@ant-design/icons";
import axios from "@api/axios";
import { useMemo, useState } from "react";

const { useBreakpoint } = Grid;

/* ========== mini chip WhatsApp ========== */
function WhatsappChip() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 16,
        height: 16,
        borderRadius: "50%",
        backgroundColor: "#22c55e",
        color: "#fff",
        fontSize: 11,
        fontWeight: 800,
        marginRight: 6,
      }}
    >
      W
    </span>
  );
}

/* ========== capacity label ========== */
const getCapacityLabel = (size) => {
  if (size == null) return null;
  const n = Number(size);
  if (!Number.isFinite(n) || n <= 0) return null;

  if (n === 1) return "1 adulto";
  if (n === 2) return "2 adultos";
  if (n === 3) return "3 adultos";
  if (n === 4) return "Familia";
  return `Hasta ${n} personas`;
};

function RoomCards({
  beachColors,
  cardsData,
  loading,
  onReservaExpress,
  onInfoWhatsapp,
  pagination,
  onPageChange,
  isMobile, // opcional
}) {
  const screens = useBreakpoint();
  const resolvedIsMobile =
    typeof isMobile === "boolean" ? isMobile : !screens.lg;

  const [messageApi, contextHolder] = message.useMessage();
  const [favLoadingId, setFavLoadingId] = useState(null);

  const colors = {
    deepBlue: beachColors?.deepBlue || "#0b2a4a",
    turquoise: beachColors?.turquoise || "#22c7b8",
    teal: beachColors?.teal || "#14b8a6",
    oceanBlue: beachColors?.oceanBlue || "#60a5fa",
    coral: beachColors?.coral || "#fb7185",
    sand: beachColors?.sand || "#fde68a",
  };

  const placeholderImg =
    "https://via.placeholder.com/1200x800?text=Sin+imagen";

  const safeCards = Array.isArray(cardsData) ? cardsData : [];
  const limited = useMemo(() => safeCards.slice(0, 6), [safeCards]);

  const getSedeLabel = (hotelCode) => {
    if (!hotelCode) return "Sede no definida";
    switch (hotelCode) {
      case "casa_frida":
        return "Casa Frida";
      case "cabanas_fridas":
        return "Cabañas Frida";
      default:
        return hotelCode;
    }
  };

  const SedeTag = ({ hotelCode }) => {
    const label = getSedeLabel(hotelCode);
    const bg =
      hotelCode === "casa_frida"
        ? "rgba(96,165,250,0.18)"
        : "rgba(34,199,184,0.18)";

    return (
      <Tag
        bordered={false}
        style={{
          borderRadius: 999,
          fontSize: 10,
          margin: 0,
          padding: "2px 10px",
          background: bg,
          color: "#0f172a",
          fontWeight: 900,
        }}
      >
        {label}
      </Tag>
    );
  };

  const handleFavorite = async (room) => {
    try {
      setFavLoadingId(room._id);
      messageApi.open({
        key: `fav-${room._id}`,
        type: "loading",
        content: "Registrando favorito...",
        duration: 0,
      });

      const { data } = await axios.post(
        `/api/habitaciones/${room._id}/favorite`
      );

      messageApi.open({
        key: `fav-${room._id}`,
        type: "success",
        content: data?.message || "Gracias por marcar como favorito 💙",
        duration: 2,
      });
    } catch (err) {
      console.error("Error al marcar favorito:", err);
      const backendMsg =
        err.response?.data?.message ||
        "No se pudo registrar tu favorito. Inténtalo más tarde.";
      messageApi.open({
        key: `fav-${room._id}`,
        type: "error",
        content: backendMsg,
        duration: 3,
      });
    } finally {
      setFavLoadingId(null);
    }
  };

  /* ========== disponibilidad meta ========== */
  const getDisponibilidadMeta = (room) => {
    if (room?.isDeleted) {
      return {
        code: "papelera",
        label: "No disponible",
        description: "Esta habitación está en papelera.",
        color: "#9ca3af",
        text: "#111827",
      };
    }

    const invOk = (room?.inventoryStatus || "Activa") === "Activa";

    if (!invOk) {
      return {
        code: "no_disponible",
        label: "No disponible",
        description: `Estado: ${room.inventoryStatus}`,
        color: "#9ca3af",
        text: "#111827",
      };
    }

    return {
      code: "disponible",
      label: "Disponible",
      description: "Puedes solicitar una reserva o pedir más información.",
      color: colors.teal,
      text: "#064e3b",
    };
  };

  /* ========== normalize ========== */
  const normalizeCard = (raw) => {
    const c = {
      ...raw,
      amenities: Array.isArray(raw?.amenities) ? raw.amenities : [],
      img: raw?.img || placeholderImg,
      rating: typeof raw?.rating === "number" ? raw.rating : 0,
      location: raw?.location || "Ubicación no disponible",
      price: Number(raw?.price || 0),
      favoritesCount: Number(raw?.favoritesCount || 0),
    };

    const discountPercent = c.offer?.discountPercent;
    const hasDiscount =
      c.offer?.isSpecial &&
      typeof discountPercent === "number" &&
      discountPercent > 0;

    const discountedPrice = hasDiscount
      ? Math.round(c.price * (1 - discountPercent / 100))
      : null;

    const meta = getDisponibilidadMeta(c);
    const isDisponible = meta.code === "disponible";
    const isNoDisponible = !isDisponible;

    const visibleAmenities = c.amenities.slice(0, 3);
    const extraAmenitiesCount =
      c.amenities.length > 3 ? c.amenities.length - 3 : 0;

    const hasRating = c.favoritesCount > 0 && c.rating > 0;
    const capacityLabel = getCapacityLabel(c.size);

    return {
      c,
      meta,
      isDisponible,
      isNoDisponible,
      hasDiscount,
      discountedPrice,
      discountPercent,
      visibleAmenities,
      extraAmenitiesCount,
      hasRating,
      capacityLabel,
    };
  };

  /* ========== menú opciones ========== */
  const buildMenuItems = (isNoDisponible) => {
    const items = [];

    if (typeof onReservaExpress === "function") {
      items.push({
        key: "reserva",
        disabled: isNoDisponible,
        label: (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <CalendarOutlined />
            Reserva express
          </span>
        ),
      });
    }

    items.push({
      key: "whatsapp",
      label: (
        <span style={{ display: "inline-flex", alignItems: "center" }}>
          <WhatsappChip />
          Obtener información
        </span>
      ),
    });

    return items;
  };

  /* ========== Article Card (Hero / Stack / Tile) ========== */
  const ArticleRoomCard = ({ raw, variant = "tile" }) => {
    const {
      c,
      meta,
      isNoDisponible,
      hasDiscount,
      discountedPrice,
      discountPercent,
      visibleAmenities,
      extraAmenitiesCount,
      hasRating,
      capacityLabel,
    } = normalizeCard(raw);

    const menuItems = buildMenuItems(isNoDisponible);

    const H = variant === "hero" ? 420 : variant === "stack" ? 202 : 260;
    const titleSize = variant === "hero" ? 28 : variant === "stack" ? 18 : 16;

    const showAmenities = variant === "hero";
    const showRate = variant !== "tile";

    const priceNode = hasDiscount && discountedPrice != null ? (
      <Flex align="baseline" gap={8} wrap justify="flex-end">
        <Typography.Text
          delete
          style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}
        >
          ${c.price.toLocaleString("es-MX")}
        </Typography.Text>
        <Typography.Text
          style={{
            color: "#fff",
            fontWeight: 900,
            fontSize: variant === "hero" ? 24 : 18,
            letterSpacing: -0.3,
          }}
        >
          ${discountedPrice.toLocaleString("es-MX")}
        </Typography.Text>
        <Typography.Text style={{ color: "rgba(255,255,255,0.85)" }}>
          / noche
        </Typography.Text>
      </Flex>
    ) : (
      <Flex align="baseline" gap={8} wrap justify="flex-end">
        <Typography.Text
          style={{
            color: "#fff",
            fontWeight: 900,
            fontSize: variant === "hero" ? 24 : 18,
            letterSpacing: -0.3,
          }}
        >
          ${c.price.toLocaleString("es-MX")}
        </Typography.Text>
        <Typography.Text style={{ color: "rgba(255,255,255,0.85)" }}>
          / noche
        </Typography.Text>
      </Flex>
    );

    return (
      <Card
        hoverable
        className="frida-article-card"
        styles={{ body: { padding: 0, height: "100%" } }}
        style={{
          height: H,
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(148,163,184,0.18)",
          boxShadow: "0 18px 50px rgba(15,23,42,0.10)",
        }}
      >
        <div className="frida-article-wrap">
          <img
            className="frida-article-cover"
            src={c.img}
            alt={c.title}
            loading="lazy"
          />
          <div className="frida-article-overlay" />

          {/* top */}
          <div className="frida-article-top">
            <Flex gap={8} align="center" wrap style={{ minWidth: 0 }}>
              {!!c.badge && (
                <Tag
                  bordered={false}
                  style={{
                    borderRadius: 999,
                    padding: "2px 10px",
                    margin: 0,
                    fontSize: 10,
                    fontWeight: 900,
                    background: "rgba(251,113,133,0.22)",
                    color: "#0f172a",
                  }}
                >
                  {c.badge}
                </Tag>
              )}

              <SedeTag hotelCode={c.hotelCode} />

              <Tooltip title={meta.description}>
                <Tag
                  bordered={false}
                  style={{
                    borderRadius: 999,
                    padding: "2px 10px",
                    margin: 0,
                    fontSize: 10,
                    fontWeight: 900,
                    background: "rgba(255,255,255,0.88)",
                    color: meta.text,
                  }}
                >
                  {meta.label}
                </Tag>
              </Tooltip>

              {c.offer?.isSpecial && (
                <Tag
                  bordered={false}
                  style={{
                    borderRadius: 999,
                    padding: "2px 10px",
                    margin: 0,
                    fontSize: 10,
                    fontWeight: 900,
                    background: "rgba(255,255,255,0.88)",
                    color: "#0f172a",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <FireFilled style={{ color: colors.turquoise }} />
                  Oferta
                  {hasDiscount ? (
                    <span style={{ opacity: 0.85 }}>-{discountPercent}%</span>
                  ) : null}
                </Tag>
              )}
            </Flex>

            <Flex gap={8} align="center" wrap style={{ justifyContent: "flex-end" }}>
              <Tooltip
                title={`${c.favoritesCount} personas marcaron esta habitación como favorita`}
              >
                <Button
                  danger
                  size="small"
                  icon={<HeartOutlined />}
                  loading={favLoadingId === c._id}
                  onClick={(e) => {
                    e?.stopPropagation?.();
                    handleFavorite(c);
                  }}
                  style={{
                    height: 32,
                    borderRadius: 999,
                    fontWeight: 900,
                    background: "rgba(255,255,255,0.92)",
                    borderColor: "rgba(255,255,255,0.55)",
                    boxShadow: "0 10px 26px rgba(2,6,23,.18)",
                  }}
                >
                  {variant === "tile" ? null : c.favoritesCount}
                </Button>
              </Tooltip>

              <Dropdown
                trigger={["click"]}
                menu={{
                  items: menuItems,
                  onClick: ({ key }) => {
                    if (key === "reserva") {
                      if (!isNoDisponible && typeof onReservaExpress === "function")
                        onReservaExpress(c);
                    } else if (key === "whatsapp") {
                      if (typeof onInfoWhatsapp === "function") onInfoWhatsapp(c);
                    }
                  },
                }}
              >
                <Button
                  size="small"
                  type="primary"
                  onClick={(e) => e?.stopPropagation?.()}
                  style={{
                    height: 32,
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 900,
                    background: colors.deepBlue,
                    borderColor: "transparent",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 12px 30px rgba(2,6,23,.22)",
                  }}
                >
                  {variant === "tile" ? "" : "Opciones"}
                  <DownOutlined style={{ fontSize: 10 }} />
                </Button>
              </Dropdown>
            </Flex>
          </div>

          {/* bottom */}
          <div className="frida-article-bottom">
            <Typography.Title
              level={variant === "hero" ? 3 : 5}
              style={{
                margin: 0,
                color: "#fff",
                fontWeight: 900,
                fontSize: titleSize,
                letterSpacing: -0.4,
                lineHeight: 1.05,
              }}
              className="frida-clamp-2"
            >
              {c.title}
            </Typography.Title>

            <Flex
              align="center"
              gap={12}
              wrap
              style={{ marginTop: variant === "hero" ? 8 : 6 }}
            >
              <Typography.Text
                style={{
                  color: "rgba(255,255,255,0.92)",
                  fontSize: 12,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  minWidth: 0,
                }}
              >
                <EnvironmentOutlined style={{ color: colors.turquoise }} />
                <span className="frida-ellipsis">{c.location}</span>
              </Typography.Text>

              {capacityLabel && (
                <Typography.Text
                  style={{
                    color: "rgba(255,255,255,0.92)",
                    fontSize: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <TeamOutlined />
                  {capacityLabel}
                </Typography.Text>
              )}
            </Flex>

            <Flex
              justify="space-between"
              align="flex-end"
              gap={12}
              wrap
              style={{ marginTop: 10 }}
            >
              <div style={{ minWidth: 0 }}>
                {showRate ? (
                  hasRating ? (
                    <Tooltip title={`Puntuación: ${c.rating} (${c.favoritesCount} favoritos)`}>
                      <div style={{ display: "inline-flex" }}>
                        <Rate
                          allowHalf
                          disabled
                          value={c.rating}
                          style={{ fontSize: 14 }}
                        />
                      </div>
                    </Tooltip>
                  ) : (
                    <Typography.Text
                      style={{
                        color: "rgba(255,255,255,0.82)",
                        fontSize: 11,
                        fontStyle: "italic",
                      }}
                    >
                      Aún sin calificación
                    </Typography.Text>
                  )
                ) : hasRating ? (
                  <Flex align="center" gap={6}>
                    <StarFilled style={{ color: "rgba(255,255,255,0.92)" }} />
                    <Typography.Text style={{ color: "rgba(255,255,255,0.90)", fontWeight: 900 }}>
                      {Number(c.rating).toFixed(1)}
                    </Typography.Text>
                  </Flex>
                ) : null}

                {showAmenities && visibleAmenities.length > 0 ? (
                  <Flex align="center" gap={8} wrap style={{ marginTop: 10 }}>
                    {visibleAmenities.map((a, j) => (
                      <Tag
                        key={j}
                        bordered={false}
                        style={{
                          borderRadius: 999,
                          margin: 0,
                          fontSize: 10,
                          fontWeight: 900,
                          background: "rgba(255,255,255,0.88)",
                          color: "#0f172a",
                        }}
                      >
                        {a}
                      </Tag>
                    ))}

                    {extraAmenitiesCount > 0 ? (
                      <Popover
                        title="Servicios adicionales"
                        trigger="click"
                        content={
                          <Space wrap size={[6, 6]}>
                            {c.amenities.slice(3).map((a, j) => (
                              <Tag
                                key={j}
                                color={colors.turquoise}
                                style={{
                                  borderRadius: 999,
                                  margin: 0,
                                  fontSize: 11,
                                  padding: "2px 10px",
                                  color: "#0f172a",
                                }}
                              >
                                {a}
                              </Tag>
                            ))}
                          </Space>
                        }
                      >
                        <Tag
                          bordered={false}
                          style={{
                            borderRadius: 999,
                            margin: 0,
                            fontSize: 10,
                            fontWeight: 900,
                            background: "rgba(255,255,255,0.88)",
                            color: "#0f172a",
                            cursor: "pointer",
                          }}
                        >
                          +{extraAmenitiesCount} más
                        </Tag>
                      </Popover>
                    ) : null}
                  </Flex>
                ) : null}
              </div>

              <div style={{ textAlign: "right" }}>{priceNode}</div>
            </Flex>
          </div>
        </div>
      </Card>
    );
  };

  /* ========== Desktop editorial layout (robusto, sin bugs) ========== */
  const renderDesktopEditorial = () => {
    const n = Math.min(6, limited.length);

    const a0 = limited[0];
    const a1 = limited[1];
    const a2 = limited[2];
    const a3 = limited[3];
    const a4 = limited[4];
    const a5 = limited[5];

    const showTopRightStack = n >= 3; // 2 stacks
    const showTopRightTall = n === 2 || n === 4; // 1 stack alto
    const showBottom3 = n >= 6;
    const showBottom2 = n === 5;
    const showBottom1 = n === 4;

    return (
      <>
        <style>{`
          .frida-article-card:hover{
            transform: translateY(-3px);
            transition: transform .18s ease, box-shadow .18s ease;
          }
          .frida-article-wrap{
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          .frida-article-cover{
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            transform: scale(1.03);
            transition: transform .35s ease;
            filter: saturate(1.06) contrast(1.02);
          }
          .frida-article-card:hover .frida-article-cover{
            transform: scale(1.08);
          }
          .frida-article-overlay{
            position: absolute;
            inset: 0;
            background:
              radial-gradient(1200px 600px at 30% 18%, rgba(255,255,255,0.08), transparent 55%),
              linear-gradient(180deg, rgba(2,6,23,0.16) 0%, rgba(2,6,23,0.52) 55%, rgba(2,6,23,0.90) 100%);
          }
          .frida-article-top{
            position: absolute;
            top: 12px;
            left: 12px;
            right: 12px;
            z-index: 2;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            min-width: 0;
          }
          .frida-article-bottom{
            position: absolute;
            left: 14px;
            right: 14px;
            bottom: 14px;
            z-index: 2;
            min-width: 0;
          }
          .frida-ellipsis{
            display: inline-block;
            max-width: 420px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            vertical-align: bottom;
            min-width: 0;
          }
          .frida-clamp-2{
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            overflow: hidden;
          }
          @media (max-width: 1180px){
            .frida-ellipsis{ max-width: 280px; }
          }
          @media (prefers-reduced-motion: reduce){
            .frida-article-card, .frida-article-cover{
              transition: none !important;
            }
          }
        `}</style>

        <div style={{ width: "100%", minWidth: 0 }}>
          {/* TOP ROW */}
          <Row gutter={[16, 16]} style={{ marginTop: 15 }}>
            {/* HERO */}
            <Col xs={24} lg={n === 1 ? 24 : 16}>
              {a0 ? (
                <ArticleRoomCard raw={a0} variant="hero" />
              ) : (
                <Card style={{ borderRadius: 18, height: 420 }}>
                  <Skeleton active />
                </Card>
              )}
            </Col>

            {/* RIGHT */}
            {n > 1 ? (
              <Col xs={24} lg={8}>
                {showTopRightStack ? (
                  <Flex vertical gap={16}>
                    {a1 ? (
                      <ArticleRoomCard raw={a1} variant="stack" />
                    ) : (
                      <Card style={{ borderRadius: 18, height: 202 }}>
                        <Skeleton active />
                      </Card>
                    )}
                    {a2 ? (
                      <ArticleRoomCard raw={a2} variant="stack" />
                    ) : (
                      <Card style={{ borderRadius: 18, height: 202 }}>
                        <Skeleton active />
                      </Card>
                    )}
                  </Flex>
                ) : showTopRightTall ? (
                  a1 ? (
                    <ArticleRoomCard raw={a1} variant="hero" />
                  ) : (
                    <Card style={{ borderRadius: 18, height: 420 }}>
                      <Skeleton active />
                    </Card>
                  )
                ) : (
                  // n==2 sin tall? no entra aquí
                  null
                )}
              </Col>
            ) : null}
          </Row>

          {/* BOTTOM ROW */}
          {(showBottom1 || showBottom2 || showBottom3) && (
            <Row gutter={[16, 16]} style={{ marginTop: 0 }}>
              {showBottom1 && a2 ? (
                <Col xs={24} lg={24}>
                  <ArticleRoomCard raw={a2} variant="tile" />
                </Col>
              ) : null}

              {showBottom2 && (
                <>
                  <Col xs={24} lg={12}>
                    {a3 ? (
                      <ArticleRoomCard raw={a3} variant="tile" />
                    ) : (
                      <Card style={{ borderRadius: 18, height: 260 }}>
                        <Skeleton active />
                      </Card>
                    )}
                  </Col>
                  <Col xs={24} lg={12}>
                    {a4 ? (
                      <ArticleRoomCard raw={a4} variant="tile" />
                    ) : (
                      <Card style={{ borderRadius: 18, height: 260 }}>
                        <Skeleton active />
                      </Card>
                    )}
                  </Col>
                </>
              )}

              {showBottom3 && (
                <>
                  <Col xs={24} lg={8}>
                    {a3 ? (
                      <ArticleRoomCard raw={a3} variant="tile" />
                    ) : (
                      <Card style={{ borderRadius: 18, height: 260 }}>
                        <Skeleton active />
                      </Card>
                    )}
                  </Col>
                  <Col xs={24} lg={8}>
                    {a4 ? (
                      <ArticleRoomCard raw={a4} variant="tile" />
                    ) : (
                      <Card style={{ borderRadius: 18, height: 260 }}>
                        <Skeleton active />
                      </Card>
                    )}
                  </Col>
                  <Col xs={24} lg={8}>
                    {a5 ? (
                      <ArticleRoomCard raw={a5} variant="tile" />
                    ) : (
                      <Card style={{ borderRadius: 18, height: 260 }}>
                        <Skeleton active />
                      </Card>
                    )}
                  </Col>
                </>
              )}
            </Row>
          )}
        </div>
      </>
    );
  };

  /* ========== Mobile: tu layout “cards normales” (lo dejo estable) ========== */
  const pageSize = pagination?.limit || 6;
  const skeletonCount = pageSize || 6;

  const renderMobileSkeleton = (i) => (
    <Col key={i} xs={24} sm={12} md={12}>
      <Card style={{ borderRadius: 18 }} hoverable>
        <Skeleton
          active
          title={{ width: "60%" }}
          paragraph={{ rows: 3 }}
        />
        <Skeleton.Image
          active
          style={{ width: "100%", height: 180, borderRadius: 14 }}
        />
      </Card>
    </Col>
  );

  const renderMobileList = () => {
    return (
      <Row gutter={[16, 16]} style={{ marginTop: 15 }}>
        {loading
          ? Array.from({ length: skeletonCount }).map((_, i) =>
              renderMobileSkeleton(i)
            )
          : safeCards.map((raw, i) => {
              const norm = normalizeCard(raw);
              const {
                c,
                meta,
                isNoDisponible,
                hasDiscount,
                discountedPrice,
                discountPercent,
                visibleAmenities,
                extraAmenitiesCount,
                hasRating,
                capacityLabel,
              } = norm;

              const menuItems = buildMenuItems(isNoDisponible);

              return (
                <Col key={c._id || i} xs={24} sm={12} md={12}>
                  <Card
                    hoverable
                    cover={
                      <img
                        alt={c.title}
                        src={c.img}
                        style={{ height: 180, objectFit: "cover" }}
                      />
                    }
                    styles={{
                      body: {
                        padding: 10,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        minHeight: 230,
                      },
                    }}
                    style={{ borderRadius: 18, overflow: "hidden" }}
                    actions={[
                      <Flex
                        justify="space-between"
                        style={{ padding: "0 8px" }}
                        key="actions"
                      >
                        <Tooltip title={`${c.favoritesCount} favoritos`}>
                          <Button
                            type="default"
                            danger
                            icon={<HeartOutlined />}
                            size="small"
                            style={{ height: 30 }}
                            loading={favLoadingId === c._id}
                            onClick={() => handleFavorite(c)}
                          >
                            {c.favoritesCount}
                          </Button>
                        </Tooltip>

                        <Dropdown
                          trigger={["click"]}
                          menu={{
                            items: menuItems,
                            onClick: ({ key }) => {
                              if (key === "reserva") {
                                if (
                                  !isNoDisponible &&
                                  typeof onReservaExpress === "function"
                                )
                                  onReservaExpress(c);
                              } else if (key === "whatsapp") {
                                if (typeof onInfoWhatsapp === "function")
                                  onInfoWhatsapp(c);
                              }
                            },
                          }}
                        >
                          <Button
                            size="small"
                            type="primary"
                            style={{
                              height: 30,
                              borderRadius: 999,
                              fontSize: 11,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            Opciones{" "}
                            <DownOutlined style={{ fontSize: 10 }} />
                          </Button>
                        </Dropdown>
                      </Flex>,
                    ]}
                  >
                    <Flex justify="space-between" align="flex-start" gap={8}>
                      <Space direction="vertical" size={2} style={{ width: "100%" }}>
                        <Typography.Title
                          level={5}
                          style={{
                            color: colors.deepBlue,
                            marginBottom: 0,
                            fontSize: 15,
                            fontWeight: 900,
                          }}
                        >
                          {c.title}
                        </Typography.Title>
                        <SedeTag hotelCode={c.hotelCode} />
                      </Space>

                      <Tooltip title={meta.description}>
                        <Tag
                          color={meta.color}
                          style={{
                            borderRadius: 999,
                            fontSize: 10,
                            marginTop: 2,
                            color: meta.text,
                            fontWeight: 800,
                          }}
                        >
                          {meta.label}
                        </Tag>
                      </Tooltip>
                    </Flex>

                    <Flex justify="space-between" align="center" wrap gap={4} style={{ marginTop: 2 }}>
                      <Flex vertical style={{ maxWidth: "70%" }}>
                        <Typography.Text
                          type="secondary"
                          style={{
                            fontSize: 12,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <EnvironmentOutlined style={{ color: colors.turquoise }} />
                          {c.location}
                        </Typography.Text>

                        {capacityLabel && (
                          <Typography.Text
                            type="secondary"
                            style={{
                              fontSize: 11,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              marginTop: 2,
                            }}
                          >
                            <TeamOutlined style={{ color: colors.deepBlue }} />
                            {capacityLabel}
                          </Typography.Text>
                        )}
                      </Flex>

                      {hasRating ? (
                        <Tooltip title={`Puntuación: ${c.rating}`}>
                          <div style={{ display: "inline-flex" }}>
                            <Rate allowHalf disabled value={c.rating} style={{ fontSize: 14 }} />
                          </div>
                        </Tooltip>
                      ) : (
                        <Typography.Text type="secondary" style={{ fontSize: 11, fontStyle: "italic" }}>
                          Aún sin calificación
                        </Typography.Text>
                      )}
                    </Flex>

                    {c.offer?.isSpecial && (
                      <Typography.Text
                        style={{
                          color: colors.turquoise,
                          fontWeight: 800,
                          fontSize: 11,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 2,
                        }}
                      >
                        <FireFilled /> Oferta Especial
                        {hasDiscount && (
                          <Tag
                            color={colors.turquoise}
                            style={{
                              borderRadius: 999,
                              fontSize: 10,
                              color: "#064e3b",
                              fontWeight: 900,
                            }}
                          >
                            -{discountPercent}%
                          </Tag>
                        )}
                      </Typography.Text>
                    )}

                    {visibleAmenities.length > 0 && (
                      <Space wrap size={[4, 4]} style={{ marginTop: 6, maxWidth: "100%" }}>
                        {visibleAmenities.map((a, j) => (
                          <Tag key={j} color={colors.coral} style={{ borderRadius: 12, fontSize: 10 }}>
                            {a}
                          </Tag>
                        ))}
                        {extraAmenitiesCount > 0 && (
                          <Popover
                            title="Servicios adicionales"
                            trigger="click"
                            content={
                              <Space wrap size={[4, 4]}>
                                {c.amenities.slice(3).map((a, j) => (
                                  <Tag
                                    key={j}
                                    color={colors.turquoise}
                                    style={{ borderRadius: 12, fontSize: 11, padding: "2px 8px" }}
                                  >
                                    {a}
                                  </Tag>
                                ))}
                              </Space>
                            }
                          >
                            <Tag
                              style={{
                                borderRadius: 12,
                                fontSize: 10,
                                borderStyle: "dashed",
                                cursor: "pointer",
                              }}
                            >
                              +{extraAmenitiesCount} más
                            </Tag>
                          </Popover>
                        )}
                      </Space>
                    )}

                    <Flex justify="flex-start" align="baseline" gap={6} style={{ marginTop: 10 }}>
                      {hasDiscount && discountedPrice != null ? (
                        <>
                          <Typography.Text delete type="secondary" style={{ fontSize: 12 }}>
                            ${c.price.toLocaleString("es-MX")}
                          </Typography.Text>
                          <Typography.Text
                            style={{
                              fontSize: 18,
                              fontWeight: 900,
                              color: colors.deepBlue,
                            }}
                          >
                            ${discountedPrice.toLocaleString("es-MX")}
                          </Typography.Text>
                          <Typography.Text type="secondary">/ noche</Typography.Text>
                        </>
                      ) : (
                        <>
                          <Typography.Text style={{ fontSize: 18, fontWeight: 900, color: colors.deepBlue }}>
                            ${c.price.toLocaleString("es-MX")}
                          </Typography.Text>
                          <Typography.Text type="secondary">/ noche</Typography.Text>
                        </>
                      )}
                    </Flex>
                  </Card>
                </Col>
              );
            })}
      </Row>
    );
  };

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      {contextHolder}

      {resolvedIsMobile ? renderMobileList() : renderDesktopEditorial()}

      {!loading &&
        pagination &&
        pagination.total > pagination.limit &&
        typeof onPageChange === "function" && (
          <Flex justify="center" style={{ marginTop: 18 }}>
            <Pagination
              current={pagination.page}
              pageSize={pagination.limit}
              total={pagination.total}
              onChange={onPageChange}
              showSizeChanger={false}
              hideOnSinglePage
            />
          </Flex>
        )}
    </div>
  );
}

RoomCards.defaultProps = {
  cardsData: [],
  pagination: null,
  onPageChange: null,
  isMobile: undefined,
};

export default RoomCards;
