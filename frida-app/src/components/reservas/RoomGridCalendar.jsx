// src/components/reservas/RoomGridCalendar.jsx
import { useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Space,
  Table,
  Tag,
  Typography,
  Popover,
  theme,
} from "antd";
import { CalendarOutlined, HomeOutlined, MoreOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { beachColors, neutrals } from "../../theme/beachTheme";
import {
  DATE_FMT,
  eventoCubreFecha,
  getHotelLabel,
  getHotelShort,
  metaEvento,
  recortar,
} from "./reservasHelpers";
import { TooltipContenidoEvento } from "./TooltipEvento";

dayjs.locale("es");

const { Text } = Typography;

/* ===================== LANES POR HABITACIÓN ===================== */
const buildRoomLanes = (events) => {
  if (!events || !events.length) return [[]];

  const sorted = [...events].sort((a, b) =>
    String(a.startDate || a.checkinAt || "").localeCompare(
      String(b.startDate || b.checkinAt || "")
    )
  );

  const toRange = (ev) => {
    const start =
      ev.startDate || ev.checkinAt || ev.createdAt || dayjs().format(DATE_FMT);
    const end =
      ev.endDate || ev.checkoutAt || ev.startDate || ev.checkinAt || start;
    return {
      start: dayjs(start),
      end: dayjs(end),
    };
  };

  const lanes = [];

  for (const ev of sorted) {
    const { start, end } = toRange(ev);
    let placed = false;

    for (const lane of lanes) {
      const last = lane[lane.length - 1];
      const lastRange = toRange(last);

      if (start.isAfter(lastRange.end, "day")) {
        lane.push(ev);
        placed = true;
        break;
      }
    }

    if (!placed) {
      lanes.push([ev]);
    }
  }

  return lanes;
};

/* ===================== GRID POR HABITACIÓN (ANT TABLE) ===================== */
const RoomGridCalendar = ({
  eventos,
  filtroHotel,
  compacto,
  loading,
  onCheckin,
  onCheckout,
  onPaid,
  onUnpaid,
  onDelete,
  onRequestEditDates,
  pending,
  isMobileUI,
  openPopoverKey,
  onPopoverToggle,
  onPopoverLock,
  onCloseAllPopovers,
}) => {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [hoveredChipKey, setHoveredChipKey] = useState(null);
  const [collapsedOverflowByRoom, setCollapsedOverflowByRoom] = useState({});
  const { token } = theme.useToken();

  const month = useMemo(
    () => selectedDate.startOf("month"),
    [selectedDate]
  );

  const FIRST_COL_WIDTH = compacto ? 190 : 220;
  const cellHeight = compacto ? 30 : 36;
  const cellWidth = compacto ? 56 : 72;

  const days = useMemo(() => {
    const arr = [];
    let cur = month.startOf("month");
    const end = month.endOf("month");
    while (cur.isSame(end, "day") || cur.isBefore(end, "day")) {
      arr.push(cur);
      cur = cur.add(1, "day");
    }
    return arr;
  }, [month]);

  const today = dayjs();
  const todayStr = today.format(DATE_FMT);
  const isSelectedToday = selectedDate.isSame(today, "day");

  const tableMinWidth = FIRST_COL_WIDTH + days.length * cellWidth;

  const filteredEvents = useMemo(
    () =>
      (eventos || []).filter((e) =>
        filtroHotel === "all" ? true : e.hotel === filtroHotel
      ),
    [eventos, filtroHotel]
  );

  const eventsByRoom = useMemo(() => {
    const out = new Map();
    for (const e of filteredEvents) {
      const room = e.room || e.roomNumber || e.codigo || e.habitacion;
      if (!room) continue;
      const hotel = e.hotel || e.hotelCode || filtroHotel;
      const key = `${hotel || "x"}::${room}`;
      if (!out.has(key)) out.set(key, []);
      out.get(key).push(e);
    }
    return out;
  }, [filteredEvents, filtroHotel]);

  const rooms = useMemo(() => {
    const map = new Map();
    for (const e of filteredEvents) {
      const room = e.room || e.roomNumber || e.codigo || e.habitacion;
      if (!room) continue;
      const hotel = e.hotel || e.hotelCode || filtroHotel;
      const key = `${hotel || "x"}::${room}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          hotel,
          room,
          label: `${getHotelShort(hotel) ? getHotelShort(hotel) + " · " : ""}Hab ${room}`,
        });
      }
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      if (a.hotel === b.hotel) {
        const na = Number(a.room);
        const nb = Number(b.room);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        return String(a.room).localeCompare(String(b.room));
      }
      return getHotelLabel(a.hotel).localeCompare(getHotelLabel(b.hotel));
    });
    return arr;
  }, [filteredEvents, filtroHotel]);

  const dataSource = useMemo(() => {
    const grouped = new Map();
    for (const roomMeta of rooms) {
      const hotelKey = roomMeta.hotel || "x";
      if (!grouped.has(hotelKey)) {
        grouped.set(hotelKey, {
          key: `hotel:${hotelKey}`,
          groupType: "hotel",
          hotel: hotelKey,
          roomCount: 0,
          children: [],
        });
      }
      const parent = grouped.get(hotelKey);
      parent.roomCount += 1;

      const roomEvents = eventsByRoom.get(roomMeta.key) || [];
      const lanes = buildRoomLanes(roomEvents);
      const hasOverflow = lanes.length > 1;
      const isCollapsed = !!collapsedOverflowByRoom[roomMeta.key];

      lanes.forEach((laneEvents, laneIndex) => {
        if (laneIndex > 0 && isCollapsed) return;

        parent.children.push({
          key:
            laneIndex === 0
              ? roomMeta.key
              : `${roomMeta.key}::lane${laneIndex}`,
          groupType: "room",
          roomMeta,
          laneIndex,
          totalLanes: lanes.length,
          hasOverflow,
          events: laneEvents,
        });
      });
    }
    return Array.from(grouped.values());
  }, [rooms, eventsByRoom, collapsedOverflowByRoom]);

  const monthLabel = month.format("MMMM YYYY");

  const bodyPopoverStyle = {
    background: token.colorBgElevated,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowStrong,
    border: `1px solid ${token.colorBorderSecondary}`,
    padding: 8,
  };

  const columns = useMemo(() => {
    const cols = [];

    // Columna de habitación / grupo hotel
    cols.push({
      title: (
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: neutrals.textMuted,
          }}
        >
          Habitación
        </span>
      ),
      dataIndex: "roomMeta",
      key: "room",
      fixed: "left",
      width: FIRST_COL_WIDTH,
      render: (_, row) => {
        if (row.groupType === "hotel") {
          return (
            <div
              style={{
                padding: "3px 6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <HomeOutlined
                  style={{ fontSize: 13, color: beachColors.deepBlue }}
                />
                <span
                  style={{
                    fontWeight: 600,
                    color: neutrals.textMain,
                    fontSize: 12,
                  }}
                >
                  {getHotelLabel(row.hotel)}
                </span>
              </div>
              <Tag
                color="blue"
                style={{
                  borderRadius: 999,
                  fontSize: 9,
                  paddingInline: 8,
                  marginInlineEnd: 0,
                  lineHeight: "16px",
                }}
              >
                {row.roomCount} hab.
              </Tag>
            </div>
          );
        }

        const { roomMeta, laneIndex = 0, totalLanes = 1, hasOverflow } = row;
        const isCollapsed = !!collapsedOverflowByRoom[roomMeta.key];

        if (laneIndex > 0) {
          return (
            <div
              style={{
                padding: "3px 6px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 9,
                color: neutrals.textMuted,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "999px",
                  background: token.colorBorderSecondary,
                  flexShrink: 0,
                }}
              />
              <span>Reserva adicional</span>
            </div>
          );
        }

        return (
          <div
            style={{
              padding: "3px 6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 0,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  color: neutrals.textMain,
                  fontSize: 11,
                }}
              >
                {roomMeta.label}
              </span>
              <span style={{ fontSize: 9.5, color: neutrals.textMuted }}>
                {getHotelLabel(roomMeta.hotel)}
              </span>
            </div>

            {hasOverflow && totalLanes > 1 && (
              <Button
                size="small"
                type="text"
                onClick={(e) => {
                  e.stopPropagation();
                  setCollapsedOverflowByRoom((prev) => ({
                    ...prev,
                    [roomMeta.key]: !prev[roomMeta.key],
                  }));
                }}
                style={{
                  borderRadius: 999,
                  height: 22,
                  paddingInline: 6,
                  fontSize: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    transform: isCollapsed ? "rotate(90deg)" : "rotate(-90deg)",
                    transition: "transform 0.18s ease",
                  }}
                >
                  <MoreOutlined />
                </span>
                <span>
                  {isCollapsed ? "+" : ""}
                  {totalLanes - 1}
                </span>
              </Button>
            )}
          </div>
        );
      },
      onCell: (row) => ({
        style: {
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorSplit}`,
          fontWeight: row.groupType === "hotel" ? 600 : 400,
          zIndex: row.groupType === "hotel" ? 9 : 8,
        },
      }),
    });

    // Columnas por día
    days.forEach((d) => {
      const dateStr = d.format(DATE_FMT);
      const isWeekend = d.day() === 0 || d.day() === 6;
      const isTodayCol = dateStr === todayStr;

      cols.push({
        title: () => (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              alignItems: "center",
              paddingBlock: 0,
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: 10.5,
                color: isTodayCol ? token.colorPrimary : neutrals.textMain,
              }}
            >
              {d.format("DD")}
            </span>
            <span
              style={{
                fontSize: 8.5,
                textTransform: "lowercase",
                color: isWeekend ? beachColors.coral : neutrals.textMuted,
              }}
            >
              {d.format("dd")}
            </span>
            {isTodayCol && (
              <span
                style={{
                  marginTop: 1,
                  width: 4,
                  height: 4,
                  borderRadius: "999px",
                  background: token.colorPrimary,
                }}
              />
            )}
          </div>
        ),
        key: dateStr,
        dataIndex: dateStr,
        width: cellWidth,
        onCell: (row) => {
          if (row.groupType === "hotel") {
            return {
              style: {
                background: token.colorBgLayout,
                borderBottom: `1px solid ${token.colorSplit}`,
              },
            };
          }

          const events = row.events || [];
          const startEvent = events.find((e) => e.startDate === dateStr);
          const coverEvent = events.find((e) =>
            eventoCubreFecha(e, dateStr)
          );

          if (!startEvent && coverEvent) return { colSpan: 0 };

          if (startEvent) {
            const start = dayjs(startEvent.startDate);
            const end = startEvent.endDate
              ? dayjs(startEvent.endDate)
              : start;
            const spanDays = Math.max(1, end.diff(start, "day") + 1);

            return {
              colSpan: spanDays,
              style: {
                padding: 0,
                background: "transparent",
                borderBottom: `1px solid ${token.colorSplit}`,
                overflow: "visible",
              },
            };
          }

          return {
            style: {
              padding: 0,
              background: isWeekend
                ? token.colorErrorBg
                : token.colorBgContainer,
              borderBottom: `1px solid ${token.colorSplit}`,
            },
          };
        },
        render: (_, row) => {
          if (row.groupType === "hotel") {
            return (
              <div
                style={{
                  height: cellHeight,
                  background: token.colorBgLayout,
                }}
              />
            );
          }

          const events = row.events || [];
          const startEvent = events.find((e) => e.startDate === dateStr);
          const coverEvent = events.find((e) =>
            eventoCubreFecha(e, dateStr)
          );

          if (!startEvent && coverEvent) return null;

          if (!startEvent) {
            return (
              <div
                style={{
                  height: cellHeight,
                  background: isWeekend
                    ? token.colorErrorBg
                    : token.colorBgContainer,
                }}
              />
            );
          }

          const ev = startEvent;
          const meta = metaEvento(ev);
          const rawLabel = ev.label || meta.labelLargo;

          const instanceKey = `classic:${row.roomMeta.key}:${row.laneIndex || 0}:${dateStr}`;
          const isHovered = hoveredChipKey === instanceKey;

          const texto = isHovered
            ? rawLabel
            : recortar(rawLabel, compacto ? 18 : 30);

          const etiquetaCorta = `${meta.labelCorto} · Hab ${
            ev.room
          }${ev.paidAt ? " · $" : ""}`;

          return (
            <div
              style={{
                height: cellHeight,
                padding: 0,
                background: token.colorBgContainer,
                overflow: isHovered ? "visible" : "hidden",
              }}
            >
              <Popover
                content={
                  <TooltipContenidoEvento
                    evento={ev}
                    onCheckin={onCheckin}
                    onCheckout={onCheckout}
                    onPaid={onPaid}
                    onUnpaid={onUnpaid}
                    onDelete={onDelete}
                    onRequestEditDates={onRequestEditDates}
                    pending={pending}
                    onClosePopover={onCloseAllPopovers}
                    isMobileUI={isMobileUI}
                    popoverKey={instanceKey}
                    onLockPopover={onPopoverLock}
                  />
                }
                color={token.colorBgElevated}
                styles={{ body: bodyPopoverStyle }}
                trigger="click"
                open={openPopoverKey === instanceKey}
                onOpenChange={(open) =>
                  onPopoverToggle?.(instanceKey, open)
                }
              >
                <div
                  onMouseEnter={() => setHoveredChipKey(instanceKey)}
                  onMouseLeave={() =>
                    setHoveredChipKey((k) =>
                      k === instanceKey ? null : k
                    )
                  }
                  style={{
                    width: isHovered ? "max-content" : "100%",
                    minWidth: "100%",
                    maxWidth: isHovered ? 520 : "100%",
                    height: "100%",
                    display: "grid",
                    gridTemplateColumns: ev.paidAt
                      ? "auto auto minmax(0, 1fr) auto"
                      : "auto auto minmax(0, 1fr)",
                    alignItems: "center",
                    columnGap: 6,
                    padding: "2px 6px",
                    borderRadius: 999,
                    background:
                      "linear-gradient(90deg, rgba(56,189,248,0.12), rgba(16,185,129,0.16))",
                    borderLeft: `4px solid ${meta.color}`,
                    fontSize: compacto ? 9.25 : 10,
                    lineHeight: "14px",
                    whiteSpace: "nowrap",
                    color: neutrals.textMain,
                    boxShadow: isHovered
                      ? token.boxShadowSecondary
                      : token.boxShadowTertiary,
                    cursor: "pointer",
                    userSelect: "none",
                    WebkitTapHighlightColor: "transparent",
                    position: "relative",
                    zIndex: isHovered ? 2 : 1,
                    transform: isHovered
                      ? "translateY(-1px) scale(1.015)"
                      : "translateY(0) scale(1)",
                    transition:
                      "max-width 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, padding 0.18s ease",
                    overflow: isHovered ? "visible" : "hidden",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "999px",
                      backgroundColor: meta.color,
                    }}
                  />
                  <span
                    style={{
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {etiquetaCorta}
                  </span>
                  <span
                    style={{
                      minWidth: 0,
                      whiteSpace: "nowrap",
                      overflow: isHovered ? "visible" : "hidden",
                      textOverflow: isHovered ? "clip" : "ellipsis",
                    }}
                  >
                    {texto}
                  </span>
                  {ev.paidAt && (
                    <span
                      style={{
                        fontSize: 10,
                        color: beachColors.teal,
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      $
                    </span>
                  )}
                </div>
              </Popover>
            </div>
          );
        },
      });
    });

    return cols;
  }, [
    days,
    todayStr,
    FIRST_COL_WIDTH,
    cellWidth,
    cellHeight,
    compacto,
    token,
    isMobileUI,
    onCheckin,
    onCheckout,
    onPaid,
    onUnpaid,
    onDelete,
    onRequestEditDates,
    onCloseAllPopovers,
    onPopoverLock,
    onPopoverToggle,
    openPopoverKey,
    pending,
    hoveredChipKey,
    collapsedOverflowByRoom,
  ]);

  return (
    <Card
      className="rgc-compact"
      size="small"
      bordered
      style={{
        marginTop: 6,
        borderRadius: 14,
        boxShadow: token.boxShadowSecondary,
      }}
      bodyStyle={{ padding: 0 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 6,
          paddingInline: 12,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <Text
            style={{
              fontWeight: 700,
              color: beachColors.deepBlue,
              fontSize: 13,
            }}
          >
            {monthLabel}
          </Text>
        </div>

        <Space size={6} wrap>
          <DatePicker
            size="small"
            value={selectedDate}
            onChange={(value) => {
              if (!value) return;
              setSelectedDate(value);
              onCloseAllPopovers?.();
            }}
            format="DD/MM/YYYY"
            allowClear={false}
            style={{
              borderRadius: 999,
            }}
          />
          {isSelectedToday && (
            <Tag
              color="blue"
              style={{
                borderRadius: 999,
                fontSize: 10,
                paddingInline: 8,
                marginInlineEnd: 0,
                lineHeight: "18px",
              }}
            >
              Hoy
            </Tag>
          )}
        </Space>
      </div>

      <Table
        className="rgc-compact"
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={false}
        size="small"
        scroll={{
          x: tableMinWidth,
          y: compacto ? 360 : 460,
        }}
        sticky
        tableLayout="fixed"
        rowKey="key"
        expandable={{
          defaultExpandAllRows: true,
        }}
        style={{
          borderRadius: "0 0 14px 14px",
        }}
      />
    </Card>
  );
};

export default RoomGridCalendar;
