
import { Row, Col, Typography, Skeleton } from "antd";
import { beachTheme as beachColors, neutralsTheme as neutrals } from "./helpers";

const { Text } = Typography;

const HabitacionesMetrics = ({
  totalActivas,
  totalMantenimiento,
  totalFuera,
  totalConPromo,
  totalConFavoritos,
  loading,
}) => {
  if (loading) {
    return (
      <Row gutter={12} style={{ marginTop: 6, marginBottom: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <Col xs={24} md={6} key={i}>
            <Skeleton.Input
              active
              size="small"
              style={{ width: "100%", maxWidth: 260 }}
            />
          </Col>
        ))}
      </Row>
    );
  }

  return (
    <Row gutter={12} style={{ marginTop: 6, marginBottom: 4 }}>
      <Col xs={24} md={6}>
        <Text style={{ fontSize: 10, color: neutrals.textMuted }}>
          Habitaciones activas:{" "}
          <span
            style={{
              fontWeight: 600,
              color: beachColors.teal,
            }}
          >
            {totalActivas}
          </span>
        </Text>
      </Col>
      <Col xs={24} md={6}>
        <Text style={{ fontSize: 10, color: neutrals.textMuted }}>
          En mantenimiento:{" "}
          <span
            style={{
              fontWeight: 600,
              color: beachColors.sunset,
            }}
          >
            {totalMantenimiento}
          </span>
        </Text>
      </Col>
      <Col xs={24} md={6}>
        <Text style={{ fontSize: 10, color: neutrals.textMuted }}>
          Fuera de servicio / bloqueadas:{" "}
          <span
            style={{
              fontWeight: 600,
              color: beachColors.coral,
            }}
          >
            {totalFuera}
          </span>
        </Text>
      </Col>
      <Col xs={24} md={6}>
        <Text style={{ fontSize: 10, color: neutrals.textMuted }}>
          Con promo / con favs:{" "}
          <span
            style={{
              fontWeight: 600,
              color: beachColors.oceanBlue,
            }}
          >
            {totalConPromo} promo · {totalConFavoritos} favs
          </span>
        </Text>
      </Col>
    </Row>
  );
};

export default HabitacionesMetrics;
