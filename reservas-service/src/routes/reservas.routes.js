const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Reserva = require("../models/Reserva");
const Habitacion = require("../models/Habitacion");
const ReservaDateChangeLog = require("../models/ReservaDateChangeLog");

const authMiddleware = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/require.Permissions");

/* ===================== DEBUG LOGS ===================== */
const DEBUG_RESERVAS = String(process.env.DEBUG_RESERVAS) === "true";
const rlog = (...args) => DEBUG_RESERVAS && console.log("[RESERVAS]", ...args);
const rerr = (...args) => console.error("[RESERVAS]", ...args);

// Traza de requests (solo si DEBUG_RESERVAS=true)
router.use((req, res, next) => {
  if (!DEBUG_RESERVAS) return next();
  const t0 = Date.now();
  rlog(`${req.method} ${req.originalUrl}`, {
    query: req.query,
    params: req.params,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    user: req.user?.id || req.user?._id || req.user?.email,
  });
  res.on("finish", () => {
    rlog(
      `-> ${res.statusCode} (${Date.now() - t0}ms) ${req.method} ${
        req.originalUrl
      }`
    );
  });
  next();
});

/* ===================== HELPERS ===================== */
function isOid(id) {
  return mongoose.Types.ObjectId.isValid(String(id));
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isDateStr(s) {
  return typeof s === "string" && DATE_RE.test(s);
}

// Fecha de hoy en America/Merida (para que checkin/checkout “hoy” coincida con tu operación real)
function todayMeridaStr() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Merida",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // YYYY-MM-DD
}

function normalizeRange(startDate, endDate) {
  const s = startDate;
  const e = endDate || startDate;
  return { s, e };
}

// Overlap inclusive: aStart <= bEnd && bStart <= aEnd
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const { s: as, e: ae } = normalizeRange(aStart, aEnd);
  const { s: bs, e: be } = normalizeRange(bStart, bEnd);
  return as <= be && bs <= ae;
}

async function findConflict({ hotel, room, startDate, endDate, excludeId }) {
  const q = { hotel, room, isDeleted: false, type: "stay" };
  if (excludeId) q._id = { $ne: excludeId };

  const candidates = await Reserva.find(q).select("startDate endDate").lean();
  return (
    candidates.find((r) =>
      rangesOverlap(startDate, endDate, r.startDate, r.endDate)
    ) || null
  );
}

function isRoomUnavailable(hab) {
  const s = hab?.inventoryStatus;
  return (
    s === "Bloqueada" ||
    s === "Mantenimiento" ||
    s === "Fuera de servicio"
  );
}

/* ===================== BILLING (desde Habitacion) ===================== */
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
  const total = hasDiscount
    ? round2(totalBeforeDiscount * (1 - disc / 100))
    : totalBeforeDiscount;

  return {
    days,
    pricePerDay: round2(price),
    discountPercent: hasDiscount ? disc : null,
    totalBeforeDiscount,
    total,
  };
}

/**
 * Mapea Reserva -> DTO para el frontend
 * Incluye:
 *  - roomMeta: { price, offer }
 *  - billing: cálculo dinámico desde Habitacion (por si cambias precio/oferta)
 *  - totalAmount: snapshot guardado en la reserva (si existe), o billing.total como fallback
 *  - guest + paymentMethod
 */
function toEventDto(r, habMeta = null) {
  const habitacionId = r?.habitacionId ? String(r.habitacionId) : null;

  const price =
    typeof habMeta?.price === "number" && Number.isFinite(habMeta.price)
      ? habMeta.price
      : null;
  const offer = habMeta?.offer || null;

  const billing =
    price !== null
      ? computeBilling({
          price,
          offer,
          startDate: r.startDate,
          endDate: r.endDate,
        })
      : null;

  const storedTotal =
    typeof r.totalAmount === "number" && Number.isFinite(r.totalAmount)
      ? round2(r.totalAmount)
      : null;

  const totalAmount =
    storedTotal !== null
      ? storedTotal
      : billing
      ? round2(billing.total)
      : null;

  const guest = r.guest || {};

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

    guest: {
      fullName: guest.fullName || "",
      email: guest.email || "",
      phone: guest.phone || "",
      guests:
        typeof guest.guests === "number" && guest.guests > 0
          ? guest.guests
          : 1,
    },
    paymentMethod: r.paymentMethod || "",

    roomMeta: habMeta
      ? { price: habMeta.price, offer: habMeta.offer || null }
      : null,
    billing,
    totalAmount,

    isDeleted: !!r.isDeleted,
    deletedAt: r.deletedAt || null,
  };
}

// Respuesta uniforme
function fail(res, status, error, message, extra = {}) {
  return res.status(status).json({ error, message, ...extra });
}

/* ===================== CHANGE LOG (fechas eliminadas) ===================== */
function listDatesInclusive(startDate, endDate) {
  const s = parseDateUTC(startDate);
  const e = parseDateUTC(endDate || startDate);
  const out = [];
  for (
    let d = new Date(s);
    d.getTime() <= e.getTime();
    d = new Date(d.getTime() + 86400000)
  ) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function calcRemovedDates(oldStart, oldEnd, newStart, newEnd) {
  const oldList = listDatesInclusive(oldStart, oldEnd);
  const newSet = new Set(listDatesInclusive(newStart, newEnd));
  return oldList.filter((x) => !newSet.has(x));
}

async function logDateChange({
  req,
  reserva,
  action,
  oldStartDate,
  oldEndDate,
  newStartDate,
  newEndDate,
  removedDates,
}) {
  await ReservaDateChangeLog.create({
    reservaId: reserva._id,
    codigoReserva: reserva.codigoReserva || "",
    hotel: reserva.hotel,
    room: String(reserva.room),

    action,
    oldStartDate,
    oldEndDate,
    newStartDate,
    newEndDate,
    removedDates: removedDates || [],

    actor: {
      id: String(req.user?.id || req.user?._id || ""),
      email: String(req.user?.email || ""),
    },
  });
}

/* ===================== ROUTES ===================== */

/**
 * GET /api/reservas/habitaciones
 */
router.get(
  "/habitaciones",
  authMiddleware,
  requirePermissions(["view_reservations"]),
  async (req, res) => {
    try {
      const { hotel, q, startDate, endDate, onlyAvailable } = req.query;
      const onlyAvail = String(onlyAvailable) === "true";

      const hq = { isDeleted: false };
      if (hotel && hotel !== "todas") hq.hotelCode = hotel;

      if (q && String(q).trim()) {
        const s = String(q)
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        hq.$or = [
          { roomNumber: { $regex: s, $options: "i" } },
          { codigo: { $regex: s, $options: "i" } },
          { title: { $regex: s, $options: "i" } },
        ];
      }

      const rooms = await Habitacion.find(hq)
        .select(
          "_id codigo hotelCode roomNumber title inventoryStatus price offer"
        )
        .sort({ hotelCode: 1, roomNumber: 1 })
        .lean();

      const isReservableByStatus = (hab) => !isRoomUnavailable(hab);

      const hasRange = isDateStr(startDate) && isDateStr(endDate);
      let reservedSet = new Set();

      if (hasRange) {
        const rq = { isDeleted: false, type: "stay" };
        if (hotel && hotel !== "todas") rq.hotel = hotel;
        rq.startDate = { $lte: endDate };
        rq.endDate = { $gte: startDate };

        const reservas = await Reserva.find(rq)
          .select("hotel room startDate endDate")
          .lean();

        for (const r of reservas) {
          if (rangesOverlap(startDate, endDate, r.startDate, r.endDate)) {
            reservedSet.add(`${r.hotel}__${String(r.room)}`);
          }
        }

        rlog("habitaciones: overlap scan", {
          hotel: hotel || "all",
          startDate,
          endDate,
          reservasEncontradas: reservas.length,
          reservedSetSize: reservedSet.size,
        });
      }

      const result = rooms
        .map((hab) => {
          const roomKey = `${hab.hotelCode}__${String(
            hab.roomNumber || hab.codigo
          )}`;
          const blockedByBooking = hasRange ? reservedSet.has(roomKey) : false;

          return {
            _id: hab._id,
            codigo: hab.codigo,
            hotelCode: hab.hotelCode,
            roomNumber: hab.roomNumber,
            title: hab.title,
            inventoryStatus: hab.inventoryStatus,
            price: hab.price,
            offer: hab.offer || null,

            reservableByStatus: isReservableByStatus(hab),
            blockedByBooking,
            available: isReservableByStatus(hab) && !blockedByBooking,
          };
        })
        .filter((x) => (onlyAvail ? x.available : true));

      res.json({ data: result });
    } catch (err) {
      rerr("[GET /reservas/habitaciones] Error:", err);
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);

/**
 * GET /api/reservas  (activos)
 * billing siempre desde Habitacion
 */
router.get(
  "/",
  authMiddleware,
  requirePermissions(["view_reservations"]),
  async (req, res) => {
    try {
      const { hotel, from, to } = req.query;

      const q = { isDeleted: false, type: "stay" };
      if (hotel && hotel !== "todas") q.hotel = hotel;

      if (isDateStr(from) && isDateStr(to)) {
        q.startDate = { $lte: to };
        q.endDate = { $gte: from };
      } else if (isDateStr(from)) {
        q.endDate = { $gte: from };
      } else if (isDateStr(to)) {
        q.startDate = { $lte: to };
      }

      const reservas = await Reserva.find(q).sort({ startDate: 1 }).lean();

      const habIds = [
        ...new Set(
          reservas
            .map((r) => String(r.habitacionId || ""))
            .filter(Boolean)
        ),
      ];
      const habs = habIds.length
        ? await Habitacion.find({ _id: { $in: habIds } })
            .select("_id price offer")
            .lean()
        : [];
      const habMap = new Map(habs.map((h) => [String(h._id), h]));

      rlog("GET /reservas ok", { count: reservas.length, hotel: hotel || "all" });
      res.json({
        data: reservas.map((r) =>
          toEventDto(r, habMap.get(String(r.habitacionId)))
        ),
      });
    } catch (err) {
      rerr("[GET /reservas] Error:", err);
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);

/**
 * GET /api/reservas/trash (papelera)
 * billing siempre desde Habitacion
 */
router.get(
  "/trash",
  authMiddleware,
  requirePermissions(["view_reservations"]),
  async (req, res) => {
    try {
      const { hotel, from, to } = req.query;

      const q = { isDeleted: true, type: "stay" };
      if (hotel && hotel !== "todas") q.hotel = hotel;

      if (isDateStr(from) && isDateStr(to)) {
        q.startDate = { $lte: to };
        q.endDate = { $gte: from };
      } else if (isDateStr(from)) {
        q.endDate = { $gte: from };
      } else if (isDateStr(to)) {
        q.startDate = { $lte: to };
      }

      const reservas = await Reserva.find(q).sort({ deletedAt: -1 }).lean();

      const habIds = [
        ...new Set(
          reservas
            .map((r) => String(r.habitacionId || ""))
            .filter(Boolean)
        ),
      ];
      const habs = habIds.length
        ? await Habitacion.find({ _id: { $in: habIds } })
            .select("_id price offer")
            .lean()
        : [];
      const habMap = new Map(habs.map((h) => [String(h._id), h]));

      rlog("GET /reservas/trash ok", {
        count: reservas.length,
        hotel: hotel || "all",
      });
      res.json({
        data: reservas.map((r) =>
          toEventDto(r, habMap.get(String(r.habitacionId)))
        ),
      });
    } catch (err) {
      rerr("[GET /reservas/trash] Error:", err);
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);

/**
 * GET /api/reservas/date-changes
 * ver fechas eliminadas / cambios
 */
router.get(
  "/date-changes",
  authMiddleware,
  requirePermissions(["view_reservations"]),
  async (req, res) => {
    try {
      const { hotel, from, to } = req.query;

      const q = {};
      if (hotel && hotel !== "todas") q.hotel = hotel;

      if (isDateStr(from) || isDateStr(to)) {
        const gte = isDateStr(from)
          ? new Date(`${from}T00:00:00.000Z`)
          : new Date("1970-01-01T00:00:00.000Z");
        const lte = isDateStr(to)
          ? new Date(`${to}T23:59:59.999Z`)
          : new Date("2999-12-31T23:59:59.999Z");
        q.createdAt = { $gte: gte, $lte: lte };
      }

      const logs = await ReservaDateChangeLog.find(q)
        .sort({ createdAt: -1 })
        .limit(400)
        .lean();
      res.json({ data: logs });
    } catch (err) {
      rerr("[GET /reservas/date-changes] Error:", err);
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);

/**
 * GET /api/reservas/stats/mensuales
 * (sigue calculando stats globales, sin filtro por hotel)
 */
router.get(
  "/stats/mensuales",
  authMiddleware,
  requirePermissions(["view_reservations"]),
  async (req, res) => {
    try {
      const monthsRaw = parseInt(req.query.months, 10);
      const months = Math.min(Math.max(monthsRaw || 6, 1), 24);

      // Inicio de mes actual
      const now = new Date();
      const startOfCurrentMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

      const monthConfigs = [];
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(
          startOfCurrentMonth.getFullYear(),
          startOfCurrentMonth.getMonth() - i,
          1
        );
        const year = d.getFullYear();
        const monthIndex = d.getMonth(); // 0-11

        const month = String(monthIndex + 1).padStart(2, "0");
        const startStr = `${year}-${month}-01`;

        const nextMonth = new Date(year, monthIndex + 1, 1);
        const endDt = new Date(nextMonth.getTime() - 1);
        const endStr = `${endDt.getFullYear()}-${String(
          endDt.getMonth() + 1
        ).padStart(2, "0")}-${String(endDt.getDate()).padStart(2, "0")}`;

        const daysInMonth = endDt.getDate();

        const label = new Intl.DateTimeFormat("es-MX", {
          month: "short",
          year: "numeric",
        }).format(d);

        const key = `${year}-${month}`;

        monthConfigs.push({
          key,
          year,
          monthIndex,
          startStr,
          endStr,
          daysInMonth,
          label,
        });
      }

      if (!monthConfigs.length) {
        return res.json({
          data: {
            months: [],
            channels: { totalReservations: 0, byChannel: [] },
          },
        });
      }

      const globalStart = monthConfigs[0].startStr;
      const globalEnd = monthConfigs[monthConfigs.length - 1].endStr;

      const [reservas, totalRooms] = await Promise.all([
        Reserva.find({
          isDeleted: false,
          type: "stay",
          startDate: { $lte: globalEnd },
          endDate: { $gte: globalStart },
        })
          .select(
            "startDate endDate totalAmount origen habitacionId hotel room createdAt"
          )
          .lean(),
        Habitacion.countDocuments({ isDeleted: { $ne: true } }),
      ]);

      // Para reservas sin totalAmount usamos price/offer de la habitación
      const habIds = [
        ...new Set(
          reservas
            .map((r) => String(r.habitacionId || ""))
            .filter((x) => x && x !== "undefined")
        ),
      ];

      let habMap = new Map();
      if (habIds.length) {
        const habs = await Habitacion.find({ _id: { $in: habIds } })
          .select("_id price offer roomType tipoHabitacion title codigo")
          .lean();
        habMap = new Map(habs.map((h) => [String(h._id), h]));
      }

      // Base por mes
      const baseMonths = {};
      for (const mc of monthConfigs) {
        baseMonths[mc.key] = {
          key: mc.key,
          label: mc.label,
          year: mc.year,
          month: mc.monthIndex + 1,
          startDate: mc.startStr,
          endDate: mc.endStr,
          roomsRented: 0,
          revenue: 0,
          nightsBooked: 0,
          totalRoomNights: totalRooms * mc.daysInMonth,
          occupancyPct: 0,
          // para métricas derivadas
          weekdayNights: {
            mon: 0,
            tue: 0,
            wed: 0,
            thu: 0,
            fri: 0,
            sat: 0,
            sun: 0,
          },
          roomTypes: {}, // roomType -> { rooms, nights }
          stayNightsSum: 0,
          stayCount: 0,
          leadTimeSum: 0,
          leadTimeCount: 0,
        };
      }

      const channelCounts = new Map();
      const channelRevenue = new Map();

      const clampDateStr = (str, minStr, maxStr) => {
        if (str < minStr) return minStr;
        if (str > maxStr) return maxStr;
        return str;
      };

      const normalizeChannel = (origen) => {
        const raw = String(origen || "directo").toLowerCase();
        if (raw.includes("booking")) return "Booking";
        if (raw.includes("expedia")) return "Expedia";
        if (raw.includes("whatsapp") || raw.includes("wa")) return "WhatsApp";
        if (raw.includes("facebook") || raw.includes("fb")) return "Facebook";
        if (
          raw.includes("direct") ||
          raw.includes("web") ||
          raw.includes("manual")
        )
          return "Directo";
        return "Otros";
      };

      const weekdayKeyFromDate = (d) => {
        // getUTCDay: 0=Dom, 1=Lun, ... 6=Sab
        const dow = d.getUTCDay();
        switch (dow) {
          case 1:
            return "mon";
          case 2:
            return "tue";
          case 3:
            return "wed";
          case 4:
            return "thu";
          case 5:
            return "fri";
          case 6:
            return "sat";
          case 0:
          default:
            return "sun";
        }
      };

      for (const r of reservas) {
        const start = r.startDate;
        const end = r.endDate || r.startDate;

        const habMeta = habMap.get(String(r.habitacionId || ""));
        const roomTypeName = habMeta
          ? habMeta.roomType ||
            habMeta.tipoHabitacion ||
            habMeta.title ||
            habMeta.codigo ||
            "General"
          : "General";

        let totalAmount =
          typeof r.totalAmount === "number" && Number.isFinite(r.totalAmount)
            ? round2(r.totalAmount)
            : null;

        if (
          totalAmount === null &&
          habMeta &&
          typeof habMeta.price === "number"
        ) {
          const billing = computeBilling({
            price: habMeta.price,
            offer: habMeta.offer || null,
            startDate: start,
            endDate: end,
          });
          totalAmount = billing.total;
        }

        const chan = normalizeChannel(r.origen);
        channelCounts.set(chan, (channelCounts.get(chan) || 0) + 1);
        if (totalAmount !== null) {
          channelRevenue.set(
            chan,
            round2((channelRevenue.get(chan) || 0) + totalAmount)
          );
        }

        // Para estancia y lead time (se usan cuando la reserva inicia en un mes)
        const stayNightsTotal = daysInclusive(start, end);
        let leadDays = null;
        if (r.createdAt) {
          const createdDt =
            r.createdAt instanceof Date
              ? r.createdAt
              : new Date(r.createdAt);
          const startDt = parseDateUTC(start);
          const diffMs = startDt.getTime() - createdDt.getTime();
          const diffDays = Math.floor(diffMs / 86400000);
          leadDays = diffDays >= 0 ? diffDays : 0;
        }

        // Recorremos meses para ver en cuáles se solapa la reserva
        for (const mc of monthConfigs) {
          if (!rangesOverlap(start, end, mc.startStr, mc.endStr)) continue;

          const m = baseMonths[mc.key];

          const effectiveStart = clampDateStr(start, mc.startStr, mc.endStr);
          const effectiveEnd = clampDateStr(end, mc.startStr, mc.endStr);

          // Contabilizar noches + día de la semana + noches por tipo de habitación
          let d = parseDateUTC(effectiveStart);
          const endDt = parseDateUTC(effectiveEnd);

          while (d.getTime() <= endDt.getTime()) {
            m.nightsBooked += 1;

            const wdKey = weekdayKeyFromDate(d);
            if (m.weekdayNights[wdKey] !== undefined) {
              m.weekdayNights[wdKey] += 1;
            }

            // noches por tipo
            if (!m.roomTypes[roomTypeName]) {
              m.roomTypes[roomTypeName] = { rooms: 0, nights: 0 };
            }
            m.roomTypes[roomTypeName].nights += 1;

            d = new Date(d.getTime() + 86400000);
          }

          // Contamos la reserva como "rentada" en el mes en el que inicia
          if (start >= mc.startStr && start <= mc.endStr) {
            m.roomsRented += 1;
            if (totalAmount !== null) {
              m.revenue = round2(m.revenue + totalAmount);
            }

            // estancia promedio (noches)
            if (stayNightsTotal > 0) {
              m.stayNightsSum += stayNightsTotal;
              m.stayCount += 1;
            }

            // lead time promedio
            if (leadDays !== null) {
              m.leadTimeSum += leadDays;
              m.leadTimeCount += 1;
            }

            // rooms por tipo (solo cuenta 1 vez por reserva)
            if (!m.roomTypes[roomTypeName]) {
              m.roomTypes[roomTypeName] = { rooms: 0, nights: 0 };
            }
            m.roomTypes[roomTypeName].rooms += 1;
          }
        }
      }

      const monthsOut = Object.values(baseMonths).map((m) => {
        const occ =
          m.totalRoomNights > 0
            ? Math.round((m.nightsBooked / m.totalRoomNights) * 100)
            : 0;

        // % de noches por día de la semana
        const weekdayBreakdown = {};
        const totalNights = m.nightsBooked || 0;
        for (const k of Object.keys(m.weekdayNights)) {
          const nightsForDay = m.weekdayNights[k] || 0;
          weekdayBreakdown[k] =
            totalNights > 0
              ? Math.round((nightsForDay * 100) / totalNights)
              : 0;
        }

        // Breakdown por tipo de habitación
        const roomTypeBreakdown = Object.entries(m.roomTypes).map(
          ([roomType, info]) => ({
            roomType,
            roomsRented: info.rooms || 0,
            occupancyPct:
              totalNights > 0
                ? Math.round((info.nights * 100) / totalNights)
                : 0,
          })
        );

        roomTypeBreakdown.sort((a, b) => b.roomsRented - a.roomsRented);

        const avgStayNights =
          m.stayCount > 0 ? round2(m.stayNightsSum / m.stayCount) : 0;
        const avgLeadTimeDays =
          m.leadTimeCount > 0 ? round2(m.leadTimeSum / m.leadTimeCount) : 0;

        return {
          key: m.key,
          label: m.label,
          year: m.year,
          month: m.month,
          startDate: m.startDate,
          endDate: m.endDate,
          roomsRented: m.roomsRented,
          revenue: round2(m.revenue),
          nightsBooked: m.nightsBooked,
          nights: m.nightsBooked, // alias para el frontend
          totalRoomNights: m.totalRoomNights,
          availableRoomNights: m.totalRoomNights, // alias para el frontend
          occupancyPct: occ,
          avgStayNights,
          avgLeadTimeDays,
          weekdayBreakdown,
          roomTypeBreakdown,
        };
      });

      monthsOut.sort((a, b) =>
        a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0
      );

      const channelsOut = {
        totalReservations: reservas.length,
        byChannel: Array.from(channelCounts.entries()).map(
          ([channel, count]) => ({
            channel,
            count,
            revenue: round2(channelRevenue.get(channel) || 0),
          })
        ),
      };

      return res.json({
        data: {
          months: monthsOut,
          channels: channelsOut,
        },
      });
    } catch (err) {
      rerr("[GET /reservas/stats/mensuales] Error:", err);
      return res
        .status(500)
        .json({ error: "INTERNAL_ERROR", message: err.message });
    }
  }
);

/**
 * POST /api/reservas
 * soporta "paid: true" para crear marcada como pagada
 * billing viene de Habitacion (no snapshot)
 * totalAmount se guarda en la reserva como snapshot
 * guest + paymentMethod vienen del body
 */
router.post(
  "/",
  authMiddleware,
  requirePermissions(["manage_reservations"]),
  async (req, res) => {
    try {
      const {
        habitacionId,
        startDate,
        endDate,
        label,
        notes,
        origen,
        paid,
        guest,
        paymentMethod,
      } = req.body;

      if (!habitacionId || !isDateStr(startDate) || !isDateStr(endDate)) {
        return fail(
          res,
          400,
          "VALIDATION_ERROR",
          "habitacionId, startDate y endDate (YYYY-MM-DD) son obligatorios."
        );
      }
      if (endDate < startDate) {
        return fail(
          res,
          400,
          "INVALID_DATES",
          "endDate no puede ser menor que startDate."
        );
      }

      // ✅ NO permitir reservas en fechas pasadas (referencia: America/Merida)
      const hoy = todayMeridaStr(); // YYYY-MM-DD
      if (startDate < hoy) {
        return fail(
          res,
          400,
          "PAST_DATES",
          "No se pueden crear reservas en fechas pasadas."
        );
      }
      if (endDate < hoy) {
        return fail(
          res,
          400,
          "PAST_DATES",
          "No se pueden crear reservas que terminen en fechas pasadas."
        );
      }

      const hab = await Habitacion.findById(habitacionId).lean();
      if (!hab || hab.isDeleted)
        return fail(res, 400, "INVALID_ROOM", "Habitación no encontrada.");
      if (isRoomUnavailable(hab)) {
        return fail(
          res,
          400,
          "ROOM_UNAVAILABLE",
          `No se puede reservar: habitación en estado ${hab.inventoryStatus}.`
        );
      }

      const hotel = hab.hotelCode;
      const room = hab.roomNumber || hab.codigo;

      const conflict = await findConflict({ hotel, room, startDate, endDate });
      if (conflict) {
        rlog("POST /reservas conflict", {
          hotel,
          room,
          startDate,
          endDate,
          conflictId: String(conflict._id),
        });
        return res.status(409).json({
          error: "CONFLICT",
          message: "Conflicto: ya existe una reserva en ese rango.",
          conflict: {
            id: String(conflict._id),
            startDate: conflict.startDate,
            endDate: conflict.endDate,
          },
        });
      }

      const isPaid = paid === true || String(paid) === "true";

      // Calculamos snapshot de totalAmount desde Habitacion
      let totalAmount = null;
      if (typeof hab.price === "number" && Number.isFinite(hab.price)) {
        const billing = computeBilling({
          price: hab.price,
          offer: hab.offer || null,
          startDate,
          endDate,
        });
        totalAmount = billing.total;
      }

      const normalizedGuest = {
        fullName: guest?.fullName || "",
        email: guest?.email || "",
        phone: guest?.phone || "",
        guests:
          typeof guest?.guests === "number" && guest.guests > 0
            ? guest.guests
            : 1,
      };

      const reserva = await Reserva.create({
        habitacionId,
        hotel,
        room,
        type: "stay",
        startDate,
        endDate,
        label: label || "Reserva",
        notes: notes || "",
        origen: origen || "manual",
        paidAt: isPaid ? hoy : null,
        totalAmount,
        guest: normalizedGuest,
        paymentMethod: paymentMethod || "",
      });

      rlog("POST /reservas created", {
        id: String(reserva._id),
        hotel,
        room,
        startDate,
        endDate,
        paid: isPaid,
        totalAmount,
      });

      // ✅ Responder con billing desde Habitacion (ya la tenemos en `hab`)
      res.status(201).json({ data: toEventDto(reserva.toObject(), hab) });
    } catch (err) {
      rerr("[POST /reservas] Error:", err);
      res.status(400).json({ error: "BAD_REQUEST", details: err.message });
    }
  }
);

/**
 * PATCH /api/reservas/:id/dates
 * ✅ guarda log con removedDates
 * ✅ recalcula totalAmount
 */
router.patch(
  "/:id/dates",
  authMiddleware,
  requirePermissions(["manage_reservations"]),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.body;

      if (!isDateStr(startDate) || !isDateStr(endDate))
        return fail(res, 400, "VALIDATION_ERROR", "startDate/endDate inválidos.");
      if (endDate < startDate)
        return fail(res, 400, "INVALID_DATES", "endDate < startDate.");

      const reserva = await Reserva.findById(req.params.id);
      if (!reserva || reserva.isDeleted)
        return fail(res, 404, "NOT_FOUND", "Reserva no encontrada.");

      if (reserva.checkoutAt)
        return fail(
          res,
          400,
          "FORBIDDEN",
          "No se pueden cambiar fechas: ya tiene check-out."
        );
      if (reserva.checkinAt && startDate !== reserva.startDate)
        return fail(
          res,
          400,
          "FORBIDDEN",
          "No se puede cambiar startDate: ya existe check-in."
        );
      if (reserva.checkinAt && endDate < reserva.checkinAt)
        return fail(
          res,
          400,
          "INVALID_DATES",
          "endDate no puede ser menor que la fecha de check-in."
        );

      const conflict = await findConflict({
        hotel: reserva.hotel,
        room: reserva.room,
        startDate,
        endDate,
        excludeId: reserva._id,
      });
      if (conflict) {
        return res.status(409).json({
          error: "CONFLICT",
          message: "Conflicto: ya existe una reserva en ese rango.",
          conflict: {
            id: String(conflict._id),
            startDate: conflict.startDate,
            endDate: conflict.endDate,
          },
        });
      }

      const oldStartDate = reserva.startDate;
      const oldEndDate = reserva.endDate;

      if (oldStartDate !== startDate || oldEndDate !== endDate) {
        const removedDates = calcRemovedDates(
          oldStartDate,
          oldEndDate,
          startDate,
          endDate
        );
        await logDateChange({
          req,
          reserva,
          action: "edit_dates",
          oldStartDate,
          oldEndDate,
          newStartDate: startDate,
          newEndDate: endDate,
          removedDates,
        });
      }

      reserva.startDate = startDate;
      reserva.endDate = endDate;

      // Recalcular totalAmount con la habitación actual
      const habMeta = await Habitacion.findById(reserva.habitacionId)
        .select("_id price offer")
        .lean();

      if (
        habMeta &&
        typeof habMeta.price === "number" &&
        Number.isFinite(habMeta.price)
      ) {
        const billing = computeBilling({
          price: habMeta.price,
          offer: habMeta.offer || null,
          startDate: reserva.startDate,
          endDate: reserva.endDate,
        });
        reserva.totalAmount = billing.total;
      }

      await reserva.save();

      res.json({ data: toEventDto(reserva.toObject(), habMeta) });
    } catch (err) {
      rerr("[PATCH /reservas/:id/dates] Error:", err);
      res.status(400).json({ error: "BAD_REQUEST", details: err.message });
    }
  }
);

/**
 * PATCH /api/reservas/:id/checkin
 */
router.patch(
  "/:id/checkin",
  authMiddleware,
  requirePermissions(["manage_reservations"]),
  async (req, res) => {
    try {
      const reserva = await Reserva.findById(req.params.id);
      if (!reserva || reserva.isDeleted)
        return fail(res, 404, "NOT_FOUND", "Reserva no encontrada.");
      if (reserva.type !== "stay")
        return fail(res, 400, "INVALID_ACTION", "Acción no válida.");

      if (reserva.checkinAt) {
        const habMeta = await Habitacion.findById(reserva.habitacionId)
          .select("_id price offer")
          .lean();
        return res.json({ data: toEventDto(reserva.toObject(), habMeta) });
      }

      const hoy = todayMeridaStr();
      if (hoy < reserva.startDate)
        return fail(
          res,
          400,
          "INVALID_ACTION",
          "No se puede marcar check-in antes de la entrada."
        );
      if (hoy > reserva.endDate)
        return fail(
          res,
          400,
          "INVALID_ACTION",
          "No se puede marcar check-in después de la salida."
        );

      reserva.checkinAt = hoy;
      await reserva.save();

      const habMeta = await Habitacion.findById(reserva.habitacionId)
        .select("_id price offer")
        .lean();
      res.json({ data: toEventDto(reserva.toObject(), habMeta) });
    } catch (err) {
      rerr("[PATCH /reservas/:id/checkin] Error:", err);
      res.status(400).json({ error: "BAD_REQUEST", details: err.message });
    }
  }
);

/**
 * PATCH /api/reservas/:id/checkout
 * ✅ checkout recorta endDate a hoy
 * ✅ guarda removedDates en log
 * ✅ recalcula totalAmount
 */
router.patch(
  "/:id/checkout",
  authMiddleware,
  requirePermissions(["manage_reservations"]),
  async (req, res) => {
    try {
      const reserva = await Reserva.findById(req.params.id);
      if (!reserva || reserva.isDeleted)
        return fail(res, 404, "NOT_FOUND", "Reserva no encontrada.");
      if (reserva.type !== "stay")
        return fail(res, 400, "INVALID_ACTION", "Acción no válida.");
      if (!reserva.checkinAt)
        return fail(
          res,
          400,
          "INVALID_ACTION",
          "Primero marca check-in."
        );

      if (reserva.checkoutAt) {
        const habMeta = await Habitacion.findById(reserva.habitacionId)
          .select("_id price offer")
          .lean();
        return res.json({ data: toEventDto(reserva.toObject(), habMeta) });
      }

      const hoy = todayMeridaStr();
      if (hoy < reserva.checkinAt)
        return fail(
          res,
          400,
          "INVALID_ACTION",
          "checkout no puede ser menor que checkin."
        );

      const oldStartDate = reserva.startDate;
      const oldEndDate = reserva.endDate;

      reserva.checkoutAt = hoy;

      if (reserva.endDate !== hoy) {
        reserva.endDate = hoy;

        const removedDates = calcRemovedDates(
          oldStartDate,
          oldEndDate,
          oldStartDate,
          hoy
        );
        await logDateChange({
          req,
          reserva,
          action: "checkout_trim",
          oldStartDate,
          oldEndDate,
          newStartDate: oldStartDate,
          newEndDate: hoy,
          removedDates,
        });
      }

      // Recalcular totalAmount con el recorte
      const habMeta = await Habitacion.findById(reserva.habitacionId)
        .select("_id price offer")
        .lean();

      if (
        habMeta &&
        typeof habMeta.price === "number" &&
        Number.isFinite(habMeta.price)
      ) {
        const billing = computeBilling({
          price: habMeta.price,
          offer: habMeta.offer || null,
          startDate: reserva.startDate,
          endDate: reserva.endDate,
        });
        reserva.totalAmount = billing.total;
      }

      await reserva.save();

      res.json({ data: toEventDto(reserva.toObject(), habMeta) });
    } catch (err) {
      rerr("[PATCH /reservas/:id/checkout] Error:", err);
      res.status(400).json({ error: "BAD_REQUEST", details: err.message });
    }
  }
);

/**
 * PATCH /api/reservas/:id/paid
 * PATCH /api/reservas/:id/unpaid
 */
router.patch(
  "/:id/paid",
  authMiddleware,
  requirePermissions(["manage_reservations"]),
  async (req, res) => {
    try {
      const reserva = await Reserva.findById(req.params.id);
      if (!reserva || reserva.isDeleted)
        return fail(res, 404, "NOT_FOUND", "Reserva no encontrada.");

      reserva.paidAt = todayMeridaStr();
      await reserva.save();

      const habMeta = await Habitacion.findById(reserva.habitacionId)
        .select("_id price offer")
        .lean();
      res.json({ data: toEventDto(reserva.toObject(), habMeta) });
    } catch (err) {
      rerr("[PATCH /reservas/:id/paid] Error:", err);
      res.status(400).json({ error: "BAD_REQUEST", details: err.message });
    }
  }
);

router.patch(
  "/:id/unpaid",
  authMiddleware,
  requirePermissions(["manage_reservations"]),
  async (req, res) => {
    try {
      const reserva = await Reserva.findById(req.params.id);
      if (!reserva || reserva.isDeleted)
        return fail(res, 404, "NOT_FOUND", "Reserva no encontrada.");

      reserva.paidAt = null;
      await reserva.save();

      const habMeta = await Habitacion.findById(reserva.habitacionId)
        .select("_id price offer")
        .lean();
      res.json({ data: toEventDto(reserva.toObject(), habMeta) });
    } catch (err) {
      rerr("[PATCH /reservas/:id/unpaid] Error:", err);
      res.status(400).json({ error: "BAD_REQUEST", details: err.message });
    }
  }
);

/**
 * PATCH /api/reservas/:id/trash
 */
router.patch(
  "/:id/trash",
  authMiddleware,
  requirePermissions(["manage_reservations"]),
  async (req, res) => {
    try {
      const id = String(req.params.id);
      rlog("TRASH request", { id });

      if (!isOid(id))
        return fail(res, 400, "INVALID_ID", "El id de la reserva no es válido.");

      const updated = await Reserva.findOneAndUpdate(
        { _id: id },
        { $set: { isDeleted: true, deletedAt: new Date() } },
        { new: true }
      ).lean();

      if (!updated)
        return fail(res, 404, "NOT_FOUND", "Reserva no encontrada.");

      const habMeta = await Habitacion.findById(updated.habitacionId)
        .select("_id price offer")
        .lean();
      return res.json({ ok: true, data: toEventDto(updated, habMeta) });
    } catch (err) {
      rerr("[PATCH /reservas/:id/trash] Error:", err);
      return res
        .status(400)
        .json({ error: "BAD_REQUEST", details: err.message });
    }
  }
);

/**
 * PATCH /api/reservas/:id/restore
 */
router.patch(
  "/:id/restore",
  authMiddleware,
  requirePermissions(["manage_reservations"]),
  async (req, res) => {
    try {
      const id = String(req.params.id);
      if (!isOid(id))
        return fail(res, 400, "INVALID_ID", "El id de la reserva no es válido.");

      const reserva = await Reserva.findById(id);
      if (!reserva)
        return fail(res, 404, "NOT_FOUND", "Reserva no encontrada.");

      if (!reserva.isDeleted) {
        const habMetaExisting = await Habitacion.findById(reserva.habitacionId)
          .select("_id price offer")
          .lean();
        return res.json({
          ok: true,
          data: toEventDto(reserva.toObject(), habMetaExisting),
        });
      }

      const conflict = await findConflict({
        hotel: reserva.hotel,
        room: reserva.room,
        startDate: reserva.startDate,
        endDate: reserva.endDate,
        excludeId: reserva._id,
      });
      if (conflict) {
        return res.status(409).json({
          error: "CONFLICT",
          message:
            "No se puede restaurar: la habitación ya está ocupada en esas fechas.",
        });
      }

      reserva.isDeleted = false;
      reserva.deletedAt = null;
      await reserva.save();

      const habMeta = await Habitacion.findById(reserva.habitacionId)
        .select("_id price offer")
        .lean();
      res.json({ ok: true, data: toEventDto(reserva.toObject(), habMeta) });
    } catch (err) {
      rerr("[PATCH /reservas/:id/restore] Error:", err);
      res.status(400).json({ error: "BAD_REQUEST", details: err.message });
    }
  }
);

/**
 * DELETE /api/reservas/:id (compat soft delete)
 */
router.delete(
  "/:id",
  authMiddleware,
  requirePermissions(["manage_reservations"]),
  async (req, res) => {
    try {
      const reserva = await Reserva.findById(req.params.id);
      if (!reserva)
        return fail(res, 404, "NOT_FOUND", "Reserva no encontrada.");

      if (reserva.isDeleted) {
        const habMetaExisting = await Habitacion.findById(reserva.habitacionId)
          .select("_id price offer")
          .lean();
        return res.json({
          ok: true,
          data: toEventDto(reserva.toObject(), habMetaExisting),
        });
      }

      reserva.isDeleted = true;
      reserva.deletedAt = new Date();
      await reserva.save();

      const habMeta = await Habitacion.findById(reserva.habitacionId)
        .select("_id price offer")
        .lean();
      res.json({ ok: true, data: toEventDto(reserva.toObject(), habMeta) });
    } catch (err) {
      rerr("[DELETE /reservas/:id] Error:", err);
      res.status(400).json({ error: "BAD_REQUEST", details: err.message });
    }
  }
);

module.exports = router;
