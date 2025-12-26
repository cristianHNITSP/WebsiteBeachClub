const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Reserva = require("../models/Reserva");
const Habitacion = require("../models/Habitacion");

/* ===================== HELPERS (copiados/compat) ===================== */
function isOid(id) {
  return mongoose.Types.ObjectId.isValid(String(id));
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isDateStr(s) {
  return typeof s === "string" && DATE_RE.test(s);
}

// Fecha de hoy en America/Merida
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

/* ===================== BILLING (igual que tu router staff) ===================== */
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
 * DTO simple para público
 * (no expone cosas internas)
 */
function toPublicReservaDto(reserva, hab) {
  const price =
    typeof hab?.price === "number" && Number.isFinite(hab.price) ? hab.price : 0;

  const billing =
    price > 0
      ? computeBilling({
          price,
          offer: hab?.offer || null,
          startDate: reserva.startDate,
          endDate: reserva.endDate,
        })
      : null;

  return {
    id: String(reserva._id),
    codigoReserva: reserva.codigoReserva || null,

    habitacionId: String(reserva.habitacionId),
    hotel: reserva.hotel,
    room: String(reserva.room),

    startDate: reserva.startDate,
    endDate: reserva.endDate,

    billing,
    totalAmount:
      typeof reserva.totalAmount === "number" && Number.isFinite(reserva.totalAmount)
        ? round2(reserva.totalAmount)
        : billing
        ? round2(billing.total)
        : null,
  };
}

function fail(res, status, error, message, extra = {}) {
  return res.status(status).json({ error, message, ...extra });
}

/* ===================== ROUTES ===================== */

/**
 * GET /api/public/habitaciones/:id/availability?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * ✅ Para que el modal/carro valide disponibilidad en tiempo real
 */
router.get("/habitaciones/:id/availability", async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    if (!isOid(id)) {
      return fail(res, 400, "INVALID_ID", "Id de habitación inválido.");
    }
    if (!isDateStr(startDate) || !isDateStr(endDate)) {
      return fail(
        res,
        400,
        "VALIDATION_ERROR",
        "startDate y endDate (YYYY-MM-DD) son obligatorios."
      );
    }
    if (endDate < startDate) {
      return fail(res, 400, "INVALID_DATES", "endDate < startDate.");
    }

    const hoy = todayMeridaStr();
    if (startDate < hoy || endDate < hoy) {
      return fail(res, 400, "PAST_DATES", "No se permiten fechas pasadas.");
    }

    const hab = await Habitacion.findById(id)
      .select("_id isDeleted hotelCode roomNumber codigo inventoryStatus price offer")
      .lean();

    if (!hab || hab.isDeleted) {
      return fail(res, 404, "NOT_FOUND", "Habitación no encontrada.");
    }

    if (isRoomUnavailable(hab)) {
      return res.json({
        data: {
          available: false,
          reservableByStatus: false,
          blockedByBooking: false,
          reason: `Estado: ${hab.inventoryStatus}`,
        },
      });
    }

    const hotel = hab.hotelCode;
    const room = hab.roomNumber || hab.codigo;

    const conflict = await findConflict({ hotel, room, startDate, endDate });
    if (conflict) {
      return res.json({
        data: {
          available: false,
          reservableByStatus: true,
          blockedByBooking: true,
          reason: "Ocupada en esas fechas",
          conflict: {
            id: String(conflict._id),
            startDate: conflict.startDate,
            endDate: conflict.endDate,
          },
        },
      });
    }

    return res.json({
      data: {
        available: true,
        reservableByStatus: true,
        blockedByBooking: false,
        reason: null,
      },
    });
  } catch (err) {
    console.error("[PUBLIC availability] Error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/**
 * POST /api/public/reservas
 * ✅ Crea reserva pública (sin auth)
 * Body:
 * {
 *   habitacionId, startDate, endDate,
 *   guest: { fullName, email, phone, guests },
 *   paymentMethod, notes
 * }
 */
router.post("/reservas", async (req, res) => {
  try {
    const { habitacionId, startDate, endDate, guest, paymentMethod, notes } =
      req.body || {};

    if (!isOid(habitacionId)) {
      return fail(res, 400, "VALIDATION_ERROR", "habitacionId inválido.");
    }
    if (!isDateStr(startDate) || !isDateStr(endDate)) {
      return fail(
        res,
        400,
        "VALIDATION_ERROR",
        "startDate y endDate (YYYY-MM-DD) son obligatorios."
      );
    }
    if (endDate < startDate) {
      return fail(res, 400, "INVALID_DATES", "endDate < startDate.");
    }

    const hoy = todayMeridaStr();
    if (startDate < hoy || endDate < hoy) {
      return fail(res, 400, "PAST_DATES", "No se permiten fechas pasadas.");
    }

    const fullName = String(guest?.fullName || "").trim();
    const email = String(guest?.email || "").trim();
    const phone = String(guest?.phone || "").trim();
    const guests = Math.max(1, Math.min(12, Number(guest?.guests || 1)));

    if (!fullName || !email || !phone) {
      return fail(
        res,
        400,
        "VALIDATION_ERROR",
        "guest.fullName, guest.email y guest.phone son obligatorios."
      );
    }

    const hab = await Habitacion.findById(habitacionId)
      .select("_id isDeleted hotelCode roomNumber codigo inventoryStatus price offer")
      .lean();

    if (!hab || hab.isDeleted) {
      return fail(res, 404, "NOT_FOUND", "Habitación no encontrada.");
    }
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

    // snapshot totalAmount
    let totalAmount = null;
    if (typeof hab.price === "number" && Number.isFinite(hab.price)) {
      totalAmount = computeBilling({
        price: hab.price,
        offer: hab.offer || null,
        startDate,
        endDate,
      }).total;
    }

    const packedNotes = JSON.stringify({
      guest: { fullName, email, phone, guests },
      paymentMethod: paymentMethod || "cash",
      notes: String(notes || ""),
      source: "public_web",
    });

    const reserva = await Reserva.create({
      habitacionId,
      hotel,
      room,
      type: "stay",
      startDate,
      endDate,
      label: `WEB: ${fullName}`,
      origen: "web",
      notes: packedNotes,
      paidAt: null,
      totalAmount,
    });

    return res.status(201).json({ data: toPublicReservaDto(reserva.toObject(), hab) });
  } catch (err) {
    console.error("[PUBLIC reservas] Error:", err);
    return res.status(400).json({ error: "BAD_REQUEST", details: err.message });
  }
});

module.exports = router;
