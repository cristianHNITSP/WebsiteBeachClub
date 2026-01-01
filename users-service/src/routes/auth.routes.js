const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Role = require('../models/Role');

const router = express.Router();

/* =========================================================
   HELPERS
   ========================================================= */
function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  return tokenFromHeader || req.cookies?.auth_token || null;
}

/* =========================================================
   POST /api/auth/login
   ========================================================= */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Email y contraseña son obligatorios.',
      });
    }

    const user = await User.findOne({ email })
      .populate('sede', 'key name')
      .select('+password +tokens');

    if (!user) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'USER_INACTIVE' });
    }

    const roleDoc = await Role.findOne({ key: user.role });
    const permissions = roleDoc?.permissions || [];

    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      permissions,
      sedeId: user.sede?._id,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    user.tokens.push({ token });
    user.tokens = user.tokens.slice(-10);
    user.lastLogin = new Date();
    await user.save();

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      sede: user.sede,
      permissions,
      token,
    });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/* =========================================================
   GET /api/auth/me
   ========================================================= */
router.get('/me', async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ error: 'NO_TOKEN' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id)
      .populate('sede', 'key name')
      .select('+tokens');

    if (!user) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }

    const roleDoc = await Role.findOne({ key: user.role });
    const permissions = roleDoc?.permissions || [];

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      sede: user.sede,
      permissions,
      lastLogin: user.lastLogin,
      tokenInStore: user.tokens.some(t => t.token === token),
    });
  } catch (err) {
    console.error('[auth/me]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/* =========================================================
   POST /api/auth/logout
   ========================================================= */
router.post('/logout', async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(400).json({ error: 'NO_TOKEN' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+tokens');

    if (user) {
      user.tokens = user.tokens.filter(t => t.token !== token);
      await user.save();
    }

    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });

    return res.json({ message: 'Sesión cerrada correctamente' });
  } catch (err) {
    console.error('[auth/logout]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
