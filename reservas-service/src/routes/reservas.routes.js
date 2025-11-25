// routes/reservas.routes.js
const express = require('express');
const Reserva = require('../models/Reserva');
const Habitacion = require('../models/Habitacion');
const authMiddleware = require('../middlewares/auth.middleware');
const { requirePermissions } = require('../middlewares/require.Permissions');

const router = express.Router();

/**
 * Helper para calcular noches
 */
function diffNights(checkIn, checkOut) {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

/**
 * GET /api/reservas
 * Listar todas las reservas
 * Permiso requerido: view_reservations
 */
router.get(
  '/',
  authMiddleware,
  requirePermissions(['view_reservations']),
  async (req, res) => {
    try {
      const reservas = await Reserva.find().populate('habitacionId');
      res.json(reservas);
    } catch (err) {
      console.error('[GET /reservas] Error:', err);
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  }
);

/**
 * POST /api/reservas
 * Crear una nueva reserva
 * Permiso requerido: manage_reservations
 */
router.post(
  '/',
  authMiddleware,
  requirePermissions(['manage_reservations']),
  async (req, res) => {
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
        notes,
      } = req.body;

      // Validaciones básicas
      if (!habitacionId || !checkIn || !checkOut || !guestName) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message:
            'habitacionId, checkIn, checkOut y guestName son obligatorios.',
        });
      }

      const habitacion = await Habitacion.findById(habitacionId);
      if (!habitacion) {
        return res
          .status(400)
          .json({ error: 'INVALID_ROOM', message: 'Habitación no encontrada.' });
      }

      const ci = new Date(checkIn);
      const co = new Date(checkOut);

      if (isNaN(ci.getTime()) || isNaN(co.getTime())) {
        return res.status(400).json({
          error: 'INVALID_DATES',
          message: 'Fechas de check-in/check-out inválidas.',
        });
      }

      const totalNights = diffNights(ci, co);
      const nightlyRate = habitacion.price || 0;
      const totalAmount = nightlyRate * totalNights;

      // Usamos el campo "codigo" de la habitación (no roomNumber)
      const codigoHab = habitacion.codigo || habitacion._id.toString();

      const codigoReserva = `${habitacion.hotelCode || 'HOTEL'}-${codigoHab}-${Date.now()}`;

      const reserva = await Reserva.create({
        codigoReserva,
        habitacionId,
        hotelCode: habitacion.hotelCode,
        roomNumber: codigoHab, // opcional: para mostrar en UI como "número"
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
        totalAmount,
        createdBy: req.user?.id || null, // opcional: quién la creó
      });

      res.status(201).json(reserva);
    } catch (err) {
      console.error('[POST /reservas] Error:', err);
      res.status(400).json({ error: 'BAD_REQUEST', details: err.message });
    }
  }
);

/**
 * GET /api/reservas/:id
 * Ver una reserva específica
 * Permiso requerido: view_reservations
 */
router.get(
  '/:id',
  authMiddleware,
  requirePermissions(['view_reservations']),
  async (req, res) => {
    try {
      const reserva = await Reserva.findById(req.params.id).populate(
        'habitacionId'
      );
      if (!reserva) {
        return res.status(404).json({ error: 'NOT_FOUND' });
      }
      res.json(reserva);
    } catch (err) {
      console.error('[GET /reservas/:id] Error:', err);
      res.status(400).json({ error: 'BAD_REQUEST', details: err.message });
    }
  }
);

/**
 * PATCH /api/reservas/:id/status
 * Actualizar el estado de una reserva (CONFIRMADA, CANCELADA, NO_SHOW, etc.)
 * Permiso requerido: manage_reservations
 */
router.patch(
  '/:id/status',
  authMiddleware,
  requirePermissions(['manage_reservations']),
  async (req, res) => {
    try {
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'El campo status es obligatorio.',
        });
      }

      const reserva = await Reserva.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!reserva) {
        return res.status(404).json({ error: 'NOT_FOUND' });
      }

      res.json(reserva);
    } catch (err) {
      console.error('[PATCH /reservas/:id/status] Error:', err);
      res.status(400).json({ error: 'BAD_REQUEST', details: err.message });
    }
  }
);

module.exports = router;
