const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema(
  {
    isSpecial: { type: Boolean, default: false },
    description: { type: String, default: '' },
    specialPrice: { type: Number, default: null }
  },
  { _id: false }
);

const AvailabilitySchema = new mongoose.Schema(
  {
    available: { type: Boolean, default: true },
    nextAvailableDate: { type: Date, default: null }
  },
  { _id: false }
);

const HabitacionSchema = new mongoose.Schema(
  {
    // Identificadores clave
    codigo: { type: String, required: true, unique: true }, // "CF-101"
    hotelCode: { type: String, required: true },           // "casa_frida"
    roomNumber: { type: String, required: true },

    // Info visual / marketing
    title: { type: String, required: true },
    location: { type: String, default: '' },
    img: { type: String, default: '' },
    price: { type: Number, required: true },
    rating: { type: Number, default: 0 },
    amenities: { type: [String], default: [] },
    badge: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    size: { type: Number, default: null },

    // Inventario interno
    roomType: { type: String, default: '' },
    capacityLabel: { type: String, default: '' },
    inventoryStatus: { type: String, default: 'Activa' },

    offer: { type: OfferSchema, default: () => ({}) },
    availability: { type: AvailabilitySchema, default: () => ({ available: true }) },

    favoritesCount: { type: Number, default: 0 }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

module.exports = mongoose.model('Habitacion', HabitacionSchema);
