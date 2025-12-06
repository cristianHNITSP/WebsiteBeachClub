// reservas-service/src/routes/heroSlide.routes.js
const express = require("express");
const mongoose = require("mongoose"); // ✅ FIX: faltaba (tu DELETE lo usa)
const HeroSlide = require("../models/HeroSlide");
const authMiddleware = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/require.Permissions");

const router = express.Router();

/** ✅ Normaliza imágenes para evitar ORB (foto.jpg => /uploads/foto.jpg) */
const normalizeImg = (img) => {
  const s = String(img || "").trim();
  if (!s) return s;

  // URLs absolutas y data/blob
  if (/^(https?:)?\/\//i.test(s) || s.startsWith("data:") || s.startsWith("blob:")) return s;

  // ya viene bien
  if (s.startsWith("/uploads/")) return s;
  if (s.startsWith("uploads/")) return `/${s}`;

  // si es un path absoluto distinto (ej /assets/..), lo respetamos
  if (s.startsWith("/")) return s;

  // filename suelto -> /uploads/filename
  return `/uploads/${s}`;
};

/**
 * GET /api/hero-slides/public
 * Ruta pública para el sitio web (home).
 * Solo devuelve slides activos, ordenados.
 */
router.get("/public", async (req, res) => {
  try {
    const slides = await HeroSlide.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    // ✅ devuelve img normalizada para evitar ORB
    const normalized = (slides || []).map((s) => ({
      ...s,
      img: normalizeImg(s.img),
    }));

    return res.json(normalized);
  } catch (err) {
    console.error("[GET /hero-slides/public] Error:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "No se pudieron obtener los slides.",
    });
  }
});

/**
 * GET /api/hero-slides
 * Lista de slides para panel admin
 */
router.get("/", authMiddleware, requirePermissions(["manage_rooms"]), async (req, res) => {
  try {
    const slides = await HeroSlide.find().sort({ order: 1, createdAt: 1 }).lean();

    const normalized = (slides || []).map((s) => ({
      ...s,
      img: normalizeImg(s.img),
    }));

    return res.json(normalized);
  } catch (err) {
    console.error("[GET /hero-slides] Error:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "No se pudo obtener la lista de hero-slides.",
    });
  }
});

/**
 * PUT /api/hero-slides/:id
 * Actualizar un slide (edición inline)
 */
router.put("/:id", authMiddleware, requirePermissions(["manage_rooms"]), async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id === "undefined" || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "INVALID_ID",
        message: "ID inválido para actualizar hero-slide.",
      });
    }

    const updatableFields = ["title", "subtitle", "badgeText", "img", "order", "isActive"];
    const update = {};

    updatableFields.forEach((field) => {
      if (field in req.body) {
        update[field] = req.body[field];
      }
    });

    // ✅ si están editando la imagen, normalízala para evitar ORB
    if ("img" in update) {
      update.img = normalizeImg(update.img);
    }

    const slide = await HeroSlide.findByIdAndUpdate(id, update, { new: true }).lean();

    if (!slide) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "HeroSlide no encontrado.",
      });
    }

    return res.json({ ...slide, img: normalizeImg(slide.img) });
  } catch (err) {
    console.error("[PUT /hero-slides/:id] Error:", err);
    return res.status(400).json({
      error: "BAD_REQUEST",
      message: "No se pudo actualizar el hero-slide.",
      details: err.message,
    });
  }
});

/**
 * POST /api/hero-slides
 * Crear un nuevo slide
 */
router.post("/", authMiddleware, requirePermissions(["manage_rooms"]), async (req, res) => {
  try {
    const payload = { ...(req.body || {}) };

    // ✅ normaliza img al crear
    if ("img" in payload) payload.img = normalizeImg(payload.img);

    const slide = await HeroSlide.create(payload);
    return res.status(201).json(slide);
  } catch (err) {
    console.error("[POST /hero-slides] Error:", err);
    return res.status(400).json({
      error: "BAD_REQUEST",
      message: "No se pudo crear el hero-slide.",
      details: err.message,
    });
  }
});

/**
 * DELETE /api/hero-slides/:id
 */
router.delete("/:id", authMiddleware, requirePermissions(["manage_rooms"]), async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ FIX: ya funciona porque ahora sí importamos mongoose
    if (!id || id === "undefined" || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "INVALID_ID",
        message: "ID inválido para eliminar hero-slide.",
      });
    }

    const slide = await HeroSlide.findByIdAndDelete(id);

    if (!slide) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "HeroSlide no encontrado.",
      });
    }

    return res.json({ message: "HeroSlide eliminado", id });
  } catch (err) {
    console.error("[DELETE /hero-slides/:id] Error:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "No se pudo eliminar el hero-slide.",
      details: err?.message,
    });
  }
});

module.exports = router;
