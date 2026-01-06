// src/components/reservas/reservasHelpers.js
import dayjs from "dayjs";

export const DATE_FMT = "YYYY-MM-DD";

/* ===================== IDS / STRINGS ===================== */
export const getHabId = (h) => h?._id || h?.id;
export const getEventId = (e) => String(e?.id || e?._id || "");
export const safeLower = (s) => String(s || "").toLowerCase();

/* ===================== DINERO ===================== */
export const moneyMXN = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(num);
};

/* ===================== SEDES ESCALABLES ===================== */
export const humanizeHotelCode = (code) => {
  const s = String(code || "")
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
  if (!s) return "Sede no especificada";
  return s
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
};

export const getHotelLabel = (hotel) => humanizeHotelCode(hotel);

export const getHotelShort = (hotel) => {
  const label = humanizeHotelCode(hotel);
  const words = label.split(" ").filter(Boolean);
  if (!words.length) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

/* ===================== STATUS / ROOM HELPERS ===================== */
export const getRoomStatusLabel = (inventoryStatus) => {
  if (inventoryStatus === "Mantenimiento") return "En mantenimiento";
  if (inventoryStatus === "Bloqueada") return "Bloqueada";
  if (inventoryStatus === "Fuera de servicio") return "Fuera de servicio";
  return "";
};

export const isRoomUnavailable = (hab) => {
  const s = hab?.inventoryStatus;
  return (
    s === "Bloqueada" || s === "Mantenimiento" || s === "Fuera de servicio"
  );
};

/* ===================== ORIGEN RESERVA ===================== */
export const ORIGEN_LABELS = {
  manual: "Panel interno (recepción / staff)",
  directo: "Recepción / venta directa",
  whatsapp: "WhatsApp",
  booking: "Booking.com",
  expedia: "Expedia",
  facebook: "Facebook / Instagram",
};

export const getOrigenLabel = (o) => ORIGEN_LABELS[o] || null;

/* ===================== HELPERS FECHAS / TEXTO ===================== */
export const recortar = (texto, max = 90) => {
  if (!texto) return "";
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
};

export const buildFechasTexto = (evento) => {
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

export const eventoCubreFecha = (evento, fechaStr) => {
  const inicio = evento.startDate;
  const fin = evento.endDate;
  if (!inicio) return false;
  if (fin) return fechaStr >= inicio && fechaStr <= fin;
  return fechaStr === inicio;
};

export const fmtRange = (startStr, endStr) => {
  const s = dayjs(startStr).format("DD/MM/YYYY");
  const e = dayjs(endStr || startStr).format("DD/MM/YYYY");
  return `${s} al ${e}`;
};

/* ===================== META TIPOS / EVENTO ===================== */
export const metaTipo = (type) => {
  switch (type) {
    case "checkin":
      return { color: "#22c55e", labelCorto: "Ent.", labelLargo: "Entrada" };
    case "checkout":
      return { color: "#fb7185", labelCorto: "Sal.", labelLargo: "Salida" };
    case "stay":
      return { color: "#38bdf8", labelCorto: "Res.", labelLargo: "Reserva" };
    default:
      return {
        color: "#14b8a6",
        labelCorto: "",
        labelLargo: "Movimiento",
      };
  }
};

export const metaEvento = (evento) => {
  if (evento?.type === "stay") {
    if (evento.checkoutAt) return metaTipo("checkout");
    if (evento.checkinAt) return metaTipo("checkin");
    return metaTipo("stay");
  }
  return metaTipo(evento?.type);
};
