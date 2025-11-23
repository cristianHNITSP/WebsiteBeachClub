const mongoose = require('mongoose');

const ReservaSchema = new mongoose.Schema(
  {
    codigoReserva: { type: String, required: true, unique: true },

    // Relación con habitación
    habitacionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Habitacion', required: true },
    hotelCode: { type: String, required: true },
    roomNumber: { type: String, required: true },

    // Huésped
    guestName: { type: String, required: true },
    guestEmail: { type: String, required: true },
    guestPhone: { type: String, required: true },
    guests: { type: Number, default: 1 },

    // Fechas
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },

    status: {
      type: String,
      enum: ['PENDIENTE', 'CONFIRMADA', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELADA', 'NO_SHOW'],
      default: 'PENDIENTE'
    },

    source: { type: String, default: 'web' },
    notes: { type: String, default: '' },

    nightlyRate: { type: Number, default: null },
    totalNights: { type: Number, default: null },
    totalAmount: { type: Number, default: null }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('Reserva', ReservaSchema);
