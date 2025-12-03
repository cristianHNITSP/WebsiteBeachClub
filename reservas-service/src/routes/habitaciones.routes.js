const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Habitacion = require("../models/Habitacion");
const Reserva = require("../models/Reserva"); // ✅ ajusta la ruta/nombre si tu modelo se llama distinto
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

  if (!isSpecial) {
    return { isSpecial: false, description: "", discountPercent: null };
  }

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
  const { q, hotelCode, inventoryStatus, promo, favorites, papelera } = query;
  const and = [];

  // ✅ Public: siempre excluye papelera
  if (forPublic) {
    and.push({ isDeleted: { $ne: true } });
  } else {
    if (papelera === "solo") and.push({ isDeleted: true });
    else if (papelera === "todas") {
      // no filtro
    } else and.push({ isDeleted: { $ne: true } }); // default: excluir
  }

  if (hotelCode && hotelCode !== "todas") and.push({ hotelCode });
  if (inventoryStatus && inventoryStatus !== "todas")
    and.push({ inventoryStatus });

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
    and.push({
      $or: [{ favoritesCount: { $exists: false } }, { favoritesCount: 0 }],
    });
  }

  if (q && typeof q === "string" && q.trim() !== "") {
    const regex = new RegExp(q.trim(), "i");
    and.push({
      $or: [
        { codigo: regex },
        { title: regex },
        { roomType: regex },
        { location: regex },
      ],
    });
  }

  return and.length ? { $and: and } : {};
}

/* ===================== Router factory (recibe io) ===================== */
function createHabitacionesRouter(io) {
  const router = express.Router();

  // ✅ YYYY-MM-DD en zona America/Merida (sin depender del TZ del servidor)
  const todayMeridaStr = () => {
    // en-CA devuelve YYYY-MM-DD
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Merida",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  };
  /**
   * GET /api/habitaciones/:id/reservas.futuras
   * ✅ historial FUTURO por habitación
   * ✅ paginado por índice (page/limit)
   * ✅ requiere view_rooms
   */
  router.get(
    "/:id/reservas.futuras",
    authMiddleware,
    requirePermissions(["view_rooms"]),
    async (req, res) => {
      try {
        const { id } = req.params;

        const pageRaw = parseInt(req.query.page, 10);
        const limitRaw = parseInt(req.query.limit, 10);

        const page = Math.max(pageRaw || 1, 1);
        const limit = Math.min(Math.max(limitRaw || 6, 1), 20);
        const skip = (page - 1) * limit;

        const todayStr = todayMeridaStr();

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({
              error: "INVALID_ID",
              message: "ID de habitación inválido.",
            });
        }

        const habMeta = await Habitacion.findById(id)
          .select("_id price offer isDeleted")
          .lean();
        if (!habMeta || habMeta.isDeleted) {
          return res
            .status(404)
            .json({ error: "NOT_FOUND", message: "Habitación no encontrada." });
        }

        // Helpers de billing (día calendario inclusivo)
        const parseYMDToUTC = (ymd) => {
          const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ""));
          if (!m) return null;
          const y = Number(m[1]);
          const mo = Number(m[2]);
          const d = Number(m[3]);
          if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
          return Date.UTC(y, mo - 1, d);
        };

        const countDaysInclusive = (startDate, endDate) => {
          const s = parseYMDToUTC(startDate);
          const e = parseYMDToUTC(endDate || startDate);
          if (s == null || e == null) return 0;
          const diffDays = Math.floor((e - s) / 86400000);
          return Math.max(1, diffDays + 1); // inclusivo
        };

        const calcBilling = ({ startDate, endDate }, room) => {
          const pricePerDay = Number(room?.price) || 0;
          const days = countDaysInclusive(startDate, endDate);
          const subtotal = Math.max(0, pricePerDay * days);

          const isSpecial = room?.offer?.isSpecial === true;
          const discountPercent = isSpecial
            ? Number(room?.offer?.discountPercent)
            : 0;
          const safePct = Number.isFinite(discountPercent)
            ? Math.min(Math.max(discountPercent, 0), 100)
            : 0;

          const discountAmount = safePct > 0 ? (subtotal * safePct) / 100 : 0;
          const total = Math.max(0, subtotal - discountAmount);

          return {
            pricePerDay,
            days,
            subtotal,
            discountPercent: safePct || null,
            discountAmount,
            total,
          };
        };

        // 🔎 Futuras: endDate >= hoy (o si no hay endDate, startDate >= hoy)
        // ✅ Nota: NO forzamos ObjectId para evitar casts raros; Mongoose castea si aplica.
        const filter = {
          $and: [
            { isDeleted: { $ne: true } },
            { habitacionId: id },
            {
              $or: [
                { endDate: { $gte: todayStr } },
                { endDate: { $exists: false }, startDate: { $gte: todayStr } },
              ],
            },
          ],
        };

        const [itemsRaw, total] = await Promise.all([
          Reserva.find(filter)
            .sort({ startDate: 1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          Reserva.countDocuments(filter),
        ]);

        const items = (itemsRaw || []).map((r) => ({
          ...r,
          billing: r?.billing?.total > 0 ? r.billing : calcBilling(r, habMeta),
        }));

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
        console.error("[GET /habitaciones/:id/reservas.futuras] Error:", err);
        return res.status(500).json({
          error: "INTERNAL_ERROR",
          message:
            "No se pudieron cargar las reservas futuras de esta habitación.",
          details: err?.message || String(err),
        });
      }
    }
  );

  /**
   * GET /api/habitaciones/public
   * ✅ excluye papelera siempre
   */
  router.get("/public", async (req, res) => {
    try {
      const pageRaw = parseInt(req.query.page, 10);
      const limitRaw = parseInt(req.query.limit, 10);

      const page = Math.max(pageRaw || 1, 1);
      const limit = Math.min(Math.max(limitRaw || 5, 1), 10);
      const skip = (page - 1) * limit;

      const filter = buildHabitacionesFilterFromQuery(req.query, {
        forPublic: true,
      });

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
      console.error("[GET /habitaciones/public] Error:", err);
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  });

  /**
   * GET /api/habitaciones/recomendaciones
   * ✅ excluye papelera
   * ✅ SIN isReserved
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
   * ✅ soporta papelera=excluir|solo|todas
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

        const filter = buildHabitacionesFilterFromQuery(req.query, {
          forPublic: false,
        });

        const [items, total] = await Promise.all([
          Habitacion.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
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
      if (!room) {
        return res
          .status(404)
          .json({ error: "NOT_FOUND", message: "Habitación no encontrada." });
      }

      if (room.isDeleted) {
        return res.status(409).json({
          error: "TRASHED",
          message: "Esta habitación está en papelera.",
        });
      }

      const ip = getRawIp(req);
      const hash = crypto
        .createHash("sha256")
        .update(`${ip}-${id}-${process.env.FAV_SALT || "saltito"}`)
        .digest("hex");

      if (room.favoriteIpHashes.includes(hash)) {
        return res.status(409).json({
          error: "ALREADY_FAVORITED",
          message: "Ya habías marcado esta habitación como favorita.",
        });
      }

      room.favoriteIpHashes.push(hash);
      room.favoritesCount = (room.favoritesCount || 0) + 1;

      await room.save();

      if (io) io.emit("habitaciones:updated", room);

      return res.json({
        message: "Favorito registrado correctamente.",
        favoritesCount: room.favoritesCount,
      });
    } catch (err) {
      console.error("[POST /habitaciones/:id/favorite] Error:", err);
      return res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Error al registrar favorito.",
      });
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

        const payload = {
          ...req.body,
          offer,
          // blindamos papelera
          isDeleted: false,
          deletedAt: null,
        };

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
   * PUT /api/habitaciones/:id
   * ✅ whitelist + no papelera editable aquí
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
            message:
              "No puedes editar una habitación en papelera. Restaúrala primero.",
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

        const merged = {
          ...room.toObject(),
          ...allowed,
          offer,
        };

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
   * PATCH /api/habitaciones/:id/trash  (soft delete)
   */
  router.patch(
    "/:id/trash",
    authMiddleware,
    requirePermissions(["manage_rooms"]),
    async (req, res) => {
      try {
        const room = await Habitacion.findById(req.params.id);
        if (!room) return res.status(404).json({ error: "NOT_FOUND" });

        if (room.isDeleted)
          return res.status(409).json({ error: "ALREADY_TRASHED" });

        room.isDeleted = true;
        room.deletedAt = new Date();

        await room.save();

        if (io) io.emit("habitaciones:trashed", { _id: room._id.toString() });
        res.json({ message: "Enviada a papelera", room });
      } catch (err) {
        console.error("[PATCH /habitaciones/:id/trash] Error:", err);
        res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    }
  );

  /**
   * PATCH /api/habitaciones/:id/restore  (restore)
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
   * DELETE /api/habitaciones/:id/permanent (hard delete definitivo)
   * ✅ exige estar en papelera
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
            message:
              "Primero envíala a papelera para poder eliminar permanentemente.",
          });
        }

        await Habitacion.findByIdAndDelete(req.params.id);

        if (io)
          io.emit("habitaciones:deleted_permanent", { _id: req.params.id });
        res.json({ message: "Eliminada permanentemente" });
      } catch (err) {
        console.error("[DELETE /habitaciones/:id/permanent] Error:", err);
        res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    }
  );

  /**
   * DELETE /api/habitaciones/:id  (legacy) -> papelera
   * ✅ para no romper front viejo
   */
  router.delete(
    "/:id",
    authMiddleware,
    requirePermissions(["manage_rooms"]),
    async (req, res) => {
      try {
        const room = await Habitacion.findById(req.params.id);
        if (!room) return res.status(404).json({ error: "NOT_FOUND" });

        if (!room.isDeleted) {
          room.isDeleted = true;
          room.deletedAt = new Date();
          await room.save();
          if (io) io.emit("habitaciones:trashed", { _id: room._id.toString() });
        }

        res.json({ message: "Enviada a papelera" });
      } catch (err) {
        console.error("[DELETE /habitaciones/:id] Error:", err);
        res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    }
  );

  return router;
}

module.exports = createHabitacionesRouter;
