// routes/habitaciones.routes.js
const express = require("express");
const crypto = require("crypto");
const Habitacion = require("../models/Habitacion");
const authMiddleware = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/require.Permissions");

// Fallback IP helper (por si por alguna razón no viene desde el middleware global)
const getRawIp = (req) => {
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || "unknown";
};

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
 * Construye el filtro de MongoDB a partir de los query params
 * Soporta:
 *  - q: texto (codigo, title, roomType, location)
 *  - hotelCode: "casa_frida" | "cabanas_fridas"
 *  - inventoryStatus: "Activa" | "Mantenimiento" | ...
 *  - promo: "todas" | "con_promo" | "sin_promo"
 *  - favorites: "todas" | "con_favs" | "sin_favs"
 *  - estadoReserva: "todos" | "no_reservada" | "reservada" | "en_espera" | 0/1/3
 */
function buildHabitacionesFilterFromQuery(query) {
  const { q, hotelCode, inventoryStatus, promo, favorites, estadoReserva } =
    query;

  const and = [];

  // Sede
  if (hotelCode && hotelCode !== "todas") {
    and.push({ hotelCode });
  }

  // Estado inventario
  if (inventoryStatus && inventoryStatus !== "todas") {
    and.push({ inventoryStatus });
  }

  // Promo
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

  // Favoritos
  if (favorites === "con_favs") {
    and.push({ favoritesCount: { $gt: 0 } });
  } else if (favorites === "sin_favs") {
    and.push({
      $or: [
        { favoritesCount: { $exists: false } },
        { favoritesCount: 0 },
      ],
    });
  }

  // Estado de reserva (0 = no reservada, 1 = reservada, 3 = en espera)
  let reservaVal;
  if (estadoReserva && estadoReserva !== "todos") {
    const map = {
      no_reservada: 0,
      reservada: 1,
      en_espera: 3,
    };

    if (Object.prototype.hasOwnProperty.call(map, estadoReserva)) {
      reservaVal = map[estadoReserva];
    } else {
      const num = Number(estadoReserva);
      if ([0, 1, 3].includes(num)) {
        reservaVal = num;
      }
    }
  }

  if (reservaVal !== undefined) {
    and.push({ estadoDeReserva: reservaVal });
  }

  // Búsqueda de texto
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

  if (!and.length) {
    return {}; // sin filtros -> todo
  }

  return { $and: and };
}

// ✅ Exportamos una función que recibe io
function createHabitacionesRouter(io) {
  const router = express.Router();

  /**
   * GET /api/habitaciones/public
   * Ruta pública (por ejemplo para mostrar cards en la web)
   * Soporta filtros y paginación (máx 5 registros por página).
   */
  router.get("/public", async (req, res) => {
    try {
      const pageRaw = parseInt(req.query.page, 10);
      const limitRaw = parseInt(req.query.limit, 10);

      const page = Math.max(pageRaw || 1, 1);
      const limit = Math.min(Math.max(limitRaw || 5, 1), 5);
      const skip = (page - 1) * limit;

      const filter = buildHabitacionesFilterFromQuery(req.query);

      const [rooms, total] = await Promise.all([
        Habitacion.find(filter).skip(skip).limit(limit),
        Habitacion.countDocuments(filter),
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
      console.error("[GET /habitaciones/public] Error:", err);
      res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  });

  router.get(
    "/name.habitaciones",
    authMiddleware,
    requirePermissions(["manage_rooms"]),
    async (req, res) => {
      try {
        const rooms = await Habitacion.find(
          {},
          {
            _id: 1,
            codigo: 1,
            roomNumber: 1,
            title: 1,
            hotelCode: 1,
          }
        ).lean();

        const payload = rooms.map((r) => ({
          id: r._id.toString(),
          codigo: r.codigo || "",
          roomNumber: r.roomNumber || "",
          title: r.title || "",
          hotelCode: r.hotelCode || "",
        }));

        res.json(payload);
      } catch (err) {
        console.error("[GET /habitaciones/name.habitaciones] Error:", err);
        res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    }
  );

  /**
   * GET /api/habitaciones/recomendaciones
   */
  router.get("/recomendaciones", async (req, res) => {
    try {
      const limitRaw = parseInt(req.query.limit, 10);
      const limit = Math.min(Math.max(limitRaw || 4, 1), 10);

      const baseQuery = {
        "offer.isSpecial": true,
        "offer.discountPercent": { $gt: 0 },
        inventoryStatus: "Activa",
      };

      let rooms = await Habitacion.find(baseQuery)
        .sort({ favoritesCount: -1, rating: -1, createdAt: -1 })
        .limit(limit);

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
   * GET /api/habitaciones/gestor.admin
   * Vista del panel admin: filtros en backend + paginación (máx 5 por página)
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
        const limit = Math.min(Math.max(limitRaw || 5, 1), 5);
        const skip = (page - 1) * limit;

        const filter = buildHabitacionesFilterFromQuery(req.query);

        const [rooms, total] = await Promise.all([
          Habitacion.find(filter).skip(skip).limit(limit),
          Habitacion.countDocuments(filter),
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
        console.error("[GET /habitaciones/gestor.admin] Error:", err);
        return res.status(500).json({ error: "INTERNAL_ERROR" });
      }
    }
  );

  /**
   * POST /api/habitaciones/:id/favorite
   * Público (website): usa hash de IP para evitar duplicados.
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

      const ip = req.clientIp || getRawIp(req);

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

      if (io) {
        io.emit("habitaciones:updated", room);
      }

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
   * PUBLICO – Reserva express (website, cliente no autenticado)
   * POST /api/habitaciones/:id/reserva-express
   */
  router.post("/:id/reserva-express", async (req, res) => {
    try {
      const { id } = req.params;
      const ipHash = req.clientIpHash;

      if (!ipHash) {
        return res.status(400).json({
          error: "IP_REQUERIDA",
          message:
            "No pudimos identificar tu dispositivo. Intenta de nuevo o contáctanos por el chat.",
        });
      }

      const room = await Habitacion.findById(id).select("+reservaIpHashes");
      if (!room) {
        return res.status(404).json({
          error: "NOT_FOUND",
          message: "Habitación no encontrada.",
        });
      }

      if (room.inventoryStatus && room.inventoryStatus !== "Activa") {
        return res.status(409).json({
          error: "NO_ACTIVA",
          message:
            "Esta habitación no está disponible para nuevas reservas en este momento.",
        });
      }

      const estadoActual =
        typeof room.estadoDeReserva === "number" ? room.estadoDeReserva : 0;

      if (estadoActual === 1) {
        return res.status(409).json({
          error: "YA_RESERVADA",
          message: "Esta habitación ya se encuentra reservada.",
        });
      }

      if (estadoActual === 3) {
        const hashes = Array.isArray(room.reservaIpHashes)
          ? room.reservaIpHashes
          : [];

        if (hashes.includes(ipHash)) {
          // idempotente: el mismo dispositivo que ya la tiene en espera
          return res.json({
            ok: true,
            holder: "self",
            room,
          });
        }

        // Otra IP intenta tomar una habitación que ya está en espera
        return res.status(409).json({
          error: "EN_PROCESO_POR_OTRO",
          message:
            "Esta habitación está siendo reservada en este momento por otro huésped.",
        });
      }

      // estadoActual === 0 → la ponemos en EN ESPERA (3) para este hash
      room.estadoDeReserva = 3;
      if (!Array.isArray(room.reservaIpHashes)) {
        room.reservaIpHashes = [];
      }
      if (!room.reservaIpHashes.includes(ipHash)) {
        room.reservaIpHashes.push(ipHash);
      }

      await room.save();

      if (io) {
        io.emit("habitaciones:updated", room);
      }

      return res.json({
        ok: true,
        holder: "self",
        room,
      });
    } catch (err) {
      console.error(
        "[POST /habitaciones/:id/reserva-express] Error:",
        err
      );
      return res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "No se pudo iniciar la reserva express.",
      });
    }
  });

  /**
   * PUBLICO – Liberar reserva express (cierre de chat desde website)
   * POST /api/habitaciones/:id/reserva-express/liberar
   */
  router.post("/:id/reserva-express/liberar", async (req, res) => {
    try {
      const { id } = req.params;
      const ipHash = req.clientIpHash;

      if (!ipHash) {
        return res.status(400).json({
          error: "IP_REQUERIDA",
          message:
            "No pudimos identificar tu dispositivo para liberar la habitación.",
        });
      }

      const room = await Habitacion.findById(id).select("+reservaIpHashes");
      if (!room) {
        return res.status(404).json({
          error: "NOT_FOUND",
          message: "Habitación no encontrada.",
        });
      }

      const estadoActual =
        typeof room.estadoDeReserva === "number" ? room.estadoDeReserva : 0;
      const hashes = Array.isArray(room.reservaIpHashes)
        ? room.reservaIpHashes
        : [];

      if (estadoActual !== 3) {
        // Ya no está en espera; devolvemos OK para no romper UX
        return res.json({
          ok: true,
          room,
          message: "La habitación ya no estaba marcada en espera.",
        });
      }

      const idx = hashes.indexOf(ipHash);
      if (idx === -1) {
        return res.status(403).json({
          error: "NO_ES_TU_RESERVA",
          message:
            "Esta reserva en espera fue iniciada desde otro dispositivo.",
        });
      }

      hashes.splice(idx, 1);
      room.reservaIpHashes = hashes;

      if (hashes.length === 0) {
        room.estadoDeReserva = 0; // vuelve a disponible
      }

      await room.save();

      if (io) {
        io.emit("habitaciones:updated", room);
      }

      return res.json({
        ok: true,
        room,
      });
    } catch (err) {
      console.error(
        "[POST /habitaciones/:id/reserva-express/liberar] Error:",
        err
      );
      return res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "No se pudo liberar la habitación.",
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

        if (io) {
          io.emit("habitaciones:created", room);
        }

        res.status(201).json(room);
      } catch (err) {
        console.error("[POST /habitaciones] Error:", err);
        res.status(400).json({ error: "BAD_REQUEST", details: err.message });
      }
    }
  );

  /**
   * PATCH /api/habitaciones/:id/estado-reserva
   * Solo panel admin (autenticado).
   * Si se pasa a 0 ó 1, se limpian reservaIpHashes.
   */
  router.patch(
    "/:id/estado-reserva",
    authMiddleware,
    requirePermissions(["manage_rooms"]),
    async (req, res) => {
      try {
        const { id } = req.params;
        let { estadoDeReserva } = req.body;

        if (estadoDeReserva === undefined || estadoDeReserva === null) {
          return res.status(400).json({
            error: "BAD_REQUEST",
            message: "estadoDeReserva es requerido.",
          });
        }

        estadoDeReserva = Number(estadoDeReserva);

        if (![0, 1, 3].includes(estadoDeReserva)) {
          return res.status(400).json({
            error: "BAD_REQUEST",
            message:
              "estadoDeReserva inválido. Usa 0 (no reservada), 1 (reservada), 3 (en espera).",
          });
        }

        const updateDoc = { estadoDeReserva };

        // Si el admin la pasa a 0 o 1, limpiamos cualquier lock de IP
        if (estadoDeReserva !== 3) {
          updateDoc.reservaIpHashes = [];
        }

        const room = await Habitacion.findByIdAndUpdate(id, updateDoc, {
          new: true,
        });

        if (!room) {
          return res.status(404).json({
            error: "NOT_FOUND",
            message: "Habitación no encontrada.",
          });
        }

        if (io) {
          io.emit("habitaciones:updated", room);
        }

        return res.json(room);
      } catch (err) {
        console.error("[PATCH /habitaciones/:id/estado-reserva] Error:", err);
        return res.status(500).json({
          error: "INTERNAL_ERROR",
          message: "Error al actualizar el estado de reserva.",
        });
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
          {
            new: true,
          }
        );
        if (!room) return res.status(404).json({ error: "NOT_FOUND" });

        if (io) {
          io.emit("habitaciones:updated", room);
        }

        res.json(room);
      } catch (err) {
        console.error("[PUT /habitaciones/:id] Error:", err);
        res.status(400).json({ error: "BAD_REQUEST", details: err.message });
      }
    }
  );

  /**
   * DELETE /api/habitaciones/:id
   */
  router.delete(
    "/:id",
    authMiddleware,
    requirePermissions(["manage_rooms"]),
    async (req, res) => {
      const room = await Habitacion.findByIdAndDelete(req.params.id);
      if (!room) return res.status(404).json({ error: "NOT_FOUND" });

      if (io) {
        io.emit("habitaciones:deleted", { _id: req.params.id });
      }

      res.json({ message: "Habitación eliminada" });
    }
  );

  return router;
}

module.exports = createHabitacionesRouter;
