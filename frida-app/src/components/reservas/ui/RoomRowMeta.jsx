// src/components/reservas/ui/RoomRowMeta.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Flex, Grid, Space, Tag, Tooltip, Typography } from "antd";
import { HomeOutlined, RightOutlined, DownOutlined } from "@ant-design/icons";

const { Text } = Typography;
const { useBreakpoint } = Grid;

function abbreviateLabel(label, mode = "mid") {
  const s = String(label || "").trim();
  if (!s) return "—";

  // quita dobles espacios
  const clean = s.replace(/\s+/g, " ");
  const parts = clean.split(" ").filter(Boolean);

  // modo super corto: 1a letra + última palabra, o recorte
  if (mode === "short") {
    if (parts.length >= 2) return `${parts[0][0].toUpperCase()}. ${parts[parts.length - 1]}`;
    return clean.length > 10 ? `${clean.slice(0, 10)}…` : clean;
  }

  // modo medio: primera palabra + iniciales siguientes (máx 2), o recorte
  if (parts.length >= 3) {
    const initials = parts
      .slice(1, 3)
      .map((w) => (w?.[0] ? `${w[0].toUpperCase()}.` : ""))
      .join(" ");
    return `${parts[0]} ${initials}`.trim();
  }
  if (parts.length === 2) return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
  return clean.length > 14 ? `${clean.slice(0, 14)}…` : clean;
}

export default function RoomRowMeta({
  variant = "room", // "hotel" | "room" | "extra"
  hotelLabel,
  roomLabel,
  roomSubLabel,
  roomCount,
  // overflow toggle
  showOverflowToggle = false,
  overflowCount = 0,
  overflowCollapsed = false,
  onToggleOverflow,
}) {
  const screens = useBreakpoint();

  // heurística: mobile/touch
  const isProbablyMobile = !screens.md;

  // medimos ancho real del contenedor (para decidir abreviación)
  const wrapRef = useRef(null);
  const [wrapW, setWrapW] = useState(9999);

  useEffect(() => {
    if (!wrapRef.current) return;

    const el = wrapRef.current;
    const ro = new ResizeObserver((entries) => {
      const w = entries?.[0]?.contentRect?.width;
      if (typeof w === "number") setWrapW(w);
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  // ================== HOTEL ROW (RESPONSIVE) ==================
  const hotelCompactLevel = useMemo(() => {
    // Ajusta umbrales si quieres, pero esto funciona bien con FIRST_COL_WIDTH chico
    if (wrapW <= 130) return "short";
    if (wrapW <= 165) return "mid";
    return "full";
  }, [wrapW]);

  const hotelDisplayLabel = useMemo(() => {
    if (hotelCompactLevel === "full") return hotelLabel || "—";
    return abbreviateLabel(hotelLabel, hotelCompactLevel);
  }, [hotelLabel, hotelCompactLevel]);

  const habSuffix = useMemo(() => {
    // si está apretado, acorta el sufijo
    return hotelCompactLevel === "full" ? "hab." : "h.";
  }, [hotelCompactLevel]);

  if (variant === "hotel") {
    return (
      <Flex ref={wrapRef} align="center" gap={6} justify="space-between">
        <Space size="small" style={{ minWidth: 0, flex: 1 }}>
          <HomeOutlined />
          <Tooltip
            title={hotelLabel}
            trigger={isProbablyMobile ? ["click"] : ["hover"]}
            placement="topLeft"
          >
            <Text strong ellipsis style={{ minWidth: 0 }}>
              {hotelDisplayLabel}
            </Text>
          </Tooltip>
        </Space>

        <Tag color="blue">
          {roomCount} {habSuffix}
        </Tag>
      </Flex>
    );
  }

  // ================== EXTRA LANE ==================
  if (variant === "extra") {
    return (
      <Space size="small">
        <Badge status="default" />
        <Text type="secondary" ellipsis={{ tooltip: "Reserva adicional" }}>
          Reserva adicional
        </Text>
      </Space>
    );
  }

  // ================== ROOM ROW ==================
  return (
    <Flex align="center" justify="space-between">
      <Flex vertical style={{ minWidth: 0 }}>
        <Text strong ellipsis={{ tooltip: roomLabel }}>
          {roomLabel}
        </Text>
        <Text type="secondary" ellipsis={{ tooltip: roomSubLabel }}>
          {roomSubLabel}
        </Text>
      </Flex>

      {showOverflowToggle && overflowCount > 0 && (
        <Button
          size="small"
          type="text"
          shape="round"
          icon={overflowCollapsed ? <RightOutlined /> : <DownOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onToggleOverflow?.();
          }}
        >
          <Text strong>
            {overflowCollapsed ? "+" : ""}
            {overflowCount}
          </Text>
        </Button>
      )}
    </Flex>
  );
}
