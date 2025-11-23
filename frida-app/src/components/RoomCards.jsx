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
} from "antd";
import {
  EnvironmentOutlined,
  HeartOutlined,
  FireFilled,
} from "@ant-design/icons";

function RoomCards({ beachColors, cardsData, loading }) {
  // Imagen placeholder si no hay `img`
  const placeholderImg =
    "https://via.placeholder.com/400x250?text=Sin+imagen";

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

  return (
    <Row gutter={[16, 16]} style={{ marginTop: 15 }}>
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
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
                          <Skeleton.Input
                            style={{ width: 100 }}
                            active
                          />
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <Skeleton.Input
                            style={{ width: 250 }}
                            active
                          />
                        </div>
                      </>
                    }
                  />
                </Card>
              </Skeleton>
            </Flex>
          </Col>
        ))
      ) : (
        cardsData.map((raw, i) => {
          // Normalizamos los datos para evitar errores
          const c = {
            ...raw,
            amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
            img: raw.img || placeholderImg,
            rating: raw.rating || 0,
            location: raw.location || "Ubicación no disponible",
            price: raw.price || 0,
          };

          return (
            <Col key={i} xs={24} sm={12} md={12} lg={8}>
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
                      <Button
                        type="default"
                        danger
                        icon={<HeartOutlined />}
                        size="small"
                        style={{ height: 30 }}
                      >
                        Favorito
                      </Button>

                      <Button
                        color="cyan"
                        variant="solid"
                        size="small"
                        style={{ height: 30 }}
                      >
                        {c.availability?.available
                          ? "Guardar"
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

                    {/* Sede */}
                    {getSedeTag(c.hotelCode)}
                  </Space>

                  {/* Ubicación */}
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 13, marginTop: 4, display: "block" }}
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
                        <FireFilled /> Oferta Especial
                      </Typography.Text>
                    )}
                  </Flex>

                  {/* Amenidades */}
                  <Space
                    wrap
                    size={[4, 4]}
                    style={{ marginTop: 8 }}
                  >
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
                    <Typography.Text
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: beachColors.deepBlue,
                      }}
                    >
                      ${c.price}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      / noche
                    </Typography.Text>
                  </Space>
                </Card>
              </Badge.Ribbon>
            </Col>
          );
        })
      )}
    </Row>
  );
}

RoomCards.defaultProps = {
  cardsData: [],
};

export default RoomCards;
