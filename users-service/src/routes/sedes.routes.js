const express = require('express');
const { body, param, validationResult } = require('express-validator');

const Sede = require('../models/Sede');
const authMiddleware = require('../middlewares/auth.middleware');
const { requirePermissions } = require('../middlewares/require.Permissions');

const router = express.Router();

/**
 * GET /api/sedes
 * Listar sedes
 */
router.get(
  '/',
  authMiddleware,
  requirePermissions(['manage_users']),
  async (req, res) => {
    const sedes = await Sede.find().sort({ createdAt: -1 }).lean();
    res.json(sedes);
  }
);

/**
 * POST /api/sedes
 * Crear sede
 */
router.post(
  '/',
  authMiddleware,
  requirePermissions(['manage_users']),
  [
    body('key').isString().trim().notEmpty(),
    body('name').isString().trim().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: errors.array() });
    }

    try {
      const sede = await Sede.create(req.body);
      res.status(201).json(sede);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'DUPLICATE_KEY' });
      }
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * PUT /api/sedes/:id
 * Editar sede
 */
router.put(
  '/:id',
  authMiddleware,
  requirePermissions(['manage_users']),
  [
    param('id').isMongoId(),
    body('name').optional().isString().trim(),
    body('description').optional().isString(),
    body('isActive').optional().isBoolean(),
  ],
  async (req, res) => {
    const sede = await Sede.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!sede) {
      return res.status(404).json({ error: 'SEDE_NOT_FOUND' });
    }

    res.json(sede);
  }
);

/**
 * PATCH /api/sedes/:id/status
 */
router.patch(
  '/:id/status',
  authMiddleware,
  requirePermissions(['manage_users']),
  [
    param('id').isMongoId(),
    body('isActive').isBoolean(),
  ],
  async (req, res) => {
    const sede = await Sede.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: req.body.isActive } },
      { new: true }
    );

    if (!sede) {
      return res.status(404).json({ error: 'SEDE_NOT_FOUND' });
    }

    res.json(sede);
  }
);

module.exports = router;
