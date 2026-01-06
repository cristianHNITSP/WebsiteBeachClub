// routes/sedes.routes.js
const express = require("express");
const mongoose = require("mongoose");
const Sede = require("../models/Sede"); // asegúrate de tener este modelo
const Habitacion = require("../models/Habitacion");
const authMiddleware = require("../middlewares/auth.middleware");
const { requirePermissions } = require("../middlewares/require.Permissions");

const router = express.Router();

/**
 * GET /api/sedes
 * Devuelve todas las sedes
 */
router.get(
  "/",
  authMiddleware,
  requirePermissions(["manage_rooms"]), // o el permiso que prefieras
  async (req, res) => {
    try {
      const sedes = await Sede.find({}).sort({ name: 1 }).lean();
      return res.json(sedes);
    } catch (err) {
      console.error("[GET /sedes] Error:", err);
      return res
        .status(500)
        .json({ error: "INTERNAL_ERROR", message: "No se pudieron cargar las sedes." });
    }
  }
);

/**
 * POST /api/sedes
 * body: { key, name }
 */
router.post(
  "/",
  authMiddleware,
  requirePermissions(["manage_rooms"]),
  async (req, res) => {
    try {
      const { key, name } = req.body || {};

      if (!name || !key) {
        return res
          .status(400)
          .json({ error: "BAD_REQUEST", message: "Nombre y clave son obligatorios." });
      }

      const existing = await Sede.findOne({
        $or: [{ key }, { name }],
      }).lean();

      if (existing) {
        return res.status(409).json({
          error: "SEDE_EXISTS",
          message: "Ya existe una sede con ese nombre o clave.",
        });
      }

      const sede = await Sede.create({
        key,
        name,
        isActive: true,
      });

      return res.status(201).json(sede);
    } catch (err) {
      console.error("[POST /sedes] Error:", err);
      return res
        .status(500)
        .json({ error: "INTERNAL_ERROR", message: "No se pudo crear la sede." });
    }
  }
);

/**
 * PATCH /api/sedes/:id/status
 * body: { isActive: boolean }
 * No permite desactivar si hay habitaciones activas con esa sede.
 */
router.patch(
  "/:id/status",
  authMiddleware,
  requirePermissions(["manage_rooms"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res
          .status(400)
          .json({ error: "INVALID_ID", message: "ID de sede inválido." });
      }

      const sede = await Sede.findById(id);
      if (!sede) {
        return res
          .status(404)
          .json({ error: "NOT_FOUND", message: "Sede no encontrada." });
      }

      // Si estamos intentando DESACTIVAR:
      if (isActive === false) {
        const sedeKey = sede.key;

        const activeRooms = await Habitacion.countDocuments({
          hotelCode: sedeKey,
          isDeleted: { $ne: true },
          inventoryStatus: "Activa",
        });

        if (activeRooms > 0) {
          return res.status(409).json({
            error: "SEDE_HAS_ACTIVE_ROOMS",
            message:
              "No puedes desactivar esta sede porque tiene habitaciones activas. " +
              "Pásalas a mantenimiento, bloqueadas o envíalas a papelera primero.",
            activeRooms,
          });
        }
      }

      sede.isActive = !!isActive;
      await sede.save();

      return res.json({
        message: "Estado de la sede actualizado.",
        sede,
      });
    } catch (err) {
      console.error("[PATCH /sedes/:id/status] Error:", err);
      return res
        .status(500)
        .json({ error: "INTERNAL_ERROR", message: "No se pudo actualizar la sede." });
    }
  }
);

module.exports = router;
