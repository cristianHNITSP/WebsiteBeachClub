const Habitacion = require("../models/Habitacion");
const Reserva = require("../models/Reserva");

/* ==== Filters ==== */
function buildPublicFilterFromWsPayload(payload) {
  const q = String(payload?.q || "").trim();
  const roomType = String(payload?.roomType || "").trim();
  const amenities = String(payload?.amenities || "").trim();
  const locationTag = String(payload?.locationTag || "").trim();

  const and = [{ isDeleted: { $ne: true } }];

  if (q) {
    const rx = new RegExp(q, "i");
    and.push({ $or: [{ codigo: rx }, { title: rx }, { roomType: rx }, { location: rx }, { hotelCode: rx }] });
  }

  if (roomType) {
    const list = roomType.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length) and.push({ roomType: { $in: list } });
  }

  if (amenities) {
    const list = amenities.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length) and.push({ amenities: { $all: list } });
  }

  if (locationTag) {
    const list = locationTag.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length) {
      and.push({ $or: list.map((t) => ({ location: { $regex: t, $options: "i" } })) });
    }
  }

  // si quieres forzar inventario activo en público, descomenta:
  // and.push({ inventoryStatus: "Activa" });

  return and.length ? { $and: and } : {};
}

/* ==== Availability ==== */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDateStr = (s) => typeof s === "string" && DATE_RE.test(s);

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const as = aStart, ae = aEnd || aStart;
  const bs = bStart, be = bEnd || bStart;
  return as <= be && bs <= ae;
}

function isRoomUnavailable(hab) {
  const s = hab?.inventoryStatus;
  return s === "Bloqueada" || s === "Mantenimiento" || s === "Fuera de servicio";
}

async function hydrateAvailability(rooms, startDate, endDate) {
  const hasRange = isDateStr(startDate) && isDateStr(endDate);

  if (!hasRange) {
    return rooms.map((hab) => {
      const reservableByStatus = !isRoomUnavailable(hab);
      return { ...hab, reservableByStatus, blockedByBooking: false, available: reservableByStatus };
    });
  }

  const rq = {
    isDeleted: { $ne: true },
    type: "stay",
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  };

  const reservas = await Reserva.find(rq).select("hotel room startDate endDate").lean();
  const reservedSet = new Set();

  for (const r of reservas) {
    if (rangesOverlap(startDate, endDate, r.startDate, r.endDate)) {
      reservedSet.add(`${r.hotel}__${String(r.room)}`);
    }
  }

  return rooms.map((hab) => {
    const roomKey = `${hab.hotelCode}__${String(hab.roomNumber || hab.codigo)}`;
    const reservableByStatus = !isRoomUnavailable(hab);
    const blockedByBooking = reservedSet.has(roomKey);
    return { ...hab, reservableByStatus, blockedByBooking, available: reservableByStatus && !blockedByBooking };
  });
}

function bindHabitacionesSocket(io) {
  io.on("connection", (socket) => {
    socket.on("habitaciones:query", async (payload = {}) => {
      try {
        const startDate = payload?.startDate || null;
        const endDate = payload?.endDate || null;

        const onlyAvailable = payload?.onlyAvailable === true || String(payload?.onlyAvailable) === "true";
        const hasRange = isDateStr(startDate) && isDateStr(endDate);

        const filter = buildPublicFilterFromWsPayload(payload);

        const roomsRaw = await Habitacion.find(filter).sort({ createdAt: -1 }).lean();
        let rooms = await hydrateAvailability(roomsRaw, startDate, endDate);

        if (hasRange && onlyAvailable) rooms = rooms.filter((r) => r.available === true);

        socket.emit("habitaciones:result", {
          items: rooms,
          meta: { count: rooms.length, searchRange: hasRange ? { startDate, endDate } : null },
        });
      } catch (err) {
        console.error("[WS habitaciones:query] Error:", err);
        socket.emit("habitaciones:error", {
          message: "No se pudieron cargar habitaciones en tiempo real.",
          details: err?.message || String(err),
        });
      }
    });
  });
}

module.exports = { bindHabitacionesSocket };
