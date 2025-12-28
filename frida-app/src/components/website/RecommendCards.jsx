// src/components/Recommendcards.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "@api/axios";
import {
  Alert,
  Badge,
  Button,
  Card,
  Flex,
  Image,
  List,
  Skeleton,
  Space,
  Tag,
  Typography,
  theme,
} from "antd";

import {
  FireFilled,
  EnvironmentOutlined,
  DollarCircleOutlined,
  ThunderboltOutlined,
  HeartOutlined,
  InfoCircleOutlined,
  RightOutlined,
} from "@ant-design/icons";

const { Text, Title } = Typography;

function Recommendcards({ beachColors, maxItems = 4 }) {
  const { token } = theme.useToken();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const placeholderImg =
    "https://via.placeholder.com/900x520?text=Habitaci%C3%B3n";

  useEffect(() => {
    let isMounted = true;

    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const { data } = await axios.get("/api/habitaciones/recomendaciones", {
          params: { limit: maxItems },
        });

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

  const list = useMemo(() => (Array.isArray(rooms) ? rooms : []), [rooms]);

  const skeletonItems = useMemo(
    () =>
      Array.from({ length: maxItems }, (_, i) => ({
        __skeleton: true,
        _key: `sk-${i}`,
      })),
    [maxItems]
  );

  const dataSource = loading && list.length === 0 ? skeletonItems : list;

  const money = (n) => {
    const num = Number(n || 0);
    try {
      return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        maximumFractionDigits: 0,
      }).format(num);
    } catch {
      return `$${num}`;
    }
  };

  const cardRadius = token.borderRadiusLG;
  const coverH = 150;

  return (
    <div style={{ overflowX: "hidden" }}>
      {/* Header compacto */}
      <div style={{ padding: 6 }}>
        <Space size={10} align="center" style={{ width: "100%" }}>
          <FireFilled
            style={{ color: beachColors?.sunset || token.colorWarning }}
          />
          <Title level={5} style={{ margin: 0, color: beachColors?.deepBlue }}>
            Habitaciones recomendadas
          </Title>
        </Space>
      </div>

      {errorMsg ? (
        <div style={{ padding: 6 }}>
          <Alert
            type="error"
            showIcon
            message="No se pudieron cargar las recomendaciones"
            description={errorMsg}
          />
        </div>
      ) : null}

      <List
        style={{ padding: 6 }}
        grid={{ gutter: 10, column: 1 }}
        dataSource={dataSource}
        rowKey={(item, index) =>
          item?._id || item?.codigo || item?._key || `it-${index}`
        }
        renderItem={(room, idx) => {
          // Skeleton
          if (room?.__skeleton) {
            return (
              <List.Item>
                <Card
                  size="small"
                  hoverable
                  style={{ borderRadius: cardRadius, overflow: "hidden" }}
                  cover={
                    <Skeleton.Image
                      active
                      style={{ width: "100%", height: coverH }}
                    />
                  }
                >
                  <Skeleton active paragraph={{ rows: 2 }} />
                </Card>
              </List.Item>
            );
          }

          const title =
            room?.title || room?.name || room?.codigo || "Habitación";
          const desc =
            room?.location || room?.badge || "Recomendación destacada";
          const img =
            room?.img ||
            room?.image ||
            room?.cover ||
            room?.thumbnail ||
            placeholderImg;

          const price = Number(room?.price || 0);
          const favorites = Number(room?.favoritesCount || room?.favs || 0);

          const discountPercent = room?.offer?.discountPercent;
          const hasDiscount =
            room?.offer?.isSpecial &&
            typeof discountPercent === "number" &&
            discountPercent > 0;

          const specialPrice =
            hasDiscount && price > 0
              ? Math.round(price * (1 - discountPercent / 100))
              : null;

          const index = idx + 1;
          const ribbonText = hasDiscount ? `-${discountPercent}%` : `#${index}`;
          const ribbonColor = hasDiscount
            ? beachColors?.turquoise || token.colorSuccess
            : beachColors?.oceanBlue || token.colorPrimary;

          return (
            <List.Item>
              <Badge.Ribbon text={ribbonText} color={ribbonColor}>
                <Card
                  size="small"
                  hoverable
                  style={{ borderRadius: cardRadius, overflow: "hidden" }}
                  cover={
                    <Image
                      preview={false}
                      src={img}
                      fallback={placeholderImg}
                      height={coverH}
                      width="100%"
                      style={{ objectFit: "cover", display: "block" }}
                    />
                  }
                  
                  actions={[
                    <Flex
                      justify="space-between"
                      align="center"
                      style={{ width: "100%" }}
                    >
                      <Button
                        key="details"
                        type="link"
                        icon={<InfoCircleOutlined />}
                        style={{ fontWeight: 700 }}
                        onClick={() => {
                          // opcional: abre modal
                        }}
                      >
                        Detalles
                      </Button>
                      ,
                      <Button
                        key="view"
                        type="primary"
                        icon={<RightOutlined />}
                        style={{
                          borderRadius: 999,
                          fontWeight: 800,
                          background: `linear-gradient(90deg, ${
                            beachColors?.turquoise || token.colorPrimary
                          }, ${beachColors?.oceanBlue || token.colorPrimary})`,
                          border: "none",
                        }}
                        onClick={() => {
                          // opcional: navegar/seleccionar
                        }}
                      >
                        Ver
                      </Button>
                      ,
                    </Flex>,



                  ]}
                >
                  <Space
                    direction="vertical"
                    size={6}
                    style={{ width: "100%" }}
                  >
                    <Text strong ellipsis style={{ fontSize: 13 }}>
                      {title}
                    </Text>

                    <Space size={6} align="center" style={{ width: "100%" }}>
                      <EnvironmentOutlined
                        style={{
                          color: beachColors?.oceanBlue || token.colorPrimary,
                        }}
                      />
                      <Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                        {desc}
                      </Text>
                    </Space>

                    <Space size={8} wrap>
                      {hasDiscount && specialPrice != null ? (
                        <>
                          <Text
                            delete
                            type="secondary"
                            style={{ fontSize: 12 }}
                          >
                            {money(price)}
                          </Text>
                          <Text
                            strong
                            style={{
                              fontSize: 14,
                              color: beachColors?.deepBlue,
                            }}
                          >
                            <DollarCircleOutlined /> {money(specialPrice)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            / noche
                          </Text>
                          <Tag
                            icon={<ThunderboltOutlined />}
                            color="success"
                            style={{
                              borderRadius: 999,
                              margin: 0,
                              fontWeight: 700,
                            }}
                          >
                            Oferta
                          </Tag>
                        </>
                      ) : (
                        <>
                          <Text
                            strong
                            style={{
                              fontSize: 14,
                              color: beachColors?.deepBlue,
                            }}
                          >
                            <DollarCircleOutlined /> {money(price)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            / noche
                          </Text>
                        </>
                      )}

                      {favorites > 0 ? (
                        <Tag
                          icon={<HeartOutlined />}
                          color="error"
                          style={{
                            borderRadius: 999,
                            margin: 0,
                            fontWeight: 700,
                          }}
                        >
                          {favorites}
                        </Tag>
                      ) : null}
                    </Space>
                  </Space>
                </Card>
              </Badge.Ribbon>
            </List.Item>
          );
        }}
      />
    </div>
  );
}

export default Recommendcards;
