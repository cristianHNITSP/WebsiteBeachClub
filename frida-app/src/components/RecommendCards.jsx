import { Card, Flex, Typography, Space, Skeleton, Input, Button } from "antd";
import { FireFilled, MailOutlined } from "@ant-design/icons";

function Recommendcards({ recommendedDestinations, beachColors, loading }) {
    return (
        <Flex vertical style={{ padding: 10, gap: 16 }}>
            <Typography.Title level={4} style={{ color: beachColors.deepBlue, marginTop: 1 }}>
                <FireFilled style={{ color: beachColors.sunset }} /> Destinos Populares
            </Typography.Title>
            <Space direction="vertical" style={{ width: "100%" }}>
                {recommendedDestinations.map((city, i) => (
                    <Card key={i} hoverable
                        cover=
                        {
                            loading ? <Skeleton.Image active alt={city.name} style={{ height: 120, width: '100%', objectFit: "cover" }} />
                                : <img src={city.img} alt={city.name} style={{ height: 120, objectFit: "cover" }} />
                        }
                        style={{ borderRadius: 12, overflow: 'hidden' }}>
                        <Flex justify="space-between" align="center">
                            <div>
                                <Typography.Text strong>{city.name}</Typography.Text>
                                <Typography.Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>{city.desc}</Typography.Paragraph>
                            </div>
                            <div style={{ background: beachColors.turquoise, color: 'white', borderRadius: 6, padding: '2px 8px', fontSize: 12 }}>-20%</div>
                        </Flex>
                    </Card>
                ))}
            </Space>

            <div style={{
                marginTop: 8, padding: 20, background: `linear-gradient(135deg, ${beachColors.deepBlue}15, ${beachColors.turquoise}15)`,
                borderRadius: 16
            }}>
                <Typography.Title level={5}><MailOutlined /> Ofertas Exclusivas</Typography.Title>
                <Typography.Text>Suscríbete y recibe promociones especiales</Typography.Text>
                <Input placeholder="Tu email" style={{ marginTop: 12, borderRadius: 8 }} />
                <Button color="cyan" variant="solid" block style={{
                    marginTop: 8, borderRadius: 8,
                }}>Suscribirme</Button>
            </div>
        </Flex>
    );
}

Recommendcards.defaultProps = {
    recommendedDestinations: []
};

export default Recommendcards;



