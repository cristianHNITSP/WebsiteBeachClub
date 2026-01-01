const express = require('express');
const bcrypt = require('bcrypt');
const { body, param, validationResult } = require('express-validator');

const User = require('../models/User');
const Sede = require('../models/Sede');

const authMiddleware = require('../middlewares/auth.middleware');
const { requirePermissions } = require('../middlewares/require.Permissions');

const router = express.Router();

/* =========================================================
   HELPERS
   ========================================================= */

const escapeRegExp = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* =========================================================
   GET /api/users
   ========================================================= */
router.get(
  '/',
  authMiddleware,
  requirePermissions(['manage_users']),
  async (req, res) => {
    try {
      let { offset, limit, role, state, q, sedeId } = req.query;

      const skip = Math.max(parseInt(offset, 10) || 0, 0);
      const pageSizeRaw = parseInt(limit, 10);
      const pageSize = Math.min(Math.max(pageSizeRaw || 5, 1), 5);

      const filter = {};

      if (role && ['administrador', 'staff'].includes(role)) {
        filter.role = role;
      }

      if (state === 'active') filter.isActive = true;
      else if (state === 'inactive') filter.isActive = false;

      // 👇 FILTRO REAL POR SEDE (ObjectId)
      if (sedeId) {
        filter.sede = sedeId;
      }

      if (q && typeof q === 'string' && q.trim() !== '') {
        const safe = escapeRegExp(q.trim());
        const regex = new RegExp(safe, 'i');
        filter.$or = [{ name: regex }, { email: regex }, { role: regex }];
      }

      const [total, users] = await Promise.all([
        User.countDocuments(filter),
        User.find(filter)
          .populate('sede', 'key name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .select('-password -tokens')
          .lean(),
      ]);

      const count = users.length;
      const hasMore = skip + count < total;

      return res.json({
        total,
        offset: skip,
        limit: pageSize,
        count,
        hasMore,
        items: users,
      });
    } catch (err) {
      console.error('Error al obtener usuarios:', err);
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Error interno del servidor al obtener usuarios',
      });
    }
  }
);

/* =========================================================
   POST /api/users
   ========================================================= */
router.post(
  '/',
  authMiddleware,
  requirePermissions(['manage_users']),
  [
    body('name').isString().trim().notEmpty(),
    body('email').isEmail(),
    body('password').isString().isLength({ min: 8 }),
    body('role')
      .optional()
      .isIn(['administrador', 'staff']),
    body('sedeId')
      .isMongoId()
      .withMessage('Sede inválida'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        details: errors.array(),
      });
    }

    try {
      const { name, email, password, role = 'staff', sedeId } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(409).json({
          error: 'EMAIL_IN_USE',
          message: 'Ya existe un usuario con ese correo.',
        });
      }

      const sede = await Sede.findById(sedeId);
      if (!sede || !sede.isActive) {
        return res.status(400).json({
          error: 'INVALID_SEDE',
          message: 'La sede no existe o está inactiva.',
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role,
        sede: sede._id,
        isActive: true,
      });

      const userObj = await User.findById(user._id)
        .populate('sede', 'key name')
        .select('-password -tokens')
        .lean();

      return res.status(201).json({
        message: 'Usuario creado correctamente',
        user: userObj,
      });
    } catch (err) {
      console.error('Error al crear usuario:', err);
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Error interno del servidor',
      });
    }
  }
);

/* =========================================================
   PUT /api/users/me
   ========================================================= */
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHENTICATED' });
    }

    const { name } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Nombre inválido',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    if (user.name.trim() === name.trim()) {
      return res.status(400).json({ error: 'NO_CHANGES' });
    }

    user.name = name.trim();
    await user.save();

    const updated = await User.findById(userId)
      .populate('sede', 'key name')
      .select('-password -tokens')
      .lean();

    return res.json({
      message: 'Perfil actualizado correctamente',
      user: updated,
    });
  } catch (err) {
    console.error('Error al actualizar perfil:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/* =========================================================
   PUT /api/users/:id
   ========================================================= */
router.put(
  '/:id',
  authMiddleware,
  requirePermissions(['manage_users']),
  [
    param('id').isMongoId(),
    body('name').optional().isString().trim().notEmpty(),
    body('email').optional().isEmail(),
    body('role').optional().isIn(['administrador', 'staff']),
    body('isActive').optional().isBoolean(),
    body('sedeId').optional().isMongoId(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: errors.array() });
    }

    const { id } = req.params;
    const { name, email, role, isActive, sedeId } = req.body;

    const updates = {};

    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) updates.email = email.toLowerCase().trim();
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

    if (sedeId) {
      const sede = await Sede.findById(sedeId);
      if (!sede) {
        return res.status(400).json({ error: 'INVALID_SEDE' });
      }
      updates.sede = sede._id;
    }

    try {
      const user = await User.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      )
        .populate('sede', 'key name')
        .select('-password -tokens');

      if (!user) {
        return res.status(404).json({ error: 'USER_NOT_FOUND' });
      }

      return res.json({
        message: 'Usuario actualizado correctamente',
        user,
      });
    } catch (err) {
      console.error('Error al actualizar usuario:', err);
      return res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  }
);

/* =========================================================
   PATCH /api/users/:id/status
   ========================================================= */
router.patch(
  '/:id/status',
  authMiddleware,
  requirePermissions(['manage_users']),
  [
    param('id').isMongoId(),
    body('isActive').isBoolean(),
  ],
  async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: { isActive: req.body.isActive } },
        { new: true }
      )
        .populate('sede', 'key name')
        .select('-password -tokens');

      if (!user) {
        return res.status(404).json({ error: 'USER_NOT_FOUND' });
      }

      return res.json({
        message: `Usuario ${req.body.isActive ? 'activado' : 'desactivado'} correctamente`,
        user,
      });
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      return res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  }
);

module.exports = router;
