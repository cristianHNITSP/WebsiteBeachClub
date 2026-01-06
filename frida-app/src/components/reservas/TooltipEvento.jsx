// src/components/reservas/TooltipEvento.jsx
import { useEffect, useRef, useState } from "react";
import { Button, Card, Divider, Dropdown, Popconfirm, Space, Tag, Typography } from "antd";
import {
  CalendarOutlined,
  DeleteOutlined,
  DollarCircleOutlined,
  EditOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  LoginOutlined,
  LogoutOutlined,
  MoreOutlined,
  ReloadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { beachColors, neutrals } from "../../theme/beachTheme";
import {
  DATE_FMT,
  buildFechasTexto,
  getEventId,
  getHotelLabel,
  getOrigenLabel,
  metaEvento,
  moneyMXN,
  recortar,
} from "./reservasHelpers";

dayjs.locale("es");

const { Text } = Typography;

/* ===================== TOOLTIP EVENTO ===================== */
export const TooltipContenidoEvento = ({
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

  const eid = getEventId(evento);
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
        fontSize: 9.5,
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
            description="Detecté que el check-in fue hoy. Si confirmas, se registrará la salida y la reserva se recortará a hoy (se quitarán los días futuros del calendario y se actualizará el total)."
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
        gap: 6,
        color: neutrals.textMain,
        fontFamily:
          '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        fontSize: 10.5,
        minWidth: 260,
        maxWidth: isMobileUI ? 300 : 360,
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
      >
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
                  Ent:{" "}
                  <b>{dayjs(evento.checkinAt).format("DD/MM/YYYY")}</b>
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
                  Sal:{" "}
                  <b>{dayjs(evento.checkoutAt).format("DD/MM/YYYY")}</b>
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
                  Pagada:{" "}
                  <b>{dayjs(evento.paidAt).format("DD/MM/YYYY")}</b>
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

/* ===================== TOOLTIP LISTA EXTRA POR DÍA ===================== */
export const TooltipListaReservasDia = ({ lista }) => {
  if (!lista || !lista.length) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        color: neutrals.textMain,
        fontFamily:
          '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        fontSize: 10.5,
      }}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: 11.5,
          paddingBottom: 4,
          borderBottom: "1px solid #e5e7eb",
          marginBottom: 2,
          color: neutrals.textMain,
        }}
      >
        Otras reservas en este día
      </div>

      {lista.map((e, idx) => {
        const meta = metaEvento(e);
        const fechas = buildFechasTexto(e);
        const detalle = recortar(e.label, 70);

        return (
          <div
            key={`${getEventId(e) || "x"}-${e.startDate || ""}-${e.room}-${idx}`}
            style={{
              padding: 6,
              borderRadius: 10,
              background: "#f9fafb",
              border: "1px solid #eef2ff",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div
              style={{ display: "flex", justifyContent: "space-between", gap: 6 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 10.5,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "999px",
                    backgroundColor: meta.color,
                  }}
                />
                <span style={{ fontWeight: 500 }}>
                  {meta.labelLargo} · {getHotelLabel(e.hotel)} · Hab {e.room}
                </span>
              </div>
            </div>

            {detalle && (
              <div style={{ fontSize: 9.5, color: neutrals.textMuted }}>
                {detalle}
              </div>
            )}

            {fechas && (
              <div
                style={{
                  fontSize: 9,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <CalendarOutlined style={{ fontSize: 9, color: meta.color }} />
                <span style={{ color: neutrals.textMuted }}>{fechas}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
