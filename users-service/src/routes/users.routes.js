const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * GET /api/users/me
 */
router.get('/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt
  });
});

/**
 * GET /api/users
 * (ejemplo simple, idealmente solo para admin)
 */
router.get('/', authMiddleware, async (req, res) => {
  const users = await User.find().select('-password -tokens');
  res.json(users);
});

module.exports = router;
