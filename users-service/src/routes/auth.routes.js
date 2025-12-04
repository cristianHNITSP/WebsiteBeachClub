// routes/auth.routes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');

const router = express.Router();

/**
 * Helper: obtiene token desde Authorization o Cookie
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

    if (!user.isActive) {
      return res.status(403).json({
        error: 'USER_INACTIVE',
        message: 'Tu usuario está inactivo. Contacta al administrador.'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("⚠️ Falta JWT_SECRET en .env");
      return res.status(500).json({
        error: 'SERVER_CONFIG',
        message: 'Configuración de servidor incompleta.'
      });
    }

    const roleDoc = await Role.findOne({ key: user.role });
    const permissions = roleDoc?.permissions || [];

    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      permissions
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    });

    // Guardar token en DB (historial 10 max)
    user.tokens = Array.isArray(user.tokens) ? user.tokens : [];
    user.tokens.push({ token });
    user.tokens = user.tokens.slice(-10);

    user.lastLogin = new Date();
    await user.save();

    // ✅ COOKIE FUNCIONAL EN HTTP
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: false,          // 🔥 HTTP => debe ser false
      sameSite: 'lax',        // 🔥 compatible con HTTP
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      permissions,
      token
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
        message: 'No autorizado.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('+tokens');
    if (!user) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Usuario no encontrado.'
      });
    }

    const roleDoc = await Role.findOne({ key: user.role });
    const permissions = roleDoc?.permissions || [];

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      permissions,
      token,
      tokenInStore: user.tokens?.some(t => t.token === token)
    });

  } catch (err) {
    console.error('[auth/me] Error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Error interno.'
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
      return res.status(400).json({ error: "NO_TOKEN" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+tokens');

    if (user) {
      user.tokens = user.tokens.filter(t => t.token !== token);
      await user.save();
    }

    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: false,   // 🔥 HTTP
      sameSite: "lax",
      path: "/",
    });

    return res.json({ message: "Sesión cerrada correctamente" });

  } catch (err) {
    console.error("[auth/logout] Error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

module.exports = router;
