// frida-app/src/components/reservas/ui/DaySpanChip.jsx
import { Badge, Button, Col, Popover, Row, Space, Typography } from "antd";
import { recortar } from "../reservasHelpers";

const { Text } = Typography;

/**
 * DaySpanChip
 * - Normal: compacto, recorta texto
 * - Focus (hover PC o open móvil/PC): overlay y muestra texto completo
 * - Tap/click mismo chip: toggle (abre/cierra)
 * - Tap fuera: lo maneja el padre (RoomGridCalendar) con onPointerDownCapture
 */
export default function DaySpanChip({
  ev,
  meta,
  compacto,
  token,
  neutrals,
  beachColors,

  isHovered = false,
  onHoverChange,

  open = false,
  onOpenChange,
  popoverContent,
  popoverBodyStyle,

  instanceKey,
}) {
  const rawLabel = ev?.label || meta?.labelLargo || "Reserva";
  const expanded = Boolean(open || isHovered);

  const texto = expanded ? rawLabel : recortar(rawLabel, compacto ? 18 : 30);

  const etiquetaCorta = `${meta?.labelCorto || "Reserva"} · Hab ${
    ev?.room ?? "—"
  }${ev?.paidAt ? " · $" : ""}`;

  const dotColor = meta?.color || beachColors.turquoise;

  const baseButtonStyle = {
    background: token.colorBgContainer,
    borderColor: token.colorBorderSecondary,
    color: neutrals.textMain,
  };

  const expandedButtonStyle = {
    background: `linear-gradient(90deg, ${beachColors.oceanBlue}20, ${beachColors.turquoise}26)`,
    borderColor: dotColor,
    color: neutrals.textMain,
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 999,
    width: "max-content",
    minWidth: "100%",
    maxWidth: 720,
    boxShadow: token.boxShadowSecondary,
  };

  return (
    <Popover
      content={popoverContent}
      color={token.colorBgElevated}
      styles={popoverBodyStyle ? { body: popoverBodyStyle } : undefined}
      trigger="click"
      open={open}
      onOpenChange={(next) => onOpenChange?.(next)}
    >
      <div
        style={{ position: "relative", height: "100%" }}
        data-chipkey={instanceKey}
      >
        <Button
          type="default"
          shape="round"
          size="small" // ✅ más compacto SIEMPRE
          block
          onMouseEnter={() => onHoverChange?.(true)}
          onMouseLeave={() => onHoverChange?.(false)}
          onClick={(e) => {
            // ✅ toggle manual (móvil/desktop) — si está abierto y tocas otra vez, cierra
            e.stopPropagation();
            onOpenChange?.(!open);
          }}
          style={expanded ? expandedButtonStyle : baseButtonStyle}
        >
          <Row wrap={false} gutter={6} align="middle">
            <Col flex="none">
              <Badge color={dotColor} />
            </Col>

            <Col flex="none">
              <Text strong style={{ color: neutrals.textMain }}>
                {etiquetaCorta}
              </Text>
            </Col>

            <Col flex="auto">
              <Text ellipsis={!expanded} style={{ color: neutrals.textMain }}>
                {texto}
              </Text>
            </Col>

            {ev?.paidAt && (
              <Col flex="none">
                <Space size={4}>
                  <Text strong style={{ color: beachColors.teal }}>
                    $
                  </Text>
                </Space>
              </Col>
            )}
          </Row>
        </Button>
      </div>
    </Popover>
  );
}
