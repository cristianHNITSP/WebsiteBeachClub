// routes/auth.routes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');

const router = express.Router();

/**
 * Helper: obtiene el token desde Authorization o cookie
 */
function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  const tokenFromCookie = req.cookies?.auth_token;

  return tokenFromHeader || tokenFromCookie || null;
}

/**
 * POST /api/auth/login
 */
// routes/auth.routes.js
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Email y contraseña son obligatorios.'
      });
    }

    const user = await User.findOne({ email }).select('+password +tokens');
    if (!user) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Usuario o contraseña incorrectos.'
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Usuario o contraseña incorrectos.'
      });
    }

    // 🚫 Usuario inactivo: NO generar token, NO dejar entrar
    if (!user.isActive) {
      return res.status(403).json({
        error: 'USER_INACTIVE',
        message:
          'Tu usuario está inactivo. Contacta al administrador del sistema para reactivar tu acceso.'
      });
    }

    if (!Array.isArray(user.tokens)) {
      user.tokens = [];
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET no está definido en las variables de entorno');
      return res.status(500).json({
        error: 'SERVER_MISCONFIG',
        message: 'Configuración del servidor incompleta.'
      });
    }

    // 🔎 Buscar el rol del usuario y sus permisos
    const roleDoc = await Role.findOne({ key: user.role });
    const permissions = roleDoc?.permissions || [];

    // ✨ Payload con permisos embebidos
    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      permissions
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    });

    user.tokens.push({ token });
    if (user.tokens.length > 10) {
      user.tokens = user.tokens.slice(-10);
    }
    user.lastLogin = new Date();
    await user.save();

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 8 * 60 * 60 * 1000
    });

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      permissions, // 👈 para el frontend
      token        // 👈 token actual de esta sesión
    });
  } catch (err) {
    console.error('[auth/login] Error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno en login.'
    });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', async (req, res) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        error: 'NO_TOKEN',
        message: 'No autorizado: token no proporcionado.'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET no está definido en las variables de entorno');
      return res.status(500).json({
        error: 'SERVER_MISCONFIG',
        message: 'Configuración del servidor incompleta.'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'TOKEN_EXPIRED',
          message: 'Sesión expirada.'
        });
      }
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Token inválido.'
      });
    }

    const user = await User.findById(decoded.id).select('+tokens');
    if (!user) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Usuario no encontrado.'
      });
    }

    // Volver a cargar permisos desde la colección Role
    const roleDoc = await Role.findOne({ key: user.role });
    const permissions = roleDoc?.permissions || [];

    const matchingToken = user.tokens?.find(t => t.token === token) || null;

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      permissions,
      token,
      tokenInStore: !!matchingToken
    });
  } catch (err) {
    console.error('[auth/me] Error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno en /auth/me.'
    });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(400).json({
        error: 'NO_TOKEN',
        message: 'No hay token en la cookie ni en el header.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+tokens');
    if (user) {
      user.tokens = user.tokens.filter(t => t.token !== token);
      await user.save();
    }

    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    });

    return res.json({ message: 'Sesión cerrada correctamente' });
  } catch (err) {
    console.error('[auth/logout] Error:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
