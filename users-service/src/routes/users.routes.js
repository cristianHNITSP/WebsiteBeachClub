const express = require('express');
const bcrypt = require('bcrypt');
const { body, param, validationResult } = require('express-validator');

const User = require('../models/User');
const authMiddleware = require('../middlewares/auth.middleware');
const { requirePermissions } = require('../middlewares/require.Permissions');

const router = express.Router();

/**
 * GET /api/users
 *
 * Solo quien tenga manage_users puede ver la lista.
 *
 * Paginación por índice (máx. 5 por página en backend):
 *   - ?offset=0&limit=5   // aunque envíen más, el backend limitará a 5
 *
 * Filtros opcionales (se ejecutan SIEMPRE en backend):
 *   - ?role=administrador | staff
 *   - ?state=active | inactive
 *   - ?q=texto   (busca por nombre, email o rol)
 *
 * Respuesta:
 * {
 *   total: number,
 *   offset: number,
 *   limit: number,
 *   count: number,
 *   hasMore: boolean,
 *   items: [ ...usuarios... ]
 * }
 */
router.get(
  '/',
  authMiddleware,
  requirePermissions(['manage_users']),
  async (req, res) => {
    try {
      let { offset, limit, role, state, q } = req.query;

      const skip = Math.max(parseInt(offset, 10) || 0, 0);
      const pageSizeRaw = parseInt(limit, 10);

      // ✅ Máximo 5 registros por página sin importar lo que mande el cliente
      const pageSize = Math.min(Math.max(pageSizeRaw || 5, 1), 5);

      const filter = {};

      if (role && ['administrador', 'staff'].includes(role)) {
        filter.role = role;
      }

      if (state === 'active') {
        filter.isActive = true;
      } else if (state === 'inactive') {
        filter.isActive = false;
      }

      if (q && typeof q === 'string' && q.trim() !== '') {
        const regex = new RegExp(q.trim(), 'i');
        filter.$or = [
          { name: regex },
          { email: regex },
          { role: regex }, // 🔎 también permite buscar por texto del rol
        ];
      }

      const [total, users] = await Promise.all([
        User.countDocuments(filter),
        User.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .select('-password -tokens'),
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
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Error interno del servidor al obtener usuarios',
      });
    }
  }
);

/**
 * POST /api/users
 *
 * Crear nuevo usuario (solo para quienes tienen manage_users).
 * - name (obligatorio)
 * - email (obligatorio, único)
 * - role ('administrador' | 'staff', por defecto 'staff')
 * - password (obligatorio, se guarda encriptada)
 */
router.post(
  '/',
  authMiddleware,
  requirePermissions(['manage_users']),
  [
    body('name')
      .exists()
      .withMessage('El nombre es obligatorio')
      .bail()
      .isString()
      .trim()
      .notEmpty()
      .withMessage('El nombre no puede estar vacío'),
    body('email')
      .exists()
      .withMessage('El correo es obligatorio')
      .bail()
      .isEmail()
      .withMessage('Correo no válido'),
    body('role')
      .optional()
      .isIn(['administrador', 'staff'])
      .withMessage('Rol no válido. Usa "administrador" o "staff".'),
    body('password')
      .exists()
      .withMessage('La contraseña es obligatoria')
      .bail()
      .isString()
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        details: errors.array(),
      });
    }

    try {
      const { name, email, role = 'staff', password } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      // Verificar si ya existe el correo
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(409).json({
          error: 'EMAIL_IN_USE',
          message: 'Ya existe un usuario con ese correo.',
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: role || 'staff',
        isActive: true,
      });

      const userObj = user.toObject();
      delete userObj.password;
      delete userObj.tokens;

      return res.status(201).json({
        message: 'Usuario creado correctamente',
        user: userObj,
      });
    } catch (err) {
      console.error('Error al crear usuario:', err);

      if (err.code === 11000 && err.keyPattern?.email) {
        return res.status(409).json({
          error: 'EMAIL_IN_USE',
          message: 'Ya existe un usuario con ese correo.',
        });
      }

      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Error interno del servidor al crear el usuario',
      });
    }
  }
);

/**
 * PUT /api/users/:id
 * Editar información general del usuario:
 * - name
 * - email
 * - role ('administrador' | 'staff')
 * - isActive (boolean)
 */
router.put(
  '/:id',
  authMiddleware,
  requirePermissions(['manage_users']),
  [
    param('id').isMongoId().withMessage('ID de usuario no válido'),
    body('name')
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage('El nombre no puede estar vacío'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Correo no válido'),
    body('role')
      .optional()
      .isIn(['administrador', 'staff'])
      .withMessage('Rol no válido. Usa "administrador" o "staff".'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive debe ser booleano'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        details: errors.array(),
      });
    }

    const { id } = req.params;
    const { name, email, role, isActive } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email.toLowerCase().trim();
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

    try {
      const user = await User.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password -tokens');

      if (!user) {
        return res.status(404).json({
          error: 'USER_NOT_FOUND',
          message: 'Usuario no encontrado',
        });
      }

      return res.json({
        message: 'Usuario actualizado correctamente',
        user,
      });
    } catch (err) {
      console.error('Error al actualizar usuario:', err);

      if (err.code === 11000 && err.keyPattern?.email) {
        return res.status(409).json({
          error: 'EMAIL_IN_USE',
          message: 'Ya existe un usuario con ese correo.',
        });
      }

      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Error interno del servidor al actualizar el usuario',
      });
    }
  }
);

/**
 * PATCH /api/users/:id/status
 * Cambiar rápido el estado isActive (activar/desactivar).
 * Body: { isActive: true/false }
 */
router.patch(
  '/:id/status',
  authMiddleware,
  requirePermissions(['manage_users']),
  [
    param('id').isMongoId().withMessage('ID de usuario no válido'),
    body('isActive')
      .exists()
      .withMessage('isActive es requerido')
      .isBoolean()
      .withMessage('isActive debe ser booleano'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        details: errors.array(),
      });
    }

    const { id } = req.params;
    const { isActive } = req.body;

    try {
      const user = await User.findByIdAndUpdate(
        id,
        { $set: { isActive } },
        { new: true, runValidators: true }
      ).select('-password -tokens');

      if (!user) {
        return res.status(404).json({
          error: 'USER_NOT_FOUND',
          message: 'Usuario no encontrado',
        });
      }

      return res.json({
        message: `Usuario ${isActive ? 'activado' : 'desactivado'} correctamente`,
        user,
      });
    } catch (err) {
      console.error('Error al actualizar estado de usuario:', err);
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Error interno del servidor al actualizar el estado',
      });
    }
  }
);

module.exports = router;
