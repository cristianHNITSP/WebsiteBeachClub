// backend/reservas-service/src/ws/reservas.socket.js
const Reserva = require("../models/Reserva");
const Habitacion = require("../models/Habitacion");
const ReservaDateChangeLog = require("../models/ReservaDateChangeLog");

/* ====== helpers (copiados/compat) ====== */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDateStr = (s) => typeof s === "string" && DATE_RE.test(s);

// UTC midnight parse
function parseDateUTC(yyyyMMdd) {
  return new Date(`${yyyyMMdd}T00:00:00.000Z`);
}
function daysInclusive(startDate, endDate) {
  const s = parseDateUTC(startDate);
  const e = parseDateUTC(endDate || startDate);
  const ms = e.getTime() - s.getTime();
  const d = Math.floor(ms / 86400000) + 1;
  return Math.max(1, d);
}
function round2(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
function computeBilling({ price, offer, startDate, endDate }) {
  const days = daysInclusive(startDate, endDate || startDate);

  const dp = offer?.discountPercent;
  const disc = Number.isFinite(Number(dp)) ? Number(dp) : null;
  const hasDiscount = disc !== null && disc > 0;

  const totalBeforeDiscount = round2(price * days);
  const total = hasDiscount ? round2(totalBeforeDiscount * (1 - disc / 100)) : totalBeforeDiscount;

  return {
    days,
    pricePerDay: round2(price),
    discountPercent: hasDiscount ? disc : null,
    totalBeforeDiscount,
    total,
  };
}

function toEventDto(r, habMeta = null) {
  const habitacionId = r?.habitacionId ? String(r.habitacionId) : null;

  const price =
    typeof habMeta?.price === "number" && Number.isFinite(habMeta.price)
      ? habMeta.price
      : null;

  const offer = habMeta?.offer || null;
  const billing = price !== null ? computeBilling({ price, offer, startDate: r.startDate, endDate: r.endDate }) : null;

  return {
    id: String(r._id),
    habitacionId,

    hotel: r.hotel,
    room: r.room,
    type: r.type,
    startDate: r.startDate,
    endDate: r.endDate,
    label: r.label,
    origen: r.origen,
    notes: r.notes,

    checkinAt: r.checkinAt || null,
    checkoutAt: r.checkoutAt || null,
    paidAt: r.paidAt || null,

    roomMeta: habMeta ? { price: habMeta.price, offer: habMeta.offer || null } : null,
    billing,

    isDeleted: !!r.isDeleted,
    deletedAt: r.deletedAt || null,
  };
}

/* ====== binder ====== */
function bindReservasSocket(io) {
  io.on("connection", (socket) => {
    socket.on("reservas:query", async (payload = {}) => {
      try {
        // payload: { hotel, from, to, includeDeleted? }
        const hotel = payload?.hotel || null;
        const from = payload?.from || null;
        const to = payload?.to || null;
        const includeDeleted = payload?.includeDeleted === true;

        const q = { type: "stay" };
        q.isDeleted = includeDeleted ? { $in: [true, false] } : false;
        if (hotel) q.hotel = hotel;

        if (isDateStr(from) && isDateStr(to)) {
          q.startDate = { $lte: to };
          q.endDate = { $gte: from };
        } else if (isDateStr(from)) {
          q.endDate = { $gte: from };
        } else if (isDateStr(to)) {
          q.startDate = { $lte: to };
        }

        const reservas = await Reserva.find(q).sort({ startDate: 1 }).lean();

        const habIds = [...new Set(reservas.map((r) => String(r.habitacionId || "")).filter(Boolean))];
        const habs = habIds.length
          ? await Habitacion.find({ _id: { $in: habIds } }).select("_id price offer").lean()
          : [];
        const habMap = new Map(habs.map((h) => [String(h._id), h]));

        socket.emit("reservas:result", {
          items: reservas.map((r) => toEventDto(r, habMap.get(String(r.habitacionId)))),
          meta: { count: reservas.length, hotel: hotel || null, range: isDateStr(from) || isDateStr(to) ? { from, to } : null, includeDeleted },
        });
      } catch (err) {
        console.error("[WS reservas:query] Error:", err);
        socket.emit("reservas:error", {
          message: "No se pudieron cargar reservas en tiempo real.",
          details: err?.message || String(err),
        });
      }
    });

    socket.on("reservas:trash:query", async (payload = {}) => {
      try {
        const hotel = payload?.hotel || null;
        const from = payload?.from || null;
        const to = payload?.to || null;

        const q = { isDeleted: true, type: "stay" };
        if (hotel) q.hotel = hotel;

        if (isDateStr(from) && isDateStr(to)) {
          q.startDate = { $lte: to };
          q.endDate = { $gte: from };
        } else if (isDateStr(from)) {
          q.endDate = { $gte: from };
        } else if (isDateStr(to)) {
          q.startDate = { $lte: to };
        }

        const reservas = await Reserva.find(q).sort({ deletedAt: -1 }).lean();

        const habIds = [...new Set(reservas.map((r) => String(r.habitacionId || "")).filter(Boolean))];
        const habs = habIds.length
          ? await Habitacion.find({ _id: { $in: habIds } }).select("_id price offer").lean()
          : [];
        const habMap = new Map(habs.map((h) => [String(h._id), h]));

        socket.emit("reservas:trash:result", {
          items: reservas.map((r) => toEventDto(r, habMap.get(String(r.habitacionId)))),
          meta: { count: reservas.length, hotel: hotel || null, range: isDateStr(from) || isDateStr(to) ? { from, to } : null },
        });
      } catch (err) {
        console.error("[WS reservas:trash:query] Error:", err);
        socket.emit("reservas:trash:error", {
          message: "No se pudieron cargar reservas de papelera en tiempo real.",
          details: err?.message || String(err),
        });
      }
    });

    socket.on("reservas:date-changes:query", async (payload = {}) => {
      try {
        const hotel = payload?.hotel || null;
        const from = payload?.from || null;
        const to = payload?.to || null;
        const limit = Math.min(Math.max(parseInt(payload?.limit, 10) || 250, 1), 500);

        const q = {};
        if (hotel) q.hotel = hotel;

        if (isDateStr(from) || isDateStr(to)) {
          const gte = isDateStr(from) ? new Date(`${from}T00:00:00.000Z`) : new Date("1970-01-01T00:00:00.000Z");
          const lte = isDateStr(to) ? new Date(`${to}T23:59:59.999Z`) : new Date("2999-12-31T23:59:59.999Z");
          q.createdAt = { $gte: gte, $lte: lte };
        }

        const logs = await ReservaDateChangeLog.find(q).sort({ createdAt: -1 }).limit(limit).lean();

        socket.emit("reservas:date-changes:result", {
          items: logs,
          meta: { count: logs.length, hotel: hotel || null, range: isDateStr(from) || isDateStr(to) ? { from, to } : null, limit },
        });
      } catch (err) {
        console.error("[WS reservas:date-changes:query] Error:", err);
        socket.emit("reservas:date-changes:error", {
          message: "No se pudieron cargar logs de cambios de fechas.",
          details: err?.message || String(err),
        });
      }
    });
  });
}

module.exports = { bindReservasSocket };
