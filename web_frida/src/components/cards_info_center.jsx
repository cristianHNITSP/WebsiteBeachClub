import React from "react";
import { Card, Rate, Tag, Typography, Badge, Row, Col, Space, Button, Flex } from "antd";
import { EnvironmentOutlined, HeartOutlined, StarFilled, FireFilled } from "@ant-design/icons";

function CardsInfoCenter({ beachColors, cardsData }) {
    return (
        <Row gutter={[16, 200]} justify="center" style={{ margin: "15px 0 0 0" }}>
            {cardsData.map((c, i) => (
                <Col key={i} xs={24} sm={12} md={12} lg={8}>
                    <Badge.Ribbon
                        text={c.badge}
                        color={c.featured ? beachColors.coral : beachColors.turquoise}
                    >
                        <Card
                            hoverable
                            cover={<img alt={c.title} src={c.img} style={{ height: 180, objectFit: "cover" }} />}
                            bodyStyle={{ padding: 12, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 250 }}
                            actions={[
                                <Flex justify="center" gap={10}>
                                    <Button color="cyan" variant="solid">
                                        Reservar
                                    </Button>
                                    <Button type="default" icon={<HeartOutlined />}>Guardar</Button>
                                </Flex>

                            ]}
                        >
                            <Typography.Title level={5} style={{ color: beachColors.deepBlue, marginBottom: 4 }}>
                                {c.title}
                            </Typography.Title>

                            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                                <EnvironmentOutlined style={{ color: beachColors.turquoise }} /> {c.location}
                            </Typography.Text>

                            <Space size="middle" style={{ marginTop: 8, justifyContent: "space-between", width: "100%" }}>
                                <Rate allowHalf disabled defaultValue={c.rating} character={<StarFilled style={{ color: beachColors.sunset }} />} />
                                <Typography.Text strong>{c.rating}</Typography.Text>
                                <Typography.Text style={{ color: beachColors.turquoise, fontWeight: 600, fontSize: 12 }}>
                                    <FireFilled /> Oferta Especial
                                </Typography.Text>
                            </Space>

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
            ))}
        </Row>
    );
}

CardsInfoCenter.defaultProps = {
    cardsData: []
};

export default CardsInfoCenter;
