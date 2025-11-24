// routes/habitaciones.routes.js
const express = require("express");
const crypto = require("crypto");
const Habitacion = require("../models/Habitacion");
const authMiddleware = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/require.Permissions");

const router = express.Router();

// Helper: obtener IP "real"
function getClientIp(req) {
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  return req.ip || req.connection.remoteAddress || "unknown";
}

// Normaliza la oferta que venga del body (POST/PUT)
function normalizeOfferPayload(body) {
  const offer = body.offer || {};
  const isSpecial = !!offer.isSpecial;
  let discount = offer.discountPercent;

  if (!isSpecial) {
    return {
      isSpecial: false,
      description: "",
      discountPercent: null,
    };
  }

  discount = Number(discount);

  // Si el descuento no es válido, degradamos a sin oferta
  if (!discount || discount <= 0 || discount >= 100) {
    return {
      isSpecial: false,
      description: "",
      discountPercent: null,
    };
  }

  return {
    isSpecial: true,
    description: offer.description || "",
    discountPercent: discount,
  };
}

/**
 * GET /api/habitaciones
 * Ruta pública (por ejemplo para mostrar cards en la web)
 */
router.get("/", async (req, res) => {
  try {
    const rooms = await Habitacion.find();
    res.json(rooms);
  } catch (err) {
    console.error("[GET /habitaciones] Error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/**
 * GET /api/habitaciones/recomendaciones
 * Habitaciones recomendadas:
 * - Solo con offer.isSpecial === true y discountPercent > 0
 * - Solo inventario "Activa"
 * - Ordenadas por favoritesCount (desc) y rating (desc)
 * - Por defecto máximo 4 resultados
 */
router.get("/recomendaciones", async (req, res) => {
  try {
    const limit = Math.max(parseInt(req.query.limit, 10) || 4, 1);

    const baseQuery = {
      "offer.isSpecial": true,
      "offer.discountPercent": { $gt: 0 },
      inventoryStatus: "Activa",
    };

    let rooms = await Habitacion.find(baseQuery)
      .sort({ favoritesCount: -1, rating: -1, createdAt: -1 })
      .limit(limit);

    // Fallback: top favoritos activos aunque no tengan oferta
    if (!rooms.length) {
      rooms = await Habitacion.find({ inventoryStatus: "Activa" })
        .sort({ favoritesCount: -1, rating: -1, createdAt: -1 })
        .limit(limit);
    }

    return res.json({
      items: rooms,
      total: rooms.length,
      limit,
    });
  } catch (err) {
    console.error("[GET /habitaciones/recomendaciones] Error:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "No se pudieron obtener las recomendaciones.",
    });
  }
});


/**
 * GET /api/habitaciones/admin?page=1&limit=5
 * Ruta exclusiva del panel admin (paginada)
 */
router.get(
  "/admin",
  authMiddleware,
  requirePermissions(["view_rooms"]),
  async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.max(parseInt(req.query.limit, 10) || 5, 1);
      const skip = (page - 1) * limit;

      const [rooms, total] = await Promise.all([
        Habitacion.find().skip(skip).limit(limit),
        Habitacion.countDocuments(),
      ]);

      const totalPages = Math.ceil(total / limit);

      return res.json({
        items: rooms,
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      });
    } catch (err) {
      console.error("[GET /habitaciones/admin] Error:", err);
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);

/**
 * POST /api/habitaciones/:id/favorite
 * Marcar habitación como favorita usando hash de IP para evitar múltiples votos.
 * No requiere sesión (puede venir del sitio público).
 */
router.post("/:id/favorite", async (req, res) => {
  try {
    const { id } = req.params;

    const room = await Habitacion.findById(id).select("+favoriteIpHashes");
    if (!room) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Habitación no encontrada.",
      });
    }

    const ip = getClientIp(req);

    const hash = crypto
      .createHash("sha256")
      .update(`${ip}-${id}-${process.env.FAV_SALT || "saltito"}`)
      .digest("hex");

    if (room.favoriteIpHashes.includes(hash)) {
      return res.status(409).json({
        error: "ALREADY_FAVORITED",
        message:
          "Ya habías marcado esta habitación como favorita desde esta red/dispositivo.",
      });
    }

    room.favoriteIpHashes.push(hash);
    room.favoritesCount = (room.favoritesCount || 0) + 1;

    await room.save();

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
 * Crear habitación (solo panel admin)
 */
router.post(
  "/",
  authMiddleware,
  requirePermissions(["manage_rooms"]),
  async (req, res) => {
    try {
      const payload = {
        ...req.body,
        offer: normalizeOfferPayload(req.body),
      };

      const room = await Habitacion.create(payload);
      res.status(201).json(room);
    } catch (err) {
      console.error("[POST /habitaciones] Error:", err);
      res.status(400).json({ error: "BAD_REQUEST", details: err.message });
    }
  }
);

/**
 * GET /api/habitaciones/:id
 * Detalle de habitación para panel
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
 * Actualizar habitación
 */
router.put(
  "/:id",
  authMiddleware,
  requirePermissions(["manage_rooms"]),
  async (req, res) => {
    try {
      const update = {
        ...req.body,
        offer: normalizeOfferPayload(req.body),
      };

      const room = await Habitacion.findByIdAndUpdate(
        req.params.id,
        update,
        { new: true }
      );
      if (!room) return res.status(404).json({ error: "NOT_FOUND" });
      res.json(room);
    } catch (err) {
      res.status(400).json({ error: "BAD_REQUEST", details: err.message });
    }
  }
);

/**
 * DELETE /api/habitaciones/:id
 * Eliminar habitación
 */
router.delete(
  "/:id",
  authMiddleware,
  requirePermissions(["manage_rooms"]),
  async (req, res) => {
    const room = await Habitacion.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ error: "NOT_FOUND" });
    res.json({ message: "Habitación eliminada" });
  }
);

module.exports = router;
