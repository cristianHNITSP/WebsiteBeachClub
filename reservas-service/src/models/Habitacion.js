const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema(
  {
    isSpecial: { type: Boolean, default: false },
    description: { type: String, default: "" },
    // Porcentaje de descuento (ej. 10 = 10%)
    discountPercent: { type: Number, default: null },
  },
  { _id: false }
);

const AvailabilitySchema = new mongoose.Schema(
  {
    available: { type: Boolean, default: true },
    nextAvailableDate: { type: Date, default: null },
  },
  { _id: false }
);

const HabitacionSchema = new mongoose.Schema(
  {
    // Identificadores clave
    codigo: { type: String, required: true, unique: true }, // "CF-101"
    hotelCode: { type: String, required: true }, // "casa_frida"
    roomNumber: { type: String, required: true },

    // Info visual / marketing
    title: { type: String, required: true },
    location: { type: String, default: "" },
    img: { type: String, default: "" },
    price: { type: Number, required: true },
    rating: { type: Number, default: 0 },
    amenities: { type: [String], default: [] },
    badge: { type: String, default: "" },
    featured: { type: Boolean, default: false },
    size: { type: Number, default: null }, // 1 a 4

    // Inventario / estado de reserva
    /**
     * Convención de estados:
     * 0 = No reservada / disponible
     * 1 = Reservada (confirmada)
     * 3 = En espera (reserva express en proceso mediante chat desde el website)
     *
     * (El valor 2 queda libre por si en el futuro quieres "bloqueada" o similar)
     */
    estadoDeReserva: {
      type: Number,
      default: 0,
      min: 0,
    },

    offer: { type: OfferSchema, default: () => ({}) },
    availability: {
      type: AvailabilitySchema,
      default: () => ({ available: true }),
    },

    // Favoritos
    favoritesCount: { type: Number, default: 0 },

    // Hashes de IP que ya marcaron favorito esta habitación (no se devuelven)
    favoriteIpHashes: {
      type: [String],
      default: [],
      select: false,
    },

    // 🔐 Hashes de IP que tienen esta habitación en "en espera" (estadoDeReserva = 3)
    // Solo los flujos públicos del website los manipulan (reserva express).
    // Cuando el admin cambia estado a 0/1, se limpian.
    reservaIpHashes: {
      type: [String],
      default: [],
      select: false,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

module.exports = mongoose.model("Habitacion", HabitacionSchema);
