import React from "react";
import {
    Button, Card, Rate, Tag, Typography, Badge, Flex, Space, Row, Col
} from "antd";
import {
    EnvironmentOutlined, HeartOutlined, StarFilled, FireFilled
} from "@ant-design/icons";

function CardsInfoCenter({ beachColors, cardsData }) {
    return (
        <Row gutter={[16, 16]} justify="center" style={{ width: "100%", margin: "15px 0 0 0" }}>
            {cardsData.map((c, i) => (
                <Col key={i} xs={24} sm={12} md={12} lg={8}>
                    <Badge.Ribbon
                        text={c.badge}
                        color={c.featured ? beachColors.coral : beachColors.turquoise}
                    >
                        <Card
                            hoverable
                            cover={
                                <div style={{ position: "relative", borderRadius: "16px 16px 0 0", overflow: "hidden" }}>
                                    <img
                                        alt={c.title}
                                        src={c.img}
                                        style={{ height: 180, width: "100%", objectFit: "cover" }}
                                    />
                                    <Button
                                        type="text"
                                        icon={<HeartOutlined />}
                                        style={{
                                            position: "absolute",
                                            top: 140,
                                            right: 8,
                                            background: "rgba(255,255,255,0.9)",
                                            borderRadius: "50%",
                                            width: 34,
                                            height: 34
                                        }}
                                    />
                                </div>
                            }
                            actions={[
                                <Button
                                    type="primary"
                                    style={{
                                        background: `linear-gradient(135deg, ${beachColors.turquoise}, ${beachColors.oceanBlue})`,
                                        border: "none",
                                        borderRadius: 10,
                                        width: 110,
                                        height: 36,
                                        fontSize: 14,
                                        fontWeight: 600,
                                        boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
                                    }}
                                >
                                    Reservar ahora
                                </Button>,
                                <Button type="text" icon={<HeartOutlined />} style={{ width: 90, height: 36 }}>Guardar</Button>
                            ]}
                            style={{
                                borderRadius: 16,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                height: "100%"
                            }}

                        >
                            <div>
                                <Typography.Title level={5} style={{ color: beachColors.deepBlue, marginBottom: 4 }}>
                                    {c.title}
                                </Typography.Title>
                                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                                    <EnvironmentOutlined style={{ color: beachColors.turquoise }} /> {c.location}
                                </Typography.Text>

                                <Flex justify="space-between" align="center" style={{ marginTop: 12 }}>
                                    <Flex align="center" gap={6}>
                                        <Rate
                                            allowHalf
                                            disabled
                                            defaultValue={c.rating}
                                            character={<StarFilled style={{ color: beachColors.sunset }} />}
                                        />
                                        <Typography.Text strong>{c.rating}</Typography.Text>
                                    </Flex>
                                    <Typography.Text style={{ color: beachColors.turquoise, fontWeight: 600, fontSize: 13 }}>
                                        <FireFilled /> Oferta Especial
                                    </Typography.Text>
                                </Flex>

                                <Space wrap size={[6, 6]} style={{ marginTop: 10 }}>
                                    {c.amenities.map((a, j) => (
                                        <Tag
                                            key={j}
                                            color=""
                                            style={{
                                                background: `${beachColors.turquoise}15`,
                                                border: `1px solid ${beachColors.turquoise}30`,
                                                borderRadius: 14,
                                                padding: "2px 10px",
                                                fontSize: 12
                                            }}
                                        >
                                            {a}
                                        </Tag>
                                    ))}
                                </Space>
                            </div>

                            <Flex align="center" style={{ marginTop: 12 }}>
                                <Typography.Text style={{ fontSize: 20, fontWeight: 700, color: beachColors.deepBlue }}>
                                    ${c.price}
                                </Typography.Text>
                                <Typography.Text type="secondary" style={{ marginLeft: 4 }}>/ noche</Typography.Text>
                            </Flex>
                        </Card>
                    </Badge.Ribbon>
                </Col>
            ))}
        </Row>
    );
}

export default CardsInfoCenter;