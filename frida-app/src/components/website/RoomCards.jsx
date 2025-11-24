// src/components/RoomCards.jsx
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
} from "antd";
import {
  EnvironmentOutlined,
  HeartOutlined,
  FireFilled,
} from "@ant-design/icons";
import axios from "axios";
import { useState } from "react";

function RoomCards({ beachColors, cardsData, loading }) {
  const [messageApi, contextHolder] = message.useMessage();
  const [favLoadingId, setFavLoadingId] = useState(null);

  const placeholderImg = "https://via.placeholder.com/400x250?text=Sin+imagen";

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

  return (
    <>
      {contextHolder}

      <Row gutter={[16, 16]} style={{ marginTop: 15 }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Col key={i} xs={12} sm={12} md={12} lg={8}>
                <Flex
                  justify="start"
                  align="center"
                  style={{
                    height: 180,
                    backgroundColor: "#f0f0f0",
                    padding: 16,
                  }}
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
            ))
          : cardsData.map((raw, i) => {
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
                c.offer?.isSpecial &&
                typeof discountPercent === "number" &&
                discountPercent > 0;

              const discountedPrice = hasDiscount
                ? Math.round(c.price * (1 - discountPercent / 100))
                : null;

              return (
                <Col key={c._id || i} xs={24} sm={12} md={12} lg={8}>
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
                          justifyContent: "space-between",
                          minHeight: 250,
                        },
                      }}
                      actions={[
                        <Flex
                          justify="space-between"
                          style={{ padding: "0 8px" }}
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

                          <Button
                            color="cyan"
                            variant="solid"
                            size="small"
                            style={{ height: 30 }}
                          >
                            {c.availability?.available
                              ? "Reservar"
                              : "No disponible"}
                          </Button>
                        </Flex>,
                      ]}
                    >
                      {/* Título + sede */}
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
                          }}
                        >
                          {c.title}
                        </Typography.Title>

                        {getSedeTag(c.hotelCode)}
                      </Space>

                      {/* Ubicación */}
                      <Typography.Text
                        type="secondary"
                        style={{
                          fontSize: 13,
                          marginTop: 4,
                          display: "block",
                        }}
                      >
                        <EnvironmentOutlined
                          style={{ color: beachColors.turquoise }}
                        />{" "}
                        {c.location}
                      </Typography.Text>

                      {/* Rating + oferta */}
                      <Flex vertical>
                        <Tooltip
                          placement="top"
                          title={`Puntuación: ${c.rating}`}
                        >
                          <div style={{ display: "inline-block" }}>
                            <Rate allowHalf disabled defaultValue={c.rating} />
                          </div>
                        </Tooltip>

                        {c.offer?.isSpecial && (
                          <Typography.Text
                            style={{
                              color: beachColors.turquoise,
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            <FireFilled /> Oferta Especial{" "}
                            {hasDiscount && (
                              <Tag
                                color={beachColors.turquoise}
                                style={{
                                  borderRadius: 999,
                                  marginLeft: 4,
                                  fontSize: 10,
                                  color: "#064e3b",
                                }}
                              >
                                -{discountPercent}%
                              </Tag>
                            )}
                          </Typography.Text>
                        )}
                      </Flex>

                      {/* Amenidades */}
                      <Space wrap size={[4, 4]} style={{ marginTop: 8 }}>
                        {c.amenities.map((a, j) => (
                          <Tag
                            key={j}
                            color={beachColors.coral}
                            style={{
                              borderRadius: 12,
                              fontSize: 11,
                            }}
                          >
                            {a}
                          </Tag>
                        ))}
                      </Space>

                      {/* Precio */}
                      <Space
                        style={{ marginTop: 12, justifyContent: "flex-start" }}
                      >
                        {hasDiscount && discountedPrice != null ? (
                          <>
                            <Typography.Text
                              delete
                              type="secondary"
                              style={{ fontSize: 13, marginRight: 4 }}
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
                      </Space>
                    </Card>
                  </Badge.Ribbon>
                </Col>
              );
            })}
      </Row>
    </>
  );
}

RoomCards.defaultProps = {
  cardsData: [],
};

export default RoomCards;
