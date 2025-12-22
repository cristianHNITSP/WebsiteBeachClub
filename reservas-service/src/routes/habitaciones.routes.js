const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Habitacion = require("../models/Habitacion");
const Reserva = require("../models/Reserva");
const authMiddleware = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/require.Permissions");

/* =============== Favoritos: seguimos usando IP hash (solo favoritos) =============== */
const getRawIp = (req) => {
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (xForwardedFor) return xForwardedFor.split(",")[0].trim();
  return req.ip || req.connection?.remoteAddress || "unknown";
};

/* ===================== Normaliza offer payload ===================== */
function normalizeOfferPayload(body) {
  const offer = body?.offer || {};
  const isSpecial = !!offer.isSpecial;
  let discount = offer.discountPercent;

  if (!isSpecial) return { isSpecial: false, description: "", discountPercent: null };

  discount = Number(discount);
  if (!Number.isFinite(discount) || discount <= 0 || discount >= 100) {
    return { isSpecial: false, description: "", discountPercent: null };
  }

  return {
    isSpecial: true,
    description: offer.description || "",
    discountPercent: discount,
  };
}

/**
 * papelera:
 * - default: EXCLUIR (papelera=excluir o undefined)
 * - papelera=solo  => solo isDeleted:true
 * - papelera=todas => incluye todo
 */
function buildHabitacionesFilterFromQuery(query, { forPublic = false } = {}) {
  const {
    q,
    hotelCode,
    inventoryStatus,
    promo,
    favorites,
    papelera,
    roomType,
    amenities,
    locationTag,
    minPrice,
    maxPrice,
  } = query;

  const and = [];

  // Public: siempre excluye papelera
  if (forPublic) {
    and.push({ isDeleted: { $ne: true } });
  } else {
    if (papelera === "solo") and.push({ isDeleted: true });
    else if (papelera === "todas") {
      // no filtro
    } else and.push({ isDeleted: { $ne: true } }); // default excluir
  }

  if (hotelCode && hotelCode !== "todas") and.push({ hotelCode });
  if (inventoryStatus && inventoryStatus !== "todas") and.push({ inventoryStatus });

  // roomType CSV
  if (roomType && String(roomType).trim()) {
    const list = String(roomType)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length) and.push({ roomType: { $in: list } });
  }

  // amenities CSV (todas)
  if (amenities && String(amenities).trim()) {
    const list = String(amenities)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length) and.push({ amenities: { $all: list } });
  }

  // locationTag CSV (cualquiera, match parcial)
  if (locationTag && String(locationTag).trim()) {
    const list = String(locationTag)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (list.length) {
      and.push({
        $or: list.map((tag) => ({ location: { $regex: tag, $options: "i" } })),
      });
    }
  }

  // price range
  const minP = Number(minPrice);
  const maxP = Number(maxPrice);
  if (Number.isFinite(minP)) and.push({ price: { $gte: minP } });
  if (Number.isFinite(maxP)) and.push({ price: { $lte: maxP } });

  if (promo === "con_promo") {
    and.push({ "offer.isSpecial": true });
    and.push({ "offer.discountPercent": { $gt: 0 } });
  } else if (promo === "sin_promo") {
    and.push({
      $or: [
        { "offer.isSpecial": { $ne: true } },
        { "offer.discountPercent": { $lte: 0 } },
        { offer: { $exists: false } },
      ],
    });
  }

  if (favorites === "con_favs") and.push({ favoritesCount: { $gt: 0 } });
  else if (favorites === "sin_favs") {
    and.push({ $or: [{ favoritesCount: { $exists: false } }, { favoritesCount: 0 }] });
  }

  if (q && typeof q === "string" && q.trim() !== "") {
    const regex = new RegExp(q.trim(), "i");
    and.push({
      $or: [{ codigo: regex }, { title: regex }, { roomType: regex }, { location: regex }],
    });
  }

  return and.length ? { $and: and } : {};
}

/* ==== Disponibilidad helpers (compat) ==== */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDateStr = (s) => typeof s === "string" && DATE_RE.test(s);

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const as = aStart,
    ae = aEnd || aStart;
  const bs = bStart,
    be = bEnd || bStart;
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

/* ===================== BILLING helpers (igual que en reservas.routes) ===================== */
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

/* ===================== Router factory (recibe io) ===================== */
function createHabitacionesRouter(io) {
  const router = express.Router();

  // YYYY-MM-DD en zona America/Merida
  const todayMeridaStr = () => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Merida",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  };

  const countPendingReservasByHabitacion = async (habitacionId, todayStr) => {
    return Reserva.countDocuments({
      $and: [
        { isDeleted: { $ne: true } },
        { habitacionId: new mongoose.Types.ObjectId(habitacionId) },
        { checkoutAt: null },
        {
          $or: [{ endDate: { $gte: todayStr } }, { endDate: { $exists: false }, startDate: { $gte: todayStr } }],
        },
      ],
    });
  };

  /**
   * GET /api/habitaciones/:id/reservas.futuras?page=1&limit=6
   * Devuelve reservas futuras/activas PENDIENTES (sin checkout) de esa habitación.
   * ✅ Ahora incluye billing calculado desde Habitacion.price/offer
   */
  router.get(
    "/:id/reservas.futuras",
    authMiddleware,
    requirePermissions(["view_reservations"]),
    async (req, res) => {
      try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ error: "INVALID_ID", message: "ID de habitación inválido." });
        }

        const pageRaw = parseInt(req.query.page, 10);
        const limitRaw = parseInt(req.query.limit, 10);

        const page = Math.max(pageRaw || 1, 1);
        const limit = Math.min(Math.max(limitRaw || 6, 1), 50);
        const skip = (page - 1) * limit;

        // checamos que exista la habitación (aunque esté en papelera, tú decides si lo permites)
        const room = await Habitacion.findById(id)
          .select("_id hotelCode roomNumber codigo isDeleted price offer")
          .lean();
        if (!room) {
          return res.status(404).json({ error: "NOT_FOUND", message: "Habitación no encontrada." });
        }

        const hoy = todayMeridaStr(); // YYYY-MM-DD

        // "futuras o activas" + "pendientes": endDate >= hoy y checkoutAt null
        const baseQuery = {
          isDeleted: { $ne: true },
          type: "stay",
          habitacionId: new mongoose.Types.ObjectId(id),
          checkoutAt: null,
          endDate: { $gte: hoy },
        };

        const [itemsRaw, total] = await Promise.all([
          Reserva.find(baseQuery)
            .sort({ startDate: 1 })
            .skip(skip)
            .limit(limit)
            .select("_id codigoReserva hotel room startDate endDate label notes origen checkinAt checkoutAt paidAt createdAt")
            .lean(),
          Reserva.countDocuments(baseQuery),
        ]);

        // ✅ adjuntar billing calculado con el precio y oferta actuales de la habitación
        const price = typeof room.price === "number" && Number.isFinite(room.price) ? room.price : null;
        const offer = room.offer || null;

        const items = itemsRaw.map((r) => {
          let billing = null;
          if (price !== null) {
            billing = computeBilling({
              price,
              offer,
              startDate: r.startDate,
              endDate: r.endDate,
            });
          }
          return { ...r, billing };
        });

        const totalPages = Math.ceil(total / limit);

        return res.json({
          items,
          total,
          page,
          limit,
          totalPages,
          hasMore: page < totalPages,
          meta: {
            habitacionId: String(room._id),
            hotelCode: room.hotelCode,
            roomNumber: room.roomNumber || room.codigo || null,
            today: hoy,
          },
        });
      } catch (err) {
        console.error("[GET /habitaciones/:id/reservas.futuras] Error:", err);
        return res.status(500).json({ error: "INTERNAL_ERROR", message: "No se pudieron cargar las reservas futuras." });
      }
    }
  );

  /**
   * GET /api/habitaciones/public
   * (no es tu carga inicial, pero se deja compatible)
   * ✅ Ahora por defecto y máximo 5 habitaciones por página
   */
  router.get("/public", async (req, res) => {
    try {
      const pageRaw = parseInt(req.query.page, 10);
      const limitRaw = parseInt(req.query.limit, 10);

      const page = Math.max(pageRaw || 1, 1);
      const limit = Math.min(Math.max(limitRaw || 5, 1), 5); // <= 5 siempre
      const skip = (page - 1) * limit;

      const filter = buildHabitacionesFilterFromQuery(req.query, { forPublic: true });

      const { startDate, endDate } = req.query;
      const onlyAvailable = String(req.query.onlyAvailable) === "true";
      const hasRange = isDateStr(startDate) && isDateStr(endDate);

      const [itemsRaw, total] = await Promise.all([
        Habitacion.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Habitacion.countDocuments(filter),
      ]);

      let items = await hydrateAvailability(itemsRaw, startDate, endDate);
      if (hasRange && onlyAvailable) items = items.filter((x) => x.available === true);

      const totalPages = Math.ceil(total / limit);

      return res.json({
        items,
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      });
    } catch (err) {
      console.error("[GET /habitaciones/public] Error:", err);
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  });

  /**
   * GET /api/habitaciones/recomendaciones
   */
  router.get("/recomendaciones", async (req, res) => {
    try {
      const limitRaw = parseInt(req.query.limit, 10);
      const limit = Math.min(Math.max(limitRaw || 4, 1), 10);

      const baseQuery = {
        isDeleted: { $ne: true },
        inventoryStatus: "Activa",
        "offer.isSpecial": true,
        "offer.discountPercent": { $gt: 0 },
      };

      let rooms = await Habitacion.find(baseQuery)
        .sort({ favoritesCount: -1, rating: -1, createdAt: -1 })
        .limit(limit);

      if (!rooms.length) {
        rooms = await Habitacion.find({
          isDeleted: { $ne: true },
          inventoryStatus: "Activa",
        })
          .sort({ favoritesCount: -1, rating: -1, createdAt: -1 })
          .limit(limit);
      }

      return res.json({ items: rooms, total: rooms.length, limit });
    } catch (err) {
      console.error("[GET /habitaciones/recomendaciones] Error:", err);
      return res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "No se pudieron obtener las recomendaciones.",
      });
    }
  });

  /**
   * GET /api/habitaciones/gestor.admin
   */
  router.get(
    "/gestor.admin",
    authMiddleware,
    requirePermissions(["view_rooms"]),
    async (req, res) => {
      try {
        const pageRaw = parseInt(req.query.page, 10);
        const limitRaw = parseInt(req.query.limit, 10);

        const page = Math.max(pageRaw || 1, 1);
        const limit = Math.min(Math.max(limitRaw || 5, 1), 50);
        const skip = (page - 1) * limit;

        const filter = buildHabitacionesFilterFromQuery(req.query, { forPublic: false });

        const [items, total] = await Promise.all([
          Habitacion.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
          Habitacion.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(total / limit);

        return res.json({
          items,
          total,
          page,
          limit,
          totalPages,
          hasMore: page < totalPages,
        });
      } catch (err) {
        console.error("[GET /habitaciones/gestor.admin] Error:", err);
        return res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    }
  );

  /**
   * POST /api/habitaciones/:id/favorite
   */
  router.post("/:id/favorite", async (req, res) => {
    try {
      const { id } = req.params;

      const room = await Habitacion.findById(id).select("+favoriteIpHashes");
      if (!room) return res.status(404).json({ error: "NOT_FOUND", message: "Habitación no encontrada." });

      if (room.isDeleted) return res.status(409).json({ error: "TRASHED", message: "Esta habitación está en papelera." });

      const ip = getRawIp(req);
      const hash = crypto
        .createHash("sha256")
        .update(`${ip}-${id}-${process.env.FAV_SALT || "saltito"}`)
        .digest("hex");

      if (room.favoriteIpHashes.includes(hash)) {
        return res.status(409).json({ error: "ALREADY_FAVORITED", message: "Ya habías marcado esta habitación como favorita." });
      }

      room.favoriteIpHashes.push(hash);
      room.favoritesCount = (room.favoritesCount || 0) + 1;

      await room.save();
      if (io) io.emit("habitaciones:updated", room);

      return res.json({ message: "Favorito registrado correctamente.", favoritesCount: room.favoritesCount });
    } catch (err) {
      console.error("[POST /habitaciones/:id/favorite] Error:", err);
      return res.status(500).json({ error: "INTERNAL_ERROR", message: "Error al registrar favorito." });
    }
  });

  /**
   * POST /api/habitaciones
   */
  router.post(
    "/",
    authMiddleware,
    requirePermissions(["manage_rooms"]),
    async (req, res) => {
      try {
        const offer = normalizeOfferPayload(req.body);
        const payload = { ...req.body, offer, isDeleted: false, deletedAt: null };

        const room = await Habitacion.create(payload);
        if (io) io.emit("habitaciones:created", room);

        res.status(201).json(room);
      } catch (err) {
        console.error("[POST /habitaciones] Error:", err);
        res.status(400).json({ error: "BAD_REQUEST", details: err.message });
      }
    }
  );

  /**
   * GET /api/habitaciones/:id
   */
  router.get(
    "/:id",
    authMiddleware,
    requirePermissions(["view_rooms"]),
    async (req, res) => {
      const room = await Habitacion.findById(req.params.id);
      if (!room) return res.status(404).json({ error: "NOT_FOUND" });
      res.json(room);
    }
  );

  /**
   * PUT /api/habitaciones/:id (whitelist)
   */
  router.put(
    "/:id",
    authMiddleware,
    requirePermissions(["manage_rooms"]),
    async (req, res) => {
      try {
        const room = await Habitacion.findById(req.params.id);
        if (!room) return res.status(404).json({ error: "NOT_FOUND" });

        if (room.isDeleted) {
          return res.status(409).json({
            error: "TRASHED",
            message: "No puedes editar una habitación en papelera. Restaúrala primero.",
          });
        }

        const allowed = ((b) => ({
          codigo: b.codigo,
          hotelCode: b.hotelCode,
          roomNumber: b.roomNumber,
          title: b.title,
          roomType: b.roomType,
          location: b.location,
          img: b.img,
          price: b.price,
          rating: b.rating,
          amenities: b.amenities,
          badge: b.badge,
          featured: b.featured,
          size: b.size,
          inventoryStatus: b.inventoryStatus,
        }))(req.body || {});

        const offer = normalizeOfferPayload(req.body);

        const merged = { ...room.toObject(), ...allowed, offer };

        delete merged._id;
        delete merged.__v;
        delete merged.createdAt;
        delete merged.updatedAt;
        delete merged.isDeleted;
        delete merged.deletedAt;

        room.set(merged);
        await room.save();

        if (io) io.emit("habitaciones:updated", room);
        res.json(room);
      } catch (err) {
        console.error("[PUT /habitaciones/:id] Error:", err);
        res.status(400).json({ error: "BAD_REQUEST", details: err.message });
      }
    }
  );

  /**
   * PATCH /api/habitaciones/:id/trash (soft delete)
   */
  router.patch(
    "/:id/trash",
    authMiddleware,
    requirePermissions(["manage_rooms"]),
    async (req, res) => {
      try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ error: "INVALID_ID", message: "ID de habitación inválido." });
        }

        const room = await Habitacion.findById(id);
        if (!room) return res.status(404).json({ error: "NOT_FOUND" });

        if (room.isDeleted) {
          return res.status(409).json({ error: "ALREADY_TRASHED", message: "Esta habitación ya está en papelera." });
        }

        const todayStr = todayMeridaStr();
        const pendingCount = await countPendingReservasByHabitacion(id, todayStr);

        if (pendingCount > 0) {
          return res.status(409).json({
            error: "HAS_PENDING_RESERVATIONS",
            message: "No puedes enviar esta habitación a papelera: tiene reservas pendientes (futuras o activas).",
            pendingCount,
          });
        }

        room.isDeleted = true;
        room.deletedAt = new Date();
        await room.save();

        if (io) io.emit("habitaciones:trashed", { _id: room._id.toString() });
        res.json({ message: "Enviada a papelera", room });
      } catch (err) {
        console.error("[PATCH /habitaciones/:id/trash] Error:", err);
        res.status(500).json({ error: "INTERNAL_ERROR", details: err?.message || String(err) });
      }
    }
  );

  /**
   * PATCH /api/habitaciones/:id/restore
   */
  router.patch(
    "/:id/restore",
    authMiddleware,
    requirePermissions(["manage_rooms"]),
    async (req, res) => {
      try {
        const room = await Habitacion.findById(req.params.id);
        if (!room) return res.status(404).json({ error: "NOT_FOUND" });

        room.isDeleted = false;
        room.deletedAt = null;

        await room.save();

        if (io) io.emit("habitaciones:restored", room);
        res.json({ message: "Restaurada", room });
      } catch (err) {
        console.error("[PATCH /habitaciones/:id/restore] Error:", err);
        res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    }
  );

  /**
   * DELETE /api/habitaciones/:id/permanent
   */
  router.delete(
    "/:id/permanent",
    authMiddleware,
    requirePermissions(["manage_rooms"]),
    async (req, res) => {
      try {
        const room = await Habitacion.findById(req.params.id);
        if (!room) return res.status(404).json({ error: "NOT_FOUND" });

        if (!room.isDeleted) {
          return res.status(409).json({
            error: "NOT_IN_TRASH",
            message: "Primero envíala a papelera para poder eliminar permanentemente.",
          });
        }

        await Habitacion.findByIdAndDelete(req.params.id);

        if (io) io.emit("habitaciones:deleted_permanent", { _id: req.params.id });
        res.json({ message: "Eliminada permanentemente" });
      } catch (err) {
        console.error("[DELETE /habitaciones/:id/permanent] Error:", err);
        res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    }
  );

  /**
   * DELETE /api/habitaciones/:id (legacy -> papelera)
   */
  router.delete(
    "/:id",
    authMiddleware,
    requirePermissions(["manage_rooms"]),
    async (req, res) => {
      try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ error: "INVALID_ID", message: "ID de habitación inválido." });
        }

        const room = await Habitacion.findById(id);
        if (!room) return res.status(404).json({ error: "NOT_FOUND" });

        if (!room.isDeleted) {
          const todayStr = todayMeridaStr();
          const pendingCount = await countPendingReservasByHabitacion(id, todayStr);

          if (pendingCount > 0) {
            return res.status(409).json({
              error: "HAS_PENDING_RESERVATIONS",
              message: "No puedes enviar esta habitación a papelera: tiene reservas pendientes (futuras o activas).",
              pendingCount,
            });
          }

          room.isDeleted = true;
          room.deletedAt = new Date();
          await room.save();

          if (io) io.emit("habitaciones:trashed", { _id: room._id.toString() });
        }

        res.json({ message: "Enviada a papelera" });
      } catch (err) {
        console.error("[DELETE /habitaciones/:id] Error:", err);
        res.status(500).json({ error: "INTERNAL_ERROR", details: err?.message || String(err) });
      }
    }
  );

  return router;
}

module.exports = createHabitacionesRouter;
