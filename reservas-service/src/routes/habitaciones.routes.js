const express = require('express');
const Habitacion = require('../models/Habitacion');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// GET /api/habitaciones  (lista todas, solo para usuarios autenticados)
router.get('/', authMiddleware, async (req, res) => {
  const rooms = await Habitacion.find();
  res.json(rooms);
});

// POST /api/habitaciones  (crear habitación)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const room = await Habitacion.create(req.body);
    res.status(201).json(room);
  } catch (err) {
    console.error('[POST /habitaciones] Error:', err);
    res.status(400).json({ error: 'BAD_REQUEST', details: err.message });
  }
});

// GET /api/habitaciones/:id
router.get('/:id', authMiddleware, async (req, res) => {
  const room = await Habitacion.findById(req.params.id);
  if (!room) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(room);
});

// PUT /api/habitaciones/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const room = await Habitacion.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!room) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json(room);
  } catch (err) {
    res.status(400).json({ error: 'BAD_REQUEST', details: err.message });
  }
});

// DELETE /api/habitaciones/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const room = await Habitacion.findByIdAndDelete(req.params.id);
  if (!room) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({ message: 'Habitación eliminada' });
});

module.exports = router;
