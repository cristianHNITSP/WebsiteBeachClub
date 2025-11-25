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
import { EnvironmentOutlined, HeartOutlined, FireFilled, DownOutlined } from "@ant-design/icons";
import axios from "axios";
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

function RoomCards({
  beachColors,
  cardsData,
  loading,
  onReservaExpress,
  onInfoWhatsapp,
  pagination,
  onPageChange,
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
    const color = hotelCode === "casa_frida" ? beachColors.oceanBlue : beachColors.turquoise;

    return (
      <Tag color={color} style={{ borderRadius: 999, fontSize: 10, color: "#0f172a" }}>
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

      const { data } = await axios.post(`/api/habitaciones/${room._id}/favorite`);

      messageApi.open({
        key: `fav-${room._id}`,
        type: "success",
        content: data?.message || "Gracias por marcar como favorito 💙",
        duration: 2,
      });
    } catch (err) {
      console.error("Error al marcar favorito:", err);
      const backendMsg =
        err.response?.data?.message || "No se pudo registrar tu favorito. Inténtalo más tarde.";
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

  // ✅ regla consistente
// ✅ regla consistente SIN availability
const getDisponibilidadMeta = (room) => {
  if (room?.isDeleted) {
    return { code: "papelera", label: "No disponible", description: "Esta habitación está en papelera.", color: "#9ca3af" };
  }

  const invOk = (room?.inventoryStatus || "Activa") === "Activa";

  if (!invOk) {
    return { code: "no_disponible", label: "No disponible", description: `Estado: ${room.inventoryStatus}`, color: "#9ca3af" };
  }

  if (room?.isReserved === true) {
    return { code: "reservada", label: "Reservada", description: "Ya reservada, no disponible para nuevas reservas.", color: "#f97373" };
  }

  return { code: "disponible", label: "Disponible", description: "Puedes solicitar una reserva o pedir más información.", color: beachColors.teal };
};


  return (
    <>
      {contextHolder}

      <Row gutter={[16, 16]} style={{ marginTop: 15 }}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Col key={i} xs={24} sm={12} md={12} lg={8}>
                <Flex justify="start" align="center" style={{ height: 180, backgroundColor: "#f0f0f0", padding: 16 }}>
                  <Skeleton active>
                    <Card hoverable>
                      <Card.Meta
                        title={<Skeleton.Input style={{ width: 200, marginTop: 16 }} active />}
                        description={
                          <>
                            <Skeleton.Input style={{ width: 150, marginTop: 8 }} active />
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
            ))
          : safeCards.map((raw, i) => {
              const c = {
                ...raw,
                amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
                img: raw.img || placeholderImg,
                rating: raw.rating || 0,
                location: raw.location || "Ubicación no disponible",
                price: raw.price || 0,
                favoritesCount: raw.favoritesCount || 0,
              };

              const discountPercent = c.offer?.discountPercent;
              const hasDiscount =
                c.offer?.isSpecial && typeof discountPercent === "number" && discountPercent > 0;

              const discountedPrice = hasDiscount ? Math.round(c.price * (1 - discountPercent / 100)) : null;

              const meta = getDisponibilidadMeta(c);
              const isDisponible = meta.code === "disponible";
              const isNoDisponible = !isDisponible; // ✅ solo disponible permite reservar

              const menuItems = [
                { key: "reserva", label: "Solicitar reserva (chat)", disabled: isNoDisponible },
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
              const extraAmenitiesCount = c.amenities.length > 3 ? c.amenities.length - 3 : 0;

              return (
                <Col key={c._id || i} xs={24} sm={12} md={12} lg={8}>
                  <Badge.Ribbon text={c.badge || ""} color={c.featured ? beachColors.coral : beachColors.turquoise}>
                    <Card
                      hoverable
                      cover={<img alt={c.title} src={c.img} style={{ height: 180, objectFit: "cover" }} />}
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
                        <Flex justify="space-between" style={{ padding: "0 8px" }} key="actions">
                          <Tooltip title={`${c.favoritesCount} personas marcaron esta habitación como favorita`}>
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
                                  if (!isNoDisponible && onReservaExpress) onReservaExpress(c);
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
                              Opciones <DownOutlined style={{ fontSize: 10 }} />
                            </Button>
                          </Dropdown>
                        </Flex>,
                      ]}
                    >
                      <Flex justify="space-between" align="flex-start" gap={8}>
                        <Space direction="vertical" size={2} style={{ width: "100%" }}>
                          <Typography.Title
                            level={5}
                            style={{ color: beachColors.deepBlue, marginBottom: 0, fontSize: 15 }}
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
                              color: meta.code === "disponible" ? "#064e3b" : "#111827",
                            }}
                          >
                            {meta.label}
                          </Tag>
                        </Tooltip>
                      </Flex>

                      <Flex justify="space-between" align="center" wrap gap={4} style={{ marginTop: 2 }}>
                        <Typography.Text
                          type="secondary"
                          style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <EnvironmentOutlined style={{ color: beachColors.turquoise }} />
                          {c.location}
                        </Typography.Text>

                        <Tooltip placement="top" title={`Puntuación: ${c.rating}`}>
                          <div style={{ display: "inline-flex" }}>
                            <Rate allowHalf disabled defaultValue={c.rating} style={{ fontSize: 14 }} />
                          </div>
                        </Tooltip>
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
                              style={{ borderRadius: 999, fontSize: 10, color: "#064e3b" }}
                            >
                              -{discountPercent}%
                            </Tag>
                          )}
                        </Typography.Text>
                      )}

                      {visibleAmenities.length > 0 && (
                        <Space wrap size={[4, 4]} style={{ marginTop: 6, maxWidth: "100%" }}>
                          {visibleAmenities.map((a, j) => (
                            <Tag key={j} color={beachColors.coral} style={{ borderRadius: 12, fontSize: 10 }}>
                              {a}
                            </Tag>
                          ))}

                          {extraAmenitiesCount > 0 && (
                            <Popover
                              title="Amenidades"
                              trigger="click"
                              content={
                                <Space wrap size={[4, 4]}>
                                  {c.amenities.slice(3).map((a, j) => (
                                    <Tag
                                      key={j}
                                      color={beachColors.turquoise}
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
                            <Typography.Text style={{ fontSize: 18, fontWeight: 700, color: beachColors.deepBlue }}>
                              ${discountedPrice.toLocaleString("es-MX")}
                            </Typography.Text>
                            <Typography.Text type="secondary">/ noche</Typography.Text>
                          </>
                        ) : (
                          <>
                            <Typography.Text style={{ fontSize: 18, fontWeight: 700, color: beachColors.deepBlue }}>
                              ${c.price.toLocaleString("es-MX")}
                            </Typography.Text>
                            <Typography.Text type="secondary">/ noche</Typography.Text>
                          </>
                        )}
                      </Flex>
                    </Card>
                  </Badge.Ribbon>
                </Col>
              );
            })}
      </Row>

      {!loading && pagination && pagination.total > pagination.limit && typeof onPageChange === "function" && (
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
};

export default RoomCards;
