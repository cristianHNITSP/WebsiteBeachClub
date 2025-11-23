const express = require('express');
const Reserva = require('../models/Reserva');
const Habitacion = require('../models/Habitacion');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * Helper para calcular noches
 */
function diffNights(checkIn, checkOut) {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

// GET /api/reservas
router.get('/', authMiddleware, async (req, res) => {
  const reservas = await Reserva.find().populate('habitacionId');
  res.json(reservas);
});

// POST /api/reservas
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      habitacionId,
      guestName,
      guestEmail,
      guestPhone,
      guests,
      checkIn,
      checkOut,
      source,
      notes
    } = req.body;

    const habitacion = await Habitacion.findById(habitacionId);
    if (!habitacion) {
      return res.status(400).json({ error: 'INVALID_ROOM', message: 'Habitación no encontrada.' });
    }

    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    const totalNights = diffNights(ci, co);
    const nightlyRate = habitacion.price;
    const totalAmount = nightlyRate * totalNights;

    const codigoReserva = `${habitacion.hotelCode}-${habitacion.roomNumber}-${Date.now()}`;

    const reserva = await Reserva.create({
      codigoReserva,
      habitacionId,
      hotelCode: habitacion.hotelCode,
      roomNumber: habitacion.roomNumber,
      guestName,
      guestEmail,
      guestPhone,
      guests,
      checkIn: ci,
      checkOut: co,
      status: 'CONFIRMADA',
      source: source || 'panel',
      notes: notes || '',
      nightlyRate,
      totalNights,
      totalAmount
    });

    res.status(201).json(reserva);
  } catch (err) {
    console.error('[POST /reservas] Error:', err);
    res.status(400).json({ error: 'BAD_REQUEST', details: err.message });
  }
});

// GET /api/reservas/:id
router.get('/:id', authMiddleware, async (req, res) => {
  const reserva = await Reserva.findById(req.params.id).populate('habitacionId');
  if (!reserva) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(reserva);
});

// PATCH /api/reservas/:id/status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  const reserva = await Reserva.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );
  if (!reserva) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(reserva);
});

module.exports = router;
