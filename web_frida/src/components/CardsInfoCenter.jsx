import { Card, Rate, Tag, Typography, Badge, Row, Col, Space, Button, Flex, Skeleton, Tooltip } from "antd";
import { EnvironmentOutlined, HeartOutlined, StarFilled, FireFilled } from "@ant-design/icons";

function CardsInfoCenter({ beachColors, cardsData, loading }) {
    return (
        <Row gutter={[16, 200]} justify="center" style={{ margin: "15px 0 0 0" }}>
            {
                loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Col key={i} xs={24} sm={12} md={12} lg={8}>
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
                        </Col>
                    ))
                ) : cardsData.map((c, i) => (
                    <Col key={i} xs={24} sm={12} md={12} lg={8}>
                        <Badge.Ribbon
                            text={c.badge}
                            color={c.featured ? beachColors.coral : beachColors.turquoise}
                        >
                            <Card
                                hoverable
                                cover={<img alt={c.title} src={c.img} style={{ height: 180, objectFit: "cover", }} />}
                                styles={{ body: { padding: 10, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 250 } }} actions={[
                                    <Flex justify="space-between" style={{ padding: '0 8px' }}>
                                        <Button color="cyan" variant="solid" size="small" style={{ height: 30 }}>
                                            Reservar
                                        </Button>
                                        <Button type="default" danger icon={<HeartOutlined />} size="small" style={{ height: 30 }}>Guardar</Button>
                                    </Flex>
                                ]}
                            >
                                <Typography.Title level={5} style={{ color: beachColors.deepBlue, marginBottom: 4 }}>
                                    {c.title}
                                </Typography.Title>

                                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                                    <EnvironmentOutlined style={{ color: beachColors.turquoise }} /> {c.location}
                                </Typography.Text>

                                <Flex vertical>
                                    <Tooltip placement="top" title={`Puntuación: ${c.rating}`}>
                                        <div style={{ display: "inline-block" }}>
                                            <Rate
                                                allowHalf
                                                disabled
                                                defaultValue={c.rating}
                                            />
                                        </div>
                                    </Tooltip>

                                    <Typography.Text
                                        style={{
                                            color: beachColors.turquoise,
                                            fontWeight: 600,
                                            fontSize: 12,
                                        }}
                                    >
                                        <FireFilled /> Oferta Especial
                                    </Typography.Text>
                                </Flex>

                                <Space wrap size={[4, 4]} style={{ marginTop: 8 }}>
                                    {c.amenities.map((a, j) => (
                                        <Tag key={j} color={`${beachColors.coral}`} style={{ borderRadius: 12, fontSize: 11 }}>
                                            {a}
                                        </Tag>
                                    ))}
                                </Space>

                                <Space style={{ marginTop: 12, justifyContent: "flex-start" }}>
                                    <Typography.Text style={{ fontSize: 18, fontWeight: 700, color: beachColors.deepBlue }}>
                                        ${c.price}
                                    </Typography.Text>
                                    <Typography.Text type="secondary">/ noche</Typography.Text>
                                </Space>

                            </Card>
                        </Badge.Ribbon>
                    </Col>
                ))

            }

        </Row>
    );
}

CardsInfoCenter.defaultProps = {
    cardsData: []
};

export default CardsInfoCenter;
