// src/routes/habitaciones.routes.js
const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const Habitacion = require("../models/Habitacion");
const Reserva = require("../models/Reserva");
const authMiddleware = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/require.Permissions");

/* ===================== ✅ Normalización hotelCode + aliases (compat) ===================== */
const normalizeSedeKey = (name) => {
  return (
    String(name || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "sede"
  );
};

// Alias viejo -> canonical (NO es hardcode de sedes, es compat)
const SEDE_ALIASES = {
  cabanas_fridas: "cabanas_frida",
};

// reverse: canonical -> [aliases...]
const SEDE_ALIAS_REVERSE = Object.entries(SEDE_ALIASES).reduce((acc, [from, to]) => {
  acc[to] = acc[to] || [];
  acc[to].push(from);
  return acc;
}, {});

const normalizeHotelCode = (code) => {
  const k = normalizeSedeKey(code);
  return SEDE_ALIASES[k] || k || "sede";
};

const expandHotelCodeFilter = (hotelCode) => {
  const raw = normalizeSedeKey(hotelCode);
  const canonical = normalizeHotelCode(raw);
  const list = [canonical];

  // si canonical tiene aliases antiguos, incluirlos para que encuentres docs viejos
  const rev = SEDE_ALIAS_REVERSE[canonical] || [];
  for (const a of rev) list.push(a);

  // si el usuario mandó un raw distinto, incluirlo también por seguridad
  if (raw && raw !== canonical) list.push(raw);

  // unique
  return [...new Set(list.filter(Boolean))];
};

/* =============== Favoritos: seguimos usando IP hash (solo favoritos) =============== */
const getRawIp = (req) => {
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (xForwardedFor) return xForwardedFor.split(",")[0].trim();
  return req.ip || req.connection?.remoteAddress || "unknown";
};

/* ===================== Upload config ===================== */
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
const HAB_UPLOAD_DIR = path.join(UPLOAD_ROOT, "habitaciones");
fs.mkdirSync(HAB_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, HAB_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext && ext.length <= 8 ? ext : "";
    const name = crypto.randomBytes(16).toString("hex");
    cb(null, `${Date.now()}_${name}${safeExt}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ok = /^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype || "");
  if (!ok) return cb(new Error("INVALID_IMAGE_TYPE"));
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
});

/* ===================== Helpers: imágenes locales (borrado seguro) ===================== */
const cleanUrl = (u) => String(u || "").trim();

const normalizeRoomImages = (room) => {
  const arr = Array.isArray(room?.images)
    ? room.images.map(cleanUrl).filter(Boolean)
    : [];
  if (arr.length) return arr;
  const legacy = cleanUrl(room?.img);
  return legacy ? [legacy] : [];
};

function extractHabitacionFilenameFromUrl(url) {
  const u = cleanUrl(url);
  if (!u) return null;

  const marker = "/uploads/habitaciones/";
  const idx = u.indexOf(marker);
  if (idx === -1) return null;

  let rest = u.slice(idx + marker.length);
  rest = rest.split("?")[0].split("#")[0];

  const base = path.basename(rest);
  if (!base) return null;

  // Si cambia al hacer basename => intentaron path traversal
  if (base !== rest) return null;

  return base;
}

async function safeUnlinkHabitacionByUrl(url) {
  const filename = extractHabitacionFilenameFromUrl(url);
  if (!filename) return { ok: false, reason: "NOT_LOCAL_OR_INVALID" };

  const abs = path.join(HAB_UPLOAD_DIR, filename);

  try {
    await fs.promises.unlink(abs);
    return { ok: true, deleted: true };
  } catch (err) {
    if (err && err.code === "ENOENT") {
      return { ok: true, deleted: false }; // ya no existe, ok
    }
    throw err;
  }
}

/* ===================== Normaliza offer payload ===================== */
function normalizeOfferPayload(body) {
  const offer = body?.offer || {};
  const isSpecial = !!offer.isSpecial;
  let discount = offer.discountPercent;

  if (!isSpecial)
    return { isSpecial: false, description: "", discountPercent: null };

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

  // ✅ hotelCode (compat con aliases viejos)
  if (hotelCode && hotelCode !== "todas") {
    const codes = expandHotelCodeFilter(hotelCode);
    if (codes.length === 1) and.push({ hotelCode: codes[0] });
    else and.push({ hotelCode: { $in: codes } });
  }

  if (inventoryStatus && inventoryStatus !== "todas")
    and.push({ inventoryStatus });

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
        $or: list.map((tag) => ({
          location: { $regex: tag, $options: "i" },
        })),
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
      return {
        ...hab,
        reservableByStatus,
        blockedByBooking: false,
        available: reservableByStatus,
      };
    });
  }

  const rq = {
    isDeleted: { $ne: true },
    type: "stay",
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  };

  const reservas = await Reserva.find(rq)
    .select("hotel room startDate endDate")
    .lean();

  const reservedSet = new Set();
  for (const r of reservas) {
    if (rangesOverlap(startDate, endDate, r.startDate, r.endDate)) {
      reservedSet.add(`${normalizeHotelCode(r.hotel)}__${String(r.room)}`);
    }
  }

  return rooms.map((hab) => {
    const roomKey = `${normalizeHotelCode(hab.hotelCode)}__${String(
      hab.roomNumber || hab.codigo
    )}`;
    const reservableByStatus = !isRoomUnavailable(hab);
    const blockedByBooking = reservedSet.has(roomKey);
    return {
      ...hab,
      reservableByStatus,
      blockedByBooking,
      available: reservableByStatus && !blockedByBooking,
    };
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
          $or: [
            { endDate: { $gte: todayStr } },
            { endDate: { $exists: false }, startDate: { $gte: todayStr } },
          ],
        },
      ],
    });
  };

  /* ===================== ✅ UPLOAD: imágenes habitaciones ===================== */
  router.post(
    "/upload",
    authMiddleware,
    requirePermissions(["manage_rooms"]),
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            error: "NO_FILE",
            message: "No se recibió ningún archivo.",
          });
        }

        const url = `/uploads/habitaciones/${req.file.filename}`;

        const baseFromEnv = String(process.env.PUBLIC_BASE_URL || "")
          .trim()
          .replace(/\/+$/, "");
        const baseFromReq = `${req.protocol}://${req.get("host")}`;
        const absoluteUrl = `${(baseFromEnv || baseFromReq).replace(/\/+$/, "")}${url}`;

        return res.json({
          url, // ✅ recomendado guardar este
          absoluteUrl,
          filename: req.file.filename,
        });
      } catch (err) {
        console.error("[POST /habitaciones/upload] Error:", err);
        return res.status(500).json({
          error: "UPLOAD_FAILED",
          message: "No se pudo subir la imagen.",
        });
      }
    }
  );

  /* ===================== ✅ DELETE: borrar imagen física (seguro) ===================== */
  router.delete(
    "/images",
    authMiddleware,
    requirePermissions(["manage_rooms"]),
    async (req, res) => {
      try {
        const url = cleanUrl(req.query?.url || req.body?.url);
        if (!url) {
          return res.status(400).json({
            error: "MISSING_URL",
            message: "Falta el parámetro url.",
          });
        }

        const r = await safeUnlinkHabitacionByUrl(url);
        if (!r.ok) {
          return res.status(400).json({
            error: "INVALID_URL",
            message: "La URL no corresponde a un archivo local válido.",
          });
        }

        return res.json({
          ok: true,
          deleted: !!r.deleted,
        });
      } catch (err) {
        console.error("[DELETE /habitaciones/images] Error:", err);
        return res.status(500).json({
          error: "INTERNAL_ERROR",
          message: "No se pudo eliminar la imagen del servidor.",
        });
      }
    }
  );

  router.post(
    "/images/delete",
    authMiddleware,
    requirePermissions(["manage_rooms"]),
    async (req, res) => {
      try {
        const url = cleanUrl(req.body?.url);
        if (!url) {
          return res.status(400).json({
            error: "MISSING_URL",
            message: "Falta el campo url.",
          });
        }

        const r = await safeUnlinkHabitacionByUrl(url);
        if (!r.ok) {
          return res.status(400).json({
            error: "INVALID_URL",
            message: "La URL no corresponde a un archivo local válido.",
          });
        }

        return res.json({ ok: true, deleted: !!r.deleted });
      } catch (err) {
        console.error("[POST /habitaciones/images/delete] Error:", err);
        return res.status(500).json({
          error: "INTERNAL_ERROR",
          message: "No se pudo eliminar la imagen del servidor.",
        });
      }
    }
  );

  /**
   * GET /api/habitaciones/:id/reservas.futuras?page=1&limit=6
   */
  router.get(
    "/:id/reservas.futuras",
    authMiddleware,
    requirePermissions(["view_reservations"]),
    async (req, res) => {
      try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            error: "INVALID_ID",
            message: "ID de habitación inválido.",
          });
        }

        const pageRaw = parseInt(req.query.page, 10);
        const limitRaw = parseInt(req.query.limit, 10);

        const page = Math.max(pageRaw || 1, 1);
        const limit = Math.min(Math.max(limitRaw || 6, 1), 50);
        const skip = (page - 1) * limit;

        const room = await Habitacion.findById(id)
          .select("_id hotelCode roomNumber codigo isDeleted price offer")
          .lean();

        if (!room) {
          return res
            .status(404)
            .json({ error: "NOT_FOUND", message: "Habitación no encontrada." });
        }

        const hoy = todayMeridaStr();

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
            .select(
              "_id codigoReserva hotel room startDate endDate label notes origen checkinAt checkoutAt paidAt createdAt guest paymentMethod totalAmount"
            )
            .lean(),
          Reserva.countDocuments(baseQuery),
        ]);

        const price =
          typeof room.price === "number" && Number.isFinite(room.price)
            ? room.price
            : null;

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
        return res.status(500).json({
          error: "INTERNAL_ERROR",
          message: "No se pudieron cargar las reservas futuras.",
        });
      }
    }
  );

  /**
   * GET /api/habitaciones/public
   */
  router.get("/public", async (req, res) => {
    try {
      const pageRaw = parseInt(req.query.page, 10);
      const limitRaw = parseInt(req.query.limit, 10);

      const page = Math.max(pageRaw || 1, 1);
      const limit = Math.min(Math.max(limitRaw || 6, 1), 6);
      const skip = (page - 1) * limit;

      const filter = buildHabitacionesFilterFromQuery(req.query, {
        forPublic: true,
      });

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

        const filter = buildHabitacionesFilterFromQuery(req.query, {
          forPublic: false,
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
      if (!room)
        return res
          .status(404)
          .json({ error: "NOT_FOUND", message: "Habitación no encontrada." });

      if (room.isDeleted)
        return res.status(409).json({
          error: "TRASHED",
          message: "Esta habitación está en papelera.",
        });

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
          isDeleted: false,
          deletedAt: null,
        };

        delete payload.deletedImages;

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
   * PUT /api/habitaciones/:id (whitelist) + ✅ cleanup deletedImages
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

        const b = req.body || {};
        const allowed = {};

        if (b.codigo !== undefined) allowed.codigo = b.codigo;
        if (b.hotelCode !== undefined) allowed.hotelCode = b.hotelCode;
        if (b.roomNumber !== undefined) allowed.roomNumber = b.roomNumber;
        if (b.title !== undefined) allowed.title = b.title;
        if (b.roomType !== undefined) allowed.roomType = b.roomType;
        if (b.location !== undefined) allowed.location = b.location;

        if (b.img !== undefined) allowed.img = b.img;
        if (b.images !== undefined) allowed.images = b.images;

        if (b.price !== undefined) allowed.price = b.price;
        if (b.rating !== undefined) allowed.rating = b.rating;
        if (b.amenities !== undefined) allowed.amenities = b.amenities;
        if (b.badge !== undefined) allowed.badge = b.badge;
        if (b.featured !== undefined) allowed.featured = b.featured;
        if (b.size !== undefined) allowed.size = b.size;
        if (b.inventoryStatus !== undefined) allowed.inventoryStatus = b.inventoryStatus;

        const offer = normalizeOfferPayload(req.body);

        const existingUrls = new Set(normalizeRoomImages(room));
        const deletedImages = Array.isArray(b.deletedImages)
          ? b.deletedImages.map(cleanUrl).filter(Boolean)
          : [];

        const merged = { ...room.toObject(), ...allowed, offer };

        delete merged._id;
        delete merged.__v;
        delete merged.createdAt;
        delete merged.updatedAt;
        delete merged.isDeleted;
        delete merged.deletedAt;

        room.set(merged);
        await room.save();

        if (deletedImages.length) {
          for (const u of deletedImages) {
            if (!existingUrls.has(cleanUrl(u))) continue;
            try {
              await safeUnlinkHabitacionByUrl(u);
            } catch (e) {
              console.warn(
                "[PUT /habitaciones/:id] No se pudo borrar imagen:",
                u,
                e?.message || e
              );
            }
          }
        }

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
          return res.status(400).json({
            error: "INVALID_ID",
            message: "ID de habitación inválido.",
          });
        }

        const room = await Habitacion.findById(id);
        if (!room) return res.status(404).json({ error: "NOT_FOUND" });

        if (room.isDeleted) {
          return res.status(409).json({
            error: "ALREADY_TRASHED",
            message: "Esta habitación ya está en papelera.",
          });
        }

        const todayStr = todayMeridaStr();
        const pendingCount = await countPendingReservasByHabitacion(id, todayStr);

        if (pendingCount > 0) {
          return res.status(409).json({
            error: "HAS_PENDING_RESERVATIONS",
            message:
              "No puedes enviar esta habitación a papelera: tiene reservas pendientes (futuras o activas).",
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
        res.status(500).json({
          error: "INTERNAL_ERROR",
          details: err?.message || String(err),
        });
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

        const imgs = normalizeRoomImages(room);
        for (const u of imgs) {
          try {
            await safeUnlinkHabitacionByUrl(u);
          } catch (e) {
            console.warn(
              "[DELETE /habitaciones/:id/permanent] No se pudo borrar imagen:",
              u,
              e?.message || e
            );
          }
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
          return res.status(400).json({
            error: "INVALID_ID",
            message: "ID de habitación inválido.",
          });
        }

        const room = await Habitacion.findById(id);
        if (!room) return res.status(404).json({ error: "NOT_FOUND" });

        if (!room.isDeleted) {
          const todayStr = todayMeridaStr();
          const pendingCount = await countPendingReservasByHabitacion(id, todayStr);

          if (pendingCount > 0) {
            return res.status(409).json({
              error: "HAS_PENDING_RESERVATIONS",
              message:
                "No puedes enviar esta habitación a papelera: tiene reservas pendientes (futuras o activas).",
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
        res.status(500).json({
          error: "INTERNAL_ERROR",
          details: err?.message || String(err),
        });
      }
    }
  );

  // ✅ handler de errores de multer
  router.use((err, _req, res, next) => {
    if (!err) return next();

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "FILE_TOO_LARGE",
        message: "La imagen es demasiado pesada (máx 6MB).",
      });
    }
    if (err.message === "INVALID_IMAGE_TYPE") {
      return res.status(400).json({
        error: "INVALID_IMAGE_TYPE",
        message: "Tipo de archivo no permitido. Sube JPG/PNG/WEBP/GIF.",
      });
    }

    console.error("[habitaciones.routes] Unhandled error:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Error inesperado.",
    });
  });

  return router;
}

module.exports = createHabitacionesRouter;
