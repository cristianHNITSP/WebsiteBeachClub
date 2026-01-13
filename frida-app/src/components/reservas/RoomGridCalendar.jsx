// frida-app/src/components/reservas/RoomGridCalendar.jsx
import { useMemo, useState } from "react";
import { Card, DatePicker, Space, Table, Tag, Typography, theme } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { beachColors, neutrals } from "../../theme/beachTheme";
import {
  DATE_FMT,
  eventoCubreFecha,
  getHotelLabel,
  getHotelShort,
  metaEvento,
} from "./reservasHelpers";
import { TooltipContenidoEvento } from "./TooltipEvento";
import RoomRowMeta from "./ui/RoomRowMeta";
import DaySpanChip from "./ui/DaySpanChip";

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
    return { start: dayjs(start), end: dayjs(end) };
  };

  const lanes = [];
  for (const ev of sorted) {
    const { start } = toRange(ev);
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

    if (!placed) lanes.push([ev]);
  }

  return lanes;
};

/* ===================== KEY PARSER (FOCUS / HOVER) ===================== */
const parseChipKey = (k) => {
  if (!k) return null;
  const m = String(k).match(/^classic:(.*):(\d+):(\d{4}-\d{2}-\d{2})$/);
  if (!m) return null;
  return { roomKey: m[1], laneIndex: Number(m[2] || 0), dateStr: m[3] };
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

  const month = useMemo(() => selectedDate.startOf("month"), [selectedDate]);

  const FIRST_COL_WIDTH = compacto ? 170 : 190;
  const cellHeight = compacto ? 30 : 38;
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
          label: `${
            getHotelShort(hotel) ? getHotelShort(hotel) + " · " : ""
          }Hab ${room}`,
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

  // ✅ Focus actual: si hay popover abierto, manda; si no, manda hover
  const focusKey = openPopoverKey || hoveredChipKey;
  const focusInfo = useMemo(() => parseChipKey(focusKey), [focusKey]);

  const bodyPopoverStyle = {
    background: token.colorBgElevated,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowStrong,
    border: `1px solid ${token.colorBorderSecondary}`,
    padding: 8,
  };

  const columns = useMemo(() => {
    const cols = [];

    cols.push({
      title: (
        <span style={{ fontSize: 10.5, fontWeight: 600, color: neutrals.textMuted }}>
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
            <RoomRowMeta
              variant="hotel"
              hotelLabel={getHotelLabel(row.hotel)}
              roomCount={row.roomCount}
              beachColors={beachColors}
              neutrals={neutrals}
              token={token}
            />
          );
        }

        const { roomMeta, laneIndex = 0, totalLanes = 1, hasOverflow } = row;
        const isCollapsed = !!collapsedOverflowByRoom[roomMeta.key];

        if (laneIndex > 0) {
          return (
            <RoomRowMeta
              variant="extra"
              beachColors={beachColors}
              neutrals={neutrals}
              token={token}
            />
          );
        }

        return (
          <RoomRowMeta
            variant="room"
            roomLabel={roomMeta.label}
            roomSubLabel={getHotelLabel(roomMeta.hotel)}
            beachColors={beachColors}
            neutrals={neutrals}
            token={token}
            showOverflowToggle={hasOverflow && totalLanes > 1}
            overflowCount={Math.max(0, totalLanes - 1)}
            overflowCollapsed={isCollapsed}
            onToggleOverflow={() =>
              setCollapsedOverflowByRoom((prev) => ({
                ...prev,
                [roomMeta.key]: !prev[roomMeta.key],
              }))
            }
          />
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

    days.forEach((d) => {
      const dateStr = d.format(DATE_FMT);
      const isWeekend = d.day() === 0 || d.day() === 6;
      const isTodayCol = dateStr === todayStr;

      cols.push({
        title: () => (
          <div style={{ display: "flex", flexDirection: "column", gap: 0, alignItems: "center" }}>
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
                  borderRadius: 999,
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
          const coverEvent = events.find((e) => eventoCubreFecha(e, dateStr));

          if (!startEvent && coverEvent) return { colSpan: 0 };

          if (startEvent) {
            const start = dayjs(startEvent.startDate);
            const end = startEvent.endDate ? dayjs(startEvent.endDate) : start;
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
              background: isWeekend ? token.colorErrorBg : token.colorBgContainer,
              borderBottom: `1px solid ${token.colorSplit}`,
            },
          };
        },

        render: (_, row) => {
          if (row.groupType === "hotel") {
            return (
              <div style={{ height: cellHeight, background: token.colorBgLayout }} />
            );
          }

          const events = row.events || [];
          const startEvent = events.find((e) => e.startDate === dateStr);
          const coverEvent = events.find((e) => eventoCubreFecha(e, dateStr));

          if (!startEvent && coverEvent) return null;

          if (!startEvent) {
            return (
              <div
                style={{
                  height: cellHeight,
                  background: isWeekend ? token.colorErrorBg : token.colorBgContainer,
                }}
              />
            );
          }

          const ev = startEvent;
          const meta = metaEvento(ev);

          const instanceKey = `classic:${row.roomMeta.key}:${row.laneIndex || 0}:${dateStr}`;
          const isHovered = hoveredChipKey === instanceKey;

          const sameLaneFocused =
            focusInfo &&
            focusInfo.roomKey === row.roomMeta.key &&
            focusInfo.laneIndex === (row.laneIndex || 0);

          if (sameLaneFocused && focusKey !== instanceKey) return null;

          return (
            <div style={{ height: cellHeight, padding: 0 }}>
              <DaySpanChip
                ev={ev}
                meta={meta}
                compacto={compacto}
                token={token}
                neutrals={neutrals}
                beachColors={beachColors}
                instanceKey={instanceKey}
                isHovered={isHovered}
                onHoverChange={(next) =>
                  setHoveredChipKey((cur) => {
                    if (next) return instanceKey;
                    return cur === instanceKey ? null : cur;
                  })
                }
                open={openPopoverKey === instanceKey}
                onOpenChange={(open) => onPopoverToggle?.(instanceKey, open)}
                popoverBodyStyle={bodyPopoverStyle}
                popoverContent={
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
              />
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
    focusInfo,
    focusKey,
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
          <Text style={{ fontWeight: 700, color: beachColors.deepBlue, fontSize: 13 }}>
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
            style={{ borderRadius: 999 }}
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
        expandable={{ defaultExpandAllRows: true }}
      />
    </Card>
  );
};

export default RoomGridCalendar;
