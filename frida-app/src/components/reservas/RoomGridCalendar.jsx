// src/components/RoomGridCalendar.jsx
import { useMemo, useState, useRef, useEffect } from "react";
import {
  Button,
  Space,
  Typography,
 Popover,
  Dropdown,
  Popconfirm,
  Divider,
  Tag,
  Card,
  Table,
  theme,
} from "antd";
import {
  CalendarOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  UserOutlined,
  MoreOutlined,
  LoginOutlined,
  LogoutOutlined,
  DeleteOutlined,
  DollarCircleOutlined,
  EditOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { beachColors, neutrals } from "../../theme/beachTheme";

dayjs.locale("es");

const { Text } = Typography;
const DATE_FMT = "YYYY-MM-DD";

/* ===================== SEDES ===================== */
const HOTELES = {
  casa_frida: "Casa Frida",
  cabanas_fridas: "Cabañas Fridas",
};
const HOTELES_SHORT = {
  casa_frida: "CF",
  cabanas_fridas: "CB",
};

const getHotelLabel = (hotel) => HOTELES[hotel] || "Sede no especificada";
const getHotelShort = (hotel) => HOTELES_SHORT[hotel] || "";

/* ===================== ORIGEN / DINERO ===================== */
const ORIGEN_LABELS = {
  manual: "Panel interno (recepción / staff)",
  directo: "Recepción / venta directa",
  whatsapp: "WhatsApp",
  booking: "Booking.com",
  expedia: "Expedia",
  facebook: "Facebook / Instagram",
};

const getOrigenLabel = (o) => ORIGEN_LABELS[o] || null;

const moneyMXN = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(num);
};

/* ===================== HELPERS ===================== */
const recortar = (texto, max = 90) => {
  if (!texto) return "";
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
};

const buildFechasTexto = (evento) => {
  const inicio = evento.startDate
    ? dayjs(evento.startDate).format("DD/MM/YYYY")
    : "";
  const fin = evento.endDate
    ? dayjs(evento.endDate).format("DD/MM/YYYY")
    : "";
  if (inicio && fin) return `${inicio} al ${fin}`;
  if (inicio && !fin) return inicio;
  return "";
};

const eventoCubreFecha = (evento, fechaStr) => {
  const inicio = evento.startDate;
  const fin = evento.endDate;
  if (!inicio) return false;
  if (fin) return fechaStr >= inicio && fechaStr <= fin;
  return fechaStr === inicio;
};

const metaTipo = (type) => {
  switch (type) {
    case "checkin":
      return { color: "#22c55e", labelCorto: "Ent.", labelLargo: "Entrada" };
    case "checkout":
      return { color: "#fb7185", labelCorto: "Sal.", labelLargo: "Salida" };
    case "stay":
      return { color: "#38bdf8", labelCorto: "Res.", labelLargo: "Reserva" };
    default:
      return {
        color: beachColors.teal,
        labelCorto: "",
        labelLargo: "Movimiento",
      };
  }
};

const metaEvento = (evento) => {
  if (evento?.type === "stay") {
    if (evento.checkoutAt) return metaTipo("checkout");
    if (evento.checkinAt) return metaTipo("checkin");
    return metaTipo("stay");
  }
  return metaTipo(evento?.type);
};

/* ===================== TOOLTIP / POPOVER ===================== */

const TooltipContenidoEvento = ({
  evento,
  onCheckin,
  onCheckout,
  onDelete,
  onPaid,
  onUnpaid,
  onRequestEditDates,
  pending,
  onClosePopover,
  isMobileUI,
  popoverKey,
  onLockPopover,
}) => {
  const popRootRef = useRef(null);
  const [openActions, setOpenActions] = useState(false);
  const [confirmKey, setConfirmKey] = useState(null);

  useEffect(() => {
    const locked = !!confirmKey || !!openActions;
    onLockPopover?.(popoverKey, locked);
    return () => onLockPopover?.(popoverKey, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmKey, openActions, popoverKey]);

  const meta = metaEvento(evento);
  const hotelLabel = getHotelLabel(evento.hotel);
  const fechas = buildFechasTexto(evento);
  const detalleCorto = recortar(evento.label, 90);
  const origenLabel = getOrigenLabel(evento.origen);

  const esReserva = evento.type === "stay";
  const tieneCheckin = !!evento.checkinAt;
  const tieneCheckout = !!evento.checkoutAt;
  const tienePago = !!evento.paidAt;

  const eid = String(evento?.id || evento?._id || "");
  const isBusy = (action) => !!pending?.[eid]?.[action];
  const busyIcon = <ReloadOutlined spin />;

  const todayStr = dayjs().format(DATE_FMT);
  const sameDayCheckoutRisk =
    !!evento?.checkinAt &&
    String(evento.checkinAt) === todayStr &&
    !evento?.checkoutAt;

  const billing = evento?.billing || null;
  const hasDiscount =
    Number.isFinite(Number(billing?.discountPercent)) &&
    Number(billing.discountPercent) > 0;
  const billingLooksInvalid =
    billing &&
    (Number(billing.pricePerDay) <= 0 || Number(billing.total) <= 0)
      ? true
      : false;

  const closeActions = () => setOpenActions(false);
  const closeConfirm = () => setConfirmKey(null);

  const actNow = async (key) => {
    closeConfirm();
    closeActions();
    onClosePopover?.();

    if (key === "edit_dates") return onRequestEditDates?.(evento);
    if (key === "checkin") return onCheckin?.(eid);
    if (key === "checkout") return onCheckout?.(eid);
    if (key === "paid") return onPaid?.(eid);
    if (key === "unpaid") return onUnpaid?.(eid);
    if (key === "delete") return onDelete?.(eid);
  };

  const estadoAccion = pending?.[eid]?.any ? (
    <div
      style={{
        fontSize: 9,
        color: neutrals.textMuted,
        display: "flex",
        gap: 6,
        alignItems: "center",
      }}
    >
      <ReloadOutlined spin />
      <span>Aplicando cambios…</span>
    </div>
  ) : null;

  const acciones = [
    esReserva
      ? {
          key: "edit_dates",
          icon: isBusy("dates") ? busyIcon : <EditOutlined />,
          label: "Cambiar fechas",
          disabled: !!evento.checkoutAt || isBusy("any"),
          danger: false,
        }
      : null,
    !tieneCheckin && esReserva
      ? {
          key: "checkin",
          icon: isBusy("checkin") ? busyIcon : <LoginOutlined />,
          label: "Marcar entrada (check-in)",
          disabled: isBusy("any"),
          danger: false,
        }
      : null,
    tieneCheckin && !tieneCheckout && esReserva
      ? {
          key: "checkout",
          icon: isBusy("checkout") ? busyIcon : <LogoutOutlined />,
          label: "Marcar salida (check-out)",
          disabled: isBusy("any"),
          danger: true,
        }
      : null,
    esReserva && !tienePago
      ? {
          key: "paid",
          icon: isBusy("paid") ? busyIcon : <DollarCircleOutlined />,
          label: "Marcar como pagada",
          disabled: isBusy("any"),
          danger: false,
        }
      : null,
    esReserva && tienePago
      ? {
          key: "unpaid",
          icon: isBusy("unpaid") ? busyIcon : <DollarCircleOutlined />,
          label: "Marcar como pendiente de pago",
          disabled: isBusy("any"),
          danger: false,
        }
      : null,
    {
      key: "delete",
      icon: isBusy("delete") ? busyIcon : <DeleteOutlined />,
      label: "Mover a papelera",
      disabled: isBusy("any"),
      danger: true,
    },
  ].filter(Boolean);

  const menuItems = acciones.map((a) => {
    const common = {
      key: a.key,
      icon: a.icon,
      disabled: a.disabled,
      danger: !!a.danger,
    };

    if (a.key === "delete") {
      return {
        ...common,
        label: (
          <Popconfirm
            title="¿Mover a papelera?"
            description="La reserva se quitará del calendario, pero podrás recuperarla desde la papelera."
            okText="Mover"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            open={confirmKey === "delete"}
            getPopupContainer={() => popRootRef.current || document.body}
            onCancel={() => closeConfirm()}
            onConfirm={() => actNow("delete")}
          >
            <span
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpenActions(true);
                setConfirmKey("delete");
              }}
              style={{ display: "inline-block", width: "100%" }}
            >
              {a.label}
            </span>
          </Popconfirm>
        ),
      };
    }

    if (a.key === "checkout" && sameDayCheckoutRisk) {
      return {
        ...common,
        label: (
          <Popconfirm
            title="¿Hacer check-out hoy?"
            description="Detecté que el check-in fue hoy. Si confirmas, se registrará la salida y la reserva se recortará a hoy."
            okText="Sí, hacer check-out"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            open={confirmKey === "checkout"}
            getPopupContainer={() => popRootRef.current || document.body}
            onCancel={() => closeConfirm()}
            onConfirm={() => actNow("checkout")}
          >
            <span
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpenActions(true);
                setConfirmKey("checkout");
              }}
              style={{ display: "inline-block", width: "100%" }}
            >
              {a.label}
            </span>
          </Popconfirm>
        ),
      };
    }

    return { ...common, label: a.label };
  });

  const onMenuClick = ({ key }) => {
    if (key === "delete") return;
    if (key === "checkout" && sameDayCheckoutRisk) return;
    actNow(key);
  };

  const hasBilling = !!billing;
  const todayBillingInfo =
    hasBilling && !billingLooksInvalid
      ? `${billing.days} día(s) × ${moneyMXN(billing.pricePerDay)}${
          hasDiscount
            ? ` · Desc. ${billing.discountPercent}% (antes: ${moneyMXN(
                billing.totalBeforeDiscount
              )})`
            : ""
        }`
      : null;

  return (
    <div
      ref={popRootRef}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        color: neutrals.textMain,
        fontFamily:
          '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        fontSize: 10.5,
        minWidth: 260,
        maxWidth: isMobileUI ? 300 : 340,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div
            style={{
              width: 4,
              height: 24,
              borderRadius: 999,
              background: meta.color,
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <span
              style={{
                fontSize: 8.5,
                textTransform: "uppercase",
                letterSpacing: 0.35,
                color: neutrals.textMuted,
              }}
            >
              Movimiento
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 600 }}>
              {meta.labelLargo}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            alignItems: "flex-end",
          }}
        >
          {evento.hotel && (
            <Tag
              icon={<HomeOutlined style={{ fontSize: 10 }} />}
              style={{
                borderRadius: 999,
                paddingInline: 8,
                paddingBlock: 0,
                fontSize: 9,
                lineHeight: "16px",
                background: "#f9fafb",
                borderColor: meta.color,
                color: neutrals.textMain,
                marginInlineEnd: 0,
              }}
            >
              {hotelLabel}
            </Tag>
          )}

          <Tag
            color="blue"
            style={{
              borderRadius: 999,
              paddingInline: 8,
              paddingBlock: 0,
              lineHeight: "16px",
              fontSize: 9,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 0,
              marginInlineEnd: 0,
            }}
          >
            Hab <strong>#{evento.room}</strong>
          </Tag>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10,
          }}
        >
          <CalendarOutlined style={{ fontSize: 11, color: meta.color }} />
          <span>{fechas || "Reserva registrada."}</span>
        </div>

        {detalleCorto && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              fontSize: 10,
            }}
          >
            <UserOutlined
              style={{
                fontSize: 11,
                color: neutrals.textMuted,
                marginTop: 1,
              }}
            />
            <span>{detalleCorto}</span>
          </div>
        )}

        {esReserva && hasBilling && (
          <Card
            size="small"
            bordered
            bodyStyle={{
              padding: 6,
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
            style={{
              marginTop: 2,
              borderRadius: 12,
              background: "#f8fafc",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 9.5, color: neutrals.textMuted }}>
                Total
              </span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>
                {billingLooksInvalid ? "—" : moneyMXN(billing.total)}
              </span>
            </div>

            {todayBillingInfo ? (
              <div
                style={{
                  fontSize: 9.25,
                  color: neutrals.textMuted,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <span>{todayBillingInfo}</span>
              </div>
            ) : (
              <div style={{ fontSize: 9.25, color: "#b45309" }}>
                No se pudo calcular el total (precio inválido).
              </div>
            )}
          </Card>
        )}

        {estadoAccion}

        {esReserva && (
          <>
            <Divider style={{ margin: "6px 0" }} />

            <Space size={6} wrap style={{ fontSize: 9.25 }}>
              {evento.checkinAt ? (
                <Tag
                  icon={<LoginOutlined />}
                  color="success"
                  style={{ borderRadius: 999, marginInlineEnd: 0 }}
                >
                  Ent: <b>{dayjs(evento.checkinAt).format("DD/MM/YYYY")}</b>
                </Tag>
              ) : (
                <Tag
                  color="blue"
                  style={{ borderRadius: 999, marginInlineEnd: 0 }}
                >
                  Sin check-in
                </Tag>
              )}

              {evento.checkoutAt ? (
                <Tag
                  icon={<LogoutOutlined />}
                  color="red"
                  style={{ borderRadius: 999, marginInlineEnd: 0 }}
                >
                  Sal: <b>{dayjs(evento.checkoutAt).format("DD/MM/YYYY")}</b>
                </Tag>
              ) : (
                <Tag style={{ borderRadius: 999, marginInlineEnd: 0 }}>
                  Sin check-out
                </Tag>
              )}

              {evento.paidAt ? (
                <Tag
                  icon={<DollarCircleOutlined />}
                  color="success"
                  style={{ borderRadius: 999, marginInlineEnd: 0 }}
                >
                  Pagada: <b>{dayjs(evento.paidAt).format("DD/MM/YYYY")}</b>
                </Tag>
              ) : (
                <Tag
                  color="gold"
                  style={{ borderRadius: 999, marginInlineEnd: 0 }}
                >
                  Pendiente
                </Tag>
              )}
            </Space>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Dropdown
                trigger={isMobileUI ? ["click"] : ["hover"]}
                placement="bottomRight"
                open={openActions}
                onOpenChange={(open) => {
                  if (!open && confirmKey) return;
                  setOpenActions(open);
                }}
                getPopupContainer={() => popRootRef.current || document.body}
                menu={{ items: menuItems, onClick: onMenuClick }}
              >
                <Button
                  size="small"
                  type="text"
                  icon={<MoreOutlined />}
                  style={{
                    borderRadius: 999,
                    width: 28,
                    height: 28,
                    paddingInline: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                />
              </Dropdown>
            </div>
          </>
        )}
      </div>

      {origenLabel && (
        <div
          style={{
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 8.5,
            color: neutrals.textMuted,
          }}
        >
          <InfoCircleOutlined style={{ fontSize: 9, color: meta.color }} />
          <span>Origen: {origenLabel}.</span>
        </div>
      )}
    </div>
  );
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
  const [month, setMonth] = useState(dayjs().startOf("month"));
  const [hoveredChipKey, setHoveredChipKey] = useState(null);
  const { token } = theme.useToken();

  // Más compacto
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

  const todayStr = dayjs().format(DATE_FMT);
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
          label: `${getHotelShort(hotel)} · Hab ${room}`,
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
      parent.children.push({
        key: roomMeta.key,
        groupType: "room",
        roomMeta,
        events: eventsByRoom.get(roomMeta.key) || [],
      });
    }
    return Array.from(grouped.values());
  }, [rooms, eventsByRoom]);

  const changeMonth = (offset) => {
    setMonth((m) => m.add(offset, "month"));
    onCloseAllPopovers?.();
  };

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

        const { roomMeta } = row;
        return (
          <div
            style={{
              padding: "3px 6px",
              display: "flex",
              flexDirection: "column",
              gap: 0,
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
        );
      },
      onCell: (row) => ({
        style: {
          background:
            row.groupType === "hotel"
              ? token.colorBgContainer
              : token.colorBgContainer,
          borderBottom: `1px solid ${token.colorSplit}`,
          fontWeight: row.groupType === "hotel" ? 600 : 400,
          // 🔒 La columna fija siempre por encima de las reservas
          zIndex: row.groupType === "hotel" ? 9 : 8,
        },
      }),
    });

    days.forEach((d) => {
      const dateStr = d.format(DATE_FMT);
      const isWeekend = d.day() === 0 || d.day() === 6;
      const isToday = dateStr === todayStr;

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
                color: isToday ? token.colorPrimary : neutrals.textMain,
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
            {isToday && (
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

          const instanceKey = `classic:${row.roomMeta.key}:${dateStr}`;
          const rowKeyPrefix = `classic:${row.roomMeta.key}:`;
          const rowHasHover =
            hoveredChipKey &&
            hoveredChipKey.startsWith(rowKeyPrefix);
          const isHovered = hoveredChipKey === instanceKey;
          const isOtherHoveredOnRow = rowHasHover && !isHovered;

          // 👉 Solo recorto cuando NO está en hover
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
                trigger={isMobileUI ? "click" : "hover"}
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
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "2px 6px",
                    borderRadius: 999,
                    background:
                      "linear-gradient(90deg, rgba(56,189,248,0.12), rgba(16,185,129,0.16))",
                    borderLeft: `4px solid ${meta.color}`,
                    fontSize: compacto ? 9.25 : 10,
                    lineHeight: "14px",
                    whiteSpace: "nowrap",
                    overflow: isHovered ? "visible" : "hidden",
                    textOverflow: isHovered ? "clip" : "ellipsis",
                    color: neutrals.textMain,
                    boxShadow: isHovered
                      ? token.boxShadowSecondary
                      : token.boxShadowTertiary,
                    cursor: "pointer",
                    userSelect: "none",
                    WebkitTapHighlightColor: "transparent",
                    position: "relative",
                    // 🔝 suficiente para comerse a otras reservas,
                    // pero por debajo de la columna fija (que tiene zIndex 8/9)
                    zIndex: isHovered ? 2 : 1,
                    transform: isHovered
                      ? "translateY(-1px) scale(1.015)"
                      : "translateY(0) scale(1)",
                    opacity: isOtherHoveredOnRow ? 0 : 1,
                    pointerEvents: isOtherHoveredOnRow ? "none" : "auto",
                    transition:
                      "opacity 0.12s ease, max-width 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, padding 0.18s ease",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "999px",
                      backgroundColor: meta.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 700, flexShrink: 0 }}>
                    {etiquetaCorta}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>{texto}</span>
                  {ev.paidAt && (
                    <span
                      style={{
                        fontSize: 10,
                        color: beachColors.teal,
                        fontWeight: 800,
                        flexShrink: 0,
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

        <Space size={4} wrap>
          <Button
            size="small"
            onClick={() => changeMonth(-1)}
            style={{
              borderRadius: 999,
              borderColor: token.colorBorderSecondary,
              background: token.colorBgLayout,
              fontSize: 11,
              paddingInline: 8,
              height: 26,
            }}
          >
            &lt;
          </Button>
          <Button
            size="small"
            type="primary"
            onClick={() => setMonth(dayjs().startOf("month"))}
            style={{
              borderRadius: 999,
              fontSize: 11,
              paddingInline: 10,
              height: 26,
            }}
          >
            Hoy
          </Button>
          <Button
            size="small"
            onClick={() => changeMonth(1)}
            style={{
              borderRadius: 999,
              borderColor: token.colorBorderSecondary,
              background: token.colorBgLayout,
              fontSize: 11,
              paddingInline: 8,
              height: 26,
            }}
          >
            &gt;
          </Button>
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
