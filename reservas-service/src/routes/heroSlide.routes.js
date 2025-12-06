// src/routes/heroSlide.routes.js
const express = require("express");
const HeroSlide = require("../models/HeroSlide");
const authMiddleware = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/require.Permissions");

const router = express.Router();

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

    return res.json(slides);
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
 * Lista de slides para panel admin (puedes usar luego en un panel).
 */
router.get(
  "/",
  authMiddleware,
  requirePermissions(["manage_rooms"]),
  async (req, res) => {
    try {
      const slides = await HeroSlide.find().sort({
        order: 1,
        createdAt: 1,
      });

      return res.json(slides);
    } catch (err) {
      console.error("[GET /hero-slides] Error:", err);
      return res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "No se pudo obtener la lista de hero-slides.",
      });
    }
  }
);

/**
 * PUT /api/hero-slides/:id
 * Actualizar un slide (lo que usa tu edición inline desde el HeroCarousel).
 */
router.put(
  "/:id",
  authMiddleware,
  requirePermissions(["manage_rooms"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Solo permitimos actualizar estos campos
      const updatableFields = [
        "title",
        "subtitle",
        "badgeText",
        "img",
        "order",
        "isActive",
      ];

      const update = {};
      updatableFields.forEach((field) => {
        if (field in req.body) {
          update[field] = req.body[field];
        }
      });

      const slide = await HeroSlide.findByIdAndUpdate(id, update, {
        new: true,
      });

      if (!slide) {
        return res.status(404).json({
          error: "NOT_FOUND",
          message: "HeroSlide no encontrado.",
        });
      }

      return res.json(slide);
    } catch (err) {
      console.error("[PUT /hero-slides/:id] Error:", err);
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "No se pudo actualizar el hero-slide.",
        details: err.message,
      });
    }
  }
);

/**
 * (Opcional) POST /api/hero-slides
 * Crear un nuevo slide desde el panel.
 */
router.post(
  "/",
  authMiddleware,
  requirePermissions(["manage_rooms"]),
  async (req, res) => {
    try {
      const slide = await HeroSlide.create(req.body);
      return res.status(201).json(slide);
    } catch (err) {
      console.error("[POST /hero-slides] Error:", err);
      return res.status(400).json({
        error: "BAD_REQUEST",
        message: "No se pudo crear el hero-slide.",
        details: err.message,
      });
    }
  }
);

/**
 * (Opcional) DELETE /api/hero-slides/:id
 */
router.delete(
  "/:id",
  authMiddleware,
  requirePermissions(["manage_rooms"]), // o el permiso que uses para hero-slides
  async (req, res) => {
    try {
      const { id } = req.params;

      // ✅ evita CastError cuando llega undefined / basura / id inválido
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
      });
    }
  }
);

module.exports = router;
