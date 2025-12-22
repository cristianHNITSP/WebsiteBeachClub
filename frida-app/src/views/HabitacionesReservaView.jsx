// src/views/HabitacionesView.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "@api/axios";
import {
  Card,
  Space,
  Tag,
  Typography,
  Calendar,
  Select,
  Form,
  Input,
  DatePicker,
  Button,
  message,
  Grid,
  Popover,
  Modal,
  Divider,
  Spin,
  Checkbox,
  Dropdown,
  Popconfirm,
  Tabs,
  Table,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import "dayjs/locale/es";
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
  HistoryOutlined,
  InboxOutlined,
  UndoOutlined,
  RestOutlined,
} from "@ant-design/icons";
import { beachColors, neutrals } from "../theme/beachTheme";

dayjs.locale("es");

const { Text } = Typography;
const { useBreakpoint } = Grid;
const { Option } = Select;
const { RangePicker } = DatePicker;

/* ===================== CONFIG API ===================== */
const RESERVAS_ENDPOINT = "/api/reservas";
const RESERVAS_HABS_ENDPOINT = "/api/reservas/habitaciones";
const RESERVAS_DATE_CHANGES_ENDPOINT = "/api/reservas/date-changes";

//NUEVO: endpoints de papelera (con fallback si tu backend no los tiene)
const RESERVAS_TRASH_ENDPOINT = "/api/reservas/trash";

const DATE_FMT = "YYYY-MM-DD";

/* ===================== HELPERS ===================== */
const getHabId = (h) => h?._id || h?.id;
const getEventId = (e) => String(e?.id || e?._id || "");
const safeLower = (s) => String(s || "").toLowerCase();

const moneyMXN = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(num);
};

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

/* ===================== STATUS / ROOM HELPERS ===================== */
const getRoomStatusLabel = (inventoryStatus) => {
  if (inventoryStatus === "Mantenimiento") return "En mantenimiento";
  if (inventoryStatus === "Bloqueada") return "Bloqueada";
  if (inventoryStatus === "Fuera de servicio") return "Fuera de servicio";
  return "";
};

const isRoomUnavailable = (hab) => {
  const s = hab?.inventoryStatus;
  return s === "Bloqueada" || s === "Mantenimiento" || s === "Fuera de servicio";
};

/* ===================== META TIPOS (UI) ===================== */
const metaTipo = (type) => {
  switch (type) {
    case "checkin":
      return { color: "#22c55e", labelCorto: "Ent.", labelLargo: "Entrada" };
    case "checkout":
      return { color: "#fb7185", labelCorto: "Sal.", labelLargo: "Salida" };
    case "stay":
      return { color: "#38bdf8", labelCorto: "Res.", labelLargo: "Reserva" };
    default:
      return { color: beachColors.teal, labelCorto: "", labelLargo: "Movimiento" };
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

/* ===================== ORIGEN RESERVA (UI) ===================== */
const ORIGEN_LABELS = {
  manual: "Panel interno (recepción / staff)",
  directo: "Recepción / venta directa",
  whatsapp: "WhatsApp",
  booking: "Booking.com",
  expedia: "Expedia",
  facebook: "Facebook / Instagram",
};

const getOrigenLabel = (o) => ORIGEN_LABELS[o] || null;

/* ===================== HELPERS FECHAS ===================== */
const recortar = (texto, max = 90) => {
  if (!texto) return "";
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
};

const buildFechasTexto = (evento) => {
  const inicio = evento.startDate ? dayjs(evento.startDate).format("DD/MM/YYYY") : "";
  const fin = evento.endDate ? dayjs(evento.endDate).format("DD/MM/YYYY") : "";
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

const fmtRange = (startStr, endStr) => {
  const s = dayjs(startStr).format("DD/MM/YYYY");
  const e = dayjs(endStr || startStr).format("DD/MM/YYYY");
  return `${s} al ${e}`;
};

/* ===================== TOOLTIP CONTENT ===================== */
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
  const [confirmKey, setConfirmKey] = useState(null); // "delete" | "checkout" | null

  //aMantener Popover abierto mientras haya dropdown/confirm (evita Popconfirm pegado)
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
  const sameDayCheckoutRisk = !!evento?.checkinAt && String(evento.checkinAt) === todayStr && !evento?.checkoutAt;

  //Billing viene del backend (Habitacion.price/offer)
  const billing = evento?.billing || null;
  const hasDiscount = Number.isFinite(Number(billing?.discountPercent)) && Number(billing.discountPercent) > 0;
  const billingLooksInvalid = billing && (Number(billing.pricePerDay) <= 0 || Number(billing.total) <= 0) ? true : false;

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
    <div style={{ fontSize: 9.5, color: neutrals.textMuted, display: "flex", gap: 6, alignItems: "center" }}>
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
    const common = { key: a.key, icon: a.icon, disabled: a.disabled, danger: !!a.danger };

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
        fontFamily: '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        fontSize: 11,
        minWidth: 280,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 4, height: 26, borderRadius: 999, background: meta.color }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 0.4, color: neutrals.textMuted }}>
              Movimiento
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: neutrals.textMain }}>{meta.labelLargo}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          {evento.hotel && (
            <span
              style={{
                fontSize: 9,
                padding: "2px 8px",
                borderRadius: 999,
                border: `1px solid ${meta.color}`,
                background: "#f9fafb",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: neutrals.textMain,
              }}
            >
              <HomeOutlined style={{ fontSize: 9, color: meta.color }} />
              {hotelLabel}
            </span>
          )}

          <span
            style={{
              fontSize: 9,
              padding: "2px 8px",
              borderRadius: 999,
              background: "#eff6ff",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: neutrals.textMain,
            }}
          >
            Habitación <strong>#{evento.room}</strong>
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
          <CalendarOutlined style={{ fontSize: 11, color: meta.color }} />
          <span>{fechas || "Reserva registrada."}</span>
        </div>

        {detalleCorto && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 10 }}>
            <UserOutlined style={{ fontSize: 11, color: neutrals.textMuted, marginTop: 1 }} />
            <span>{detalleCorto}</span>
          </div>
        )}

        {esReserva && billing && (
          <div
            style={{
              marginTop: 2,
              padding: "8px 10px",
              borderRadius: 12,
              background: "#f8fafc",
              border: "1px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: neutrals.textMuted }}>Total a pagar</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: neutrals.textMain }}>
                {billingLooksInvalid ? "—" : moneyMXN(billing.total)}
              </span>
            </div>

            {!billingLooksInvalid ? (
              <div style={{ fontSize: 9.5, color: neutrals.textMuted, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span>
                  {billing.days} día(s) × {moneyMXN(billing.pricePerDay)}
                </span>
                {hasDiscount && (
                  <span>
                    · Descuento {billing.discountPercent}% (antes: {moneyMXN(billing.totalBeforeDiscount)})
                  </span>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 9.5, color: "#b45309" }}>
                No se pudo calcular el total (precio inválido). Revisa el precio de la habitación.
              </div>
            )}

            {!!evento?.roomMeta?.offer?.description && (
              <div style={{ fontSize: 9.5, color: neutrals.textMuted }}>
                Oferta: <b>{evento.roomMeta.offer.description}</b>
              </div>
            )}
          </div>
        )}

        {estadoAccion}

        {esReserva && (
          <>
            <Divider style={{ margin: "6px 0" }} />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 9.5 }}>
              {evento.checkinAt ? (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#ecfdf5",
                    border: "1px solid #bbf7d0",
                    color: "#065f46",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <LoginOutlined />
                  Entrada: <b>{dayjs(evento.checkinAt).format("DD/MM/YYYY")}</b>
                </span>
              ) : (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    color: "#1e3a8a",
                  }}
                >
                  Sin check-in
                </span>
              )}

              {evento.checkoutAt ? (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#fff1f2",
                    border: "1px solid #fecdd3",
                    color: "#9f1239",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <LogoutOutlined />
                  Salida: <b>{dayjs(evento.checkoutAt).format("DD/MM/YYYY")}</b>
                </span>
              ) : (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    color: "#334155",
                  }}
                >
                  Sin check-out
                </span>
              )}

              {evento.paidAt ? (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#ecfdf5",
                    border: "1px solid #bbf7d0",
                    color: "#065f46",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <DollarCircleOutlined />
                  Pagada: <b>{dayjs(evento.paidAt).format("DD/MM/YYYY")}</b>
                </span>
              ) : (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    color: "#92400e",
                  }}
                >
                  Pendiente de pago
                </span>
              )}
            </div>

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
                    marginTop: 6,
                    width: 32,
                    height: 32,
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

const tooltipContenidoListaExtra = (lista) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 6,
      color: neutrals.textMain,
      fontFamily: '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
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
          <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "999px", backgroundColor: meta.color }} />
              <span style={{ fontWeight: 500 }}>
                {meta.labelLargo} · {getHotelLabel(e.hotel)} · Hab {e.room}
              </span>
            </div>
          </div>

          {detalle && <div style={{ fontSize: 9.5, color: neutrals.textMuted }}>{detalle}</div>}

          {fechas && (
            <div style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 4 }}>
              <CalendarOutlined style={{ fontSize: 9, color: meta.color }} />
              <span style={{ color: neutrals.textMuted }}>{fechas}</span>
            </div>
          )}
        </div>
      );
    })}
  </div>
);

/* ===================== PANEL PROGRAMACIÓN (BACKEND) ===================== */
const PanelProgramacionManual = ({ esMobile, onCreated, filtroHotel, messageApi }) => {
  const [formulario] = Form.useForm();
  const [enviando, setEnviando] = useState(false);

  const [habOptions, setHabOptions] = useState([]);
  const [loadingHabOptions, setLoadingHabOptions] = useState(false);

  const hotelWatch = Form.useWatch("hotel", formulario);
  const rangoWatch = Form.useWatch("rango", formulario);
  const habWatch = Form.useWatch("habitacion", formulario);

  const hotelActual = hotelWatch || (filtroHotel !== "all" ? filtroHotel : undefined);

  const rangoActual = useMemo(() => {
    const r = rangoWatch;
    if (!r || r.length !== 2 || !r[0] || !r[1]) return null;
    const s = r[0].startOf("day").format(DATE_FMT);
    const e = r[1].startOf("day").format(DATE_FMT);
    if (e < s) return null;
    return { startDate: s, endDate: e };
  }, [rangoWatch]);

  const loadHabitacionesOptions = useCallback(
    async ({ q = "" } = {}) => {
      setLoadingHabOptions(true);
      try {
        const params = {};
        if (hotelActual) params.hotel = hotelActual;

        if (rangoActual) {
          params.startDate = rangoActual.startDate;
          params.endDate = rangoActual.endDate;
          params.onlyAvailable = "true";
        }

        if (q && q.trim()) params.q = q.trim();

        const res = await axios.get(RESERVAS_HABS_ENDPOINT, { params });
        const raw = res?.data?.data || [];
        const arr = Array.isArray(raw) ? raw : [];

        if (habWatch) {
          const ok = arr.some((x) => String(getHabId(x)) === String(habWatch));
          if (!ok) formulario.setFieldsValue({ habitacion: undefined });
        }

        setHabOptions(arr);
      } catch (e) {
        console.error("Error cargando habitaciones:", e);
        setHabOptions([]);
      } finally {
        setLoadingHabOptions(false);
      }
    },
    [hotelActual, rangoActual, habWatch, formulario]
  );

  useEffect(() => {
    loadHabitacionesOptions({ q: "" });
  }, [loadHabitacionesOptions]);

  const habById = useMemo(() => {
    const map = new Map();
    for (const h of habOptions) map.set(String(getHabId(h)), h);
    return map;
  }, [habOptions]);

  const manejarEnvio = async (valores) => {
    const msgKey = "create_reserva";
    setEnviando(true);
    messageApi?.loading({ content: "Guardando la reserva…", key: msgKey, duration: 0 });

    try {
      const { habitacion, huesped, rango, notas, pagada, origen } = valores;

      if (!habitacion) {
        messageApi?.warning({ content: "Elige una habitación.", key: msgKey });
        return;
      }

      const hab = habById.get(String(habitacion));
      if (!hab) {
        messageApi?.warning({ content: "Esa habitación no es válida. Elige otra.", key: msgKey });
        return;
      }

      if (!rango || rango.length !== 2 || !rango[0] || !rango[1]) {
        messageApi?.warning({ content: "Selecciona entrada y salida.", key: msgKey });
        return;
      }

      const inicio = rango[0].startOf("day").format(DATE_FMT);
      const fin = rango[1].startOf("day").format(DATE_FMT);
      if (fin < inicio) {
        messageApi?.warning({ content: "La salida no puede ser antes de la entrada.", key: msgKey });
        return;
      }

      if (isRoomUnavailable(hab)) {
        const estado = getRoomStatusLabel(hab.inventoryStatus);
        messageApi?.warning({ content: `Esa habitación está ${safeLower(estado)}. Elige otra.`, key: msgKey });
        return;
      }

      const nombreHuesped = huesped ? ` ${huesped}` : "";
      const notasTexto = notas ? ` · ${notas}` : "";
      const etiquetaBase = `Reserva${nombreHuesped}`.trim() || "Reserva";
      const etiquetaFinal = `${etiquetaBase}${notasTexto}`;

      const payload = {
        habitacionId: getHabId(hab),
        startDate: inicio,
        endDate: fin,
        label: etiquetaFinal,
        notes: notas || "",
        origen: origen || "directo",
        origenPanel: "manual", // si quieres distinguir en el futuro, solo a nivel de backend
        origenUi: origen || "directo",
        origenSource: "panel",
        origenChannel: origen || "directo",
        origenTag: origen || "directo",
        paid: !!pagada,
      };

      // Por compatibilidad, si solo quieres un campo:
      delete payload.origenPanel;
      delete payload.origenUi;
      delete payload.origenSource;
      delete payload.origenChannel;
      delete payload.origenTag;

      const res = await axios.post(RESERVAS_ENDPOINT, payload);
      const created = res?.data?.data || res?.data;
      onCreated?.(created);

      formulario.resetFields();
      formulario.setFieldsValue({ origen: "directo", pagada: false });

      messageApi?.success({
        content: pagada ? "Reserva guardada y marcada como pagada." : "Reserva guardada.",
        key: msgKey,
      });

      loadHabitacionesOptions({ q: "" });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) {
        messageApi?.error({ content: "Esa habitación ya está ocupada en esas fechas. Prueba otra.", key: msgKey });
      } else {
        messageApi?.error({ content: "Ups… no se pudo guardar. Intenta de nuevo.", key: msgKey });
      }
      console.error(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      style={{
        padding: esMobile ? 10 : 12,
        marginBottom: 10,
        borderRadius: 12,
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        fontFamily: '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      <Space direction="vertical" size={4} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <Text style={{ fontSize: 12, fontWeight: 600, color: neutrals.textMain }}>Programar reserva</Text>

          <Button
            size="small"
            type="text"
            icon={<ReloadOutlined />}
            onClick={() => loadHabitacionesOptions({ q: "" })}
            style={{ color: neutrals.textMuted }}
          >
            Actualizar
          </Button>
        </div>

        <Text style={{ fontSize: 10, color: neutrals.textMuted }}>
          Tip: selecciona <b>fechas</b> primero para ver solo habitaciones <b>disponibles</b>.
        </Text>

        <Form
          form={formulario}
          layout={esMobile ? "vertical" : "inline"}
          onFinish={manejarEnvio}
          style={{ width: "100%", marginTop: 4, rowGap: 6 }}
          initialValues={{ pagada: false, origen: "directo" }}
        >
          <Form.Item name="hotel" style={{ marginRight: esMobile ? 0 : 6, marginBottom: 6 }}>
            <Select
              size="small"
              placeholder="Sede"
              style={{ width: esMobile ? "100%" : 150 }}
              allowClear
              onChange={() => formulario.setFieldsValue({ habitacion: undefined })}
            >
              <Option value="casa_frida">Casa Frida</Option>
              <Option value="cabanas_fridas">Cabañas Fridas</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="rango"
            rules={[{ required: true, message: "Selecciona entrada y salida." }]}
            style={{ marginRight: esMobile ? 0 : 6, marginBottom: 6 }}
          >
            <RangePicker size="small" format="DD/MM/YYYY" style={{ width: esMobile ? "100%" : 230 }} />
          </Form.Item>

          <Form.Item
            name="habitacion"
            rules={[{ required: true, message: "Selecciona la habitación" }]}
            style={{ marginRight: esMobile ? 0 : 6, marginBottom: 6 }}
          >
            <Select
              size="small"
              placeholder={loadingHabOptions ? "Cargando..." : "Habitación"}
              style={{ width: esMobile ? "100%" : 360 }}
              loading={loadingHabOptions}
              showSearch
              filterOption={false}
              onSearch={(q) => loadHabitacionesOptions({ q })}
              onChange={(value) => {
                const hab = habById.get(String(value));
                if (!hab) return;

                if (isRoomUnavailable(hab)) {
                  const estado = getRoomStatusLabel(hab.inventoryStatus);
                  messageApi?.warning({ content: `Esa habitación está ${safeLower(estado)}.`, key: "hab_select" });
                  formulario.setFieldsValue({ habitacion: undefined });
                  return;
                }
                formulario.setFieldsValue({ habitacion: value, hotel: hab.hotelCode });
              }}
              notFoundContent={rangoActual ? "Sin disponibles para ese rango." : "Elige fechas o escribe para buscar."}
            >
              {habOptions.map((h) => {
                const short = getHotelShort(h.hotelCode);
                const estado = getRoomStatusLabel(h.inventoryStatus);
                const disponibleTxt = h.available === false ? " · No disponible" : "";
                const etiqueta = `${short ? short + " · " : ""}Hab ${h.roomNumber || h.codigo || "?"}${
                  h.title ? " · " + h.title : ""
                }${estado ? " · " + estado : ""}${disponibleTxt}`;

                return (
                  <Option key={getHabId(h)} value={getHabId(h)}>
                    {etiqueta}
                  </Option>
                );
              })}
            </Select>
          </Form.Item>

          <Form.Item
            name="huesped"
            style={{
              marginRight: esMobile ? 0 : 6,
              marginBottom: 6,
              flex: esMobile ? "1 1 100%" : "0 1 180px",
            }}
          >
            <Input size="small" placeholder="Nombre del huésped (opcional)" style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="notas"
            style={{
              marginRight: esMobile ? 0 : 6,
              marginBottom: 6,
              flex: esMobile ? "1 1 100%" : "1 1 220px",
            }}
          >
            <Input size="small" placeholder="Notas internas (opcional)" style={{ width: "100%" }} />
          </Form.Item>

          {/* NUEVO: origen de la reserva */}
          <Form.Item
            name="origen"
            style={{ marginRight: esMobile ? 0 : 6, marginBottom: 6 }}
            rules={[{ required: true, message: "Selecciona el origen de la reserva." }]}
          >
            <Select
              size="small"
              placeholder="Origen de la reserva"
              style={{ width: esMobile ? "100%" : 220 }}
              dropdownMatchSelectWidth={false}
            >
              <Option value="directo">Recepción / venta directa</Option>
              <Option value="whatsapp">WhatsApp</Option>
              <Option value="booking">Booking.com</Option>
              <Option value="expedia">Expedia</Option>
              <Option value="facebook">Facebook / Instagram</Option>
            </Select>
          </Form.Item>

          {/* NUEVO: pago como checkbox con copy más claro */}
          <Form.Item
            name="pagada"
            valuePropName="checked"
            style={{ marginRight: esMobile ? 0 : 6, marginBottom: 6 }}
          >
            <Checkbox>Reserva pagada (monto total liquidado)</Checkbox>
          </Form.Item>

          <Form.Item style={{ marginBottom: 6 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="small"
              style={{
                borderRadius: 999,
                paddingInline: 16,
                background: beachColors.oceanBlue,
                borderColor: beachColors.oceanBlue,
              }}
              loading={enviando}
            >
              Guardar
            </Button>
          </Form.Item>
        </Form>
      </Space>
    </div>
  );
};

/* ===================== TAB: CAMBIOS DE FECHAS ===================== */
const CambiosFechasTab = ({ filtroHotel, esMobile }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const [range, setRange] = useState([
    dayjs().startOf("month").subtract(1, "month"),
    dayjs().endOf("month").add(1, "month"),
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    const key = "load_changes";
    messageApi.loading({ content: "Cargando cambios…", key, duration: 0 });

    try {
      const params = {};
      if (filtroHotel !== "all") params.hotel = filtroHotel;

      if (range?.[0] && range?.[1]) {
        params.from = range[0].startOf("day").format(DATE_FMT);
        params.to = range[1].endOf("day").format(DATE_FMT);
      }

      const res = await axios.get(RESERVAS_DATE_CHANGES_ENDPOINT, { params });
      const raw = res?.data?.data || [];
      setRows(Array.isArray(raw) ? raw : []);
      messageApi.success({ content: "Listo.", key });
    } catch (e) {
      console.error(e);
      setRows([]);
      messageApi.error({ content: "No se pudieron cargar los cambios.", key: "load_changes" });
    } finally {
      setLoading(false);
    }
  }, [filtroHotel, range, messageApi]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(
    () => [
      {
        title: "Fecha",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 160,
        render: (v) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "—"),
      },
      {
        title: "Sede / Hab",
        key: "room",
        render: (_, r) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 600, color: neutrals.textMain }}>
              {getHotelLabel(r.hotel)} · Hab {r.room}
            </span>
            <span style={{ fontSize: 11, color: neutrals.textMuted }}>
              Reserva: {r.codigoReserva || "—"}
            </span>
          </div>
        ),
      },
      {
        title: "Cambio",
        key: "change",
        render: (_, r) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div>
              <Tag
                color={r.action === "checkout_trim" ? "red" : "blue"}
                style={{ borderRadius: 999 }}
              >
                {r.action === "checkout_trim"
                  ? "Check-out (recorte)"
                  : "Edición de fechas"}
              </Tag>
            </div>
            <div style={{ fontSize: 11 }}>
              <div style={{ color: neutrals.textMuted }}>
                Antes:{" "}
                <b style={{ color: neutrals.textMain }}>
                  {fmtRange(r.oldStartDate, r.oldEndDate)}
                </b>
              </div>
              <div style={{ color: neutrals.textMuted }}>
                Después:{" "}
                <b style={{ color: neutrals.textMain }}>
                  {fmtRange(r.newStartDate, r.newEndDate)}
                </b>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Fechas eliminadas",
        dataIndex: "removedDates",
        key: "removedDates",
        width: 260,
        render: (arr) => {
          const list = Array.isArray(arr) ? arr : [];
          if (!list.length)
            return <span style={{ color: neutrals.textMuted }}>—</span>;

          const preview = list.slice(0, 4);
          const rest = list.length - preview.length;

          return (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {preview.map((d) => (
                <Tag key={d} style={{ borderRadius: 999, fontSize: 11 }}>
                  {dayjs(d).format("DD/MM")}
                </Tag>
              ))}
              {rest > 0 && (
                <Tooltip
                  title={
                    <div style={{ maxWidth: 260 }}>
                      {list.map((d) => (
                        <div key={d}>{dayjs(d).format("DD/MM/YYYY")}</div>
                      ))}
                    </div>
                  }
                >
                  <Tag color="purple" style={{ borderRadius: 999 }}>
                    +{rest} más
                  </Tag>
                </Tooltip>
              )}
            </div>
          );
        },
      },
      {
        title: "Actor",
        key: "actor",
        width: 180,
        render: (_, r) => (
          <div style={{ fontSize: 11, color: neutrals.textMuted }}>
            {r?.actor?.email ? <span>{r.actor.email}</span> : <span>—</span>}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      {contextHolder}

      <div
        style={{
          padding: esMobile ? 8 : 12,
          borderRadius: 14,
          border: "1px solid #e5e7eb",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Tag color="geekblue" style={{ borderRadius: 999 }}>
              <HistoryOutlined /> Cambios de fechas
            </Tag>

            <RangePicker
              value={range}
              onChange={(v) => setRange(v || [])}
              format="DD/MM/YYYY"
              size="small"
              style={{ width: esMobile ? "100%" : 260 }}
            />
          </div>

          <Button size="small" icon={<ReloadOutlined />} onClick={load} loading={loading}>
            Recargar
          </Button>
        </div>

        <Table
          rowKey={(r) =>
            String(r?._id || r?.id || `${r?.createdAt}-${r?.reservaId}`)
          }
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          size="small"
        />
      </div>
    </>
  );
};

/* ===================== TAB: PAPELERA ===================== */
const PapeleraTab = ({ filtroHotel, esMobile, onRestored }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  const [range, setRange] = useState([
    dayjs().startOf("month").subtract(2, "month"),
    dayjs().endOf("month").add(2, "month"),
  ]);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    const key = "load_trash";
    messageApi.loading({ content: "Cargando papelera…", key, duration: 0 });

    const params = {};
    if (filtroHotel !== "all") params.hotel = filtroHotel;
    if (range?.[0] && range?.[1]) {
      params.from = range[0].startOf("day").format(DATE_FMT);
      params.to = range[1].startOf("day").format(DATE_FMT);
    }
    if (q?.trim()) params.q = q.trim();

    try {
      // 1) Intento: endpoint dedicado
      const res = await axios.get(RESERVAS_TRASH_ENDPOINT, { params });
      const raw = res?.data?.data || res?.data || [];
      const arr = Array.isArray(raw) ? raw : [];
      setRows(arr);
      messageApi.success({ content: "Listo.", key });
    } catch (e1) {
      // 2) Fallback: list por query en /api/reservas
      try {
        const res2 = await axios.get(RESERVAS_ENDPOINT, {
          params: { ...params, isDeleted: "true" },
        });
        const raw2 = res2?.data?.data || res2?.data || [];
        const arr2 = Array.isArray(raw2) ? raw2 : [];
        setRows(arr2.filter((x) => !!x?.isDeleted));
        messageApi.success({ content: "Listo.", key });
      } catch (e2) {
        console.error("[trash] no se pudo cargar:", e1, e2);
        setRows([]);
        messageApi.error({ content: "No se pudo cargar la papelera.", key });
      }
    } finally {
      setLoading(false);
    }
  }, [filtroHotel, range, q, messageApi]);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const restoreReserva = useCallback(
    async (id) => {
      const sid = String(id || "");
      if (!sid) return;

      const key = `restore_${sid}`;
      messageApi.loading({ content: "Restaurando…", key, duration: 0 });

      try {
        // 1) ruta “normal”
        try {
          await axios.patch(`${RESERVAS_ENDPOINT}/${sid}/restore`);
        } catch (e1) {
          // 2) alternativa común
          await axios.patch(`${RESERVAS_ENDPOINT}/${sid}/untrash`);
        }

        messageApi.success({ content: "Reserva restaurada.", key });
        setRows((prev) => prev.filter((r) => getEventId(r) !== sid));
        onRestored?.();
      } catch (e) {
        console.error(e);
        messageApi.error({ content: "No se pudo restaurar.", key });
      }
    },
    [messageApi, onRestored]
  );

  const hardDeleteReserva = useCallback(
    async (id) => {
      const sid = String(id || "");
      if (!sid) return;

      const key = `hard_${sid}`;
      messageApi.loading({ content: "Eliminando definitivamente…", key, duration: 0 });

      try {
        //probamos rutas típicas sin romper tu backend:
        try {
          await axios.delete(`${RESERVAS_ENDPOINT}/${sid}/hard`);
        } catch (e1) {
          try {
            await axios.delete(`${RESERVAS_ENDPOINT}/${sid}/destroy`);
          } catch (e2) {
            await axios.delete(`${RESERVAS_ENDPOINT}/${sid}`, {
              params: { hard: "true" },
            });
          }
        }

        messageApi.success({ content: "Eliminada definitivamente.", key });
        setRows((prev) => prev.filter((r) => getEventId(r) !== sid));
      } catch (e) {
        console.error(e);
        messageApi.error({ content: "No se pudo eliminar definitivamente.", key });
      }
    },
    [messageApi]
  );

  const columns = useMemo(
    () => [
      {
        title: "Eliminada",
        dataIndex: "deletedAt",
        key: "deletedAt",
        width: 160,
        render: (v, r) =>
          v
            ? dayjs(v).format("DD/MM/YYYY HH:mm")
            : r?.updatedAt
            ? dayjs(r.updatedAt).format("DD/MM/YYYY HH:mm")
            : "—",
      },
      {
        title: "Sede / Hab",
        key: "room",
        render: (_, r) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 600, color: neutrals.textMain }}>
              {getHotelLabel(r.hotel)} · Hab {r.room}
            </span>
            <span style={{ fontSize: 11, color: neutrals.textMuted }}>
              {recortar(r.label || "—", 60)}
            </span>
          </div>
        ),
      },
      {
        title: "Fechas",
        key: "range",
        width: 190,
        render: (_, r) => (
          <span style={{ color: neutrals.textMuted }}>
            {r?.startDate ? fmtRange(r.startDate, r.endDate) : "—"}
          </span>
        ),
      },
      {
        title: "Total",
        key: "total",
        width: 140,
        render: (_, r) => {
          const b = r?.billing;
          if (!b)
            return <span style={{ color: neutrals.textMuted }}>—</span>;
          const invalid =
            Number(b?.total) <= 0 || Number(b?.pricePerDay) <= 0;
          return (
            <span
              style={{
                fontWeight: 700,
                color: invalid ? neutrals.textMuted : neutrals.textMain,
              }}
            >
              {invalid ? "—" : moneyMXN(b.total)}
            </span>
          );
        },
      },
      {
        title: "Estado",
        key: "estado",
        width: 160,
        render: (_, r) => (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {r?.paidAt ? (
              <Tag color="green" style={{ borderRadius: 999 }}>
                $ Pagada
              </Tag>
            ) : (
              <Tag color="gold" style={{ borderRadius: 999 }}>
                Pendiente
              </Tag>
            )}
            {r?.checkinAt ? (
              <Tag color="green" style={{ borderRadius: 999 }}>
                Check-in
              </Tag>
            ) : (
              <Tag color="blue" style={{ borderRadius: 999 }}>
                Reserva
              </Tag>
            )}
          </div>
        ),
      },
      {
        title: "Acciones",
        key: "actions",
        width: 220,
        render: (_, r) => {
          const id = getEventId(r);
          return (
            <div style={{ display: "flex", gap: 8 }}>
              <Popconfirm
                title="¿Restaurar reserva?"
                description="Volverá a aparecer en el calendario. Si hay conflicto de fechas, el backend debería rechazar con 409."
                okText="Restaurar"
                cancelText="Cancelar"
                onConfirm={() => restoreReserva(id)}
              >
                <Button size="small" icon={<UndoOutlined />}>
                  Restaurar
                </Button>
              </Popconfirm>

              <Popconfirm
                title="¿Eliminar definitivamente?"
                description="Esta acción no se puede deshacer."
                okText="Eliminar"
                cancelText="Cancelar"
                okButtonProps={{ danger: true }}
                onConfirm={() => hardDeleteReserva(id)}
              >
                <Button size="small" danger icon={<RestOutlined />}>
                  Borrar
                </Button>
              </Popconfirm>
            </div>
          );
        },
      },
    ],
    [restoreReserva, hardDeleteReserva]
  );

  return (
    <>
      {contextHolder}

      <div
        style={{
          padding: esMobile ? 8 : 12,
          borderRadius: 14,
          border: "1px solid #e5e7eb",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Tag color="volcano" style={{ borderRadius: 999 }}>
              <InboxOutlined /> Papelera
            </Tag>

            <RangePicker
              value={range}
              onChange={(v) => setRange(v || [])}
              format="DD/MM/YYYY"
              size="small"
              style={{ width: esMobile ? "100%" : 260 }}
            />

            <Input
              size="small"
              placeholder="Buscar (habitación / nombre / nota)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: esMobile ? "100%" : 260 }}
              allowClear
            />
          </div>

          <Button size="small" icon={<ReloadOutlined />} onClick={loadTrash} loading={loading}>
            Recargar
          </Button>
        </div>

        <Table
          rowKey={(r) =>
            String(r?._id || r?.id || `${r?.deletedAt}-${r?.room}-${r?.startDate}`)
          }
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          size="small"
        />
      </div>
    </>
  );
};

/* ===================== VISTA PRINCIPAL ===================== */
const HabitacionesReservaView = ({ isMobile: forzarMobile }) => {
  const [messageApi, contextHolder] = message.useMessage();

  const puntosCorte = useBreakpoint();
  const esMobileDetectado = !puntosCorte.md;
  const esMobileFinal = typeof forzarMobile === "boolean" ? forzarMobile : esMobileDetectado;
  const compacto = esMobileFinal;

  const DEBUG_RESERVAS = String(import.meta.env.VITE_DEBUG_RESERVAS) === "true";

  const axiosDebugInstalledRef = useRef(false);
  useEffect(() => {
    if (!DEBUG_RESERVAS) return;
    if (axiosDebugInstalledRef.current) return;
    axiosDebugInstalledRef.current = true;

    console.log("[AXIOS DEBUG] instalado", {
      baseURL: axios.defaults.baseURL,
      withCredentials: axios.defaults.withCredentials,
    });

    axios.interceptors.request.use((config) => {
      const reqId = Math.random().toString(16).slice(2);
      config.headers = config.headers || {};
      config.headers["x-debug-reqid"] = reqId;
      config.metadata = { reqId, t0: performance.now() };

      console.groupCollapsed(
        `%c[HTTP ->] ${String(config.method).toUpperCase()} ${config.url}`,
        "color:#2563eb;font-weight:600"
      );
      console.log("reqId:", reqId);
      console.log("params:", config.params);
      console.log("data:", config.data);
      console.log("headers:", config.headers);
      console.groupEnd();

      return config;
    });

    axios.interceptors.response.use(
      (res) => {
        const md = res.config.metadata || {};
        const ms = md.t0 ? Math.round(performance.now() - md.t0) : "?";
        console.groupCollapsed(
          `%c[HTTP <-] ${res.status} ${res.config.url} (${ms}ms)`,
          "color:#16a34a;font-weight:600"
        );
        console.log("reqId:", md.reqId);
        console.log("data:", res.data);
        console.groupEnd();
        return res;
      },
      (err) => {
        const cfg = err.config || {};
        const md = cfg.metadata || {};
        const ms = md.t0 ? Math.round(performance.now() - md.t0) : "?";
        console.groupCollapsed(
          `%c[HTTP !!] ${(cfg.method || "??").toUpperCase()} ${cfg.url} (${ms}ms)`,
          "color:#dc2626;font-weight:600"
        );
        console.log("reqId:", md.reqId);
        console.log("status:", err?.response?.status);
        console.log("response:", err?.response?.data);
        console.log("message:", err?.message);
        console.groupEnd();
        return Promise.reject(err);
      }
    );
  }, [DEBUG_RESERVAS]);

  const [eventos, setEventos] = useState([]);
  const [loadingEventos, setLoadingEventos] = useState(true);
  const [filtroHotel, setFiltroHotel] = useState("all");

  const [pending, setPending] = useState({});
  const setPendingAction = (id, action, value) => {
    const sid = String(id);
    setPending((prev) => {
      const cur = prev[sid] || {};
      const next = { ...cur, [action]: !!value };
      //incluye acciones de papelera si luego las usas aquí
      next.any = ["checkin", "checkout", "paid", "unpaid", "delete", "dates", "restore", "hard_delete"].some(
        (k) => !!next[k]
      );
      return { ...prev, [sid]: next };
    });
  };

  //Popover open + lock map (evita Popconfirm pegado)
  const [openPopoverKey, setOpenPopoverKey] = useState(null);
  const popoverLocksRef = useRef(new Map()); // key -> boolean
  const lastOpenAtRef = useRef(0);

  const setPopoverLocked = useCallback((key, locked) => {
    if (!key) return;
    popoverLocksRef.current.set(String(key), !!locked);
  }, []);

  const closeAllPopovers = () => setOpenPopoverKey(null);

  const setPopoverOpenSafe = (key, open) => {
    const k = String(key);

    if (open) {
      lastOpenAtRef.current = Date.now();
      setOpenPopoverKey(k);
      return;
    }

    if (popoverLocksRef.current.get(k)) return;
    if (esMobileFinal && Date.now() - lastOpenAtRef.current < 160) return;

    if (openPopoverKey === k) setOpenPopoverKey(null);
  };

  const [editModal, setEditModal] = useState({
    open: false,
    eventoId: null,
    start: null,
    end: null,
  });

  const loadReservas = useCallback(async () => {
    const msgKey = "load_reservas";
    setLoadingEventos(true);
    messageApi.loading({ content: "Cargando calendario…", key: msgKey, duration: 0 });

    try {
      const params = {};
      if (filtroHotel !== "all") params.hotel = filtroHotel;

      const from = dayjs().startOf("month").subtract(2, "month").format(DATE_FMT);
      const to = dayjs().endOf("month").add(2, "month").format(DATE_FMT);
      params.from = from;
      params.to = to;

      if (DEBUG_RESERVAS) console.log("[UI loadReservas] params:", params);

      const res = await axios.get(RESERVAS_ENDPOINT, { params });
      const raw = res?.data?.data || res?.data || [];
      const arr = Array.isArray(raw) ? raw : [];
      setEventos(arr.filter((e) => !e?.isDeleted));

      messageApi.success({ content: "Listo.", key: msgKey });
    } catch (e) {
      console.error("Error cargando reservas:", e);
      messageApi.error({
        content: "No pudimos cargar el calendario. Intenta recargar.",
        key: msgKey,
      });
      setEventos([]);
    } finally {
      setLoadingEventos(false);
    }
  }, [filtroHotel, messageApi, DEBUG_RESERVAS]);

  useEffect(() => {
    loadReservas();
  }, [loadReservas]);

  const patchEventoLocal = (id, patch) => {
    const sid = String(id);
    setEventos((prev) =>
      prev.map((e) => (getEventId(e) !== sid ? e : { ...e, ...patch }))
    );
  };

  const runAction = async ({
    id,
    action,
    loadingText = "Aplicando cambios…",
    okText = "Listo.",
    failText = "Ups… no se pudo completar. Intenta de nuevo.",
    fn,
    afterSuccess,
    afterFail,
  }) => {
    const sid = String(id);
    const key = `act_${action}_${sid}`;

    if (pending?.[sid]?.any) {
      if (DEBUG_RESERVAS)
        console.warn("[runAction] bloqueado por pending.any", {
          sid,
          action,
          pending: pending?.[sid],
        });
      return;
    }

    setPendingAction(sid, action, true);
    messageApi.loading({ content: loadingText, key, duration: 0 });

    try {
      if (DEBUG_RESERVAS) console.log("[runAction] start:", { sid, action });
      const out = await fn?.();
      if (DEBUG_RESERVAS) console.log("[runAction] success:", { sid, action, out });
      afterSuccess?.(out);
      messageApi.success({ content: okText, key });
      return out;
    } catch (err) {
      const status = err?.response?.status;
      const apiMsg = err?.response?.data?.message || err?.response?.data?.error;

      let human = apiMsg;
      if (!human) {
        if (status === 409) human = "Esa fecha ya está ocupada. Cambia el rango.";
        else human = failText;
      }

      messageApi.error({ content: human, key });
      afterFail?.(err);

      if (DEBUG_RESERVAS)
        console.error("[runAction] fail:", {
          sid,
          action,
          status,
          data: err?.response?.data,
          msg: err?.message,
        });
      throw err;
    } finally {
      setPendingAction(sid, action, false);
      if (DEBUG_RESERVAS) console.log("[runAction] done:", { sid, action });
    }
  };

  const marcarCheckin = async (eventoId) =>
    runAction({
      id: eventoId,
      action: "checkin",
      loadingText: "Marcando entrada…",
      okText: "Entrada registrada.",
      failText: "No pudimos marcar la entrada.",
      fn: async () =>
        (await axios.patch(`${RESERVAS_ENDPOINT}/${eventoId}/checkin`))?.data?.data,
      afterSuccess: (data) => data && patchEventoLocal(eventoId, data),
    });

  const marcarCheckout = async (eventoId) =>
    runAction({
      id: eventoId,
      action: "checkout",
      loadingText: "Marcando salida…",
      okText: "Salida registrada.",
      failText: "No pudimos marcar la salida.",
      fn: async () =>
        (await axios.patch(`${RESERVAS_ENDPOINT}/${eventoId}/checkout`))?.data?.data,
      afterSuccess: (data) => data && patchEventoLocal(eventoId, data),
    });

  const marcarPagado = async (eventoId) =>
    runAction({
      id: eventoId,
      action: "paid",
      loadingText: "Marcando como pagada…",
      okText: "Marcada como pagada.",
      failText: "No pudimos marcarla como pagada.",
      fn: async () =>
        (await axios.patch(`${RESERVAS_ENDPOINT}/${eventoId}/paid`))?.data?.data,
      afterSuccess: (data) => data && patchEventoLocal(eventoId, data),
    });

  const marcarPendientePago = async (eventoId) =>
    runAction({
      id: eventoId,
      action: "unpaid",
      loadingText: "Quitando marca de pago…",
      okText: "Listo: queda como pendiente",
      failText: "No pudimos cambiar el estado de pago.",
      fn: async () =>
        (await axios.patch(`${RESERVAS_ENDPOINT}/${eventoId}/unpaid`))?.data?.data,
      afterSuccess: (data) => data && patchEventoLocal(eventoId, data),
    });

  const eliminarEvento = async (eventoId) => {
    const sid = String(eventoId || "");
    if (!sid) {
      messageApi.error("No encontramos el ID de la reserva (eventoId vacío).");
      console.error("[UI delete] eventoId vacío:", eventoId);
      return;
    }

    await runAction({
      id: sid,
      action: "delete",
      loadingText: "Moviendo a papelera…",
      okText: "Listo: se movió a la papelera",
      failText: "No pudimos moverla a la papelera.",
      fn: async () =>
        (await axios.patch(`${RESERVAS_ENDPOINT}/${sid}/trash`))?.data?.data,
      afterSuccess: () => {
        setEventos((prev) => prev.filter((e) => getEventId(e) !== sid));
        closeAllPopovers();
      },
    });
  };

  const requestEditDates = (evento) => {
    if (!evento || evento.type !== "stay") return;
    if (evento.checkoutAt)
      return messageApi.warning("Esa reserva ya tiene salida. No se puede cambiar.");

    const eid = getEventId(evento);
    setEditModal({
      open: true,
      eventoId: eid,
      start: dayjs(evento.startDate).startOf("day"),
      end: dayjs(evento.endDate || evento.startDate).startOf("day"),
    });
  };

  const applyEditDates = async () => {
    const evento = eventos.find((e) => getEventId(e) === String(editModal.eventoId));
    if (!evento) return messageApi.error("No encontramos esa reserva.");

    const start = editModal.start?.startOf("day");
    const end = editModal.end?.startOf("day");
    if (!start || !end) return messageApi.warning("Elige un rango válido.");
    if (end.isBefore(start, "day"))
      return messageApi.warning("La salida no puede ser antes de la entrada.");
    if (evento.checkoutAt)
      return messageApi.warning("Esa reserva ya tiene salida. No se puede cambiar.");

    if (evento.checkinAt) {
      const originalStart = dayjs(evento.startDate).startOf("day");
      if (!start.isSame(originalStart, "day"))
        return messageApi.warning("Ya tiene entrada, solo puedes cambiar la salida.");
      const checkin = dayjs(evento.checkinAt).startOf("day");
      if (end.isBefore(checkin, "day"))
        return messageApi.warning(
          "La salida no puede ser antes de la entrada registrada."
        );
    }

    const startStr = start.format(DATE_FMT);
    const endStr = end.format(DATE_FMT);

    await runAction({
      id: getEventId(evento),
      action: "dates",
      loadingText: "Actualizando fechas…",
      okText: "Fechas actualizadas.",
      failText: "No pudimos cambiar las fechas.",
      fn: async () =>
        (
          await axios.patch(`${RESERVAS_ENDPOINT}/${getEventId(evento)}/dates`, {
            startDate: startStr,
            endDate: endStr,
          })
        )?.data?.data,
      afterSuccess: (data) => {
        if (data) patchEventoLocal(getEventId(evento), data);
        setEditModal({ open: false, eventoId: null, start: null, end: null });
      },
    });
  };

  const handleCreated = async () => loadReservas();

  const headerWrapStyle = {
    display: "grid",
    gridTemplateColumns: compacto ? "1fr" : "max-content 1fr",
    alignItems: "center",
    columnGap: 12,
    rowGap: 10,
    width: "100%",
    minWidth: 0,
  };

  const headerTitleStyle = {
    fontWeight: 600,
    color: neutrals.textMain,
    fontSize: 15,
    lineHeight: 1.2,
    whiteSpace: compacto ? "normal" : "nowrap",
    minWidth: 0,
  };

  const headerRightStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
    justifyContent: "flex-start",
    minWidth: 0,
  };

  const legendWrapStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    minWidth: 0,
  };

  const tagBase = {
    borderRadius: 999,
    fontSize: 9,
    whiteSpace: "nowrap",
    lineHeight: "18px",
    paddingInline: 10,
    paddingBlock: 2,
  };

  const leyendaTipos = (
    <div style={legendWrapStyle}>
      <Tag color="#38bdf8" style={{ ...tagBase, color: "#0f172a" }}>
        Reserva
      </Tag>
      <Tag color="#22c55e" style={{ ...tagBase, color: "#052e16" }}>
        Check-in
      </Tag>
      <Tag color="#fb7185" style={{ ...tagBase, color: "#4c0519" }}>
        Check-out
      </Tag>
      <Tag color="#10b981" style={{ ...tagBase, color: "#052e16" }}>
        $ Pagada
      </Tag>
    </div>
  );

  const selectorHotel = (
    <Select
      size="small"
      value={filtroHotel}
      onChange={setFiltroHotel}
      style={{ minWidth: 160 }}
      dropdownMatchSelectWidth={false}
    >
      <Option value="all">Todas las sedes</Option>
      <Option value="casa_frida">Casa Frida</Option>
      <Option value="cabanas_fridas">Cabañas Fridas</Option>
    </Select>
  );

  const renderCeldaFecha = (valor) => {
    const fechaStr = valor.format(DATE_FMT);
    const lista = eventos.filter(
      (e) =>
        eventoCubreFecha(e, fechaStr) &&
        (filtroHotel === "all" || e.hotel === filtroHotel)
    );
    if (!lista.length) return null;

    const maxItems = compacto ? 3 : 4;
    const visibles = lista.slice(0, maxItems);
    const extras = lista.slice(maxItems);

    const bodyStyle = {
      background: "#ffffff",
      borderRadius: 14,
      boxShadow: "0 14px 34px rgba(15,23,42,0.16)",
      border: "1px solid #e5e7eb",
      padding: 10,
    };

    return (
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          fontFamily:
            '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        }}
      >
        {visibles.map((item, indice) => {
          const meta = metaEvento(item);
          const shortHotel = getHotelShort(item.hotel);
          const eid = getEventId(item);
          const instanceKey = `evt:${fechaStr}:${eid || "noid"}:${indice}`;

          const etiquetaCorta = `${shortHotel ? `${shortHotel} · ` : ""}Hab ${
            item.room
          } · ${meta.labelCorto}${item.paidAt ? " · $" : ""}`.trim();

          return (
            <Popover
              key={`pop-${instanceKey}`}
              content={
                <TooltipContenidoEvento
                  evento={item}
                  onCheckin={marcarCheckin}
                  onCheckout={marcarCheckout}
                  onPaid={marcarPagado}
                  onUnpaid={marcarPendientePago}
                  onRequestEditDates={requestEditDates}
                  onDelete={eliminarEvento}
                  pending={pending}
                  onClosePopover={closeAllPopovers}
                  isMobileUI={esMobileFinal}
                  popoverKey={instanceKey}
                  onLockPopover={setPopoverLocked}
                />
              }
              color="#ffffff"
              styles={{ body: bodyStyle }}
              trigger={esMobileFinal ? "click" : "hover"}
              open={openPopoverKey === instanceKey}
              onOpenChange={(open) => setPopoverOpenSafe(instanceKey, open)}
            >
              <li
                style={{
                  marginTop: 2,
                  padding: "2px 4px",
                  borderRadius: 7,
                  fontSize: compacto ? 8 : 9,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  cursor: "pointer",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  userSelect: "none",
                  WebkitTapHighlightColor: "transparent",
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
                <span
                  style={{
                    display: "inline-block",
                    maxWidth: "100%",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color: neutrals.textMain,
                    fontWeight: 500,
                  }}
                >
                  {etiquetaCorta}
                </span>
              </li>
            </Popover>
          );
        })}

        {extras.length > 0 && (
          <Popover
            content={tooltipContenidoListaExtra(extras)}
            color="#ffffff"
            styles={{ body: bodyStyle }}
            trigger={esMobileFinal ? "click" : "hover"}
            open={openPopoverKey === `extras:${fechaStr}`}
            onOpenChange={(open) => setPopoverOpenSafe(`extras:${fechaStr}`, open)}
          >
            <li
              style={{
                marginTop: 2,
                padding: "2px 4px",
                borderRadius: 7,
                fontSize: compacto ? 8 : 9,
                background: "#eef2ff",
                color: "#111827",
                cursor: "pointer",
                fontWeight: 500,
                userSelect: "none",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              +{extras.length} más
            </li>
          </Popover>
        )}
      </ul>
    );
  };

  const tabsItems = [
    {
      key: "calendario",
      label: "Calendario",
      children: (
        <>
          <PanelProgramacionManual
            esMobile={esMobileFinal}
            onCreated={handleCreated}
            filtroHotel={filtroHotel}
            messageApi={messageApi}
          />

          <div
            style={{
              overflowX: compacto ? "auto" : "visible",
              paddingBottom: compacto ? 4 : 0,
            }}
          >
            <Spin spinning={loadingEventos} tip="Cargando…" style={{ width: "100%" }}>
              <div
                style={{
                  minWidth: compacto ? 620 : "auto",
                  opacity: loadingEventos ? 0.7 : 1,
                }}
              >
                <Calendar
                  fullscreen={false}
                  defaultValue={dayjs()}
                  dateCellRender={renderCeldaFecha}
                  headerRender={({ value, onChange }) => {
                    const meses = [];
                    for (let i = 0; i < 12; i++)
                      meses.push(value.clone().month(i).format("MMM"));

                    return (
                      <div
                        style={{
                          padding: "4px 8px 12px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <Text
                          style={{
                            fontWeight: 600,
                            color: neutrals.textMain,
                            fontSize: 13,
                          }}
                        >
                          {value.format("MMMM YYYY")}
                        </Text>

                        <Space size={6} wrap>
                          <Select
                            size="small"
                            value={value.month()}
                            onChange={(mes) =>
                              onChange(value.clone().month(mes))
                            }
                            style={{ width: 110 }}
                          >
                            {meses.map((nombreMes, indice) => (
                              <Option key={indice} value={indice}>
                                {nombreMes}
                              </Option>
                            ))}
                          </Select>

                          <Select
                            size="small"
                            value={value.year()}
                            onChange={(anio) =>
                              onChange(value.clone().year(anio))
                            }
                            style={{ width: 90 }}
                          >
                            {[2024, 2025, 2026].map((anio) => (
                              <Option key={anio} value={anio}>
                                {anio}
                              </Option>
                            ))}
                          </Select>

                          <Button
                            size="small"
                            type="text"
                            onClick={closeAllPopovers}
                            style={{ color: neutrals.textMuted }}
                          >
                            Cerrar tooltips
                          </Button>
                        </Space>
                      </div>
                    );
                  }}
                />
              </div>
            </Spin>
          </div>
        </>
      ),
    },
    {
      key: "cambios",
      label: "Cambios de fechas",
      children: (
        <CambiosFechasTab filtroHotel={filtroHotel} esMobile={esMobileFinal} />
      ),
    },

    //NUEVO TAB: PAPELERA
    {
      key: "papelera",
      label: "Papelera",
      children: (
        <PapeleraTab
          filtroHotel={filtroHotel}
          esMobile={esMobileFinal}
          onRestored={loadReservas}
        />
      ),
    },
  ];

  return (
    <>
      {contextHolder}

      <Card
        variant="borderless"
        style={{
          marginTop: 4,
          borderRadius: 16,
          background: "#ffffff",
          boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
          fontFamily:
            '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        }}
        title={
          <div style={headerWrapStyle}>
            <Text style={headerTitleStyle}>Calendario de ocupación centralizado</Text>
            <div style={headerRightStyle}>
              {leyendaTipos}
              {selectorHotel}
              <Button
                size="small"
                type="text"
                icon={<ReloadOutlined />}
                onClick={loadReservas}
                loading={loadingEventos}
                style={{ color: neutrals.textMuted }}
              >
                Recargar
              </Button>
            </div>
          </div>
        }
      >
        <Tabs
          defaultActiveKey="calendario"
          items={tabsItems}
          destroyInactiveTabPane={false}
          style={{ marginTop: -8 }}
          onChange={() => closeAllPopovers()}
        />
      </Card>

      <Modal
        open={editModal.open}
        title="Cambiar fechas de la reserva"
        okText="Guardar"
        cancelText="Cancelar"
        onOk={applyEditDates}
        onCancel={() =>
          setEditModal({ open: false, eventoId: null, start: null, end: null })
        }
        destroyOnClose
      >
        {(() => {
          const ev = eventos.find(
            (x) => getEventId(x) === String(editModal.eventoId)
          );
          const hasCheckin = !!ev?.checkinAt;
          const hasCheckout = !!ev?.checkoutAt;

          return (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              {hasCheckout && (
                <Text style={{ fontSize: 12, color: neutrals.textMuted }}>
                  Esta reserva ya tiene <b>check-out</b>. No se permiten cambios.
                </Text>
              )}

              {hasCheckin && !hasCheckout && (
                <Text style={{ fontSize: 12, color: neutrals.textMuted }}>
                  Ya existe <b>check-in</b>. Solo puedes cambiar la{" "}
                  <b>salida</b>.
                </Text>
              )}

              <RangePicker
                value={[editModal.start, editModal.end]}
                onChange={(val) => {
                  if (!val || val.length !== 2) return;

                  if (hasCheckin && ev?.startDate) {
                    setEditModal((p) => ({
                      ...p,
                      start: dayjs(ev.startDate).startOf("day"),
                      end: val[1]?.startOf("day") || p.end,
                    }));
                    return;
                  }

                  setEditModal((p) => ({
                    ...p,
                    start: val[0]?.startOf("day") || p.start,
                    end: val[1]?.startOf("day") || p.end,
                  }));
                }}
                format="DD/MM/YYYY"
                style={{ width: "100%" }}
                disabled={hasCheckout}
              />

              {ev && (
                <Text style={{ fontSize: 11, color: neutrals.textMuted }}>
                  Hab <b>#{ev.room}</b> · {getHotelLabel(ev.hotel)} · Actual:{" "}
                  <b>{fmtRange(ev.startDate, ev.endDate)}</b>
                </Text>
              )}
            </div>
          );
        })()}
      </Modal>
    </>
  );
};

export default HabitacionesReservaView;
