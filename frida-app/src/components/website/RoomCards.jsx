import {
  Card,
  Rate,
  Tag,
  Typography,
  Badge,
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
} from "antd";
import {
  EnvironmentOutlined,
  HeartOutlined,
  FireFilled,
  DownOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import axios from "@api/axios";
import { useState } from "react";

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
        fontWeight: 700,
        marginRight: 4,
      }}
    >
      W
    </span>
  );
}

// Mapea c.size (número) a etiqueta legible
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
  isMobile,
}) {
  const [messageApi, contextHolder] = message.useMessage();
  const [favLoadingId, setFavLoadingId] = useState(null);

  const placeholderImg = "https://via.placeholder.com/400x250?text=Sin+imagen";
  const safeCards = Array.isArray(cardsData) ? cardsData : [];

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

  const getSedeTag = (hotelCode) => {
    const label = getSedeLabel(hotelCode);
    const color =
      hotelCode === "casa_frida"
        ? beachColors.oceanBlue
        : beachColors.turquoise;

    return (
      <Tag
        color={color}
        style={{ borderRadius: 999, fontSize: 10, color: "#0f172a" }}
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

  // ✅ regla consistente SIN availability y SIN isReserved
  const getDisponibilidadMeta = (room) => {
    if (room?.isDeleted) {
      return {
        code: "papelera",
        label: "No disponible",
        description: "Esta habitación está en papelera.",
        color: "#9ca3af",
      };
    }

    const invOk = (room?.inventoryStatus || "Activa") === "Activa";

    if (!invOk) {
      return {
        code: "no_disponible",
        label: "No disponible",
        description: `Estado: ${room.inventoryStatus}`,
        color: "#9ca3af",
      };
    }

    return {
      code: "disponible",
      label: "Disponible",
      description: "Puedes solicitar una reserva o pedir más información.",
      color: beachColors.teal,
    };
  };

  const pageSize = pagination?.limit || 5;
  const skeletonCount = pageSize || 5;

  const renderSkeletonCard = (i) => {
    if (isMobile) {
      // skeleton vertical para móvil
      return (
        <Col key={i} xs={24} sm={12} md={12}>
          <Flex
            justify="start"
            align="center"
            style={{ height: 200, backgroundColor: "#f3f4f6", padding: 16 }}
          >
            <Skeleton active>
              <Card hoverable>
                <Card.Meta
                  title={
                    <Skeleton.Input
                      style={{ width: 200, marginTop: 16 }}
                      active
                    />
                  }
                  description={
                    <>
                      <Skeleton.Input
                        style={{ width: 150, marginTop: 8 }}
                        active
                      />
                      <div style={{ marginTop: 8 }}>
                        <Skeleton.Input style={{ width: 100 }} active />
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <Skeleton.Input style={{ width: 250 }} active />
                      </div>
                    </>
                  }
                />
              </Card>
            </Skeleton>
          </Flex>
        </Col>
      );
    }

    // skeleton horizontal desktop
    return (
      <Col key={i} xs={24}>
        <Card
          style={{
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <Flex gap={16}>
            <Skeleton.Image
              active
              style={{ width: 220, height: 160, borderRadius: 12 }}
            />
            <Flex vertical style={{ flex: 1 }}>
              <Skeleton
                active
                title={{ width: "40%" }}
                paragraph={{ rows: 3 }}
              />
            </Flex>
          </Flex>
        </Card>
      </Col>
    );
  };

  return (
    <>
      {contextHolder}

      <Row gutter={[16, 16]} style={{ marginTop: 15 }}>
        {loading
          ? Array.from({ length: skeletonCount }).map((_, i) =>
              renderSkeletonCard(i)
            )
          : safeCards.map((raw, i) => {
              const c = {
                ...raw,
                amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
                img: raw.img || placeholderImg,
                rating: typeof raw.rating === "number" ? raw.rating : 0,
                location: raw.location || "Ubicación no disponible",
                price: raw.price || 0,
                favoritesCount:
                  typeof raw.favoritesCount === "number"
                    ? raw.favoritesCount
                    : 0,
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

              const menuItems = [
                {
                  key: "whatsapp",
                  label: (
                    <span>
                      <WhatsappChip />
                      Obtener información
                    </span>
                  ),
                },
              ];

              const visibleAmenities = c.amenities.slice(0, 3);
              const extraAmenitiesCount =
                c.amenities.length > 3 ? c.amenities.length - 3 : 0;

              const hasRating = c.favoritesCount > 0 && c.rating > 0;
              const capacityLabel = getCapacityLabel(c.size);

              // ====== TARJETA MÓVIL (vertical) ======
              if (isMobile) {
                return (
                  <Col key={c._id || i} xs={24} sm={12} md={12}>
                    <Badge.Ribbon
                      text={c.badge || ""}
                      color={
                        c.featured ? beachColors.coral : beachColors.turquoise
                      }
                    >
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
                        actions={[
                          <Flex
                            justify="space-between"
                            style={{ padding: "0 8px" }}
                            key="actions"
                          >
                            <Tooltip
                              title={`${c.favoritesCount} personas marcaron esta habitación como favorita`}
                            >
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
                                    if (!isNoDisponible && onReservaExpress)
                                      onReservaExpress(c);
                                  } else if (key === "whatsapp") {
                                    if (onInfoWhatsapp) onInfoWhatsapp(c);
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
                        <Flex
                          justify="space-between"
                          align="flex-start"
                          gap={8}
                        >
                          <Space
                            direction="vertical"
                            size={2}
                            style={{ width: "100%" }}
                          >
                            <Typography.Title
                              level={5}
                              style={{
                                color: beachColors.deepBlue,
                                marginBottom: 0,
                                fontSize: 15,
                              }}
                            >
                              {c.title}
                            </Typography.Title>
                            {getSedeTag(c.hotelCode)}
                          </Space>

                          <Tooltip title={meta.description}>
                            <Tag
                              color={meta.color}
                              style={{
                                borderRadius: 999,
                                fontSize: 10,
                                marginTop: 2,
                                color:
                                  meta.code === "disponible"
                                    ? "#064e3b"
                                    : "#111827",
                              }}
                            >
                              {meta.label}
                            </Tag>
                          </Tooltip>
                        </Flex>

                        {/* Ubicación + capacidad + rating */}
                        <Flex
                          justify="space-between"
                          align="center"
                          wrap
                          gap={4}
                          style={{ marginTop: 2 }}
                        >
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
                              <EnvironmentOutlined
                                style={{ color: beachColors.turquoise }}
                              />
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
                                <TeamOutlined
                                  style={{ color: beachColors.deepBlue }}
                                />
                                {capacityLabel}
                              </Typography.Text>
                            )}
                          </Flex>

                          {hasRating ? (
                            <Tooltip
                              placement="top"
                              title={`Puntuación: ${c.rating} (${c.favoritesCount} favoritos)`}
                            >
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
                              type="secondary"
                              style={{ fontSize: 11, fontStyle: "italic" }}
                            >
                              Aún sin calificación
                            </Typography.Text>
                          )}
                        </Flex>

                        {c.offer?.isSpecial && (
                          <Typography.Text
                            style={{
                              color: beachColors.turquoise,
                              fontWeight: 600,
                              fontSize: 11,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              marginTop: 2,
                            }}
                          >
                            <FireFilled /> Oferta Especial
                            {hasDiscount && (
                              <Tag
                                color={beachColors.turquoise}
                                style={{
                                  borderRadius: 999,
                                  fontSize: 10,
                                  color: "#064e3b",
                                }}
                              >
                                -{discountPercent}%
                              </Tag>
                            )}
                          </Typography.Text>
                        )}

                        {visibleAmenities.length > 0 && (
                          <Space
                            wrap
                            size={[4, 4]}
                            style={{ marginTop: 6, maxWidth: "100%" }}
                          >
                            {visibleAmenities.map((a, j) => (
                              <Tag
                                key={j}
                                color={beachColors.coral}
                                style={{ borderRadius: 12, fontSize: 10 }}
                              >
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
                                        color={beachColors.turquoise}
                                        style={{
                                          borderRadius: 12,
                                          fontSize: 11,
                                          padding: "2px 8px",
                                        }}
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

                        <Flex
                          justify="flex-start"
                          align="baseline"
                          gap={6}
                          style={{ marginTop: 10 }}
                        >
                          {hasDiscount && discountedPrice != null ? (
                            <>
                              <Typography.Text
                                delete
                                type="secondary"
                                style={{ fontSize: 12 }}
                              >
                                ${c.price.toLocaleString("es-MX")}
                              </Typography.Text>
                              <Typography.Text
                                style={{
                                  fontSize: 18,
                                  fontWeight: 700,
                                  color: beachColors.deepBlue,
                                }}
                              >
                                ${discountedPrice.toLocaleString("es-MX")}
                              </Typography.Text>
                              <Typography.Text type="secondary">
                                / noche
                              </Typography.Text>
                            </>
                          ) : (
                            <>
                              <Typography.Text
                                style={{
                                  fontSize: 18,
                                  fontWeight: 700,
                                  color: beachColors.deepBlue,
                                }}
                              >
                                ${c.price.toLocaleString("es-MX")}
                              </Typography.Text>
                              <Typography.Text type="secondary">
                                / noche
                              </Typography.Text>
                            </>
                          )}
                        </Flex>
                      </Card>
                    </Badge.Ribbon>
                  </Col>
                );
              }

              // ====== TARJETA DESKTOP (horizontal, más ancha que alta) ======
              return (
                <Col key={c._id || i} xs={24}>
                  <Badge.Ribbon
                    text={c.badge || ""}
                    color={
                      c.featured ? beachColors.coral : beachColors.turquoise
                    }
                  >
                    <Card
                      hoverable
                      style={{
                        borderRadius: 18,
                        overflow: "hidden",
                      }}
                      bodyStyle={{ padding: 12 }}
                    >
                      <Flex gap={16} align="stretch">
                        {/* Imagen */}
                        <div
                          style={{
                            flex: "0 0 220px",
                            maxWidth: 240,
                            borderRadius: 14,
                            overflow: "hidden",
                          }}
                        >
                          <img
                            src={c.img}
                            alt={c.title}
                            style={{
                              width: "100%",
                              height: 160,
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        </div>

                        {/* Contenido */}
                        <Flex
                          vertical
                          justify="space-between"
                          style={{ flex: 1, minHeight: 160 }}
                          gap={6}
                        >
                          <div>
                            <Flex
                              justify="space-between"
                              align="flex-start"
                              gap={8}
                            >
                              <Space
                                direction="vertical"
                                size={2}
                                style={{ width: "100%" }}
                              >
                                <Typography.Title
                                  level={5}
                                  style={{
                                    color: beachColors.deepBlue,
                                    marginBottom: 0,
                                    fontSize: 16,
                                  }}
                                >
                                  {c.title}
                                </Typography.Title>
                                {getSedeTag(c.hotelCode)}
                              </Space>

                              <Tooltip title={meta.description}>
                                <Tag
                                  color={meta.color}
                                  style={{
                                    borderRadius: 999,
                                    fontSize: 10,
                                    marginTop: 2,
                                    color:
                                      meta.code === "disponible"
                                        ? "#064e3b"
                                        : "#111827",
                                  }}
                                >
                                  {meta.label}
                                </Tag>
                              </Tooltip>
                            </Flex>

                            {/* Ubicación, capacidad, rating */}
                            <Flex
                              justify="space-between"
                              align="center"
                              wrap
                              gap={4}
                              style={{ marginTop: 4 }}
                            >
                              <Flex vertical style={{ maxWidth: "65%" }}>
                                <Typography.Text
                                  type="secondary"
                                  style={{
                                    fontSize: 12,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  <EnvironmentOutlined
                                    style={{ color: beachColors.turquoise }}
                                  />
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
                                    <TeamOutlined
                                      style={{ color: beachColors.deepBlue }}
                                    />
                                    {capacityLabel}
                                  </Typography.Text>
                                )}
                              </Flex>

                              {hasRating ? (
                                <Tooltip
                                  placement="top"
                                  title={`Puntuación: ${c.rating} (${c.favoritesCount} favoritos)`}
                                >
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
                                  type="secondary"
                                  style={{ fontSize: 11, fontStyle: "italic" }}
                                >
                                  Aún sin calificación
                                </Typography.Text>
                              )}
                            </Flex>

                            {/* Oferta + amenities */}
                            {c.offer?.isSpecial && (
                              <Typography.Text
                                style={{
                                  color: beachColors.turquoise,
                                  fontWeight: 600,
                                  fontSize: 11,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  marginTop: 4,
                                }}
                              >
                                <FireFilled /> Oferta Especial
                                {hasDiscount && (
                                  <Tag
                                    color={beachColors.turquoise}
                                    style={{
                                      borderRadius: 999,
                                      fontSize: 10,
                                      color: "#064e3b",
                                    }}
                                  >
                                    -{discountPercent}%
                                  </Tag>
                                )}
                              </Typography.Text>
                            )}

                            {visibleAmenities.length > 0 && (
                              <Space
                                wrap
                                size={[4, 4]}
                                style={{ marginTop: 6, maxWidth: "100%" }}
                              >
                                {visibleAmenities.map((a, j) => (
                                  <Tag
                                    key={j}
                                    color={beachColors.coral}
                                    style={{ borderRadius: 12, fontSize: 10 }}
                                  >
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
                                            color={beachColors.turquoise}
                                            style={{
                                              borderRadius: 12,
                                              fontSize: 11,
                                              padding: "2px 8px",
                                            }}
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
                          </div>

                          {/* Precio + acciones, pegados abajo */}
                          <Flex
                            justify="space-between"
                            align="flex-end"
                            wrap
                            gap={8}
                            style={{ marginTop: 6 }}
                          >
                            <Flex justify="flex-start" align="baseline" gap={6}>
                              {hasDiscount && discountedPrice != null ? (
                                <>
                                  <Typography.Text
                                    delete
                                    type="secondary"
                                    style={{ fontSize: 12 }}
                                  >
                                    ${c.price.toLocaleString("es-MX")}
                                  </Typography.Text>
                                  <Typography.Text
                                    style={{
                                      fontSize: 20,
                                      fontWeight: 700,
                                      color: beachColors.deepBlue,
                                    }}
                                  >
                                    ${discountedPrice.toLocaleString("es-MX")}
                                  </Typography.Text>
                                  <Typography.Text type="secondary">
                                    / noche
                                  </Typography.Text>
                                </>
                              ) : (
                                <>
                                  <Typography.Text
                                    style={{
                                      fontSize: 20,
                                      fontWeight: 700,
                                      color: beachColors.deepBlue,
                                    }}
                                  >
                                    ${c.price.toLocaleString("es-MX")}
                                  </Typography.Text>
                                  <Typography.Text type="secondary">
                                    / noche
                                  </Typography.Text>
                                </>
                              )}
                            </Flex>

                            <Space>
                              <Tooltip
                                title={`${c.favoritesCount} personas marcaron esta habitación como favorita`}
                              >
                                <Button
                                  type="default"
                                  danger
                                  icon={<HeartOutlined />}
                                  size="small"
                                  style={{ height: 32 }}
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
                                      if (!isNoDisponible && onReservaExpress)
                                        onReservaExpress(c);
                                    } else if (key === "whatsapp") {
                                      if (onInfoWhatsapp) onInfoWhatsapp(c);
                                    }
                                  },
                                }}
                              >
                                <Button
                                  size="small"
                                  type="primary"
                                  style={{
                                    height: 32,
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
                            </Space>
                          </Flex>
                        </Flex>
                      </Flex>
                    </Card>
                  </Badge.Ribbon>
                </Col>
              );
            })}
      </Row>

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
    </>
  );
}

RoomCards.defaultProps = {
  cardsData: [],
  pagination: null,
  onPageChange: null,
  isMobile: false,
};

export default RoomCards;
