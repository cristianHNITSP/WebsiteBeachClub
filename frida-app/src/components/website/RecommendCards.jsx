// src/components/Recommendcards.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Card,
  Flex,
  Typography,
  Space,
  Skeleton,
  Input,
  Button,
  Tag,
  Row,
  Col,
  Alert,
} from "antd";
import { FireFilled, MailOutlined } from "@ant-design/icons";

function Recommendcards({ beachColors, maxItems = 4 }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const placeholderImg =
    "https://via.placeholder.com/400x250?text=Habitaci%C3%B3n";

  useEffect(() => {
    let isMounted = true;

    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const { data } = await axios.get(
          "/api/habitaciones/recomendaciones",
          {
            params: { limit: maxItems },
          }
        );

        const items = Array.isArray(data) ? data : data.items || [];

        if (!isMounted) return;
        setRooms(items);
      } catch (err) {
        console.error("Error cargando recomendaciones:", err);
        if (!isMounted) return;
        setErrorMsg(
          "No se pudieron cargar las recomendaciones en este momento."
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecommendations();
    return () => {
      isMounted = false;
    };
  }, [maxItems]);

  return (
    <Flex vertical style={{ padding: 10, gap: 16 }}>
      <Typography.Title
        level={4}
        style={{ color: beachColors.deepBlue, marginTop: 1 }}
      >
        <FireFilled style={{ color: beachColors.sunset }} /> Habitaciones
        recomendadas
      </Typography.Title>

      {errorMsg && (
        <Alert
          type="error"
          showIcon
          message="No se pudieron cargar las recomendaciones"
          description={errorMsg}
        />
      )}

      <Row gutter={[12, 12]}>
        {loading && !rooms.length
          ? Array.from({ length: maxItems }).map((_, i) => (
              <Col xs={24} sm={12} key={i}>
                <Card
                  hoverable
                  style={{
                    borderRadius: 12,
                    overflow: "hidden",
                    height: "100%",
                  }}
                  cover={
                    <Skeleton.Image
                      active
                      style={{
                        height: 120,
                        width: "100%",
                        objectFit: "cover",
                      }}
                    />
                  }
                >
                  <Skeleton active paragraph={{ rows: 2 }} />
                </Card>
              </Col>
            ))
          : rooms.map((room, i) => {
              const title =
                room.title || room.name || room.codigo || "Habitación";
              const desc =
                room.location ||
                room.badge ||
                "Habitación recomendada en el Hotel Beach Club";
              const img = room.img || placeholderImg;
              const price = room.price || 0;
              const favorites = room.favoritesCount || 0;

              const discountPercent = room.offer?.discountPercent;
              const hasDiscount =
                room.offer?.isSpecial &&
                typeof discountPercent === "number" &&
                discountPercent > 0;

              const specialPrice = hasDiscount
                ? Math.round(price * (1 - discountPercent / 100))
                : null;

              const index = i + 1;

              return (
                <Col xs={24} sm={12} key={room._id || room.codigo || i}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 12,
                      overflow: "hidden",
                      height: "100%",
                    }}
                    cover={
                      loading ? (
                        <Skeleton.Image
                          active
                          alt={title}
                          style={{
                            height: 120,
                            width: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <img
                          src={img}
                          alt={title}
                          style={{
                            height: 120,
                            width: "100%",
                            objectFit: "cover",
                          }}
                        />
                      )
                    }
                  >
                    <Flex
                      justify="space-between"
                      align="flex-start"
                      style={{ gap: 8 }}
                    >
                      <div>
                        <Space size={6} align="center">
                          {/* Índice */}
                          <Tag
                            color={beachColors.turquoise}
                            style={{
                              borderRadius: 999,
                              fontSize: 10,
                              color: "#065f46",
                            }}
                          >
                            #{index}
                          </Tag>
                          <Typography.Text strong style={{ fontSize: 13 }}>
                            {title}
                          </Typography.Text>
                        </Space>
                        <Typography.Paragraph
                          type="secondary"
                          style={{
                            margin: "2px 0 0",
                            fontSize: 12,
                          }}
                          ellipsis={{ rows: 2 }}
                        >
                          {desc}
                        </Typography.Paragraph>

                        <Space
                          size={6}
                          style={{
                            marginTop: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          {/* Precio base / oferta */}
                          {hasDiscount && specialPrice != null ? (
                            <>
                              <Typography.Text
                                delete
                                type="secondary"
                                style={{ fontSize: 11 }}
                              >
                                ${price.toLocaleString("es-MX")}
                              </Typography.Text>
                              <Typography.Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: beachColors.deepBlue,
                                }}
                              >
                                ${specialPrice.toLocaleString("es-MX")}
                                <Typography.Text
                                  type="secondary"
                                  style={{
                                    fontSize: 11,
                                    marginLeft: 4,
                                  }}
                                >
                                  / noche
                                </Typography.Text>
                              </Typography.Text>
                            </>
                          ) : (
                            <Typography.Text
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: beachColors.deepBlue,
                              }}
                            >
                              ${price.toLocaleString("es-MX")}
                              <Typography.Text
                                type="secondary"
                                style={{
                                  fontSize: 11,
                                  marginLeft: 4,
                                }}
                              >
                                / noche
                              </Typography.Text>
                            </Typography.Text>
                          )}

                          {/* Chip descuento tipo índice */}
                          {hasDiscount && (
                            <div
                              style={{
                                background: beachColors.turquoise,
                                color: "white",
                                borderRadius: 6,
                                padding: "2px 8px",
                                fontSize: 11,
                              }}
                            >
                              -{discountPercent}% OFF
                            </div>
                          )}

                          {favorites > 0 && (
                            <Typography.Text
                              type="secondary"
                              style={{ fontSize: 11 }}
                            >
                              {favorites} favs
                            </Typography.Text>
                          )}
                        </Space>
                      </div>
                    </Flex>
                  </Card>
                </Col>
              );
            })}
      </Row>

      {/* Bloque newsletter */}
      <div
        style={{
          marginTop: 8,
          padding: 20,
          background: `linear-gradient(135deg, ${beachColors.deepBlue}15, ${beachColors.turquoise}15)`,
          borderRadius: 16,
        }}
      >
        <Typography.Title level={5}>
          <MailOutlined /> Ofertas Exclusivas
        </Typography.Title>
        <Typography.Text>
          Suscríbete y recibe promociones especiales de tus habitaciones
          favoritas.
        </Typography.Text>
        <Input
          placeholder="Tu email"
          style={{ marginTop: 12, borderRadius: 8 }}
        />
        <Button
          color="cyan"
          variant="solid"
          block
          style={{
            marginTop: 8,
            borderRadius: 8,
          }}
        >
          Suscribirme
        </Button>
      </div>
    </Flex>
  );
}

export default Recommendcards;
